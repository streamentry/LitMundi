import test from 'node:test';
import assert from 'node:assert/strict';
import {createSitemapFiles,escapeXml,MAX_SITEMAP_BYTES,MAX_SITEMAP_URLS} from '../scripts/lib/sitemaps.mjs';

const site='https://example.test',base='/library/';
const entry=(suffix,locale='en')=>{
  const url=site+base+locale+'/'+suffix+'/';
  return {url,locale,alternates:[{hreflang:locale,href:url},{hreflang:'x-default',href:url}]};
};
const make=(entries,extra={})=>createSitemapFiles({entries,locales:['en','vi'],site,base,...extra});

test('one child per locale, sibling file scope, stable order and no fabricated index dates',()=>{
  const entries=[entry('b'),entry('a','vi'),{...entry('a'),lastmod:'2026-01-02T10:00:00Z'}];
  const result=make(entries);
  assert.deepEqual(result.files.map(file=>file.name),['sitemap-en.xml','sitemap-vi.xml']);
  assert.equal(result.files[0].url,site+base+'sitemap-en.xml');
  assert.ok(result.index.includes('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'));
  assert.ok(!result.index.includes('<lastmod>'));
  assert.ok(result.files[0].xml.includes('<lastmod>2026-01-02T10:00:00Z</lastmod>'));
  assert.ok(result.files[0].xml.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'));
  assert.ok(!result.files[0].xml.includes('priority')&&!result.files[0].xml.includes('changefreq'));
  assert.deepEqual(make([...entries].reverse()),result);
});

test('sharding respects count boundaries without dropping or duplicating URLs',()=>{
  const entries=[entry('a'),entry('b'),entry('c')];
  const result=make(entries,{maxUrls:2});
  assert.deepEqual(result.files.map(file=>file.name),['sitemap-en-1.xml','sitemap-en-2.xml']);
  assert.deepEqual(result.files.map(file=>file.entries.length),[2,1]);
  assert.deepEqual(result.files.flatMap(file=>file.entries.map(item=>item.url)),entries.map(item=>item.url));
  assert.deepEqual(make(entries.slice(0,2),{maxUrls:2}).files.map(file=>file.name),['sitemap-en.xml']);
  assert.throws(()=>make(entries,{maxUrls:MAX_SITEMAP_URLS+1}),/limits/);
});

test('byte sharding respects exact output size and rejects an individually oversized record',()=>{
  const entries=[entry('a'),entry('b')];
  const one=Buffer.byteLength(make(entries.slice(0,1)).files[0].xml,'utf8');
  const result=make(entries,{maxBytes:one});
  assert.equal(result.files.length,2);
  assert.ok(result.files.every(file=>Buffer.byteLength(file.xml,'utf8')<=one));
  assert.throws(()=>make(entries,{maxBytes:one-1}),/entry exceeds/);
  assert.throws(()=>make(entries,{maxBytes:MAX_SITEMAP_BYTES+1}),/limits/);
});

test('XML escaping and date validation protect sitemap parsing',()=>{
  assert.equal(escapeXml(`Văn & < > " '`),'Văn &amp; &lt; &gt; &quot; &apos;');
  assert.throws(()=>escapeXml('invalid\u0000'),/XML/);
  const result=make([entry('a&b')]);
  assert.ok(result.files[0].xml.includes('/a&amp;b/'));
  assert.ok(!make([entry('a')]).files[0].xml.includes('<lastmod>'));
  for(const lastmod of ['today','2026-02-30','2026-13-01','2026-01-01T10:00:00'])assert.throws(()=>make([{...entry('a'),lastmod}]),/lastmod/);
});

test('only clean canonical URLs and reciprocal language annotations can be emitted',()=>{
  const good=entry('a');
  assert.throws(()=>make([good,good]),/Duplicate/);
  for(const url of [good.url+'?view=all',good.url+'#passage',good.url.replace('example.test','other.test'),good.url.replace('/library/','/elsewhere/'),good.url.replace('/a/','/b/../a/')])assert.throws(()=>make([{...good,url}]),/canonical/);
  assert.throws(()=>make([{...good,alternates:[]}]),/self/);
  assert.throws(()=>make([{...good,alternates:[...good.alternates,good.alternates[0]]}]),/duplicate hreflang/);
  assert.throws(()=>make([{...good,alternates:[...good.alternates,{hreflang:'vi',href:entry('a','vi').url}]}]),/reciprocal/);
  assert.throws(()=>make([good],{locales:['en','en']}),/locales/);
});
