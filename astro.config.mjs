import { defineConfig } from 'astro/config';
import publication from './src/lib/site.json' with {type:'json'};
export default defineConfig({
  site: publication.site,
  base: publication.base,
  output: 'static',
  trailingSlash: 'always',
});
