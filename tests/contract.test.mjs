import test from 'node:test';
import assert from 'node:assert/strict';
import * as plugin from '../plugin.js';
import { cases, decision, driver } from './cases.mjs';

function call(c) {
  return c.member ? plugin[c.hook][c.member](...c.args) : plugin[c.hook](...c.args);
}

for (const c of cases) {
  test(c.name, () => {
    const before = structuredClone(c.args);
    if (c.expectedError) {
      assert.throws(() => call(c), (e) => e.message.includes(c.expectedError));
    } else {
      assert.deepEqual(call(c), c.expected);
    }
    assert.deepEqual(c.args, before, '插件不得改写宿主传入参数');
  });
}

test('64 题被接受，第 65 题在调用上游前拒绝', () => {
  const questions = Object.fromEntries(Array.from({ length: 64 }, (_, i) => [
    `q${i}`, { type: 'noul', instructions: '判断是否紧急' },
  ]));
  const value = { ...decision, questions };
  assert.equal(Object.keys(plugin.native.decision({ body: { kind: 'json', value } }).requestBody.questions).length, 64);
  assert.deepEqual(plugin.extractUsage({ ...driver, requestBody: value }), {
    requests: 1, input_tokens: 4194304, output_tokens: 0,
  });
  questions.q64 = { type: 'noul', instructions: '判断是否紧急' };
  assert.throws(() => plugin.native.decision({ body: { kind: 'json', value } }), /questions/);
});

test('决策 schema 保留插入顺序而非对选项排序', () => {
  const value = {
    ...decision,
    questions: { z: { type: 'choice', instructions: '选一个', criteria: { z: 'Z', a: 'A' } }, a: decision.questions.urgent },
  };
  const intent = plugin.native.decision({ body: { kind: 'json', value } });
  const request = plugin.buildSubmitRequest({ ...driver, requestBody: intent.requestBody });
  assert.deepEqual(Object.keys(request.body.questions), ['z', 'a']);
  assert.deepEqual(Object.keys(request.body.questions.z.criteria), ['z', 'a']);
  assert.ok(plugin.meta.requiredCapabilities.includes('json-order@1'));
});

test('每张图片 4 MiB 边界及总共 8 MiB 边界', () => {
  const image = Buffer.alloc(4 * 1024 * 1024).toString('base64');
  const decode = (images) => plugin.native.decision({ body: { kind: 'json', value: { ...decision, images } } });
  assert.equal(decode([image, image]).requestBody.images.length, 2);
  assert.throws(() => decode([image, image, 'AA==']), /8 MiB/);
  assert.throws(() => decode([Buffer.alloc(4 * 1024 * 1024 + 1).toString('base64')]), /4 MiB/);
});

test('请求正文超过 13 MiB 时本地拒绝', () => {
  assert.throws(() => plugin.native.decision({
    body: { kind: 'json', value: { ...decision, state: '中'.repeat(5 * 1024 * 1024) } },
  }), /13 MiB/);
});

test('上游请求对象独立且不污染后续请求', () => {
  const original = structuredClone(driver);
  const first = plugin.buildSubmitRequest(original);
  first.body.questions.urgent.instructions = 'modified';
  assert.equal(original.requestBody.questions.urgent.instructions, '需要立即处理吗？');
  assert.equal(plugin.buildSubmitRequest(driver).body.questions.urgent.instructions, '需要立即处理吗？');
});
