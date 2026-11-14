---
translations:
  zh-CN: README.zh-CN.md
---
# Ollama Cloud Tools

Adds Ollama Cloud web search, web fetch, and Clef System One decisions to new-api. Each endpoint returns the vendor's synchronous JSON response. This is an API integration; a client or agent controls any search/tool loop.

## Channel setup

1. Use a new-api build implementing the current plugin API v1 task native routes, immediate completion, `usageProfiles`, and `json-order@1`.
2. Upload `plugin.js` in the root administrator's plugin page and enable version `1.0.4`.
3. Create a **Task Plugin** channel (type 61), select **xuu1998_ollama_cloud_tools**, and explicitly set the base URL to `https://ollama.com`. A trusted HTTPS reverse proxy with an optional path prefix is also supported.
4. Put an **Ollama API key**, without `Bearer `, in the channel key field. Clients authenticate to the gateway with a **new-api token**, not the Ollama key.
5. Add the models below, enable the channel in the intended group, and configure pricing. An allowed-model list on the client token must include the corresponding service model.

Do not bind this as a request-processing instance. No local Ollama daemon or model download is needed. Clef Cloud requires a paid Ollama plan or usage credits.

### Migrating from 1.0.3 or earlier

The marketplace identity is `xuu1998_ollama_cloud_tools`. The previous `ollama-cloud-tools` key is a separate plugin identity in the host; uploading this version does not automatically replace existing channel bindings.

Copy any provider-specific model prices to the new identity before enabling requests. Install the new plugin, reselect it on Task Plugin channels and New API upstream-plugin lists, and update each gateway in a chain. Disable the old identity after migration.

Clients using plugin-prefixed endpoints must switch to `/xuu1998_ollama_cloud_tools/...`. Unprefixed native paths such as `/v1/systemone` remain available.

The manifest uses the built-in `Ollama` icon, so uploading only `plugin.js` displays the brand icon. The optional `icon.svg` supports light and dark themes and can be selected in the upload form's icon field. Artwork is from LobeHub Icons; see `LICENSE.icon.txt`.

### Proxying an upstream new-api gateway

Version `1.0.2` declares `new_api` upstream support and appears in a **New API** channel's **upstream task plugins** selector. The list filters locally installed plugin declarations; it does not discover remote installations.

1. Install and enable the plugin on both gateways.
2. On the upstream gateway, create the direct Task Plugin channel using an Ollama key.
3. On the downstream gateway, create a **New API** channel (type 60), select `xuu1998_ollama_cloud_tools` under upstream task plugins, and use the upstream gateway's **new-api token** as the channel key.
4. Set the base URL to the upstream gateway root, including any deployment prefix, without appending `/v1` or `/xuu1998_ollama_cloud_tools`. Configure the appropriate groups, token permissions and pricing on both gateways.

Gateway requests add the `/xuu1998_ollama_cloud_tools` prefix and preserve the mapped Clef model name. Only the layer directly accessing Ollama removes cloud-routing labels while preserving the explicit model size. Gateway base URLs accept HTTP(S); direct Ollama access still requires HTTPS.

## Models and endpoints

| Gateway model | Client endpoint | Purpose |
| --- | --- | --- |
| `ollama-web-search` | `POST /api/web_search` | Search with `query` and optional `max_results` (default 5, range 1–10) |
| `ollama-web-fetch` | `POST /api/web_fetch` | Read a public page using `url` |
| `clef:27b` | `POST /v1/systemone` | Classify, estimate yes/no probabilities, and score criteria; recommended explicit model |
| `clef`, `clef:cloud`, `clef:27b-cloud` | `POST /v1/systemone` | Compatible Clef names and cloud-routing labels |

Use `/xuu1998_ollama_cloud_tools/api/web_search`, `/xuu1998_ollama_cloud_tools/api/web_fetch`, and `/xuu1998_ollama_cloud_tools/v1/systemone` to select this plugin explicitly. The host publishes these prefixed aliases. Search and fetch infer their gateway model, so their request bodies do not need a `model`. You may include the matching service model explicitly for compatibility.

Use `clef:27b` in your channel and requests to select the explicit model size; direct cloud calls retain this full name. For compatibility, `clef` and `clef:cloud` are sent as `clef`, while `clef:27b-cloud` is sent as `clef:27b`. Gateway calls preserve the mapped name so the upstream can route its published alias. Leave model mappings empty or map only between supported Clef names. This plugin still accesses cloud services and does not install local models or claim cloud availability for Nimble, Tev, or Clef Flash.

## Billing

Pricing is configured by the administrator, never calculated in the plugin.

