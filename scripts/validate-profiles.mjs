import {readdirSync,readFileSync,existsSync,statSync} from 'node:fs';
import {join} from 'node:path';
import assert from 'node:assert/strict';

const dir='corpus/catalog/profiles';
const works=JSON.parse(readFileSync('corpus/catalog/works.json','utf8'));
const editions=JSON.parse(readFileSync('corpus/catalog/editions.json','utf8'));
const published=new Set(editions.filter(e=>e.status==='published').map(e=>e.work_id));
const banned=/\b(tapestry|testament|delve|timeless|must-read|profound exploration|enduring legacy|stands as)\b/i;
const required=['en','vi'];
const words=text=>text.trim().split(/\s+/).length;
const files=existsSync(dir)?readdirSync(dir).filter(f=>f.endsWith('.json')):[];
const seen=new Set();
for(const file of files){
  const profile=JSON.parse(readFileSync(join(dir,file),'utf8')),id=profile.work_id,where=file+': ';
  assert.equal(file,id+'.json',where+'file name must equal work_id');
  assert.ok(works.some(w=>w.id===id),where+'unknown work');
  assert.ok(!seen.has(id),where+'duplicate profile');seen.add(id);
  for(const key of ['tagline','summary','context','reading_note'])for(const lang of required)
    assert.ok(typeof profile[key]?.[lang]==='string'&&profile[key][lang].trim().length>20,where+key+'.'+lang+' is required');
  for(const lang of required){
    assert.ok(profile.tagline[lang].length<=140,where+'tagline.'+lang+' exceeds 140 characters');
    const why=profile.why_it_matters?.[lang];
    assert.ok(Array.isArray(why)&&why.length===3&&why.every(p=>typeof p==='string'&&p.trim().length>200),where+'why_it_matters.'+lang+' needs three paragraphs');
    const themes=profile.themes?.[lang];
    assert.ok(Array.isArray(themes)&&themes.length>=4&&themes.length<=6,where+'themes.'+lang+' needs 4–6 items');
  }
  for(const text of [profile.tagline.en,profile.summary.en,...profile.why_it_matters.en,profile.context.en,profile.reading_note.en])
    assert.ok(!banned.test(text),where+'contains banned filler vocabulary: '+(text.match(banned)?.[0]));
  assert.ok(Array.isArray(profile.sources)&&profile.sources.length>=2&&profile.sources.every(u=>/^https:\/\/[^\s]+$/.test(u)),where+'needs at least two https sources');
  assert.ok(Array.isArray(profile.key_facts)&&profile.key_facts.length<=4,where+'at most four key facts');
  const i=profile.illustration;
  if(i===null)continue;
  for(const key of ['file','thumb','focus','creator','created','source_url','license','credit','commons_title'])
    assert.ok(typeof i[key]==='string'&&i[key].length>0,where+'illustration.'+key+' is required');
  for(const lang of required){
    assert.ok(i.alt?.[lang]?.length>10,where+'illustration.alt.'+lang+' is required');
    assert.ok(i.caption?.[lang]?.length>10,where+'illustration.caption.'+lang+' is required');
  }
  assert.ok(['text','related','period'].includes(i.depicts),where+'illustration.depicts');
  assert.ok(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/.test(i.source_url),where+'illustration must come from Wikimedia Commons');
  assert.ok(/^(Public domain|CC0)/.test(i.license),where+'illustration license must be public domain or CC0');
  assert.ok(i.creator_died===null||i.creator_died<1955||/CC0/.test(i.license),where+'creator must have died before 1955');
  const year=/\d{4}/.test(i.created)?Number(i.created.match(/\d{4}/)[0]):null;
  assert.ok(/CC0/.test(i.license)||(year!==null?year<1931:(i.creator_died!==null&&i.creator_died<1931)),where+'artwork must predate 1931');
  for(const [key,max] of [['file',300_000],['thumb',80_000]]){
    const path=join('public',i[key]);
    assert.ok(existsSync(path),where+'missing image '+path);
    assert.ok(statSync(path).size<=max,where+path+' exceeds '+max+' bytes');
  }
  assert.ok(i.width>=400&&i.height>=300,where+'image too small');
}
const missing=works.filter(w=>w.visibility==='public'&&published.has(w.id)&&!seen.has(w.id)).map(w=>w.id);
if(process.env.LITMUNDI_REQUIRE_PROFILES==='1')assert.deepEqual(missing,[],'Public works without a profile');
console.log('Profiles valid: '+files.length+' works, '+files.filter(f=>JSON.parse(readFileSync(join(dir,f),'utf8')).illustration).length+' illustrated.'+(missing.length?' Without a profile yet: '+missing.length+'.':''));
