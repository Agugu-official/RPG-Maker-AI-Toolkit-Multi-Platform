import { afterEach, describe, expect, it } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import * as fs from "fs";
import * as net from "net";
import * as os from "os";
import * as path from "path";

const root = path.resolve(import.meta.dirname, "../..");
const entrypoint = path.join(root, "src", "index.ts");
const tsxCli = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
const tempDirs: string[] = [];
const transports: StdioClientTransport[] = [];
const blockingServers: net.Server[] = [];

function inheritedEnvironment(): Record<string, string> {
  return Object.fromEntries(
    Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
  );
}

function createProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rpgmaker-mcp-stdio-"));
  tempDirs.push(dir);
  const dataDir = path.join(dir, "data");
  fs.mkdirSync(dataDir);
  fs.writeFileSync(path.join(dataDir, "Map003.json"), [
    "{",
    '"autoplayBgm":false,"height":20,"width":20,',
    '"data":[],',
    '"events":[',
    "null,",
    '{"id":1,"name":"NPC","note":"","pages":[],"x":1,"y":1}',
    "]",
    "}",
  ].join("\n") + "\n");
  fs.writeFileSync(path.join(dataDir, "MapInfos.json"), "[\nnull\n]\n");
  fs.writeFileSync(path.join(dataDir, "System.json"), '{"versionId":1}\n');
  return dir;
}

async function connect(projectPath: string, environment: Record<string, string>) {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [tsxCli, entrypoint],
    cwd: root,
    stderr: "pipe",
    env: {
      ...inheritedEnvironment(),
      RPGMAKER_PROJECT_PATH: projectPath,
      RPGMAKER_ENGINE: "mz",
      RPGMAKER_REFRESH_VERSION_ID: "false",
      LOG_LEVEL: "error",
      ...environment,
    },
  });
  transports.push(transport);
  let stderr = "";
  transport.stderr?.on("data", (chunk) => { stderr += String(chunk); });
  const client = new Client({ name: "rpgmaker-integration-test", version: "1.0.0" });
  await client.connect(transport);
  return { client, transport, getStderr: () => stderr };
}

async function freePort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Could not allocate test port");
  const port = address.port;
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return port;
}

function collectSchemaLiterals(value: unknown): unknown[] {
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const own = [
    ...(Array.isArray(record.enum) ? record.enum : []),
    ...(Object.hasOwn(record, "const") ? [record.const] : []),
  ];
  return own.concat(Object.values(record).flatMap(collectSchemaLiterals));
}

afterEach(async () => {
  await Promise.all(transports.splice(0).map((transport) => transport.close().catch(() => undefined)));
  await Promise.all(blockingServers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  for (const dir of tempDirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("real STDIO MCP registration", () => {
  it("preserves macro data and edits an event through the MCP client", async () => {
    const project = createProject();
    const mapInfoPath = path.join(project, "data", "MapInfos.json");
    const systemPath = path.join(project, "data", "System.json");
    const beforeMapInfo = fs.readFileSync(mapInfoPath, "utf-8");
    const beforeSystem = fs.readFileSync(systemPath, "utf-8");
    const { client, getStderr } = await connect(project, { RPGMAKER_BRIDGE_ENABLED: "false" });

    const listed = await client.listTools();
    const runtimeControl = listed.tools.find((tool) => tool.name === "runtime-control");
    const directionSchema = (runtimeControl?.inputSchema.properties?.direction ?? {}) as unknown;
    const directionValues = collectSchemaLiterals(directionSchema);
    expect(directionValues).toEqual(expect.arrayContaining([0, 2, 4, 6, 8]));
    expect(directionValues).not.toEqual(expect.arrayContaining(["0", "2", "4", "6", "8"]));

    for (const arguments_ of [
      { action: "set-switch", id: 1, value: true },
      { action: "set-variable", id: 1, value: 10 },
      { action: "teleport", map_id: 3, x: 1, y: 1, direction: 2 },
    ]) {
      const runtimeResult = await client.callTool({ name: "runtime-control", arguments: arguments_ });
      const runtimeContent = runtimeResult.content[0];
      if (!runtimeContent || runtimeContent.type !== "text") throw new Error("Expected text tool result");
      expect(JSON.parse(runtimeContent.text).error).toContain("RPGMAKER_BRIDGE_ENABLED=false");
    }

    const result = await client.callTool({
      name: "game-map",
      arguments: {
        action: "edit-event",
        data: { map_id: 3, event_id: 1, x: 17, y: 5 },
      },
    });
    const content = result.content[0];
    expect(content?.type).toBe("text");
    if (!content || content.type !== "text") throw new Error("Expected text tool result");
    expect(JSON.parse(content.text)).toEqual({
      success: true,
      map_id: 3,
      event_id: 1,
      updated: ["x", "y"],
    });

    const map = JSON.parse(fs.readFileSync(path.join(project, "data", "Map003.json"), "utf-8"));
    expect(map.events[1]).toMatchObject({ x: 17, y: 5 });
    expect(fs.readFileSync(mapInfoPath, "utf-8")).toBe(beforeMapInfo);
    expect(fs.readFileSync(systemPath, "utf-8")).toBe(beforeSystem);
    expect(getStderr()).not.toContain("[INFO]");
  }, 15_000);

  it("starts two MCP instances on independently configured bridge ports", async () => {
    const projectA = createProject();
    const projectB = createProject();
    const portA = await freePort();
    const portB = await freePort();
    const first = await connect(projectA, { RPGMAKER_BRIDGE_PORT: String(portA) });
    const second = await connect(projectB, { RPGMAKER_BRIDGE_PORT: String(portB) });

    expect((await first.client.listTools()).tools.some((tool) => tool.name === "game-map")).toBe(true);
    expect((await second.client.listTools()).tools.some((tool) => tool.name === "game-map")).toBe(true);
    expect((await fetch(`http://127.0.0.1:${portA}/ping`)).status).toBe(204);
    expect((await fetch(`http://127.0.0.1:${portB}/ping`)).status).toBe(204);
  }, 20_000);

  it("keeps the STDIO server alive when the configured bridge port is occupied", async () => {
    const blocker = net.createServer();
    blockingServers.push(blocker);
    await new Promise<void>((resolve, reject) => {
      blocker.once("error", reject);
      blocker.listen(0, "127.0.0.1", resolve);
    });
    const address = blocker.address();
    if (!address || typeof address === "string") throw new Error("Could not reserve test port");

    const project = createProject();
    const { client } = await connect(project, { RPGMAKER_BRIDGE_PORT: String(address.port) });
    const listed = await client.listTools();

    expect(listed.tools.some((tool) => tool.name === "game-map")).toBe(true);
  }, 15_000);
});
