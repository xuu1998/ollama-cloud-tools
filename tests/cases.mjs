const decode = (value) => ({ body: { kind: 'json', value } });
const question = { urgent: { type: 'noul', instructions: '需要立即处理吗？' } };
const decision = { model: 'clef', state: '支付返回 500。', questions: question };
const driver = {
  model: 'clef', upstreamModel: 'clef', action: 'decision',
  publicTaskId: 'task_public_123', baseUrl: 'https://ollama.com',
  apiKey: 'test-channel-key', requestBody: decision,
};
const searchResponse = { results: [{ title: 'Ollama', url: 'https://ollama.com/', content: 'Cloud models' }] };
const decisionResponse = {
  model: 'clef', answers: { urgent: { type: 'noul', noul: 0.95 } },
  usage: { input_tokens: 174, output_tokens: 0 },
};
const ok = (name, hook, args, expected, member) => ({ name, hook, ...(member ? { member } : {}), args, expected });
const bad = (name, hook, args, expectedError, member) => ({ name, hook, ...(member ? { member } : {}), args, expectedError });
const nativeOk = (name, member, value, expected) => ok(name, 'native', [decode(value)], expected, member);
const nativeBad = (name, member, value, message) => bad(name, 'native', [decode(value)], message, member);

// Expectations below are hand-written from Ollama's contract, not plugin helpers.
export const cases = [
  nativeOk('搜索缺省模型和结果数', 'search', { query: 'Ollama 云搜索' }, {
    kind: 'submit', model: 'ollama-web-search', action: 'search',
    requestBody: { query: 'Ollama 云搜索', max_results: 5 },
  }),
  nativeOk('搜索接受最大十条且不裁剪查询文本', 'search', { query: ' news ', max_results: 10, model: 'ollama-web-search' }, {
    kind: 'submit', model: 'ollama-web-search', action: 'search',
    requestBody: { query: ' news ', max_results: 10 },
  }),
  nativeBad('拒绝空查询', 'search', { query: '   ' }, 'query'),
  nativeBad('拒绝超过十条', 'search', { query: 'news', max_results: 11 }, 'max_results'),
  nativeBad('拒绝零条结果', 'search', { query: 'news', max_results: 0 }, 'max_results'),
  nativeBad('拒绝小数结果数', 'search', { query: 'news', max_results: 1.5 }, 'max_results'),
  nativeBad('拒绝字符串结果数', 'search', { query: 'news', max_results: '5' }, 'max_results'),
  nativeBad('拒绝搜索跨模型路由', 'search', { query: 'news', model: 'clef' }, 'model'),
  nativeBad('拒绝搜索未知字段', 'search', { query: 'news', api_key: 'leak' }, 'api_key'),
  bad('拒绝非 JSON 正文', 'native', [{ body: { kind: 'form', fields: { query: ['news'] } } }], 'JSON', 'search'),
  nativeOk('网页读取补全 https', 'fetch', { url: 'ollama.com/docs' }, {
    kind: 'submit', model: 'ollama-web-fetch', action: 'fetch',
    requestBody: { url: 'https://ollama.com/docs' },
  }),
  nativeOk('保留网页查询参数', 'fetch', { url: 'https://example.org/a?q=b' }, {
    kind: 'submit', model: 'ollama-web-fetch', action: 'fetch',
    requestBody: { url: 'https://example.org/a?q=b' },
  }),
  nativeBad('拒绝文件地址', 'fetch', { url: 'file:///etc/passwd' }, 'url'),
  nativeBad('拒绝缺少主机的网页地址', 'fetch', { url: 'https:///page' }, 'url'),
  nativeBad('拒绝 URL 内嵌凭据', 'fetch', { url: 'https://user:password@example.org/' }, 'url'),
  nativeBad('拒绝 localhost', 'fetch', { url: 'http://localhost/admin' }, 'public'),
  nativeBad('拒绝内网 IPv4', 'fetch', { url: 'http://192.168.123.45/' }, 'public'),
  nativeBad('拒绝回环 IPv6', 'fetch', { url: 'http://[::1]/' }, 'public'),
  nativeOk('云别名归一到 clef', 'decision', { ...decision, model: 'clef:cloud' }, {
    kind: 'submit', model: 'clef:cloud', action: 'decision', requestBody: decision,
  }),
  nativeOk('决策接受 clef:27b 并保留明确的模型规格', 'decision', { ...decision, model: 'clef:27b' }, {
    kind: 'submit', model: 'clef:27b', action: 'decision',
    requestBody: { model: 'clef:27b', state: '支付返回 500。', questions: question },
  }),
  nativeOk('27b 云标签归一到对应的 27b 规格', 'decision', { ...decision, model: 'clef:27b-cloud' }, {
    kind: 'submit', model: 'clef:27b-cloud', action: 'decision',
    requestBody: { model: 'clef:27b', state: '支付返回 500。', questions: question },
  }),
  nativeOk('保留结构化 state 和三种问题', 'decision', {
    model: 'clef', state: { body: '请退款', flags: [false, 0] },
    questions: {
      refund: { type: 'noul', instructions: { task: '需要退款吗？' }, criteria: { true: '需要退款' } },
      label: { type: 'choice', instructions: ['选择负责团队'], criteria: { billing: '付款', bug: null } },
      urgency: { type: 'score', instructions: '有多紧急？', criteria: ['普通', '紧急'] },
    },
  }, {
    kind: 'submit', model: 'clef', action: 'decision',
    requestBody: {
      model: 'clef', state: { body: '请退款', flags: [false, 0] },
      questions: {
        refund: { type: 'noul', instructions: { task: '需要退款吗？' }, criteria: { true: '需要退款' } },
        label: { type: 'choice', instructions: ['选择负责团队'], criteria: { billing: '付款', bug: null } },
        urgency: { type: 'score', instructions: '有多紧急？', criteria: ['普通', '紧急'] },
      },
    },
  }),
  nativeBad('拒绝未确认的本地模型', 'decision', { ...decision, model: 'nimble' }, 'model'),
  nativeBad('决策缺少模型不默认猜测', 'decision', { state: 'text', questions: question }, 'model'),
  nativeBad('拒绝空 state', 'decision', { ...decision, state: ' ' }, 'state'),
  nativeBad('拒绝 null state', 'decision', { ...decision, state: null }, 'state'),
  nativeBad('拒绝布尔 state', 'decision', { ...decision, state: false }, 'state'),
  nativeBad('拒绝无问题', 'decision', { ...decision, questions: {} }, 'questions'),
  nativeBad('拒绝非法问题名', 'decision', { ...decision, questions: { '中文': question.urgent } }, 'name'),
  nativeBad('拒绝未知问题类型', 'decision', { ...decision, questions: { q: { type: 'boolean', instructions: '判断' } } }, 'type'),
  nativeBad('拒绝空 instructions', 'decision', { ...decision, questions: { q: { type: 'noul', instructions: ' ' } } }, 'instructions'),
  nativeBad('拒绝不支持的 stream', 'decision', { ...decision, stream: true }, 'stream'),
  nativeBad('拒绝工具参数', 'decision', { ...decision, tools: [] }, 'tools'),
  nativeBad('choice 至少两个选项', 'decision', { ...decision, questions: { q: { type: 'choice', instructions: '选择', criteria: { a: 'A' } } } }, 'criteria'),
  nativeBad('noul 禁止额外选项', 'decision', { ...decision, questions: { q: { type: 'noul', instructions: '判断', criteria: { maybe: '也许' } } } }, 'criteria'),
  nativeBad('score 必须数组', 'decision', { ...decision, questions: { q: { type: 'score', instructions: '评分', criteria: { low: '低', high: '高' } } } }, 'criteria'),
  nativeBad('score 至多十级', 'decision', { ...decision, questions: { q: { type: 'score', instructions: '评分', criteria: Array(11).fill('级别') } } }, 'criteria'),
  nativeBad('拒绝图片 URL', 'decision', { ...decision, images: ['https://example.org/a.png'] }, 'base64'),
  nativeBad('拒绝 data URL', 'decision', { ...decision, images: ['data:image/png;base64,aGVsbG8='] }, 'base64'),
  nativeBad('拒绝超过四张图片', 'decision', { ...decision, images: Array(5).fill('aGVsbG8=') }, 'images'),
  nativeBad('拒绝未知问题字段', 'decision', { ...decision, questions: { q: { ...question.urgent, temperature: 0 } } }, 'temperature'),
  ok('构建云搜索请求及鉴权', 'buildSubmitRequest', [{
    ...driver, model: 'ollama-web-search', upstreamModel: 'ollama-web-search',
    action: 'search', requestBody: { query: 'news', max_results: 5 },
  }], {
    url: 'https://ollama.com/api/web_search', method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer test-channel-key' },
    body: { query: 'news', max_results: 5 },
  }),
  ok('构建云端决策请求且移除 cloud 后缀', 'buildSubmitRequest', [{
    ...driver, upstreamModel: 'clef:cloud', baseUrl: 'https://ollama.com/',
  }], {
    url: 'https://ollama.com/v1/systemone', method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer test-channel-key' },
    body: decision,
  }),
  ok('New API 上游搜索使用插件专属前缀和网关令牌', 'buildSubmitRequest', [{
    ...driver, upstream: { kind: 'new_api' }, baseUrl: 'https://gateway.example',
    apiKey: 'test-gateway-token', model: 'ollama-web-search', upstreamModel: 'ollama-web-search',
    action: 'search', requestBody: { query: 'news', max_results: 3 },
  }], {
    url: 'https://gateway.example/xuu1998_ollama_cloud_tools/api/web_search', method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer test-gateway-token' },
    body: { query: 'news', max_results: 3 },
  }),
  ok('New API 网页读取允许内网 HTTP 网关和部署路径前缀', 'buildSubmitRequest', [{
    ...driver, upstream: { kind: 'new_api' }, baseUrl: 'http://gateway.example:3000/gateway/',
    apiKey: 'test-gateway-token', model: 'ollama-web-fetch', upstreamModel: 'ollama-web-fetch',
    action: 'fetch', requestBody: { url: 'https://ollama.com/' },
  }], {
    url: 'http://gateway.example:3000/gateway/xuu1998_ollama_cloud_tools/api/web_fetch', method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer test-gateway-token' },
    body: { url: 'https://ollama.com/' },
  }),
  ok('New API 决策转发保留上游渠道发布的 cloud 模型名', 'buildSubmitRequest', [{
    ...driver, upstream: { kind: 'new_api' }, baseUrl: 'https://gateway.example/',
    apiKey: 'test-gateway-token', upstreamModel: 'clef:cloud',
  }], {
    url: 'https://gateway.example/xuu1998_ollama_cloud_tools/v1/systemone', method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer test-gateway-token' },
    body: { model: 'clef:cloud', state: '支付返回 500。', questions: question },
  }),
  bad('直连 Ollama 不允许明文 HTTP 地址', 'buildSubmitRequest', [{
    ...driver, upstream: { kind: 'vendor' }, baseUrl: 'http://ollama.com',
  }], 'baseUrl'),
  ok('直连云端发送明确的 clef:27b 模型名', 'buildSubmitRequest', [{
    ...driver, model: 'clef:27b', upstreamModel: 'clef:27b',
    requestBody: { ...decision, model: 'clef:27b' },
  }], {
    url: 'https://ollama.com/v1/systemone', method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer test-channel-key' },
    body: { model: 'clef:27b', state: '支付返回 500。', questions: question },
  }),
  ok('New API 上游保留 clef:27b-cloud 模型名', 'buildSubmitRequest', [{
    ...driver, model: 'clef:27b', upstreamModel: 'clef:27b-cloud',
    upstream: { kind: 'new_api' }, baseUrl: 'https://gateway.example',
    requestBody: { ...decision, model: 'clef:27b' },
  }], {
    url: 'https://gateway.example/xuu1998_ollama_cloud_tools/v1/systemone', method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: 'Bearer test-channel-key' },
    body: { model: 'clef:27b-cloud', state: '支付返回 500。', questions: question },
  }),
  bad('拒绝通过映射切换本地模型', 'buildSubmitRequest', [{ ...driver, upstreamModel: 'clef-flash' }], 'model'),
  bad('拒绝缺少渠道密钥', 'buildSubmitRequest', [{ ...driver, apiKey: '' }], 'key'),
  bad('拒绝渠道地址混入查询参数', 'buildSubmitRequest', [{ ...driver, baseUrl: 'https://ollama.com?key=x' }], 'baseUrl'),
  bad('拒绝未知操作', 'buildSubmitRequest', [{ ...driver, action: 'chat' }], 'action'),
  ok('同步搜索立即完成而非等待轮询', 'parseSubmitResponse', [
    { ...driver, action: 'search' }, { statusCode: 200, headers: {}, body: searchResponse },
  ], {
    taskId: 'sync-task_public_123', taskData: searchResponse,
    immediate: { taskId: 'sync-task_public_123', status: 'SUCCESS', progress: '100%' },
  }),
  ok('同步网页读取立即完成', 'parseSubmitResponse', [
    { ...driver, action: 'fetch' },
    { statusCode: 200, body: { title: 'Ollama', content: 'A page', links: ['https://ollama.com/'] } },
  ], {
    taskId: 'sync-task_public_123',
    taskData: { title: 'Ollama', content: 'A page', links: ['https://ollama.com/'] },
    immediate: { taskId: 'sync-task_public_123', status: 'SUCCESS', progress: '100%' },
  }),
  ok('同步云端决策立即完成并保留原生概率', 'parseSubmitResponse', [
    driver, { statusCode: 200, body: decisionResponse },
  ], {
    taskId: 'sync-task_public_123', taskData: decisionResponse,
    immediate: { taskId: 'sync-task_public_123', status: 'SUCCESS', progress: '100%' },
  }),
  bad('拒绝成功状态中的上游错误对象', 'parseSubmitResponse', [driver, { statusCode: 200, body: { error: 'bad request' } }], 'error'),
  bad('拒绝缺少搜索 results 的上游正文', 'parseSubmitResponse', [{ ...driver, action: 'search' }, { statusCode: 200, body: {} }], 'results'),
  bad('拒绝缺少 usage 的决策正文', 'parseSubmitResponse', [driver, { statusCode: 200, body: { model: 'clef', answers: {} } }], 'usage'),
  bad('拒绝非整数 token 量', 'parseSubmitResponse', [driver, {
    statusCode: 200, body: { ...decisionResponse, usage: { input_tokens: -1, output_tokens: 0 } },
  }], 'input_tokens'),
  ok('返回原生搜索结果', 'native', [{}, { status: 'SUCCESS', data: searchResponse }], searchResponse, 'result'),
  ok('返回原生决策概率和零输出 tokens', 'native', [{}, { status: 'SUCCESS', data: decisionResponse }], decisionResponse, 'result'),
  ok('搜索预留一次调用', 'extractUsage', [{ ...driver, model: 'ollama-web-search', upstreamModel: 'ollama-web-search', action: 'search', requestBody: { query: 'news' } }], { requests: 1 }),
  ok('决策预留输入 token 上界', 'extractUsage', [driver], { requests: 1, input_tokens: 65536, output_tokens: 0 }),
  ok('clef:27b 无 action 时仍按决策模型预留', 'extractUsage', [{
    ...driver, action: '', model: 'clef:27b', upstreamModel: 'clef:27b',
    requestBody: { ...decision, model: 'clef:27b' },
  }], { requests: 1, input_tokens: 65536, output_tokens: 0 }),
  ok('clef:27b-cloud 无 action 时正确结算实际用量', 'extractUsageOnComplete', [{
    ...driver, action: '', model: 'clef:27b-cloud', upstreamModel: 'clef:27b',
  }, { status: 'SUCCESS' }, { ...decisionResponse, model: 'clef:27b' }], {
    requests: 1, input_tokens: 174, output_tokens: 0,
  }),
  ok('按次定价不把 token 数当作价格倍率', 'extractUsage', [{ ...driver, usagePurpose: 'billing_ratios' }], null),
  ok('搜索按次定价不额外乘倍率', 'extractUsage', [{
    ...driver, model: 'ollama-web-search', upstreamModel: 'ollama-web-search',
    action: 'search', requestBody: { query: 'news' }, usagePurpose: 'billing_ratios',
  }], null),
  ok('按上游真实用量结算且保留零输出', 'extractUsageOnComplete', [driver, { status: 'SUCCESS' }, decisionResponse], {
    requests: 1, input_tokens: 174, output_tokens: 0,
  }),
  ok('失败不申报用量', 'extractUsageOnComplete', [driver, { status: 'FAILURE' }, {}], null),
  bad('同步任务禁止重新提交进行轮询', 'buildQueryRequest', [driver], 'synchronous'),
  bad('同步任务不伪造轮询状态', 'parseTaskResult', [driver, {}], 'synchronous'),
];

export { decision, driver, searchResponse, decisionResponse };
