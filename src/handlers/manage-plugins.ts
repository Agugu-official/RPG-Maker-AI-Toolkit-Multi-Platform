import * as fs from "fs";
import * as path from "path";
import type { HandlerContext } from "./types.js";

export async function handleManagePlugins(ctx: HandlerContext): Promise<string> {
  const { input, writer, projectPath, changeLog } = ctx;
  const action = input.action as string;
  const pluginName = (input.plugin_name as string | undefined)?.trim();

  try {
    if (action === "list") {
      const plugins = writer.listPlugins();
      const includeParameters = input.include_parameters !== false;
      const pluginsDir = path.join(projectPath, "js", "plugins");
      const pluginFiles = fs.existsSync(pluginsDir)
        ? fs.readdirSync(pluginsDir, { withFileTypes: true })
            .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".js"))
            .map((entry) => entry.name)
            .sort((a, b) => a.localeCompare(b))
        : [];
      const fileNames = new Set(pluginFiles.map((filename) => filename.replace(/\.js$/i, "")));
      const registeredNames = new Set(plugins.map((plugin) => plugin.name));
      const isSeparator = (name: string) => /^-+$/.test(name.trim());
      const actualPlugins = plugins.filter((plugin) => !isSeparator(plugin.name));
      const listedPlugins = plugins.map((plugin, index) => {
        const base = {
          name: plugin.name,
          status: plugin.status,
          description: plugin.description,
          index,
          file_exists: fileNames.has(plugin.name),
          is_separator: isSeparator(plugin.name),
        };
        return includeParameters ? { ...base, parameters: plugin.parameters } : base;
      });
      const missingFiles = actualPlugins
        .filter((plugin) => !fileNames.has(plugin.name))
        .map((plugin) => `${plugin.name}.js`);
      const unregisteredFiles = pluginFiles.filter(
        (filename) => !registeredNames.has(filename.replace(/\.js$/i, "")),
      );

      return JSON.stringify({
        success: true,
        count: plugins.length,
        plugin_count: actualPlugins.length,
        separator_count: plugins.length - actualPlugins.length,
        enabled_count: actualPlugins.filter((plugin) => plugin.status).length,
        disabled_count: actualPlugins.filter((plugin) => !plugin.status).length,
        file_count: pluginFiles.length,
        plugins: listedPlugins,
        missing_files: missingFiles,
        unregistered_files: unregisteredFiles,
      });
    }

    if (!pluginName) {
      return JSON.stringify({ error: "plugin_name is required for enable, disable, and delete actions" });
    }

    if (action === "enable" || action === "disable") {
      const plugins = writer.listPlugins();
      if (!plugins.find((p) => p.name === pluginName)) {
        return JSON.stringify({ error: `Plugin '${pluginName}' not found in plugins.js` });
      }
      writer.updatePluginsRegistry({ name: pluginName, status: action === "enable" });
      changeLog.append({
        tool: "manage-plugins",
        entityType: "Plugin",
        action: "update",
        summary: `Plugin '${pluginName}' ${action}d`,
      });
      return JSON.stringify({ success: true, plugin_name: pluginName, status: action === "enable" });
    }

    if (action === "delete") {
      const plugins = writer.listPlugins();
      const exists = plugins.find((p) => p.name === pluginName);

      // Remove from registry regardless of whether the file exists
      if (exists) {
        writer.removePluginFromRegistry(pluginName);
      }

      // Delete the .js file if present
      const pluginFilePath = path.join(projectPath, "js", "plugins", `${pluginName}.js`);
      let fileDeleted = false;
      if (fs.existsSync(pluginFilePath)) {
        fs.unlinkSync(pluginFilePath);
        fileDeleted = true;
      }

      if (!exists && !fileDeleted) {
        return JSON.stringify({ error: `Plugin '${pluginName}' not found in registry or plugins folder` });
      }

      changeLog.append({
        tool: "manage-plugins",
        entityType: "Plugin",
        action: "delete",
        summary: `Plugin '${pluginName}' deleted (registry: ${exists ? "yes" : "no"}, file: ${fileDeleted ? "yes" : "no"})`,
      });

      return JSON.stringify({ success: true, plugin_name: pluginName, removed_from_registry: !!exists, file_deleted: fileDeleted });
    }

    return JSON.stringify({ error: `Unknown action '${action}'. Use list, enable, disable, or delete.` });
  } catch (error) {
    return JSON.stringify({ error: (error as Error).message });
  }
}