- Search/fetch report `requests: 1` on success.
- Clef reports `requests`, `input_tokens`, and `output_tokens`. The two token counts come from Ollama's `usage`; `output_tokens: 0` is preserved.
- Before a decision call, the plugin reserves **65,536 input tokens per question**, with zero output tokens. This is a conservative reservation because shared context can be counted again for separate scoring. On immediate completion the host settles using actual usage. Multi-question calls can require considerably more gateway balance than their final charge.
- Configure model/provider-specific task expressions. A per-call expression can use `u("requests")`; token pricing can use `u("input_tokens") * YOUR_USD_PER_MILLION / 1000000`. `YOUR_USD_PER_MILLION` is explanatory notation: replace it with an actual number before saving. Task expressions return USD directly.
- Ollama currently documents cloud decision billing per input token. Leave output-token pricing at zero if following that vendor policy. The plugin still reports output usage for observability.
- Upstream HTTP failures are handled by the host; no successful usage is reported for an immediate failed task.

## Examples

Send these bodies with `Authorization: Bearer <NEW_API_TOKEN>` and `Content-Type: application/json` to your gateway.

Search, `POST /xuu1998_ollama_cloud_tools/api/web_search`:

```json
{"query":"Ollama System One cloud documentation","max_results":3}
```

Read a page, `POST /xuu1998_ollama_cloud_tools/api/web_fetch`:

```json
{"url":"https://ollama.com/"}
```

Make decisions, `POST /xuu1998_ollama_cloud_tools/v1/systemone`:

```json
{
  "model": "clef:27b",
  "state": {"ticket": "Production checkout returns 500 for every customer."},
  "questions": {
    "urgent": {
      "type": "noul",
      "instructions": "Does this require immediate attention?"
    },
    "team": {
      "type": "choice",
      "instructions": "Which team should handle this?",
      "criteria": {"engineering": "Software errors", "billing": "Refund questions"}
    },
    "severity": {
      "type": "score",
      "instructions": "How severe is the problem?",
      "criteria": ["Minor", "Moderate", "Critical"]
    }
  }
}
```

`noul` is the probability of true, not a boolean. `score` is a probability-weighted value on the zero-based scale. Confidence is not a calibrated probability that the decision is correct.

## Limits

- Synchronous JSON only. No chat compatibility, streaming, generation tools, video input, automatic research loop, or decision-driven channel routing.
- `state` and question `instructions` accept a nonempty string, JSON object, or array.
- 1–64 questions, with names of 1–100 ASCII letters, digits, `_`, `.` or `-`. Choice has 2–26 options; score has 2–10 ordered levels; noul accepts optional `false`/`true` descriptions.
- At most four raw base64 images, 4 MiB decoded per image and 8 MiB combined; no image URL or data URL. The request body must fit within 13 MiB. Ollama checks supported image formats, its 16-megapixel limit, and the 65,536-token model context. The gateway may impose a smaller body limit.
- Web fetch accepts HTTP(S) public DNS names and canonical IPv4 literals; IPv6 literals, credentials in URLs, and obvious private addresses are rejected. DNS resolution and redirected-page access remain Ollama's responsibility.
- Unsupported fields are rejected rather than silently discarded.
- Native routes use `retainResult: false`: the result is returned once and its body is not retained for later task retrieval. The host still records task/accounting metadata; normal request logging policies still apply. These synchronous services are not polled.
- Non-retained native responses use the host's download-size limit, avoiding the default 1 MiB persisted-result cap. The generic `/v1/tasks/:pluginKey` endpoint still has that default cap; use the native routes above for these services.

## Development and verification

No npm installation is required. Node.js 22+ is enough for the contract tests:

```sh
npm test
npm run fixtures
new-api plugin lint plugin.js
new-api plugin test plugin.js --fixture fixtures/golden.json
```

If a new-api executable is unavailable, use the source checkout without changing it:

```powershell
.\tools\check-host.ps1 -NewApiPath '..\new-api'
```

That script compiles a small checker into this plugin's ignored `tools/plugincheck.exe` and uses the actual host registry and JavaScript engine. `-GoCommand` selects a particular Go executable if needed.

Validate marketplace documents with the host's actual Markdown parsers:

```sh
node tools/check-marketplace.mjs --new-api ../new-api --owner xuu1998
```

The host's `web/node_modules` must be installed. This verifies the owner namespace, version consistency, and the English/Chinese README and CHANGELOG files.

After installation, run explicit live checks through the gateway:

```powershell
$env:NEW_API_BASE_URL = 'https://your-gateway.example'
$env:NEW_API_KEY = '<NEW_API_TOKEN>'
node tools/smoke.mjs --all
```

This makes three real service calls and consumes account usage. Individual flags are `--search`, `--fetch`, and `--decision`. Keys are read from the environment and are not printed. No real account credentials are bundled.

## Sources

Contract checked on 2026-11-14:

- [Web search and web fetch](https://docs.ollama.com/capabilities/web-search)
- [Cloud decisions](https://docs.ollama.com/capabilities/decision)
- [System One API](https://docs.ollama.com/api/systemone)
- [Clef model](https://ollama.com/library/clef)

## Marketplace submission

Submit repository path `xuu1998/ollama-cloud-tools` and root version tag `v1.0.4`. Each release tag places `plugin.js`, README and CHANGELOG files together, and its version matches `meta.version`.
