import type { MergeFeatureData } from "../jobs.js";
import { enqueueCompleteInitiative } from "../jobs.js";
import * as featureService from "../../services/feature.service.js";
import * as githubService from "../../services/github.service.js";
import { getOctokitForInitiative } from "../../services/github-token.service.js";
import { createChildLogger } from "../../lib/logger.js";

const log = createChildLogger({ handler: "merge-feature" });

export async function handleMergeFeature(data: MergeFeatureData): Promise<void> {
  const { initiativeId, featureId, targetRepo, baseBranch } = data;

  await featureService.updateFeatureStatus(featureId, "merging");

  try {
    const feature = await featureService.getFeatureById(featureId);
    if (!feature) throw new Error(`Feature ${featureId} not found`);

    const octokit = await getOctokitForInitiative(initiativeId);

    // Merge the PR
    if (feature.pr_number) {
      log.info({ featureId, prNumber: feature.pr_number }, "Merging PR");
      await githubService.mergePullRequest(targetRepo, feature.pr_number, octokit);
    }

    await featureService.updateFeatureStatus(featureId, "merged");
    log.info({ featureId }, "Feature merged");

    // Check if all features are done
    const allMerged = await featureService.allFeaturesMerged(initiativeId);

    if (allMerged) {
      await enqueueCompleteInitiative({ initiativeId, targetRepo, baseBranch });
    } else {
      log.info({ initiativeId, featureId }, "Feature merged, awaiting manual start of next feature");
    }
  } catch (err) {
    log.error({ err, featureId }, "Merge feature failed");
    await featureService.updateFeatureStatus(featureId, "failed");
    throw err;
  }
}
