import {assetPath,basePath} from '../lib/urls';
export const prerender=true;
export function GET({site}:{site:URL}){
  const scope=basePath==='/'?[]:[
    '# Informational template for a site hosted under '+basePath,
    '# Crawlers read '+new URL('/robots.txt',site).href+', not this project-level file.',
    '# Add the Sitemap line to the origin-root robots.txt, or submit the index in webmaster tools.',
    '',
  ];
  return new Response([...scope,'User-agent: *','Allow: '+basePath,'Sitemap: '+new URL(assetPath('sitemap-index.xml'),site).href,''].join('\n'),{headers:{'Content-Type':'text/plain; charset=utf-8'}});
}
