import {normalizedBase,siteOrigin,languagePattern} from './seo.mjs';

export const MAX_SITEMAP_URLS=50_000;
export const MAX_SITEMAP_BYTES=52_428_800;
const declaration='<?xml version="1.0" encoding="UTF-8"?>\n';
const header=declaration+'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n';
const footer='</urlset>\n';
const size=text=>Buffer.byteLength(text,'utf8');
const compare=(a,b)=>a<b?-1:a>b?1:0;

export function escapeXml(value) {
  const text=String(value);
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/u.test(text)) throw new Error('Invalid XML character');
  return text.replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[character]));
}

function validLastmod(value) {
  if (typeof value!=='string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value) || !Number.isFinite(Date.parse(value))) return false;
  const [year,month,day]=value.slice(0,10).split('-').map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
}

function renderEntry(entry) {
  if (entry.lastmod!==undefined && !validLastmod(entry.lastmod)) throw new Error('Invalid lastmod for '+entry.url);
  return '  <url>\n    <loc>'+escapeXml(entry.url)+'</loc>\n'+
    (entry.lastmod?'    <lastmod>'+escapeXml(entry.lastmod)+'</lastmod>\n':'')+
    entry.alternates.map(alternate=>'    <xhtml:link rel="alternate" hreflang="'+escapeXml(alternate.hreflang)+'" href="'+escapeXml(alternate.href)+'"/>\n').join('')+
    '  </url>\n';
}

/** Split by interface URL prefix, then by both protocol limits. */
export function createSitemapFiles({entries,locales,site,base='/',maxUrls=MAX_SITEMAP_URLS,maxBytes=MAX_SITEMAP_BYTES}) {
  const origin=siteOrigin(site),prefix=normalizedBase(base);
  if (!Number.isInteger(maxUrls)||maxUrls<1||maxUrls>MAX_SITEMAP_URLS||!Number.isInteger(maxBytes)||maxBytes<size(header+footer)||maxBytes>MAX_SITEMAP_BYTES) throw new Error('Invalid sitemap limits');
  if (!locales.length || new Set(locales).size!==locales.length || locales.some(locale=>!languagePattern.test(locale))) throw new Error('Invalid sitemap locales');
  const byUrl=new Map(entries.map(entry=>[entry.url,entry]));
  if (byUrl.size!==entries.length) throw new Error('Duplicate canonical sitemap URL');
  for (const entry of entries) {
    const url=new URL(entry.url);
    if (url.href!==entry.url||url.origin!==origin||url.search||url.hash||url.username||url.password||url.pathname.includes('//')||!locales.includes(entry.locale)||!url.pathname.startsWith(prefix+entry.locale+'/')||!url.pathname.endsWith('/')) throw new Error('Invalid canonical sitemap URL: '+entry.url);
    const names=new Set();
    for (const alternate of entry.alternates) {
      if ((alternate.hreflang!=='x-default'&&!languagePattern.test(alternate.hreflang))||names.has(alternate.hreflang)) throw new Error('Invalid or duplicate hreflang');
      names.add(alternate.hreflang);
      const target=byUrl.get(alternate.href);
      if (!target || !target.alternates.some(other=>other.href===entry.url&&other.hreflang!=='x-default')) throw new Error('Hreflang must target a reciprocal canonical entry');
    }
    if (!entry.alternates.some(alternate=>alternate.href===entry.url&&alternate.hreflang!=='x-default')) throw new Error('Missing self hreflang');
  }
  const files=[];
  for (const locale of [...locales].sort(compare)) {
    const selected=entries.filter(entry=>entry.locale===locale).sort((a,b)=>compare(a.url,b.url));
    const shards=[];
    let shard=[],bytes=size(header+footer);
    for (const entry of selected) {
      const xml=renderEntry(entry),length=size(xml);
      if (size(header+footer)+length>maxBytes) throw new Error('One sitemap entry exceeds the byte limit');
      if (shard.length&&(shard.length===maxUrls||bytes+length>maxBytes)) {shards.push(shard);shard=[];bytes=size(header+footer);}
      shard.push({entry,xml});bytes+=length;
    }
    if (shard.length) shards.push(shard);
    shards.forEach((items,index)=>{
      const name='sitemap-'+locale+(shards.length>1?'-'+(index+1):'')+'.xml';
      files.push({name,locale,url:origin+prefix+name,entries:items.map(item=>item.entry),xml:header+items.map(item=>item.xml).join('')+footer});
    });
  }
  if (!files.length||files.length>MAX_SITEMAP_URLS) throw new Error('Sitemap index must contain 1–50000 files');
  const index=declaration+'<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+files.map(file=>'  <sitemap><loc>'+escapeXml(file.url)+'</loc></sitemap>\n').join('')+'</sitemapindex>\n';
  if (size(index)>MAX_SITEMAP_BYTES) throw new Error('Sitemap index exceeds the byte limit');
  return {index,files};
}
