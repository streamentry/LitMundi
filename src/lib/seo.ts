import {catalog,editions,type Edition} from './corpus';
import {supported} from './i18n';
import {basePath} from './urls';
import {createSeoManifest,canonicalReaderPath} from '../../scripts/lib/seo.mjs';
import {createSitemapFiles} from '../../scripts/lib/sitemaps.mjs';
import {createGitLastmod} from '../../scripts/lib/sitemap-lastmod.mjs';

const manifests=new Map<string,ReturnType<typeof createSeoManifest>>();
export function seoManifest(site:URL|string) {
  const key=site.toString();
  if (!manifests.has(key)) manifests.set(key,createSeoManifest({works:catalog,editions,locales:supported,site,base:basePath}));
  return manifests.get(key)!;
}

export function seoForPath(pathname:string,site:URL|string) {
  return seoManifest(site).entries.find(entry=>entry.path===pathname);
}

export function canonicalEditionPath(edition:Edition) {
  return canonicalReaderPath(edition,supported,basePath);
}

const sitemaps=new Map<string,ReturnType<typeof createSitemapFiles>>();
export function siteSitemaps(site:URL|string) {
  const key=site.toString();
  if (!sitemaps.has(key)) {
    const lastmod=createGitLastmod();
    const entries=seoManifest(site).entries.map(entry=>({...entry,lastmod:lastmod(entry.sourceFiles)}));
    sitemaps.set(key,createSitemapFiles({entries,locales:supported,site,base:basePath}));
  }
  return sitemaps.get(key)!;
}
