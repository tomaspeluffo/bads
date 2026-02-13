import type { DecomposeFeatureData } from "../jobs.js";
import * as featureService from "../../services/feature.service.js";
import * as taskService from "../../services/task.service.js";
import { runTaskDecomposerAgent } from "../../agents/task-decomposer.agent.js";
import { getOctokitForInitiative } from "../../services/github-token.service.js";
import { createChildLogger } from "../../lib/logger.js";

const log = createChildLogger({ handler: "decompose-feature" });

export async function handleDecomposeFeature(data: DecomposeFeatureData): Promise<void> {
  const { initiativeId, featureId, targetRepo } = data;

  await featureService.updateFeatureStatus(featureId, "decomposing");

  try {
    const feature = await featureService.getFeatureById(featureId);
    if (!feature) throw new Error(`Feature ${featureId} not found`);

    // 1. Get codebase context (optional — works without GitHub)
    let fileTree: string[] = [];
    if (targetRepo) {
      try {
        const githubService = await import("../../services/github.service.js");
        const octokit = await getOctokitForInitiative(initiativeId);
        fileTree = await githubService.getFileTree(targetRepo, data.baseBranch, octokit);
        log.info({ featureId, targetRepo, fileCount: fileTree.length }, "Fetched codebase context");
      } catch (err) {
        log.warn({ err, featureId, targetRepo }, "No se pudo obtener el file tree de GitHub, continuando sin contexto de codebase");
      }
    } else {
      log.info({ featureId }, "Sin repositorio configurado, descomponiendo sin contexto de codebase");
    }

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
      user_story: t.userStory,
      acceptance_criteria: t.acceptanceCriteria,
      task_type: t.taskType,
      file_paths: t.filePaths,
      status: "to_do" as const,
    }));

    await taskService.createTasks(taskInserts);

    // 4. Mark feature as decomposed (branch creation and development happen later when GitHub is needed)
    await featureService.updateFeatureStatus(featureId, "developing");

    log.info({ featureId, taskCount: taskInserts.length }, "Feature decomposed");
  } catch (err) {
    log.error({ err, featureId }, "Decompose feature failed");
    await featureService.updateFeatureStatus(featureId, "failed");
    throw err;
  }
}
