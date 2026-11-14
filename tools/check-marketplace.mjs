// Validate release documents with the installed host's actual Markdown parsers.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const hostArg = process.argv.indexOf('--new-api');
if (hostArg < 0 || !process.argv[hostArg + 1]) {
  console.error('用法：node tools/check-marketplace.mjs --new-api <new-api-source> [--owner <github-owner>]');
  process.exit(2);
}
const ownerArg = process.argv.indexOf('--owner');
const owner = ownerArg < 0 ? 'xuu1998' : process.argv[ownerArg + 1];
assert.ok(owner, '需要 GitHub owner');
const pluginRoot = fileURLToPath(new URL('../', import.meta.url));
const webRoot = path.resolve(process.argv[hostArg + 1], 'web');
const hostRequire = createRequire(path.join(webRoot, 'package.json'));
const parserRoot = path.join(webRoot, 'src/features/task-plugins/lib');
const temp = mkdtempSync(path.join(tmpdir(), 'ollama-marketplace-'));
const url = (file) => pathToFileURL(file).href;

try {
  const config = `
export default {
  root: ${JSON.stringify(temp)},
  resolve: { alias: { '@': ${JSON.stringify(path.join(webRoot, 'src'))} } },
  test: { environment: 'node', include: ['marketplace.test.mjs'] },
};
`;
  const test = `
import { test, expect } from ${JSON.stringify(url(path.join(path.dirname(hostRequire.resolve('vitest/package.json')), 'dist/index.js')))};
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { meta } from ${JSON.stringify(url(path.join(pluginRoot, 'plugin.js')))};
import { parsePluginReadme } from ${JSON.stringify(url(path.join(parserRoot, 'plugin-readme.ts')))};
import { parsePluginChangelog } from ${JSON.stringify(url(path.join(parserRoot, 'plugin-changelog.ts')))};
import { parsePluginMetaPreview, readPluginSourceParts } from ${JSON.stringify(url(path.join(parserRoot, 'plugin-meta-preview.ts')))};
import { javascriptLanguage } from ${JSON.stringify(url(hostRequire.resolve('@codemirror/lang-javascript')))};
const root = ${JSON.stringify(pluginRoot)};
const source = 'https://github.com/' + ${JSON.stringify(owner)} + '/ollama-cloud-tools/blob/v' + meta.version + '/';
const read = (file) => readFileSync(path.join(root, file), 'utf8');
test('marketplace owner namespace and package version', () => {
  expect(meta.key.startsWith(${JSON.stringify(owner.toLowerCase() + '_')})).toBe(true);
  expect(meta.key.length).toBeLessThanOrEqual(30);
  expect(JSON.parse(read('package.json')).version).toBe(meta.version);
});
test('meta is readable without executing the plugin', () => {
  const source = read('plugin.js');
  const preview = parsePluginMetaPreview(source);
  expect(preview.status).toBe('parsed');
  expect(preview.fields.key).toMatchObject({ state: 'value', value: meta.key });
  expect(preview.fields.models).toMatchObject({ state: 'value', value: meta.models });
  expect(readPluginSourceParts(source)).toEqual({ task: true, provider: false, transform: false });
});
test('community manifest contains only literal values', () => {
  const source = read('plugin.js');
  const tree = javascriptLanguage.parser.parse(source);
  const declaration = tree.topNode.getChildren('ExportDeclaration')
    .map(node => node.getChild('VariableDeclaration'))
    .find(node => node?.getChildren('VariableDefinition').some(name => source.slice(name.from, name.to) === 'meta'));
  const definition = declaration?.getChildren('VariableDefinition')
    .find(name => source.slice(name.from, name.to) === 'meta');
  let value = definition?.nextSibling;
  while (value && value.name !== 'Equals') value = value.nextSibling;
  value = value?.nextSibling;
  while (value && ['LineComment', 'BlockComment'].includes(value.name)) value = value.nextSibling;
  const skip = new Set(['{', '}', '[', ']', ',', 'LineComment', 'BlockComment']);
  function literal(node, location) {
    expect(node, location).toBeTruthy();
    if (['String', 'Number', 'BooleanLiteral', 'null'].includes(node.name)) return;
    if (node.name === 'ObjectExpression') {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (skip.has(child.name)) continue;
        expect(child.name, location).toBe('Property');
        expect(['PropertyDefinition', 'String'].includes(child.firstChild?.name), location).toBe(true);
        let item = child.getChild(':')?.nextSibling;
        while (item && ['LineComment', 'BlockComment'].includes(item.name)) item = item.nextSibling;
        literal(item, location + '.' + source.slice(child.firstChild.from, child.firstChild.to));
      }
      return;
    }
    if (node.name === 'ArrayExpression') {
      let index = 0;
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (!skip.has(child.name)) literal(child, location + '[' + index++ + ']');
      }
      return;
    }
    throw new Error(location + ': nonliteral ' + node.name);
  }
  literal(value, 'meta');
});
for (const [locale, file] of [['en', 'README.md'], ['zh-CN', 'README.zh-CN.md']]) {
  test(file + ' actual host parser', () => {
    expect(() => parsePluginReadme(read(file), locale, source + file)).not.toThrow();
  });
}
test('CHANGELOG.md actual host parser and translation identity', () => {
  const english = parsePluginChangelog(read('CHANGELOG.md'), {
    plugin: meta.key, version: meta.version, locale: 'en',
  }, source + 'CHANGELOG.md');
  for (const [locale, file] of Object.entries(english.translations)) {
    const translated = parsePluginChangelog(read(file), {
      plugin: meta.key, version: meta.version, locale,
    }, source + file);
    expect(translated.document.sections.map(x => x.category))
      .toEqual(english.document.sections.map(x => x.category));
  }
});
`;
  writeFileSync(path.join(temp, 'vitest.config.mjs'), config);
  writeFileSync(path.join(temp, 'marketplace.test.mjs'), test);
  const cli = path.join(path.dirname(hostRequire.resolve('vitest/package.json')), 'vitest.mjs');
  const result = spawnSync(process.execPath, [
    cli, 'run', '--config', path.join(temp, 'vitest.config.mjs'), '--reporter=dot',
  ], { cwd: webRoot, stdio: 'inherit', env: process.env });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  assert.ok(path.resolve(temp).startsWith(path.resolve(tmpdir()) + path.sep + 'ollama-marketplace-'));
  rmSync(temp, { recursive: true, force: true });
}
