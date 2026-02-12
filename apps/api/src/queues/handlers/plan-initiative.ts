import type { PlanInitiativeData } from "../jobs.js";
import { enqueueDecomposeFeature } from "../jobs.js";
import * as initiativeService from "../../services/initiative.service.js";
import * as planService from "../../services/plan.service.js";
import * as featureService from "../../services/feature.service.js";
import * as notionService from "../../services/notion.service.js";
import type { NotionPageContent } from "../../services/notion.service.js";
import { runPlannerAgent } from "../../agents/planner.agent.js";
import { createChildLogger } from "../../lib/logger.js";

const log = createChildLogger({ handler: "plan-initiative" });

export async function handlePlanInitiative(data: PlanInitiativeData): Promise<void> {
  const { initiativeId, notionPageId, targetRepo, baseBranch } = data;

  await initiativeService.updateInitiativeStatus(initiativeId, "planning");

  try {
    let notionContent: NotionPageContent;

    if (notionPageId) {
      // Fetch from Notion
      log.info({ notionPageId }, "Fetching Notion content");
      notionContent = await notionService.fetchAndParseNotionPage(notionPageId);

      // Update initiative with parsed content
      await initiativeService.updateInitiative(initiativeId, {
        title: notionContent.title || `Initiative from ${notionPageId}`,
        raw_content: notionContent as unknown as Record<string, unknown>,
        notion_url: notionContent.url ?? null,
      });
    } else {
      // Direct upload — content already stored in raw_content
      log.info({ initiativeId }, "Using pre-populated content (direct upload)");
      const initiative = await initiativeService.getInitiativeById(initiativeId);
      if (!initiative?.raw_content) {
        throw new Error("Initiative has no raw_content for direct upload");
      }
      notionContent = initiative.raw_content as unknown as NotionPageContent;
    }

    // 2. Run Planner Agent
    log.info({ initiativeId }, "Running Planner Agent");
    const planResult = await runPlannerAgent({
      initiativeId,
      notionContent,
    });

    // 3. Store plan
    const version = await planService.getNextPlanVersion(initiativeId);
    const plan = await planService.createPlan({
      initiative_id: initiativeId,
      version,
      summary: planResult.summary,
      raw_output: planResult as unknown as Record<string, unknown>,
      feature_count: planResult.features.length,
      is_active: true,
    });

    // 4. Store features
    const featureInserts = planResult.features.map((f, i) => ({
      plan_id: plan.id,
      initiative_id: initiativeId,
      sequence_order: i + 1,
      title: f.title,
      description: f.description,
      acceptance_criteria: f.acceptanceCriteria,
      status: "pending" as const,
      retry_count: 0,
    }));

    const features = await featureService.createFeatures(featureInserts);
    await initiativeService.updateInitiativeStatus(initiativeId, "planned");

    // 5. Start first feature
    const firstFeature = features[0];
    if (firstFeature) {
      await initiativeService.updateInitiativeStatus(initiativeId, "in_progress");
      await enqueueDecomposeFeature({
        initiativeId,
        featureId: firstFeature.id,
        targetRepo,
        baseBranch,
      });
    }

    log.info({ initiativeId, featureCount: features.length }, "Plan created");
  } catch (err) {
    log.error({ err, initiativeId }, "Plan initiative failed");
    await initiativeService.updateInitiativeStatus(
      initiativeId,
      "failed",
      err instanceof Error ? err.message : "Unknown error",
    );
    throw err;
  }
}
