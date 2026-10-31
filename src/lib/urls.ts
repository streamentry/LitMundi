/**
 * Public paths must remain valid when the site is hosted below /LitMundi/.
 * Keep this helper as the sole source for internal page and asset URLs.
 * To migrate to a custom domain, change Astro's site/base configuration.
 */
export const basePath = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
const clean = (part: string) => part.replace(/^\/+|\/+$/g, '');

export function pagePath(...parts: string[]): string {
  const suffix = parts.map(clean).filter(Boolean).join('/');
  return suffix ? basePath + suffix + '/' : basePath;
}

export function assetPath(asset: string): string {
  return basePath + asset.replace(/^\/+/, '');
}
