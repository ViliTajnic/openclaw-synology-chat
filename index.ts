import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";
import { resolveAccount } from "./src/accounts.js";
import { createSynologyChatPlugin, getWebhookDelegate, setWebhookDelegate } from "./src/channel.js";
import { setSynologyRuntime } from "./src/runtime.js";

const plugin = {
  id: "synology-chat",
  name: "Synology Chat",
  description: "Native Synology Chat channel plugin for OpenClaw",
  configSchema: emptyPluginConfigSchema(),
  register(api: OpenClawPluginApi) {
    setSynologyRuntime(api.runtime);

    // Register the HTTP route at plugin load time using api.registerHttpRoute(),
    // which writes into the registry object captured by the gateway HTTP handler.
    // (registerPluginHttpRoute() uses requireActivePluginRegistry() which returns
    // a later-replaced registry object, causing 404.)
    const webhookPath = resolveAccount(api.config).webhookPath;
    api.registerHttpRoute({
      path: webhookPath,
      auth: "plugin",
      replaceExisting: true,
      handler: (req, res) => getWebhookDelegate()?.(req, res),
    });

    api.registerChannel({ plugin: createSynologyChatPlugin() });
  },
};

export { setWebhookDelegate };
export default plugin;
