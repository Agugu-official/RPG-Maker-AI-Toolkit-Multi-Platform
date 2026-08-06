# RPG Maker AI Toolkit — 多平台版

**面向 RPG Maker MZ · MV · VX Ace · VX · XP 的 Model Context Protocol（MCP）服务器**。它允许任何兼容 MCP 的 AI 助手（Claude、GPT 等）直接读取和修改 RPG Maker 游戏项目，并实时控制正在运行的游戏。

> [English](README.md#english) · [Español](README.md#español) · 简体中文

## 功能简介

RPG Maker AI Toolkit 将 RPG Maker 项目封装为一组高层工具。你只需用自然语言描述目标，AI 助手即可读取或修改项目文件，无需手动复制粘贴 JSON、JavaScript 或 Ruby 数据。

当前服务器注册了 13 个 MCP 工具：1 个独立健康检查、11 个领域宏工具，以及 1 个 `batch-edit` 批处理入口。它们由约 110 个内部处理器支撑，在保持外层工具列表简洁的同时覆盖完整功能。

主要能力包括：

- 支持 RPG Maker MZ、MV、VX Ace、VX 和 XP。
- 读取、创建、编辑、复制和删除数据库实体。
- 创建与编辑地图、事件、图块和图块组。
- 编写分支对话、导入导出文本并生成多场景故事。
- 运行单场或批量战斗模拟。
- 管理插件、Ruby 脚本、项目校验、备份和变更历史。
- 通过运行时桥接读取游戏状态、切换开关、修改变量、传送玩家和触发战斗。
- 每次成功写入前自动备份，并将操作追加到变更日志。

MZ 和 MV 使用 JSON 数据格式及 HTTP 运行时桥接；VX Ace、VX 和 XP 则通过内置 Ruby 桥接处理 Marshal 数据，并通过 TCP 控制运行中的游戏。

## 环境要求

| 依赖 | 版本 | 说明 |
|---|---|---|
| Node.js | 20+ | 所有引擎均需要 |
| RPG Maker MZ 或 MV | 任意 | 使用 JSON，无额外运行时依赖 |
| RPG Maker VX Ace、VX 或 XP | 任意 | 还需要 Ruby |
| Ruby | 2.7+ | 仅 VX Ace、VX、XP 需要 |

TypeScript 仅用于开发；编译后的程序可直接由 Node.js 运行。

> 对于 VX Ace（`.rvdata2`）、VX（`.rvdata`）和 XP（`.rxdata`）项目，系统 `PATH` 中必须存在 Ruby 可执行文件，也可以在 `.env` 中通过 `RUBY_PATH` 指定绝对路径。

## 安装

```bash
git clone https://github.com/Zagos/RPG-Maker-AI-Toolkit-Multi-Platform.git
cd RPG-Maker-AI-Toolkit-Multi-Platform
npm install
npm run build
```

## 配置

复制环境变量模板：

```bash
cp .env.example .env
```

然后编辑 `.env`：

```env
# 必填：RPG Maker 项目根目录的绝对路径
RPGMAKER_PROJECT_PATH=C:\Users\you\Documents\MyGame

# 引擎：mz（默认）| mv | vxace | vx | xp
RPGMAKER_ENGINE=mz

# 可选：RPG Maker 可执行文件路径，供 game-setup 的 launch 操作使用
RPGMAKER_EXECUTABLE_PATH=C:\Program Files\RPG Maker MZ\RPGMakerMZ.exe

# VX Ace、VX、XP 可选：Ruby 可执行文件或绝对路径
RUBY_PATH=ruby

# Ruby 引擎运行时桥接端口与查询超时
RUBY_BRIDGE_PORT=9002
RUBY_BRIDGE_TIMEOUT=8000

# MZ/MV HTTP 运行时桥接；并行实例应使用不同端口
RPGMAKER_BRIDGE_HOST=127.0.0.1
RPGMAKER_BRIDGE_PORT=9001
RPGMAKER_BRIDGE_ENABLED=true

# 地图变化后是否刷新 System.json.versionId
RPGMAKER_REFRESH_VERSION_ID=true

# 日志与备份
MCP_DEBUG=false
LOG_LEVEL=info
BACKUP_MAX_COUNT=10
```

| 环境变量 | 默认值 | 用途 |
|---|---|---|
| `RPGMAKER_PROJECT_PATH` | 无 | RPG Maker 项目根目录的绝对路径，必填 |
| `RPGMAKER_ENGINE` | `mz` | `mz`、`mv`、`vxace`、`vx` 或 `xp` |
| `RPGMAKER_EXECUTABLE_PATH` | 无 | `game-setup` 启动编辑器时使用 |
| `RUBY_PATH` | `ruby` | Ruby 引擎的 Marshal 数据桥接 |
| `RUBY_BRIDGE_PORT` | `9002` | Ruby 引擎的运行时 TCP 端口 |
| `RUBY_BRIDGE_TIMEOUT` | `8000` | Ruby 运行时查询超时，单位为毫秒 |
| `RPGMAKER_BRIDGE_HOST` | `127.0.0.1` | MZ/MV HTTP 运行时桥接监听地址及插件连接地址 |
| `RPGMAKER_BRIDGE_PORT` | `9001` | MZ/MV HTTP 运行时桥接端口；并行实例应分别配置 |
| `RPGMAKER_BRIDGE_ENABLED` | `true` | 是否启动 MZ/MV HTTP 运行时桥接 |
| `RPGMAKER_REFRESH_VERSION_ID` | `true` | 地图发生语义变化后是否刷新 `System.json.versionId` |
| `MCP_DEBUG` | `false` | 是否输出详细调试日志 |
| `LOG_LEVEL` | `info` | `debug`、`info`、`warn` 或 `error` |
| `BACKUP_MAX_COUNT` | `10` | 每个源文件最多保留的备份数 |

## 运行

开发模式会在源码变化后自动重启：

```bash
npm run dev
```

生产模式：

```bash
npm run build
npm start
```

配置有效时，启动日志会显示已找到的 RPG Maker 引擎与项目路径。

## 接入 ChatGPT 桌面 App 与 Codex

本服务器通过本地 **STDIO** 提供 MCP。推荐把编译后的 `dist/index.js` 注册为 STDIO 服务器；同一 Codex 主机上的 ChatGPT 桌面 App、Codex CLI 和 Codex IDE 扩展会共享 MCP 配置。详见 OpenAI 官方的 [Model Context Protocol 文档](https://learn.chatgpt.com/docs/extend/mcp)。

先运行 `npm run build`，再根据操作系统填写对应的绝对路径：

| 配置项 | macOS 示例 | Windows 示例 |
|---|---|---|
| Node 可执行文件 | `/opt/homebrew/bin/node`（Apple Silicon）或 `/usr/local/bin/node`（Intel） | `C:\Program Files\nodejs\node.exe` |
| 工具包入口文件 | `/Users/your-name/Projects/RPG-Maker-AI-Toolkit-Multi-Platform/dist/index.js` | `C:\Users\your-name\Projects\RPG-Maker-AI-Toolkit-Multi-Platform\dist\index.js` |
| 工具包工作目录 | `/Users/your-name/Projects/RPG-Maker-AI-Toolkit-Multi-Platform` | `C:\Users\your-name\Projects\RPG-Maker-AI-Toolkit-Multi-Platform` |
| RPG Maker 项目 | `/Users/your-name/Documents/Games/MyGame` | `C:\Users\your-name\Documents\Games\MyGame` |

macOS 使用 `command -v node`、Windows PowerShell 使用 `(Get-Command node).Source`，可以取得本机真实的 Node 路径。Windows 路径在 ChatGPT App 字段和带引号的 PowerShell 参数中直接使用单个反斜杠；只有写入 JSON 字符串等格式时才需要双反斜杠。

### ChatGPT 桌面 App

1. 打开 **Settings → MCP servers → Add server**。
2. 名称填写 `rpgmaker`，传输方式选择 **STDIO**。
3. 根据上表填写 **Command**、**Arguments** 和 **Working directory**；唯一的参数是 `dist/index.js` 的绝对路径。
4. 添加以下环境变量：

   ```text
   RPGMAKER_PROJECT_PATH=<RPG Maker 项目的绝对路径>
   RPGMAKER_ENGINE=mz
   ```

   根据项目改为 `mv`、`vxace`、`vx` 或 `xp`。Ruby 引擎可能还需要配置 `RUBY_PATH`。
5. 保存后选择 **Restart**。在输入框中输入 `/mcp`，确认 `rpgmaker` 已连接。

### Codex CLI 与 IDE 扩展

使用 CLI 是创建共享配置最容易复现的方式。macOS 执行：

```bash
codex mcp add rpgmaker \
  --env RPGMAKER_PROJECT_PATH="/Users/your-name/Documents/Games/MyGame" \
  --env RPGMAKER_ENGINE=mz \
  -- "/opt/homebrew/bin/node" \
  "/Users/your-name/Projects/RPG-Maker-AI-Toolkit-Multi-Platform/dist/index.js"
```

Windows PowerShell 执行：

```powershell
codex mcp add rpgmaker `
  --env "RPGMAKER_PROJECT_PATH=C:\Users\your-name\Documents\Games\MyGame" `
  --env RPGMAKER_ENGINE=mz `
  -- "C:\Program Files\nodejs\node.exe" `
  "C:\Users\your-name\Projects\RPG-Maker-AI-Toolkit-Multi-Platform\dist\index.js"
```

执行 `codex mcp list` 和 `codex mcp get rpgmaker` 检查注册结果，然后在 Codex 中使用 `/mcp` 查看服务器。共享配置发生变化后，需要重启 ChatGPT 桌面 App 或 IDE 扩展。

> **传输方式说明：** `http://127.0.0.1:9001`（MZ/MV 默认值）和 TCP 端口 `9002`（VX Ace/VX/XP 默认值）是游戏运行时桥接，并非 MCP endpoint，不要把它们注册为 Streamable HTTP。ChatGPT Web 不读取本地 STDIO 配置；托管使用需要远程 MCP 插件或 [OpenAI Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)。并行启动 MZ/MV 实例时，应为每个实例配置不同的 `RPGMAKER_BRIDGE_PORT`。

## 连接 Claude Desktop

在 `claude_desktop_config.json` 中添加：

```json
{
  "mcpServers": {
    "rpgmaker": {
      "command": "node",
      "args": ["C:/path/to/RpgMakerMCP/dist/index.js"],
      "env": {
        "RPGMAKER_PROJECT_PATH": "C:/path/to/MyGame",
        "RPGMAKER_ENGINE": "mz"
      }
    }
  }
}
```

将示例路径替换为本机的工具目录和 RPG Maker 项目目录。Windows 路径可在 JSON 中使用正斜杠，或使用转义后的双反斜杠。

## 引擎兼容性

| 引擎 | 项目数据格式 | `RPGMAKER_ENGINE` | 运行时桥接 |
|---|---|---|---|
| RPG Maker MZ | JSON | `mz`（默认） | HTTP，默认端口 9001 |
| RPG Maker MV | JSON | `mv` | HTTP，默认端口 9001 |
| RPG Maker VX Ace | `.rvdata2`（Marshal） | `vxace` | TCP，端口 9002 |
| RPG Maker VX | `.rvdata`（Marshal） | `vx` | TCP，端口 9002 |
| RPG Maker XP | `.rxdata`（Marshal） | `xp` | TCP，端口 9002 |

## 项目结构

```text
src/
├── index.ts                   # 服务器入口与 MCP 工具注册
├── core/
│   ├── resolve-handler.ts     # 根据引擎选择处理器
│   ├── change-log.ts          # mcp-changes.json 审计日志
│   └── types/                 # Reader/Writer 公共接口
├── macro/
│   ├── schemas/               # 对 AI 暴露的宏工具 Schema
│   └── handlers/              # 宏工具分发器
├── handlers/                  # 内部处理器，不直接暴露给 AI
└── adapters/
    ├── mz/                    # MZ：JSON 读写、校验、HTTP 桥接
    ├── mv/                    # MV：扩展 MZ 适配器
    ├── vxace/                 # VX Ace：.rvdata2
    ├── vx/                    # VX：.rvdata
    ├── xp/                    # XP：.rxdata
    └── ruby-bridge/
        ├── bridge.rb          # Marshal 与 JSON 转换
        ├── game-bridge.rb     # 游戏内 TCP 服务器
        └── tcp-bridge.ts      # Node.js TCP 客户端
tests/                         # Vitest 测试
```

## 可用工具

大多数宏工具采用 `{ action, data }` 结构，其中 `data` 存放当前操作所需的字段。`runtime-control`、`runtime-inspect` 和 `manage-backups` 使用顶层字段。所有工具都返回 JSON。

成功写入时，服务器会先创建带时间戳的备份，再把操作追加到变更日志。

### `health-check`：服务器健康检查

不需要参数，用于确认 MCP 服务器能够响应。

### `runtime-control`：控制运行中的游戏

调用前需要先安装并启动对应引擎的运行时桥接。

| `action` | 关键字段 | 作用 |
|---|---|---|
| `set-switch` | `id`, `value` | 打开或关闭游戏开关 |
| `set-variable` | `id`, `value` | 设置游戏变量 |
| `teleport` | `map_id`, `x`, `y`, `direction?` | 将玩家传送到指定地图和坐标 |
| `save` | `slot?` | 保存到指定存档位，默认 98 |
| `load` | `slot?` | 从指定存档位读取，默认 98 |
| `modify-inventory` | `operations [{action,type,id?,amount}]` | 增减物品、武器、护甲或金钱 |
| `set-party-state` | `actor_id?`, `hp_percent?`, `mp_percent?`, `add_states?`, `remove_states?` | 修改角色或队伍的 HP、MP 和状态 |
| `call-common-event` | `event_id` | 触发公共事件 |
| `modify-actor` | `actor_id`, `operations` | 修改等级、经验、HP、MP 或 TP |
| `manage-party` | `party_action`, `actor_id` | 添加或移除队伍成员 |
| `control-weather` | `weather_type`, `power`, `duration?` | 修改天气效果 |
| `play-audio` | `audio_type`, `name?`, `volume?`, `pitch?`, `pan?` | 播放或停止音频 |
| `control-timer` | `timer_action`, `frames?` | 启动或停止倒计时 |
| `show-message` | `text`, `speaker?` | 在游戏消息窗口显示文字 |
| `execute-script` | `code`, `timeout?` | 在 MZ/MV 中执行 JavaScript，或在 Ruby 引擎中执行 Ruby |

### `runtime-inspect`：读取运行时状态

| `action` / `type` | 关键字段 | 返回内容 |
|---|---|---|
| `game-state` | 无 | 地图 ID、玩家坐标、队伍 HP/等级和金钱 |
| `switch` | `id` | 开关当前值与名称 |
| `variable` | `id` | 变量当前值与名称 |
| `inventory` | `category?` | 物品、武器和护甲及其数量 |
| `actor` | `actor_id` | 等级、HP、MP、TP、状态、装备和技能 |
| `party` | 无 | 当前队伍成员 |
| `map` | 无 | 地图尺寸、玩家位置和天气 |
| `battle` | 无 | 当前回合、敌人和队伍战斗状态 |
| `timer` | 无 | `{ working, seconds }` |

### `query-data`：读取项目数据

该工具只读访问项目数据，不执行写入。

| `action` | 关键字段 | 作用 |
|---|---|---|
| `list` | `data_type` | 按类型列出实体 ID 和名称 |
| `entity` | `entity_type`, `entity_id` | 读取单个实体的完整数据 |
| `map` | `map_id` | 读取地图元数据、事件和遭遇配置 |
| `maps` | 无 | 从 MapInfos 列出所有地图 |
| `resources` | `category?` | 按类别列出 `img/` 和 `audio/` 资源 |
| `system` | `section?` | 读取 System 数据的指定部分 |
| `animation` | `animation_id?` | 读取单个动画或列出全部动画 |
| `tileset` | `tileset_id?`, `include_flags?` | 读取图块组及可选标志数组 |
| `search` | `entity_type`, `query` | 按名称进行不区分大小写的子串搜索 |
| `summary` | 无 | 返回实体数量、地图名称和开关/变量总数 |

`data_type` 支持：`Actors`、`Classes`、`Skills`、`Items`、`Weapons`、`Armors`、`Enemies`、`Troops`、`States`、`Animations`、`Tilesets`、`Maps`、`CommonEvents`。

### `game-entity`：管理数据库实体

| `action` | 类型或关键字段 | 作用 |
|---|---|---|
| `create` | actor、item、weapon、armor、skill、class、state、enemy、troop、common-event、animation、tileset | 创建实体，`name` 必填 |
| `edit` | 同上，加对应实体 ID | 修改现有实体 |
| `delete` | `entity_type`, `entity_id`, `confirm: true` | 删除实体并保留原数组索引 |
| `duplicate` | `entity_type`, `entity_id`, `new_name` | 复制实体并指定新名称 |
| `generate` | `name`, `archetype` | 按职业原型生成完整角色 |
| `traits` | `entity_id`, `mode`, `traits` | 替换、追加或清空特性 |
| `effects` | `entity_id`, `mode`, `effects` | 管理技能或物品效果 |
| `class-learnings` | `class_id`, `mode`, `learnings` | 管理职业技能习得表 |
| `enemy-actions` | `enemy_id`, `mode`, `actions` | 管理敌人行动模式 |
| `drop-items` | `enemy_id`, `mode`, `drops` | 管理敌人掉落物 |
| `character` | `vehicle` 及可选图像、BGM、初始位置 | 修改载具配置 |
| `system` | 游戏标题、货币、初始队伍、起点等 | 修改全局系统设置 |

`generate` 支持 `warrior`、`mage`、`rogue`、`healer`、`paladin` 和 `ranger`。它会读取现有职业、武器与护甲数据，选择匹配项并返回角色、职业、装备和精灵信息。

### `game-map`：地图、事件与图块组

| `action` | 关键字段 | 作用 |
|---|---|---|
| `create` | `name`, `map_id?`, `width?`, `height?`, `tileset_id?`, `parent_id?` | 创建空地图 |
| `edit` | `map_id` 及地图属性 | 编辑地图属性 |
| `delete` | `map_id`, `confirm: true` | 删除地图文件并清空 MapInfos 条目 |
| `copy` | `source_map_id`, `new_name`, `parent_id?` | 复制地图、图块和事件 |
| `edit-info` | `map_id`, `name?`, `parent_id?`, `order?`, `expanded?` | 仅修改 MapInfos 元数据 |
| `read-tiles` | `map_id` 与可选区域、图层 | 读取指定区域图块 ID |
| `paint-tiles` | `map_id`, `tiles` | 原子性写入一组离散图块 |
| `fill` | `map_id`, `x`, `y`, `width`, `height`, `layer`, `tile_id` | 用单个图块填充矩形区域 |
| `paint-region` | `map_id`, `layer`, 区域与图块数据 | 填充或印制图块区域 |
| `create-event` | `map_id`, `event_name`, `x`, `y`, `event_type`, `pages` | 创建地图事件 |
| `edit-event` | `map_id`, `event_id` 及更新字段 | 修改地图事件 |
| `delete-event` | `map_id`, `event_id` | 清空事件槽位 |
| `edit-event-page` | `map_id`, `event_id`, `mode`, `page_index?`, `page?` | 添加、替换或移除事件页 |
| `edit-troop-events` | `troop_id`, `mode`, `pages` | 编辑敌群战斗事件页 |
| `create-tileset` | `name`, `mode?`, `tilesetNames?` | 创建图块组 |
| `edit-tileset` | `tileset_id`, `flag_overrides` | 修改通行性和地形标签 |
| `edit-tileset-properties` | `tileset_id` 及更新字段 | 修改图块组名称、模式和图像引用 |

图层 0–3 为图块层，4 为阴影标志，5 为区域 ID。事件指令使用 `{ type, data }` 格式，支持消息、选项、条件分支、循环、开关、变量、传送、脚本、战斗、公共事件、音频、图片和等待等 30 多种类型。

### `dialogue-tools`：对话与故事创作

| `action` | 关键字段 | 作用 |
|---|---|---|
| `add` | `dialogue_lines`, `event_name?` | 向事件添加简单对话 |
| `create-advanced` | `dialogue_name`, `dialogue_nodes` | 创建带选项、条件和动作的分支对话 |
| `generate-story` | `story_title`, `story_description`, `scenes` | 生成包含地图与事件的多场景故事 |
| `export` | `include_maps?`, `include_common_events?`, `map_ids?` | 将对话导出为结构化 JSON |
| `import` | `entries`, `confirm: true` | 将翻译或修改后的对话写回项目 |

导出结果会记录来源类型、来源 ID、事件 ID、页码、指令索引、说话者和文本行。导入时按这些字段匹配，且文本行数必须与原文一致。

### `battle-sim`：战斗模拟

| `action` | 关键字段 | 作用 |
|---|---|---|
| `encounter` | `troop_id`，或 `enemy_id` + `count`，以及可选 `actions` | 运行单场战斗并返回日志 |
| `suite` | `troop_id` 或 `enemy_id`, `runs`, `actions?` | 重复运行战斗并统计胜率、平均 HP 和伤害 |

### `project-tools`：项目维护与批量操作

| `action` | 关键字段 | 作用 |
|---|---|---|
| `validate` | `entity_types?`, `include_warnings?` | 执行校验并返回错误和警告 |
| `cleanup` | `entity_types?` | 只读检查实体数组中的空槽位 |
| `find-replace` | `find`, `replace`, `targets?`, `confirm: true` | 批量替换名称、备注和事件指令文本 |
| `batch-update` | `entity_type`, `entity_ids`, `updates`, `confirm: true` | 对多个实体应用相同更新 |
| `batch-create` | `entity_type`, `entities` | 原子性创建最多 50 个同类型实体 |
| `batch-delete` | `entity_type`, `entity_ids`, `confirm: true` | 一次清空最多 100 个实体槽位 |
| `history` | `limit?`, `entity_type?`, `action?`, `since?` | 查询审计日志 |

`find-replace` 的目标可选 `names`、`notes` 和 `event_commands`；默认检查全部三类。

### `plugin-manage`：插件与 Ruby 脚本管理

MZ 和 MV 使用插件：

| `action` | 关键字段 | 作用 |
|---|---|---|
| `create` | `plugin_name`, `description`, `author`, `version`, `code_type` | 从模板创建插件 |
| `create-advanced` | `plugin_name`, `template_type` | 使用专用模板创建插件 |
| `manage` | `action`, `plugin_name?` | 列出、启用、禁用或删除插件 |
| `edit-parameters` | `plugin_name`, `parameters` | 修改插件参数 |
| `reorder` | `plugin_name`, `position`, `relative_plugin?` | 调整插件加载顺序 |

VX Ace、VX 和 XP 使用 Ruby 脚本：

| `action` | 关键字段 | 作用 |
|---|---|---|
| `list-scripts` | 无 | 列出全部脚本 ID 与名称 |
| `read-script` | `id?` 或 `name?` | 读取脚本源码 |
| `create-script` | `name`, `source` | 追加脚本 |
| `edit-script` | `id`, `name?`, `source?` | 修改脚本名称或源码 |
| `delete-script` | `id`, `confirm: true` | 删除脚本 |

插件文件名在写入前会经过校验，禁止路径分隔符、Windows 保留名称及 `<>:"/\|?*` 等字符。

### `game-setup`：项目检查、桥接安装与启动

| `action` | 作用 |
|---|---|
| `health-check` | 返回服务器状态、当前引擎、项目路径和时间戳 |
| `setup-debug` | 安装当前引擎对应的运行时桥接插件或脚本 |
| `launch` | 启动 `RPGMAKER_EXECUTABLE_PATH` 指定的 RPG Maker 程序 |

在 MZ/MV 中，`setup-debug` 会写入并注册 `RPGMakerDebugger.js`；在 VX Ace/VX/XP 中，它会向脚本数据注入 `RpgMakerMCPBridge`。重复调用不会覆盖已有的桥接插件或脚本。

### `manage-backups`：备份管理

该工具直接使用顶层字段，不使用 `data`：

| 字段 | 作用 |
|---|---|
| `action` | `list`、`restore`、`delete` 或 `prune` |
| `filename?` | 按源文件筛选 |
| `backup_name?` | 指定备份文件 |
| `max_count?` | 将每个源文件的备份裁剪到指定数量 |

所有写入都会先在 `<项目目录>/backups/` 创建备份。Ruby 引擎会直接备份二进制 Marshal 文件。

### `batch-edit`：多步骤批处理入口

`batch-edit` 可在一次 MCP 调用中依次执行多个内部处理器。默认情况下，某一步失败不会阻止后续步骤；设置 `stop_on_error: true` 可在首次失败时停止。

```json
{
  "operations": [
    { "tool": "edit-actor", "input": { "actor_id": 1, "name": "Aria" } },
    { "tool": "edit-item", "input": { "name": "Mana Potion", "price": 150 } },
    { "tool": "set-switch", "input": { "id": 5, "value": true } }
  ],
  "stop_on_error": false
}
```

每次最多执行 50 个操作，且不允许嵌套调用 `batch-edit`。

## 配置运行时桥接

### MZ / MV：HTTP 桥接（默认端口 9001）

1. 调用 `game-setup`，设置 `action: "setup-debug"`，安装 `RPGMakerDebugger.js`。
2. 在 RPG Maker 插件管理器中启用该插件。
3. 运行游戏或按 F5；插件会每 500 毫秒轮询 MCP 服务器。

使用 `RPGMAKER_BRIDGE_HOST`、`RPGMAKER_BRIDGE_PORT` 和 `RPGMAKER_BRIDGE_ENABLED` 配置监听端。`game-setup` 生成插件时会写入同一 host/port。端口被占用时，仅运行时操作会禁用；STDIO MCP 服务和文件工具仍可继续使用。并行实例必须使用不同端口。

### VX Ace / VX / XP：TCP 桥接（端口 9002）

1. 调用 `game-setup`，设置 `action: "setup-debug"`，注入 `RpgMakerMCPBridge`。
2. 关闭并重新打开 RPG Maker 项目，使编辑器重新加载脚本数据。
3. 运行游戏；桥接脚本会在游戏进程内启动 TCP 服务器。

可以通过 `.env` 中的 `RUBY_BRIDGE_PORT` 修改默认端口。

典型运行时工作流：

```text
1. game-setup (setup-debug)             安装桥接，每个项目只需执行一次
2. game-setup (launch)                  启动游戏
3. runtime-inspect (game-state)         确认连接并读取初始状态
4. runtime-inspect (switch/variable)    读取开关与变量
5. runtime-control                      为测试场景配置状态
6. runtime-inspect (inventory)          检查队伍物品
7. runtime-control (modify-inventory)   添加测试物品或金钱
8. runtime-control (teleport)           跳转到待测区域
9. runtime-control (modify-actor)       配置角色等级和属性
10. battle-sim (encounter/suite)        运行战斗并分析结果
11. runtime-control (save/load)         保存和恢复复现状态
```

## 变更日志

每次成功写入都会向 `<项目目录>/mcp-changes.json` 追加记录。可通过 `project-tools` 查询：

```json
{ "action": "history", "data": { "action": "create", "limit": 20 } }
```

每条记录包含 `timestamp`、`tool`、`entityType`、`entityId`、`action` 和 `summary`。

## 使用示例

通常无需手写 JSON，只要向 AI 助手描述目标即可。查看 [EXAMPLES.md](EXAMPLES.md) 可了解每个宏工具的自然语言提示词和等价 JSON 调用示例；该文件当前提供英文和西班牙文说明。

## 测试

```bash
npm test                  # 单次运行全部测试
npm run test:watch        # 监听模式
npm run test:coverage     # 生成 v8 覆盖率报告
npx tsc --noEmit          # 仅执行类型检查
```

测试使用 Vitest，位于 `tests/`。覆盖率配置排除了服务器入口、Schema 配置和插件模板等文件。

## 常见问题

| 错误或现象 | 处理方法 |
|---|---|
| `RPGMAKER_PROJECT_PATH is not set` | 在 `.env` 中配置项目绝对路径 |
| `RPG Maker project path does not exist` | 检查路径是否存在；Windows 也可以使用正斜杠 |
| `RPG Maker data directory not found` | 确认项目根目录中包含 `data/` |
| `Invalid plugin filename` | 移除非法字符、路径分隔符或 Windows 保留名称 |
| `mapInfo is missing required fields` | 创建地图并显式提供 mapInfo 时传入全部必填字段 |
| `Game not connected`（MZ/MV） | 启用 `RPGMakerDebugger`，启动游戏并进入地图 |
| `Ruby bridge not available`（VX Ace/VX/XP） | 先执行 `setup-debug`，重新打开项目，再运行游戏并进入地图 |
| 运行时工具超时 | 游戏可能仍在标题画面，或桥接脚本尚未运行 |
| Ruby 桥接端口冲突 | 将 `RUBY_BRIDGE_PORT` 改为未占用端口 |
| 服务器无响应 | 按 `Ctrl+C` 停止，检查项目路径，然后重新运行 `npm run dev` |

## 贡献

欢迎提交 Issue 和 Pull Request。添加内部处理器时，请确保：

- 处理器捕获异常并返回 JSON 错误，不向 MCP 调用方抛出异常。
- 写入前在处理器边界完成校验。
- 所有成功写入都通过 Writer 创建备份。
- 所有成功写入都追加变更日志。
- 新处理器注册到内部 registry，并由现有宏工具路由；不要直接扩张外层工具列表。
- 为行为变更补充 Vitest 测试，并保持多引擎 Reader/Writer 接口兼容。

## 许可证

本项目采用 [MIT License](LICENSE)。
