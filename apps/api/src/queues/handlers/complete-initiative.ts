import type { CompleteInitiativeData } from "../jobs.js";
import * as initiativeService from "../../services/initiative.service.js";
import * as memoryService from "../../services/memory.service.js";
import * as executionService from "../../services/execution.service.js";
import { createChildLogger } from "../../lib/logger.js";

const log = createChildLogger({ handler: "complete-initiative" });

export async function handleCompleteInitiative(data: CompleteInitiativeData): Promise<void> {
  const { initiativeId } = data;

  try {
    const initiative = await initiativeService.getInitiativeById(initiativeId);
    if (!initiative) throw new Error(`Initiative ${initiativeId} not found`);

    // Extract and store patterns from this initiative's execution
    const metrics = await executionService.getExecutionMetrics(initiativeId);

    log.info(
      {
        initiativeId,
        totalTokens: metrics.totalTokens,
        totalDurationMs: metrics.totalDurationMs,
        executionCount: metrics.executionCount,
      },
      "Initiative completed, extracting patterns",
    );

    // Store a completion pattern
    await memoryService.extractAndStorePatterns(initiativeId, [
      {
        type: "pattern",
        category: "initiative",
        title: `Completed: ${initiative.title}`,
        content: `Initiative completed with ${metrics.executionCount} agent executions, ${metrics.totalTokens} total tokens, ${metrics.totalDurationMs}ms total duration.`,
        tags: ["initiative", "completed"],
      },
    ]);

    await initiativeService.updateInitiativeStatus(initiativeId, "completed");
    log.info({ initiativeId }, "Initiative completed");
  } catch (err) {
    log.error({ err, initiativeId }, "Complete initiative failed");
    await initiativeService.updateInitiativeStatus(
      initiativeId,
      "failed",
      err instanceof Error ? err.message : "Unknown error",
    );
    throw err;
  }
}
