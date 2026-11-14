// Explicit opt-in: this script makes real calls through your new-api gateway.
import assert from 'node:assert/strict';

const modes = process.argv.slice(2);
const valid = ['--search', '--fetch', '--decision', '--all', '--help'];
if (modes.includes('--help') || !modes.length) {
  console.log('用法：node tools/smoke.mjs --search|--fetch|--decision|--all');
  console.log('环境变量：NEW_API_BASE_URL（网关根地址）、NEW_API_KEY（网关令牌）');
  console.log('会执行真实 API 调用并产生服务商和网关用量；不会打印密钥。');
  process.exit(0);
}
if (modes.some((mode) => !valid.includes(mode))) throw new Error('未知参数；使用 --help 查看用法。');
const base = process.env.NEW_API_BASE_URL;
const key = process.env.NEW_API_KEY;
if (!base || !key) throw new Error('需要设置 NEW_API_BASE_URL 和 NEW_API_KEY。');
const url = new URL(base);
if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
  throw new Error('网关地址必须是 HTTP(S) 地址，且不含凭据、查询参数或片段。');
}
const root = base.replace(/\/+$/, '') + '/xuu1998_ollama_cloud_tools';
const enabled = (mode) => modes.includes('--all') || modes.includes(mode);

async function request(path, body) {
  const response = await fetch(root + path, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
    redirect: 'error',
  });
  if (!response.ok) throw new Error(`${path} 返回 HTTP ${response.status}，请检查网关日志。`);
  return response.json();
}

if (enabled('--search')) {
  const data = await request('/api/web_search', { query: 'Ollama official documentation', max_results: 2 });
  assert.ok(Array.isArray(data.results), '搜索返回值缺少 results');
  assert.ok(data.results.length <= 2, '搜索结果超过 max_results');
  console.log(`搜索通过：${data.results.length} 条结果`);
}
if (enabled('--fetch')) {
  const data = await request('/api/web_fetch', { url: 'https://ollama.com/' });
  assert.equal(typeof data.content, 'string');
  assert.ok(Array.isArray(data.links));
  console.log(`网页读取通过：${data.content.length} 个字符，${data.links.length} 个链接`);
}
if (enabled('--decision')) {
  const data = await request('/v1/systemone', {
    model: 'clef:27b',
    state: '生产支付接口持续返回 500，所有客户均无法付款。',
    questions: {
      urgent: { type: 'noul', instructions: '是否需要立即处理？' },
      team: {
        type: 'choice', instructions: '由哪个团队处理？',
        criteria: { engineering: '软件故障', billing: '退款与账单咨询' },
      },
      severity: {
        type: 'score', instructions: '问题有多严重？', criteria: ['轻微', '一般', '严重'],
      },
    },
  });
  assert.equal(data.answers.urgent.type, 'noul');
  assert.ok(data.answers.urgent.noul >= 0 && data.answers.urgent.noul <= 1);
  assert.ok(['engineering', 'billing'].includes(data.answers.team.choice));
  assert.ok(data.answers.severity.score >= 0 && data.answers.severity.score <= 2);
  assert.ok(Number.isSafeInteger(data.usage.input_tokens) && data.usage.input_tokens >= 0);
  assert.ok(Number.isSafeInteger(data.usage.output_tokens) && data.usage.output_tokens >= 0);
  console.log(`云决策通过：输入 ${data.usage.input_tokens} tokens，输出 ${data.usage.output_tokens} tokens`);
}
