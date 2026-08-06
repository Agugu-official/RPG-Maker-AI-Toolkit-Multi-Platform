import type { HandlerContext } from "../../handlers/types.js";
import { resolveHandler } from "../../core/resolve-handler.js";

const ACTION_TO_TOOL: Record<string, string> = {
  "encounter": "start-encounter",
  "suite": "run-battle-suite",
};

export async function handleBattleSim(ctx: HandlerContext): Promise<string> {
  if ((ctx.engine === "mz" || ctx.engine === "mv") && ctx.debugBridge.isAvailable === false) {
    return JSON.stringify({ error: ctx.debugBridge.unavailableReason || "MZ/MV runtime bridge is unavailable" });
  }
  const action = ctx.input.action as string;
  const data = (ctx.input.data ?? {}) as Record<string, unknown>;

  const toolName = ACTION_TO_TOOL[action];
  if (!toolName) {
    return JSON.stringify({ error: `Unknown battle-sim action: ${action}` });
  }

  const handler = resolveHandler(toolName, ctx.engine);
  if (!handler) {
    return JSON.stringify({ error: `Internal handler not found for: ${toolName}` });
  }

  return handler({ ...ctx, input: data });
}
