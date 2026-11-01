import {readFile,mkdir,readdir,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import sharp from 'sharp';
import {isPublicEdition} from './lib/reader-data.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const output=join(root,'public/social');
const fontfile=join(root,'scripts/fonts/DejaVuSerif.ttf');
const width=1200,height=630;
const colors={paper:'#faf9f6',ink:'#193e2f',green:'#24553e',muted:'#53665a',line:'#dce3d9',gold:'#b39559'};
const xml=value=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[character]));

/** Render the full text. Long titles wrap and shrink; none are ellipsized. */
async function textLayer(value,{size,maxWidth,maxHeight,color=colors.ink}) {
  const text='<span foreground="'+color+'" fallback="false">'+xml(value.normalize('NFC'))+'</span>';
  const options={text,fontfile,width:maxWidth,rgba:true,align:'left',wrap:'word-char',spacing:5};
  for(let points=size;points>=24;points-=2){
    const result=await sharp({text:{...options,font:'DejaVu Serif '+points,dpi:72}}).png().toBuffer({resolveWithObject:true});
    if(result.info.width<=maxWidth&&result.info.height<=maxHeight)return result.data;
  }
  // The bounded-height Pango layout fits unusually long bibliographic titles
  // without dropping words. The page metadata retains the complete title too.
  const result=await sharp({text:{...options,font:'DejaVu Serif 24',height:maxHeight}}).png().toBuffer({resolveWithObject:true});
  if(result.info.width>maxWidth||result.info.height>maxHeight)throw new Error('Social-card text exceeds its layout bounds');
  return result.data;
}

const background=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="1200" height="630" fill="${colors.paper}"/>
  <rect width="22" height="630" fill="${colors.green}"/>
  <path d="M76 144H1124M76 542H1124" stroke="${colors.line}" stroke-width="2"/>
  <path d="M1074 63H1124V113" fill="none" stroke="${colors.gold}" stroke-width="3"/>
</svg>`);

const works=JSON.parse(await readFile(join(root,'corpus/catalog/works.json'),'utf8'));
const editions=JSON.parse(await readFile(join(root,'corpus/catalog/editions.json'),'utf8'));
const published=works.filter(work=>editions.some(edition=>edition.work_id===work.id&&isPublicEdition(edition,work)));
for(const work of published){
  if(!/^[a-z][a-z0-9-]+$/.test(work.id)||!work.title?.trim()||!work.author?.trim())throw new Error('Invalid social-card work identity');
}
await mkdir(output,{recursive:true});
const favicon=await readFile(join(root,'public/favicon.svg'));
const logo=await sharp(favicon,{density:576}).resize(512,512).png({compressionLevel:9}).toBuffer();
await sharp(logo).toFile(join(output,'logo.png'));
const icon=await sharp(logo).resize(48,48).png().toBuffer();
const brand=await textLayer('LitMundi',{size:40,maxWidth:800,maxHeight:55});
const footer=await textLayer('Read · Compare · Download',{size:22,maxWidth:1048,maxHeight:35,color:colors.muted});

async function card(filename,title,byline) {
  const heading=await textLayer(title,{size:76,maxWidth:1048,maxHeight:220});
  const attribution=await textLayer(byline,{size:30,maxWidth:1048,maxHeight:74,color:colors.muted});
  const image=await sharp(background).composite([
    {input:icon,left:76,top:62},{input:brand,left:143,top:66},
    {input:heading,left:76,top:194},{input:attribution,left:76,top:442},
    {input:footer,left:76,top:574},
  ]).png({compressionLevel:9,adaptiveFiltering:true}).toBuffer();
  const metadata=await sharp(image).metadata();
  if(metadata.width!==width||metadata.height!==height)throw new Error('Incorrect social-card dimensions');
  await sharp(image).toFile(join(output,filename));
}

await card('site.png','A library of\nworld literature.','Originals and translations');
for(const work of published)await card(work.id+'.png',work.title,work.author);

// Remove only known corpus cards that are no longer public. Unrelated files
// in this directory are not deleted, and the authoritative corpus is untouched.
const expected=new Set(['site.png','logo.png',...published.map(work=>work.id+'.png')]);
const known=new Set(works.map(work=>work.id+'.png'));
for(const name of await readdir(output))if(known.has(name)&&!expected.has(name))await unlink(join(output,name));
console.log('Generated '+(published.length+1)+' social cards (1200×630) and logo.png (512×512) from the published corpus.');
