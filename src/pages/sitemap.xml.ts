import {publicWorks,publishedEditions} from '../lib/corpus';
import {supported} from '../lib/i18n';
import {pagePath} from '../lib/urls';
export const prerender=true;
export function GET({site}:{site:URL}){
  const paths=[[],['quality'],...publicWorks().flatMap(work=>[
    ['works',work.id],...publishedEditions(work.id).map(edition=>['read',work.id,edition.id])
  ])];
  const absolute=(locale:string,parts:string[])=>new URL(pagePath(locale,...parts),site).href;
  const entries=paths.flatMap(parts=>supported.map(locale=>`<url><loc>${absolute(locale,parts)}</loc>${supported.map(other=>`<xhtml:link rel="alternate" hreflang="${other}" href="${absolute(other,parts)}"/>`).join('')}<xhtml:link rel="alternate" hreflang="x-default" href="${absolute('en',parts)}"/></url>`));
  return new Response('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'+entries.join('\n')+'\n</urlset>\n',{headers:{'Content-Type':'application/xml; charset=utf-8'}});
}
