import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const root = path.resolve(process.argv[2] || '.');
const base = 'https://mcgm78.github.io/casa-pomar-silves/';
const versions = {pt:['pt-PT','index.html',''],en:['en','en.html','en.html'],de:['de','de.html','de.html'],fr:['fr','fr.html','fr.html']};
const expected = {
  pt:['O seu próximo capítulo.','Ver as 50 fotografias','Gostaria de agendar uma visita'],
  en:['Your next chapter.','View all 50 photos','I would like to arrange a viewing'],
  de:['Ihr nächstes Kapitel.','Alle 50 Fotos ansehen','Ich möchte eine Besichtigung vereinbaren'],
  fr:['Votre prochain chapitre.','Voir les 50 photos','Je souhaiterais organiser une visite']
};
for (const [language,[htmlLanguage,file,suffix]] of Object.entries(versions)) {
  const page = fs.readFileSync(path.join(root,file),'utf8');
  assert(page.includes(`<html lang="${htmlLanguage}">`));
  assert(page.includes(`<link rel="canonical" href="${base+suffix}">`));
  assert(page.includes(`<meta property="og:url" content="${base+suffix}">`));
  for (const [other,[,,target]] of Object.entries(versions)) {
    assert(page.includes(`hreflang="${other}" href="${base+target}"`));
  }
  assert(page.includes('hreflang="x-default"'));
  assert(page.includes(`hreflang="${language}" aria-current="page"`));
  expected[language].forEach(text=>assert(page.includes(text),`Missing ${language} text: ${text}`));
  assert(!page.includes('photo-download') && !page.includes('images/original/'));
  assert(page.includes('<s>840 000 €</s>') && page.includes('780 000'));
  assert(page.includes('Julio Miranda') && page.includes('jmiranda@t-online.de'));
  const json = JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
  assert.equal(json.url,base+suffix);
  assert.equal(json.inLanguage,htmlLanguage);
  assert.equal(json.offers.price,780000);
  assert.equal(json.offers.itemOffered.numberOfBedrooms,6);
  const ids=[...page.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(ids.length,new Set(ids).size);
  for (const [,rawUrl] of page.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const url=rawUrl.split('?')[0];
    if (/^(https?:|data:|tel:|mailto:)/.test(url)) continue;
    if(url.startsWith('#')) assert(ids.includes(url.slice(1)),`Broken ${language} anchor ${url}`);
    else assert(fs.existsSync(path.join(root,url)),`Missing ${language} asset ${url}`);
  }
  const context={window:{},document:{documentElement:{lang:htmlLanguage}}};
  for(const script of ['property.js','tour-data.js','i18n.js'])vm.runInNewContext(fs.readFileSync(path.join(root,script),'utf8'),context);
  const {t}=context.window.HOUSE_I18N;
  assert.equal(context.window.PROPERTY_CONFIG.photos.length,50);
  assert.equal(Object.keys(context.window.HOUSE_TOUR.scenes).length,23);
  assert.equal(context.window.PROPERTY_CONFIG.whatsappNumber,'491727134094');
  assert.equal(context.window.PROPERTY_CONFIG.telephoneNumber,'351919825799');
  assert.equal(context.window.PROPERTY_CONFIG.email,'jmiranda@t-online.de');
  const caption=t('Abrir fotografia {id}: {alt}',{id:50,alt:context.window.PROPERTY_CONFIG.photos[49].alt});
  assert(caption.includes('50') && !caption.includes('{'));
  assert(!t('A mostrar {shown} de {total}',{shown:29,total:29}).includes('{'));
  assert(t('O meu nome é {name}.',{name:'Alex'}).includes('Alex'));
  if(language!=='pt'){
    context.window.PROPERTY_CONFIG.photos.forEach(photo=>assert(!/Fachada|Quarto|Cozinha|Casa de banho|Terraço|Pátio|Varanda|Pomar|arrumação|Corredor|Paisagem|Vista |Sala /.test(photo.alt),`Untranslated ${language} photo ${photo.id}`));
    Object.values(context.window.HOUSE_TOUR.scenes).forEach(scene=>{
      assert(!/Piso|Anexo|Wc|Entrada|Cozinha|Exterior casa/.test(scene.title));
      scene.hotSpots.forEach(hotspot=>assert(context.window.HOUSE_TOUR.scenes[hotspot.sceneId]));
    });
    assert.notEqual(t('A preparar a visita virtual…'),'A preparar a visita virtual…');
    assert.notEqual(t('Olá!'),'Olá!');
  }
}
const sitemap=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
assert.equal([...sitemap.matchAll(/<url>/g)].length,4);
assert.equal([...sitemap.matchAll(/<image:image>/g)].length,200);
console.log(JSON.stringify({languages:['pt','en','de','fr'],pages:4,photosPerLanguage:50,tourScenesPerLanguage:23,price:780000,contacts:'preserved',result:'passed'}));
