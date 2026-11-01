import type {APIRoute} from 'astro';
import {siteSitemaps} from '../lib/seo';
export const prerender=true;
/** Existing submissions remain usable; static Pages cannot send an HTTP 301. */
export const GET:APIRoute=({site})=>new Response(siteSitemaps(site!).index,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
