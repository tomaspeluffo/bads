import type { NotifyHumanData } from "../jobs.js";
import * as featureService from "../../services/feature.service.js";
import * as initiativeService from "../../services/initiative.service.js";
import { createChildLogger } from "../../lib/logger.js";

const log = createChildLogger({ handler: "notify-human" });

export async function handleNotifyHuman(data: NotifyHumanData): Promise<void> {
  const { initiativeId, featureId, prUrl } = data;

  try {
    const feature = await featureService.getFeatureById(featureId);
    if (!feature) throw new Error(`Feature ${featureId} not found`);

    const initiative = await initiativeService.getInitiativeById(initiativeId);
    if (!initiative) throw new Error(`Initiative ${initiativeId} not found`);

    log.info(
      { featureId, featureTitle: feature.title, initiativeTitle: initiative.title, prUrl, branch: feature.branch_name },
      "Feature ready for human review",
    );

    // Pipeline pauses here. Resumes when human calls approve/reject endpoint.
    log.info({ featureId }, "Pipeline paused, awaiting human review");
  } catch (err) {
    log.error({ err, featureId }, "Notify human failed");
    // Non-fatal: feature is already in human_review status
    // Human can still approve/reject via API
  }
}
