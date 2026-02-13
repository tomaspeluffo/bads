import { anthropic } from "../lib/anthropic.js";
import { logExecution } from "../services/execution.service.js";
import type { AgentType } from "../models/agent-execution.js";
import { FALLBACK_MODEL } from "../config/constants.js";
import { createChildLogger } from "../lib/logger.js";
import type Anthropic from "@anthropic-ai/sdk";
import AnthropicSDK from "@anthropic-ai/sdk";

const log = createChildLogger({ module: "agent" });

function isOverloadedError(err: unknown): boolean {
  return err instanceof AnthropicSDK.APIError && err.status === 529;
}

export interface AgentCallOptions {
  agent: AgentType;
  initiativeId: string;
  featureId?: string;
  taskId?: string;
  model: string;
  maxTokens: number;
  system: string;
  messages: Anthropic.MessageParam[];
  tools?: Anthropic.Tool[];
  timeout?: number;
}

export interface AgentResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  durationMs: number;
  stopReason: string | null;
}

export async function callAgent(opts: AgentCallOptions): Promise<AgentResult> {
  const start = Date.now();
  const callLog = log.child({ agent: opts.agent, initiativeId: opts.initiativeId });

  callLog.info("Agent call started");

  try {
    const response = await createMessageWithFallback({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: opts.messages,
      tools: opts.tools,
    });

    const durationMs = Date.now() - start;
    const content = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("");

    const result: AgentResult = {
      content,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      durationMs,
      stopReason: response.stop_reason,
    };

    // Log execution
    await logExecution({
      agent: opts.agent,
      initiative_id: opts.initiativeId,
      feature_id: opts.featureId ?? null,
      task_id: opts.taskId ?? null,
      input_tokens: result.inputTokens,
      output_tokens: result.outputTokens,
      duration_ms: result.durationMs,
      model: opts.model,
      status: "success",
    });

    callLog.info(
      { inputTokens: result.inputTokens, outputTokens: result.outputTokens, durationMs },
      "Agent call completed",
    );

    return result;
  } catch (err) {
    const durationMs = Date.now() - start;

    await logExecution({
      agent: opts.agent,
      initiative_id: opts.initiativeId,
      feature_id: opts.featureId ?? null,
      task_id: opts.taskId ?? null,
      input_tokens: 0,
      output_tokens: 0,
      duration_ms: durationMs,
      model: opts.model,
      status: "error",
    }).catch(() => {});

    callLog.error({ err, durationMs }, "Agent call failed");
    throw err;
  }
}

async function createMessageWithFallback(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  try {
    return await anthropic.messages.create(params);
  } catch (err) {
    if (isOverloadedError(err) && params.model !== FALLBACK_MODEL) {
      log.warn({ model: params.model, fallback: FALLBACK_MODEL }, "Model overloaded, retrying with fallback");
      return await anthropic.messages.create({ ...params, model: FALLBACK_MODEL });
    }
    throw err;
  }
}

export async function callAgentWithTools(
  opts: AgentCallOptions,
  handleToolUse: (
    name: string,
    input: Record<string, unknown>,
  ) => Promise<string>,
): Promise<{ content: string; totalInputTokens: number; totalOutputTokens: number; durationMs: number }> {
  const start = Date.now();
  const callLog = log.child({ agent: opts.agent, initiativeId: opts.initiativeId });

  let messages = [...opts.messages];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let finalContent = "";
  let iterations = 0;
  const maxIterations = 25;

  while (iterations < maxIterations) {
    iterations++;
    callLog.info({ iteration: iterations }, "Tool use iteration");

    const response = await createMessageWithFallback({
      model: opts.model,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages,
      tools: opts.tools,
    });

    totalInputTokens += response.usage.input_tokens;
    totalOutputTokens += response.usage.output_tokens;

    // Collect text content
    const textBlocks = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text);
    finalContent = textBlocks.join("");

    // Check if done
    if (response.stop_reason === "end_turn" || response.stop_reason !== "tool_use") {
      break;
    }

    // Process tool calls
    const toolUseBlocks = response.content.filter(
      (c): c is Anthropic.ToolUseBlock => c.type === "tool_use",
    );

    if (toolUseBlocks.length === 0) break;

    // Add assistant response to messages
    messages.push({ role: "assistant", content: response.content });

    // Process each tool call and add results
    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      try {
        const result = await handleToolUse(
          toolUse.name,
          toolUse.input as Record<string, unknown>,
        );
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: result,
        });
      } catch (err) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
          is_error: true,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  const durationMs = Date.now() - start;

  // Log execution
  await logExecution({
    agent: opts.agent,
    initiative_id: opts.initiativeId,
    feature_id: opts.featureId ?? null,
    task_id: opts.taskId ?? null,
    input_tokens: totalInputTokens,
    output_tokens: totalOutputTokens,
    duration_ms: durationMs,
    model: opts.model,
    status: "success",
  });

  callLog.info(
    { totalInputTokens, totalOutputTokens, durationMs, iterations },
    "Tool use agent completed",
  );

  return { content: finalContent, totalInputTokens, totalOutputTokens, durationMs };
}
