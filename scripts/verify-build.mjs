import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const base = '/LitMundi/';
const files = [];
function visit(dir) {
  for (const e of readdirSync(dir,{withFileTypes:true})) {
    const path = join(dir,e.name);
    if (e.isDirectory()) visit(path);
    else files.push(path);
  }
}
visit('dist');
for (const path of [
  'dist/index.html','dist/en/index.html','dist/vi/index.html',
  'dist/fr/index.html','dist/es/index.html','dist/404.html',
  'dist/en/works/demo-proust/index.html',
  'dist/vi/read/demo-proust/fr/index.html',
  'dist/favicon.svg'
]) assert.ok(existsSync(path),'Missing build output: '+path);
const home = readFileSync('dist/en/index.html','utf8');
const root = readFileSync('dist/index.html','utf8');
assert.ok(home.includes(base+'en/works/demo-proust/'),'Work links must include Pages base');
assert.ok(home.includes(base+'favicon.svg'),'Favicon must include Pages base');
assert.ok(root.includes(base+'en/'),'Default language redirect must include Pages base');
for (const f of files.filter(f=>f.endsWith('.html'))) {
  const html = readFileSync(f,'utf8');
  assert.ok(!/(?:href|src)=["']\/(?:en|vi|fr|es|favicon\.svg)(?:\/|["'])/.test(html),
    'Broken root-relative link in '+f);
}
console.log('GitHub Pages base URL and '+files.length+' generated files verified.');
