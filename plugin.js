// API v1: synchronous JSON services, executed over HTTP by the Go host.
const CLEF_MODELS = ["clef:27b", "clef", "clef:cloud", "clef:27b-cloud"];

// Community catalogs read this object without executing JavaScript.
// Keep the entire manifest literal, including nested usage profiles.
export const meta = {
  apiVersion: 1,
  key: "xuu1998_ollama_cloud_tools",
  name: { en: "Ollama Cloud Tools", zh: "Ollama 云搜索与决策" },
  icon: "Ollama",
  description: {
    en: "Ollama Cloud web search, web fetch, and Clef System One decisions over native JSON APIs",
    zh: "通过原生 JSON 接口调用 Ollama 云搜索、网页读取和 Clef 云端决策",
  },
  version: "1.0.5",
  author: { name: "xuu1998" },
  website: "https://docs.ollama.com/capabilities/decision",
  baseUrl: "https://ollama.com",
  keyHint: {
    en: "Ollama API key for direct access, or the upstream new-api token for gateway access; no Bearer prefix",
    zh: "直连填写 Ollama API key；转接网关填写上游 new-api 令牌；均不包含 Bearer 前缀",
  },
  requiredCapabilities: ["json-order@1"],
  models: ["ollama-web-search", "ollama-web-fetch", "clef:27b", "clef", "clef:cloud", "clef:27b-cloud"],
  fetchMode: "per_task",
  upstreams: ["vendor", "new_api"],
  auth: "api_key",
  usageSchema: {
    requests: {
      type: "number", unit: "count", unitLabel: { en: "request", zh: "次" },
      description: { en: "Completed API calls", zh: "已完成的 API 调用次数" },
    },
  },
  usageExamples: [{ label: "1 request", facts: { requests: 1 } }],
  usageProfiles: [{
    models: ["clef:27b", "clef", "clef:cloud", "clef:27b-cloud"],
    schema: {
      requests: {
        type: "number", unit: "count", unitLabel: { en: "request", zh: "次" },
        description: { en: "Completed API calls", zh: "已完成的 API 调用次数" },
      },
      input_tokens: {
        type: "number", unit: "token",
        description: { en: "Input tokens reported by Ollama", zh: "Ollama 返回的实际输入 token" },
      },
      output_tokens: {
        type: "number", unit: "token",
        description: { en: "Internal scoring tokens reported by Ollama", zh: "Ollama 返回的内部评分输出 token" },
      },
    },
    examples: [{ label: "1 decision", facts: { requests: 1, input_tokens: 174, output_tokens: 0 } }],
  }],
  routes: [
    { method: "POST", path: "/api/web_search", type: "submit", decode: "search", render: "result", retainResult: false },
    { method: "POST", path: "/api/web_fetch", type: "submit", decode: "fetch", render: "result", retainResult: false },
    { method: "POST", path: "/v1/systemone", type: "submit", decode: "decision", render: "result", retainResult: false },
  ],
};

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function requireObject(value, field) {
  if (!object(value)) throw new Error(field + " must be a JSON object");
  return value;
}

function fields(value, allowed, name) {
  requireObject(value, name);
  for (const key of Object.keys(value)) {
    if (allowed.indexOf(key) < 0) throw new Error(name + ": unsupported field " + key);
  }
}

function text(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(name + " must be a nonempty string");
  return value;
}

function content(value, name) {
  if (typeof value === "string") return text(value, name);
  if (!object(value) && !Array.isArray(value)) throw new Error(name + " must be text, an object or an array");
  return value;
}

function integer(value, min, max, name) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(name + " must be an integer from " + min + " to " + max);
  }
  return value;
}

function clone(value) {
  // Unlike utils.json.clone, this does not impose a 1 MiB image-body limit.
  return JSON.parse(JSON.stringify(value));
}

function bodyFrom(ctx) {
  if (!ctx.body || ctx.body.kind !== "json") throw new Error("JSON body required");
  return requireObject(ctx.body.value, "body");
}

