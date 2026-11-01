import type {APIRoute,GetStaticPaths} from 'astro';
import {siteSitemaps} from '../lib/seo';
export const prerender=true;
export const getStaticPaths:GetStaticPaths=()=>siteSitemaps(import.meta.env.SITE).files.map(file=>({params:{part:file.name.slice('sitemap-'.length,-'.xml'.length)},props:{xml:file.xml}}));
export const GET:APIRoute=({props})=>new Response(props.xml,{headers:{'Content-Type':'application/xml; charset=utf-8'}});
