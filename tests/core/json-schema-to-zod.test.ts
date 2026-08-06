import { describe, expect, it } from "vitest";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { BatchEditTool } from "../../src/adapters/mz/tools/batch-edit.js";
import { jsonSchemaToZod, type JsonObjectSchema } from "../../src/core/json-schema-to-zod.js";
import { GameEntityTool } from "../../src/macro/schemas/game-entity.js";
import { GameMapTool } from "../../src/macro/schemas/game-map.js";
import { RuntimeControlTool } from "../../src/macro/schemas/runtime-control.js";

function parserFor(tool: Tool | { inputSchema: unknown }) {
  return jsonSchemaToZod(tool.inputSchema as JsonObjectSchema);
}

describe("JSON Schema to Zod conversion", () => {
  it("preserves dynamic macro data objects", () => {
    const input = {
      action: "edit-event",
      data: { map_id: 3, event_id: 1, x: 17, y: 5 },
    };

    expect(parserFor(GameMapTool).parse(input)).toEqual(input);
    expect(parserFor(GameEntityTool).parse({
      action: "create",
      type: "actor",
      data: { name: "Aria", initial_level: 3 },
    })).toEqual({
      action: "create",
      type: "actor",
      data: { name: "Aria", initial_level: 3 },
    });
  });

  it("preserves nested batch and runtime operation fields", () => {
    const batchInput = {
      operations: [{ tool: "edit-actor", input: { actor_id: 1, name: "Aria" } }],
    };
    const runtimeInput = {
      action: "modify-actor",
      operations: [{ field: "hp", mode: "set", value: 10 }],
    };

    expect(parserFor(BatchEditTool).parse(batchInput)).toEqual(batchInput);
    expect(parserFor(RuntimeControlTool).parse(runtimeInput)).toEqual(runtimeInput);
  });

  it.each([true, 10, "chapter-2"])("keeps untyped values as their original type: %j", (value) => {
    expect(parserFor(RuntimeControlTool).parse({ action: "set-variable", value }).value).toBe(value);
  });

  it("keeps numeric enums numeric", () => {
    const parser = parserFor(RuntimeControlTool);
    expect(parser.parse({ action: "teleport", direction: 2 }).direction).toBe(2);
    expect(() => parser.parse({ action: "teleport", direction: "2" })).toThrow();
  });

  it("applies integer, numeric range, and additionalProperties constraints", () => {
    const parser = jsonSchemaToZod({
      type: "object",
      properties: {
        count: { type: "integer", minimum: 1, maximum: 3 },
      },
      required: ["count"],
      additionalProperties: false,
    });

    expect(parser.parse({ count: 2 })).toEqual({ count: 2 });
    expect(() => parser.parse({ count: 1.5 })).toThrow();
    expect(() => parser.parse({ count: 4 })).toThrow();
    expect(() => parser.parse({ count: 2, extra: true })).toThrow();
  });

  it("validates typed additional properties with catchall", () => {
    const parser = jsonSchemaToZod({
      type: "object",
      properties: {},
      additionalProperties: { type: "number" },
    });

    expect(parser.parse({ hp: 100, mp: 20 })).toEqual({ hp: 100, mp: 20 });
    expect(() => parser.parse({ hp: "100" })).toThrow();
  });
});
