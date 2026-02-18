import * as pitchService from "../../services/pitch.service.js";
import { runPitchAgent } from "../../agents/pitch.agent.js";
import type { GeneratePitchData } from "../jobs.js";
import { createChildLogger } from "../../lib/logger.js";
import { throwMaybeUnrecoverable } from "../unrecoverable.js";

const log = createChildLogger({ module: "generate-pitch-handler" });

export async function handleGeneratePitch(data: GeneratePitchData): Promise<void> {
  const { pitchId } = data;

  await pitchService.updatePitchStatus(pitchId, "generating");

  const pitch = await pitchService.getPitchById(pitchId);
  if (!pitch) {
    throw new Error(`Pitch ${pitchId} not found`);
  }

  try {
    log.info({ pitchId }, "Running pitch agent");
    const content = await runPitchAgent({
      pitchId,
      title: pitch.title,
      brief: pitch.brief,
      clientName: pitch.client_name,
    });

    await pitchService.updatePitch(pitchId, { status: "ready", content });
    log.info({ pitchId }, "Pitch generated successfully");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    await pitchService.updatePitchStatus(pitchId, "failed", message);
    throwMaybeUnrecoverable(err);
  }
}
