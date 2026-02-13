import type { DevelopFeatureData } from "../jobs.js";
import * as featureService from "../../services/feature.service.js";
import * as taskService from "../../services/task.service.js";
import { runDeveloperAgent } from "../../agents/developer.agent.js";
import * as githubService from "../../services/github.service.js";
import { getOctokitForInitiative } from "../../services/github-token.service.js";
import { createChildLogger } from "../../lib/logger.js";

const log = createChildLogger({ handler: "develop-feature" });

export async function handleDevelopFeature(data: DevelopFeatureData): Promise<void> {
  const { initiativeId, featureId, targetRepo, baseBranch, rejectionFeedback } = data;

  const feature = await featureService.getFeatureById(featureId);
  if (!feature) throw new Error(`Feature ${featureId} not found`);

  await featureService.updateFeatureStatus(featureId, "developing");

  try {
    const octokit = await getOctokitForInitiative(initiativeId);

    // Ensure repo is initialized (handles empty repos)
    await githubService.ensureRepoInitialized(targetRepo, baseBranch, octokit);

    // Create branch if not yet assigned
    let branchName = feature.branch_name;
    if (!branchName) {
      branchName = `feature/${featureId.slice(0, 8)}-${feature.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40)}`;
      await githubService.createBranch(targetRepo, baseBranch, branchName, octokit);
      await featureService.updateFeatureStatus(featureId, "developing", { branch_name: branchName });
      log.info({ featureId, branchName }, "Branch created for feature");
    }

    const tasks = await taskService.getTasksByFeature(featureId);

    // Process each task sequentially
    for (const task of tasks) {
      if (task.status === "done" && !rejectionFeedback) continue;

      await taskService.updateTaskStatus(task.id, "doing");

      log.info({ taskId: task.id, taskTitle: task.title }, "Running Developer Agent");

      // Get previous task outputs for context
      const previousTasks = tasks.filter(
        (t) => t.sequence_order < task.sequence_order && t.agent_output,
      );

      const result = await runDeveloperAgent({
        initiativeId,
        task,
        feature,
        branchName,
        targetRepo,
        previousTaskOutputs: previousTasks.map((t) => t.agent_output!),
        rejectionFeedback: rejectionFeedback ?? undefined,
        octokit,
      });

      // Commit changes
      if (result.files.length > 0) {
        await githubService.commitFiles(
          targetRepo,
          branchName,
          result.files,
          `feat(${feature.title}): ${task.title}`,
          octokit,
        );
      }

      await taskService.updateTaskStatus(task.id, "done", result as unknown as Record<string, unknown>);
      log.info({ taskId: task.id }, "Task completed");
    }

    log.info({ featureId }, "Feature development completed, awaiting manual move to review");
  } catch (err) {
    log.error({ err, featureId }, "Develop feature failed");
    await featureService.updateFeatureStatus(featureId, "failed");
    throw err;
  }
}
