import { afterEach, describe, expect, it } from "vitest";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { RPGMakerWriter } from "../../src/adapters/mz/writer.js";

const dirs: string[] = [];

function createNativeProject(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rpgmaker-writer-format-"));
  dirs.push(dir);
  const dataDir = path.join(dir, "data");
  fs.mkdirSync(dataDir);

  fs.writeFileSync(path.join(dataDir, "Map001.json"), [
    "{",
    '"autoplayBgm":false,"height":10,"width":10,',
    '"data":[],',
    '"events":[',
    "null,",
    '{"id":1,"name":"NPC","note":"","pages":[],"x":1,"y":1}',
    "]",
    "}",
  ].join("\n") + "\n");
  fs.writeFileSync(
    path.join(dataDir, "MapInfos.json"),
    '[\nnull,\n{"id":1,"expanded":false,"name":"Town","order":1,"parentId":0,"scrollX":0,"scrollY":0}\n]\n',
  );
  fs.writeFileSync(path.join(dataDir, "System.json"), '{"gameTitle":"Test","versionId":1}\n');
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
});

describe("RPGMakerWriter formatting and write scope", () => {
  it("moves an event without touching MapInfos/System or expanding native JSON", () => {
    const dir = createNativeProject();
    const dataDir = path.join(dir, "data");
    const mapPath = path.join(dataDir, "Map001.json");
    const infoPath = path.join(dataDir, "MapInfos.json");
    const systemPath = path.join(dataDir, "System.json");
    const beforeMapText = fs.readFileSync(mapPath, "utf-8");
    const beforeMap = JSON.parse(beforeMapText) as { events: Array<Record<string, unknown> | null> };
    const beforeInfo = fs.readFileSync(infoPath, "utf-8");
    const beforeSystem = fs.readFileSync(systemPath, "utf-8");
    const updatedMap = structuredClone(beforeMap);
    updatedMap.events[1]!.x = 17;
    updatedMap.events[1]!.y = 5;

    const writer = new RPGMakerWriter({
      projectPath: dir,
      createBackup: true,
      refreshMapVersionId: false,
    });
    writer.writeMap(1, updatedMap);

    const afterMapText = fs.readFileSync(mapPath, "utf-8");
    const afterMap = JSON.parse(afterMapText) as typeof beforeMap;
    const normalizedAfter = structuredClone(afterMap);
    normalizedAfter.events[1]!.x = 1;
    normalizedAfter.events[1]!.y = 1;

    expect(normalizedAfter).toEqual(beforeMap);
    expect(afterMapText.split("\n")).toHaveLength(beforeMapText.split("\n").length);
    expect(afterMapText.split("\n").filter((line, index) => line !== beforeMapText.split("\n")[index])).toHaveLength(1);
    expect(fs.readFileSync(infoPath, "utf-8")).toBe(beforeInfo);
    expect(fs.readFileSync(systemPath, "utf-8")).toBe(beforeSystem);
    expect(fs.readdirSync(path.join(dir, "backups"))).toHaveLength(1);
  });

  it("does not write or back up semantically unchanged data", () => {
    const dir = createNativeProject();
    const mapPath = path.join(dir, "data", "Map001.json");
    const before = fs.readFileSync(mapPath, "utf-8");
    const writer = new RPGMakerWriter({ projectPath: dir, createBackup: true });

    writer.writeMap(1, JSON.parse(before));

    expect(fs.readFileSync(mapPath, "utf-8")).toBe(before);
    expect(fs.readdirSync(path.join(dir, "backups"))).toEqual([]);
    expect(JSON.parse(fs.readFileSync(path.join(dir, "data", "System.json"), "utf-8")).versionId).toBe(1);
  });

  it("validates mapInfo before changing the map file", () => {
    const dir = createNativeProject();
    const mapPath = path.join(dir, "data", "Map001.json");
    const before = fs.readFileSync(mapPath, "utf-8");
    const map = JSON.parse(before) as Record<string, unknown>;
    const writer = new RPGMakerWriter({ projectPath: dir, createBackup: false });

    expect(() => writer.writeMap(1, { ...map, width: 20 }, { id: 1, name: "Missing fields" })).toThrow(
      /missing required fields/,
    );
    expect(fs.readFileSync(mapPath, "utf-8")).toBe(before);
  });
});
