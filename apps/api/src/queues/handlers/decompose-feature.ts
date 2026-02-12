import type { DecomposeFeatureData } from "../jobs.js";
import { enqueueDevelopFeature } from "../jobs.js";
import * as featureService from "../../services/feature.service.js";
import * as taskService from "../../services/task.service.js";
import { runTaskDecomposerAgent } from "../../agents/task-decomposer.agent.js";
import * as githubService from "../../services/github.service.js";
import { createChildLogger } from "../../lib/logger.js";

const log = createChildLogger({ handler: "decompose-feature" });

export async function handleDecomposeFeature(data: DecomposeFeatureData): Promise<void> {
  const { initiativeId, featureId, targetRepo, baseBranch } = data;

  await featureService.updateFeatureStatus(featureId, "decomposing");

  try {
    const feature = await featureService.getFeatureById(featureId);
    if (!feature) throw new Error(`Feature ${featureId} not found`);

    // 1. Get codebase context
    log.info({ featureId, targetRepo }, "Fetching codebase context");
    const fileTree = await githubService.getFileTree(targetRepo, baseBranch);

    // 2. Run Task Decomposer Agent
    log.info({ featureId }, "Running Task Decomposer Agent");
    const decomposition = await runTaskDecomposerAgent({
      initiativeId,
      feature,
      fileTree,
    });

    // 3. Store tasks
    const taskInserts = decomposition.tasks.map((t, i) => ({
      feature_id: featureId,
      sequence_order: i + 1,
      title: t.title,
      description: t.description,
      task_type: t.taskType,
      file_paths: t.filePaths,
      status: "to_do" as const,
    }));

    await taskService.createTasks(taskInserts);

    // 4. Create branch for feature
    const branchName = `bads/${feature.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50)}-${featureId.slice(0, 8)}`;
    await githubService.createBranch(targetRepo, baseBranch, branchName);
    await featureService.updateFeatureStatus(featureId, "developing", { branch_name: branchName });

    // 5. Enqueue development
    await enqueueDevelopFeature({
      initiativeId,
      featureId,
      targetRepo,
      baseBranch,
    });

    log.info({ featureId, taskCount: taskInserts.length }, "Feature decomposed");
  } catch (err) {
    log.error({ err, featureId }, "Decompose feature failed");
    await featureService.updateFeatureStatus(featureId, "failed");
    throw err;
  }
}