function utf8Bytes(value) {
  let bytes = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value.charCodeAt(i);
    if (c < 0x80) bytes++;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < value.length &&
      value.charCodeAt(i + 1) >= 0xdc00 && value.charCodeAt(i + 1) <= 0xdfff) {
      bytes += 4;
      i++;
    } else bytes += 3;
  }
  return bytes;
}

function checkBodySize(value) {
  if (utf8Bytes(JSON.stringify(value)) > 13 * 1024 * 1024) {
    throw new Error("Cloud request body must not exceed 13 MiB");
  }
}

function webURL(value) {
  let url = text(value, "url").trim();
  if (!/^[a-z][a-z0-9+.-]*:/i.test(url)) url = "https://" + url;
  // URL is not a global in the plugin sandbox. Accept an unambiguous DNS
  // authority or dotted IPv4; Ollama additionally resolves and validates it.
  const match = /^https?:\/\/([^/?#]+)([/?#].*)?$/i.exec(url);
  if (!match || /[@\\\s]/.test(url)) throw new Error("url must be an HTTP(S) URL without credentials");
  const authority = match[1];
  if (authority.charAt(0) === "[") throw new Error("url must use a public DNS name or IPv4 address");
  const hostPort = /^([a-z0-9.-]+)(?::([0-9]{1,5}))?$/i.exec(authority);
  if (!hostPort || (hostPort[2] && (+hostPort[2] < 1 || +hostPort[2] > 65535))) throw new Error("url has an invalid host");
  const host = hostPort[1].toLowerCase().replace(/\.$/, "");
  if (host.indexOf(".") < 0 || /(^|\.)localhost$|\.local$|\.internal$/.test(host)) {
    throw new Error("url must use a public host");
  }
  if (/^[0-9.]+$/.test(host)) {
    const octets = host.split(".");
    if (octets.length !== 4 || octets.some(function (n) { return !/^(0|[1-9][0-9]{0,2})$/.test(n) || +n > 255; })) {
      throw new Error("url must use a public IPv4 address");
    }
    const a = +octets[0], b = +octets[1];
    if (a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19))) {
      throw new Error("url must use a public IPv4 address");
    }
  } else if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/i.test(host)) {
    throw new Error("url has an invalid DNS name");
  }
  return url;
}

function searchBody(value) {
  fields(value, ["query", "max_results", "model"], "search");
  if (value.model !== undefined && value.model !== "ollama-web-search") throw new Error("search model must be ollama-web-search");
  const result = {
    query: text(value.query, "query"),
    max_results: value.max_results === undefined ? 5 : integer(value.max_results, 1, 10, "max_results"),
  };
  checkBodySize(result);
  return result;
}

function fetchBody(value) {
  fields(value, ["url", "model"], "fetch");
  if (value.model !== undefined && value.model !== "ollama-web-fetch") throw new Error("fetch model must be ollama-web-fetch");
  return { url: webURL(value.url) };
}

function cloudModel(value) {
  if (CLEF_MODELS.indexOf(value) < 0) throw new Error("Unsupported cloud decision model; use clef:27b or a supported Clef alias");
  return value === "clef:27b" || value === "clef:27b-cloud" ? "clef:27b" : "clef";
}

function checkQuestion(q, name) {
  fields(q, ["type", "instructions", "criteria"], "question " + name);
  content(q.instructions, "instructions");
  const criteria = q.criteria;
  if (q.type === "choice") {
    requireObject(criteria, "choice criteria");
    const keys = Object.keys(criteria);
    integer(keys.length, 2, 26, "choice criteria count");
    for (const key of keys) {
      text(key, "criteria key");
      if (criteria[key] !== null && typeof criteria[key] !== "string") throw new Error("choice criteria must be strings or null");
    }
  } else if (q.type === "noul") {
    if (criteria !== undefined) {
      fields(criteria, ["false", "true"], "noul criteria");
      for (const key of Object.keys(criteria)) {
        if (typeof criteria[key] !== "string") throw new Error("noul criteria must be strings");
      }
    }
  } else if (q.type === "score") {
    if (!Array.isArray(criteria)) throw new Error("score criteria must be an ordered array");
    integer(criteria.length, 2, 10, "score criteria count");
    for (const level of criteria) {
      if (typeof level !== "string") throw new Error("score criteria must contain strings");
    }
  } else throw new Error("Unsupported question type");
}

