import { mkdirSync, writeFileSync } from 'node:fs';
import { cases } from '../tests/cases.mjs';

const directory = new URL('../fixtures/', import.meta.url);
mkdirSync(directory, { recursive: true });
writeFileSync(new URL('golden.json', directory), JSON.stringify({ cases }, null, 2) + '\n');
console.log(`已生成 ${cases.length} 个宿主 fixture 用例`);
