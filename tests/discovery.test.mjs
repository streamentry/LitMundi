import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {labels,workSummary,languageName,authorSlug,readerPageTitle,workPageTitle,readerPageDescription,workPageDescription} from '../scripts/lib/discovery.mjs';
import {isPublicEdition,editionTitle} from '../scripts/lib/reader-data.mjs';

const read=path=>JSON.parse(readFileSync(path,'utf8'));
const data=read('src/lib/discovery.json'),locales=Object.keys(read('src/lib/locales.json'));
const works=read('corpus/catalog/works.json'),editions=read('corpus/catalog/editions.json'),languageNames=read('corpus/catalog/languages.json');
const visible=works.filter(work=>editions.some(edition=>edition.work_id===work.id&&isPublicEdition(edition,work)));

test('provided summaries cover supported locales and keep their English source in sync',()=>{
  for(const workId of Object.keys(data.summaries)){
    const work=works.find(work=>work.id===workId);
    assert.ok(work,'Localized summaries must identify an actual corpus work');
    assert.equal(data.summaries[work.id].en,work.description,'Changing the editorial English summary requires a deliberate localization update');
    for(const locale of locales){
      const summary=workSummary(work,locale);
      assert.equal(summary.language,locale);
      assert.ok(typeof summary.text==='string'&&summary.text.trim().length>30);
      if(locale!=='en')assert.notEqual(summary.text,work.description,'An untranslated description must not be labeled as a translation');
    }
  }
});

test('unknown works and unprovided translations retain an honest English summary label',()=>{
  const future={id:'future-work',description:'An English editorial description awaiting localization.'};
  assert.deepEqual(workSummary(future,'vi'),{text:future.description,language:'en'});
  assert.deepEqual(workSummary(visible[0],'ja'),{text:visible[0].description,language:'en'});
});

test('reader discovery identifies the edition language, author and actual review category',()=>{
  const work=works.find(work=>work.id==='machado-um-apologo');
  const original=editions.find(edition=>edition.work_id===work.id&&edition.kind==='source');
  const translation=editions.find(edition=>edition.work_id===work.id&&edition.kind==='translation'&&edition.status==='published');
  assert.equal(readerPageTitle(work,translation,languageNames),editionTitle(work,translation)+' — Machado de Assis · Tiếng Việt');
  assert.equal(workPageTitle(work,translation),editionTitle(work,translation)+' — Machado de Assis');
  for(const locale of locales){
    const description=readerPageDescription(work,translation,locale,languageNames);
    assert.ok(description.includes(translation.title)&&description.includes(work.author));
    assert.ok(description.includes(languageName('vi',locale)));
    assert.ok(description.includes(labels(locale).aiReview));
    assert.ok(!description.includes(labels(locale).humanReview));
    assert.ok(!description.includes('{'));
    const sourceDescription=readerPageDescription(work,original,locale,languageNames);
    assert.ok(sourceDescription.includes(languageName('pt',locale)));
    assert.ok(!sourceDescription.includes(labels(locale).aiReview),'Source checking is not a translation AI review');
  }
  assert.match(readerPageDescription(work,translation,'fr'),/en vietnamien/);
  assert.doesNotMatch(readerPageDescription(work,translation,'fr'),/en français/);
  assert.match(readerPageDescription(work,translation,'es'),/en vietnamita/);
});

test('edition descriptions do not promise a complete publication or download for drafts and samples',()=>{
  const work=visible[0],published=editions.find(edition=>edition.work_id===work.id&&isPublicEdition(edition,work));
  for(const status of ['draft','planned','sample','withdrawn'])for(const locale of locales){
    const description=readerPageDescription(work,{...published,status},locale,languageNames);
    assert.ok(!description.includes('EPUB')&&!description.includes('TXT'));
    assert.notEqual(description,readerPageDescription(work,published,locale,languageNames));
  }
});

test('work descriptions name only this work’s published text languages',()=>{
  const work=works.find(work=>work.id==='machado-um-apologo');
  const pending={id:'future-french',work_id:work.id,language:'fr',kind:'translation',status:'draft',content_path:'pending.json'};
  const otherWork={...pending,id:'other-work-french',work_id:'unrelated',status:'published'};
  const description=workPageDescription(work,[...editions,pending,otherWork],'fr',languageNames);
  assert.match(description,/portugais et vietnamien/);
  assert.doesNotMatch(description,/français/);
  const demo=works.find(work=>work.visibility==='demo');
  assert.ok(!workPageDescription(demo,editions,'en',languageNames).includes('EPUB'));
});

test('author anchors are stable for accents, pen names and non-Latin names',()=>{
  assert.equal(authorSlug('Emilia Pardo Bazán'),'emilia-pardo-bazan');
  assert.equal(authorSlug('Saki (H. H. Munro)'),'saki-h-h-munro');
  assert.equal(authorSlug('Đặng Thùy Trâm'),'dang-thuy-tram');
  assert.equal(authorSlug('夏目 漱石'),'夏目-漱石');
  const authors=[...new Set(visible.map(work=>work.author))];
  assert.equal(new Set(authors.map(authorSlug)).size,authors.length);
});