function checkImages(images) {
  if (!Array.isArray(images)) throw new Error("images must be an array");
  integer(images.length, 0, 4, "images count");
  let total = 0;
  for (const image of images) {
    if (typeof image !== "string" || !image.length) throw new Error("images must contain raw base64 strings");
    if (image.length > 5592408) throw new Error("Each image must not exceed 4 MiB");
    const padding = image.endsWith("==") ? 2 : image.endsWith("=") ? 1 : 0;
    if (image.length % 4 !== 0 || /[^A-Za-z0-9+/=]/.test(image) ||
      (image.indexOf("=") !== -1 && image.indexOf("=") !== image.length - padding)) {
      throw new Error("images must contain raw base64, without URLs or data prefixes");
    }
    const bytes = image.length / 4 * 3 - padding;
    if (bytes > 4 * 1024 * 1024) throw new Error("Each image must not exceed 4 MiB");
    total += bytes;
  }
  if (total > 8 * 1024 * 1024) throw new Error("Combined images must not exceed 8 MiB");
}

function decisionBody(value) {
  fields(value, ["model", "state", "questions", "images", "keep_alive"], "decision");
  const model = cloudModel(value.model);
  content(value.state, "state");
  requireObject(value.questions, "questions");
  const names = Object.keys(value.questions);
  integer(names.length, 1, 64, "questions count");
  for (const name of names) {
    if (!/^[A-Za-z0-9_.-]{1,100}$/.test(name)) throw new Error("question name must be 1–100 ASCII letters, digits, _, . or -");
    checkQuestion(value.questions[name], name);
  }
  if (value.images !== undefined) checkImages(value.images);
  if (value.keep_alive !== undefined && typeof value.keep_alive !== "string" &&
    (typeof value.keep_alive !== "number" || !Number.isFinite(value.keep_alive))) {
    throw new Error("keep_alive must be a duration string or finite number");
  }
  checkBodySize(value);
  const result = clone(value);
  result.model = model;
  return result;
}

function actionOf(ctx) {
  if (ctx.action) {
    if (["search", "fetch", "decision"].indexOf(ctx.action) < 0) throw new Error("Unsupported action");
    return ctx.action;
  }
  if (ctx.model === "ollama-web-search") return "search";
  if (ctx.model === "ollama-web-fetch") return "fetch";
  if (CLEF_MODELS.indexOf(ctx.model) >= 0) return "decision";
  throw new Error("Unsupported action or model");
}

function viaGateway(ctx) {
  return Boolean(ctx.upstream && ctx.upstream.kind === "new_api");
}

function prepared(ctx) {
  const action = actionOf(ctx);
  const model = ctx.upstreamModel || ctx.model;
  if (action === "decision") {
    const body = decisionBody(ctx.requestBody);
    const upstreamName = cloudModel(model);
    body.model = viaGateway(ctx) ? model : upstreamName;
    return { action: action, path: "/v1/systemone", body: body };
  }
  if (model !== (action === "search" ? "ollama-web-search" : "ollama-web-fetch")) {
    throw new Error("Search/fetch model mapping must keep the service model");
  }
  return action === "search" ?
    { action: action, path: "/api/web_search", body: searchBody(ctx.requestBody) } :
    { action: action, path: "/api/web_fetch", body: fetchBody(ctx.requestBody) };
}

