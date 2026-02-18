import type { PlanInitiativeData } from "../jobs.js";
import * as initiativeService from "../../services/initiative.service.js";
import * as planService from "../../services/plan.service.js";
import * as featureService from "../../services/feature.service.js";
import * as notionService from "../../services/notion.service.js";
import type { NotionPageContent } from "../../services/notion.service.js";
import { getOctokitForInitiative } from "../../services/github-token.service.js";
import { runPlannerAgent } from "../../agents/planner.agent.js";
import { createChildLogger } from "../../lib/logger.js";
import { throwMaybeUnrecoverable } from "../unrecoverable.js";

const log = createChildLogger({ handler: "plan-initiative" });

export async function handlePlanInitiative(data: PlanInitiativeData): Promise<void> {
  const { initiativeId, notionPageId, targetRepo, baseBranch } = data;

  // Only set "planning" if not already failed (avoids overwriting error on retries)
  const current = await initiativeService.getInitiativeById(initiativeId);
  if (current?.status !== "failed") {
    await initiativeService.updateInitiativeStatus(initiativeId, "planning");
  }

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

    // Read additional context if this is a re-plan after answering questions
    const initiative = await initiativeService.getInitiativeById(initiativeId);
    const additionalContext = (initiative?.metadata as Record<string, unknown>)?.additionalContext as string | undefined;

    // Get existing features and separate merged from pending
    const allExistingFeatures = await featureService.getFeaturesByInitiative(initiativeId);
    const mergedFeatures = allExistingFeatures.filter((f) => f.status === "merged");
    const pendingFeatures = allExistingFeatures.filter((f) => f.status !== "merged" && f.status !== "failed");

    const existingFeatures = mergedFeatures.length > 0
      ? {
          merged: mergedFeatures.map((f) => ({ title: f.title, description: f.description, sequence_order: f.sequence_order })),
          pending: pendingFeatures.map((f) => ({ title: f.title, description: f.description, sequence_order: f.sequence_order })),
        }
      : undefined;

    // Fetch repo file tree for planner context (optional — proceed without if unavailable)
    let repoFileTree: string[] = [];
    if (targetRepo) {
      try {
        const githubService = await import("../../services/github.service.js");
        const octokit = await getOctokitForInitiative(initiativeId);
        repoFileTree = await githubService.getFileTree(targetRepo, baseBranch ?? "main", octokit);
        log.info({ initiativeId, fileCount: repoFileTree.length }, "Fetched repo file tree for planner context");
      } catch (err) {
        log.warn({ err, initiativeId }, "Could not fetch repo file tree, proceeding without it");
      }
    }

    // 2. Run Planner Agent
    log.info({ initiativeId, mergedCount: mergedFeatures.length }, "Running Planner Agent");
    const planResult = await runPlannerAgent({
      initiativeId,
      notionContent,
      additionalContext,
      existingFeatures,
      repoFileTree: repoFileTree.length > 0 ? repoFileTree : undefined,
    });

    // 3. Handle result based on status
    if (planResult.status === "needs_info") {
      log.info(
        { initiativeId, questionCount: planResult.questions.length },
        "Planner needs more information",
      );

      // Store questions in metadata and set status to needs_info
      const currentMetadata = (initiative?.metadata as Record<string, unknown>) ?? {};
      await initiativeService.updateInitiative(initiativeId, {
        metadata: {
          ...currentMetadata,
          plannerAnalysis: planResult.summary,
          plannerQuestions: planResult.questions,
        },
      });
      await initiativeService.updateInitiativeStatus(initiativeId, "needs_info");
      return;
    }

    // status === "ready" — create plan and features
    log.info({ initiativeId, featureCount: planResult.features.length }, "Planner produced a plan");

    // 4. Store plan
    const totalFeatureCount = mergedFeatures.length + planResult.features.length;
    const version = await planService.getNextPlanVersion(initiativeId);
    const plan = await planService.createPlan({
      initiative_id: initiativeId,
      version,
      summary: planResult.summary,
      raw_output: planResult as unknown as Record<string, unknown>,
      feature_count: totalFeatureCount,
      is_active: true,
    });

    // Migrate merged features to the new plan (plan_id update only)
    if (mergedFeatures.length > 0) {
      await featureService.migrateFeaturesToPlan(
        mergedFeatures.map((f) => f.id),
        plan.id,
      );
      log.info({ initiativeId, migratedCount: mergedFeatures.length }, "Migrated merged features to new plan");
    }

    // Set status to plan_review — features are created only after user approves the plan
    await initiativeService.updateInitiativeStatus(initiativeId, "plan_review");

    log.info({ initiativeId, featureCount: totalFeatureCount }, "Plan created, awaiting user approval");
  } catch (err) {
    log.error({ err, initiativeId }, "Plan initiative failed");
    await initiativeService.updateInitiativeStatus(
      initiativeId,
      "failed",
      err instanceof Error ? err.message : "Unknown error",
    );
    throwMaybeUnrecoverable(err);
  }
}
