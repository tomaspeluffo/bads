import type { MergeFeatureData } from "../jobs.js";
import { enqueueDecomposeFeature, enqueueCompleteInitiative } from "../jobs.js";
import * as featureService from "../../services/feature.service.js";
import * as githubService from "../../services/github.service.js";
import { createChildLogger } from "../../lib/logger.js";

const log = createChildLogger({ handler: "merge-feature" });

export async function handleMergeFeature(data: MergeFeatureData): Promise<void> {
  const { initiativeId, featureId, targetRepo, baseBranch } = data;

  await featureService.updateFeatureStatus(featureId, "merging");

  try {
    const feature = await featureService.getFeatureById(featureId);
    if (!feature) throw new Error(`Feature ${featureId} not found`);

    // Merge the PR
    if (feature.pr_number) {
      log.info({ featureId, prNumber: feature.pr_number }, "Merging PR");
      await githubService.mergePullRequest(targetRepo, feature.pr_number);
    }

    await featureService.updateFeatureStatus(featureId, "merged");
    log.info({ featureId }, "Feature merged");

    // Check if all features are done
    const allMerged = await featureService.allFeaturesMerged(initiativeId);

    if (allMerged) {
      await enqueueCompleteInitiative({ initiativeId, targetRepo, baseBranch });
    } else {
      // Start next pending feature
      const nextFeature = await featureService.getNextPendingFeature(initiativeId);
      if (nextFeature) {
        await enqueueDecomposeFeature({
          initiativeId,
          featureId: nextFeature.id,
          targetRepo,
          baseBranch,
        });
      }
    }
  } catch (err) {
    log.error({ err, featureId }, "Merge feature failed");
    await featureService.updateFeatureStatus(featureId, "failed");
    throw err;
  }
}
