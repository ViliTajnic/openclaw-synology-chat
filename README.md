# OpenClaw — Synology Chat Plugin

Connects your Synology NAS Chat to [OpenClaw](https://openclaw.ai) so you can message the AI agent directly from the Synology Chat app.

## How it works

Synology Chat sends an outgoing webhook (HTTP POST) to the OpenClaw gateway whenever you send a message to the bot. The plugin validates the request, dispatches it to the agent, and sends the reply back via the Synology Chat chatbot incoming webhook API.

## Prerequisites

- OpenClaw gateway running and reachable from your NAS (same LAN or via Tailscale)
- Synology Chat installed on your NAS (DSM 7+)
- A Synology Chat bot created in the admin console

## Installation

### From npm (once published)

```
openclaw plugin install @openclaw/synology-chat
```

### From local path (monorepo / development)

1. Build or symlink the plugin:

```bash
mkdir -p ~/.openclaw/plugins
cp -r extensions/synology-chat ~/.openclaw/plugins/synology-chat
```

2. Add to `~/.openclaw/openclaw.json`:

```json
{
  "plugins": {
    "load": {
      "paths": ["~/.openclaw/plugins/synology-chat"]
    },
    "entries": {
      "synology-chat": { "enabled": true }
    }
  }
}
```

3. Restart the gateway:

```
openclaw gateway restart
```

## Synology Chat setup

### 1. Create a bot

In Synology Chat: **Main Menu → Integration → Bot → Create**

- Give the bot a name (e.g. _OpenClaw_)
- Copy the **Outgoing webhook token** — you'll need it as `token` in the config
- Copy the **Incoming webhook URL** — you'll need it as `incomingUrl` in the config

### 2. Configure the outgoing webhook

Set the outgoing webhook URL to your OpenClaw gateway address + the webhook path:

```
http://<your-mac-ip>:18789/channels/synology-chat/webhook
```

Example: `http://192.168.x.x:18789/channels/synology-chat/webhook`

> The gateway must be reachable from the NAS. Set `gateway.bind` to `"lan"` (not `"loopback"`) in `openclaw.json`.

## Configuration

Add a `channels.synology-chat` section to `~/.openclaw/openclaw.json`:

```json
{
  "channels": {
    "synology-chat": {
      "enabled": true,
      "token": "<outgoing-webhook-token>",
      "incomingUrl": "<incoming-webhook-url>",
      "nasHost": "192.168.x.x",
      "webhookPath": "/channels/synology-chat/webhook",
      "dmPolicy": "allowlist",
      "allowedUserIds": ["1", "2"],
      "botName": "OpenClaw",
      "allowInsecureSsl": false,
      "rateLimitPerMinute": 30
    }
  }
}
```

### Config reference

| Key                  | Default             | Description                                                            |
| -------------------- | ------------------- | ---------------------------------------------------------------------- |
| `enabled`            | `true`              | Enable or disable the channel                                          |
| `token`              | —                   | Outgoing webhook token from Synology Chat bot settings                 |
| `incomingUrl`        | —                   | Incoming webhook URL from Synology Chat bot settings                   |
| `nasHost`            | `localhost`         | NAS hostname or IP (informational, used for logging)                   |
| `webhookPath`        | `/webhook/synology` | URL path the gateway listens on for incoming webhooks                  |
| `dmPolicy`           | `allowlist`         | Access policy: `allowlist`, `open`, or `disabled`                      |
| `allowedUserIds`     | `[]`                | Numeric Synology Chat user IDs allowed when `dmPolicy` is `allowlist`  |
| `botName`            | `OpenClaw`          | Bot display name (used in agent context)                               |
| `allowInsecureSsl`   | `false`             | Skip SSL verification when calling the NAS (use for self-signed certs) |
| `rateLimitPerMinute` | `30`                | Max messages per user per minute                                       |

### Environment variable fallbacks

For the default account, config values can also be set via environment variables:

| Variable                     | Config key                         |
| ---------------------------- | ---------------------------------- |
| `SYNOLOGY_CHAT_TOKEN`        | `token`                            |
| `SYNOLOGY_CHAT_INCOMING_URL` | `incomingUrl`                      |
| `SYNOLOGY_NAS_HOST`          | `nasHost`                          |
| `SYNOLOGY_ALLOWED_USER_IDS`  | `allowedUserIds` (comma-separated) |
| `SYNOLOGY_RATE_LIMIT`        | `rateLimitPerMinute`               |
| `OPENCLAW_BOT_NAME`          | `botName`                          |

### DM policy

| Value       | Behaviour                                               |
| ----------- | ------------------------------------------------------- |
| `allowlist` | Only users listed in `allowedUserIds` can send messages |
| `open`      | Any Synology Chat user can message the bot              |
| `disabled`  | Reject all incoming messages                            |

> For first-time setup, set `dmPolicy: "open"` and send a message to find your user ID in the gateway logs, then add it to `allowedUserIds` and switch back to `"allowlist"`.

## Testing

Use `curl` to simulate an incoming webhook (replace the token and URL):

```bash
curl -X POST http://localhost:18789/channels/synology-chat/webhook \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode 'token=<your-token>' \
  --data-urlencode 'user_id=1' \
  --data-urlencode 'username=testuser' \
  --data-urlencode 'text=Hello agent'
```

A `200` response means the plugin received the message. The agent reply will be sent to Synology Chat via `incomingUrl`.

## Known limitations

- **No file access**: When a user attaches a file in Synology Chat, the webhook only delivers the filename — no download URL. The agent is informed of the attachment but cannot read the file content. Use a channel with file support (e.g. Google Chat, Telegram) if you need the agent to process documents.

- **Text only**: The bot can only send plain text replies. No markdown, bold, italic, code blocks, buttons, or cards.

- **Link formatting**: Use `<URL|label>` syntax for clickable links, e.g. `<https://example.com|Click here>`. Standard markdown links are not rendered.

- **No message editing or deletion**: Synology Chat does not support editing or deleting messages sent by bots.

- **No threads or reactions**: The plugin operates in direct-message mode only. Group channels, threads, and reactions are not supported.

- **2000 character limit**: Keep responses under 2000 characters for best readability. Longer messages may be truncated by the client.

- **Single-account only**: The current implementation supports one configured account (the `default` account). Multi-account support is not yet implemented.

- **Self-signed certificates**: If your NAS uses a self-signed SSL certificate, set `allowInsecureSsl: true`. This disables certificate verification for outbound requests to the NAS — only use it on a trusted local network.