export const native = {
  search: function (ctx) {
    return { kind: "submit", model: "ollama-web-search", action: "search", requestBody: searchBody(bodyFrom(ctx)) };
  },
  fetch: function (ctx) {
    return { kind: "submit", model: "ollama-web-fetch", action: "fetch", requestBody: fetchBody(bodyFrom(ctx)) };
  },
  decision: function (ctx) {
    const input = bodyFrom(ctx);
    const body = decisionBody(input);
    return { kind: "submit", model: input.model, action: "decision", requestBody: body };
  },
  result: function (ctx, task) {
    if (task.status !== "SUCCESS") throw new Error("Ollama synchronous request did not complete successfully");
    return task.data;
  },
  error: function (ctx, error) {
    return { error: error.message || "Ollama Cloud request failed" };
  },
};

export function buildSubmitRequest(ctx) {
  const request = prepared(ctx);
  const gateway = viaGateway(ctx);
  const base = text(ctx.baseUrl, "baseUrl").replace(/\/+$/, "");
  if (!/^https?:\/\/[a-z0-9.-]+(?::[0-9]{1,5})?(?:\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]*)?$/i.test(base) ||
    /[?#\\]/.test(base) || (!gateway && !/^https:\/\//i.test(base))) {
    throw new Error("baseUrl must be HTTPS for Ollama, or HTTP(S) for a New API gateway, without credentials, query or fragment");
  }
  const key = text(ctx.apiKey, "Channel API key").trim();
  if (/[\r\n]/.test(key)) throw new Error("Invalid channel API key");
  return {
    url: base + (gateway ? "/xuu1998_ollama_cloud_tools" : "") + request.path,
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: "Bearer " + key },
    body: request.body,
  };
}

function tokenUsage(data) {
  requireObject(data.usage, "usage");
  return {
    requests: 1,
    input_tokens: integer(data.usage.input_tokens, 0, 2147483647, "input_tokens"),
    output_tokens: integer(data.usage.output_tokens, 0, 2147483647, "output_tokens"),
  };
}

export function parseSubmitResponse(ctx, response) {
  if (!response || response.statusCode < 200 || response.statusCode >= 300) throw new Error("Ollama HTTP error");
  const data = requireObject(response.body, "Ollama response");
  if (data.error !== undefined) throw new Error("Ollama returned an error");
  const action = actionOf(ctx);
  if (action === "search" && !Array.isArray(data.results)) throw new Error("Ollama response is missing results");
  if (action === "fetch" && (typeof data.title !== "string" || typeof data.content !== "string" || !Array.isArray(data.links))) {
    throw new Error("Ollama response is missing title, content or links");
  }
  if (action === "decision") {
    tokenUsage(data);
    requireObject(data.answers, "answers");
    for (const name of Object.keys(ctx.requestBody.questions)) {
      if (!Object.prototype.hasOwnProperty.call(data.answers, name)) throw new Error("Ollama response is missing an answer");
    }
  }
  const id = "sync-" + text(ctx.publicTaskId, "publicTaskId");
  return {
    taskId: id, taskData: data,
    immediate: { taskId: id, status: "SUCCESS", progress: "100%" },
  };
}

export function extractUsage(ctx) {
  // The host's legacy per-call path treats positive facts as price ratios.
  // Only the facts path must receive quantities, never the ratios path.
  if (ctx.usagePurpose === "billing_ratios") return null;
  const request = prepared(ctx);
  if (request.action !== "decision") return { requests: 1 };
  // No tokenizer is available in JS. Reserve a conservative per-question
  // context bound, then replace it with the upstream's actual input usage.
  return { requests: 1, input_tokens: 65536 * Object.keys(request.body.questions).length, output_tokens: 0 };
}

export function extractUsageOnComplete(ctx, result, data) {
  if (result.status !== "SUCCESS") return null;
  return actionOf(ctx) === "decision" ? tokenUsage(data) : { requests: 1 };
}

export function buildQueryRequest() {
  throw new Error("Ollama services are synchronous; polling is not supported");
}

export function parseTaskResult() {
  throw new Error("Ollama services are synchronous; polling is not supported");
}
