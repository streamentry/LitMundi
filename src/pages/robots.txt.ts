import {assetPath} from '../lib/urls';
export const prerender=true;
export function GET({site}:{site:URL}){
  return new Response('User-agent: *\nAllow: /\nSitemap: '+new URL(assetPath('sitemap.xml'),site).href+'\n',{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
