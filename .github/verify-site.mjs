import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const dist = path.resolve(process.argv[2] || 'dist');
const html = fs.readFileSync(path.join(dist,'index.html'),'utf8');
const context = {window:{}};
vm.runInNewContext(fs.readFileSync(path.join(dist,'property.js'),'utf8'),context);
vm.runInNewContext(fs.readFileSync(path.join(dist,'tour-data.js'),'utf8'),context);
const property = context.window.PROPERTY_CONFIG;
const tour = context.window.HOUSE_TOUR;

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match=>match[1]);
assert.equal(ids.length,new Set(ids).size,'HTML ids must be unique');
for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
  const url = match[1].split('?')[0];
  if (/^(https?:|data:|tel:|mailto:)/.test(url)) continue;
  if (url.startsWith('#')) assert(ids.includes(url.slice(1)),`Unknown anchor ${url}`);
  else assert(fs.existsSync(path.join(dist,url)),`Missing resource ${url}`);
}
const scripts = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
assert.equal(scripts.length,1);
scripts.forEach(match=>JSON.parse(match[1]));

assert.equal(property.photos.length,50);
assert.equal(new Set(property.photos.map(photo=>photo.id)).size,50);
assert.equal(property.whatsappNumber,'491727134094');
assert.equal(property.telephoneNumber,'351919825799');
assert.equal(property.email,'jmiranda@t-online.de');
assert.equal(property.price,780000);
assert.equal(property.contactName,'Julio Miranda');
const whatsappLinks = [...html.matchAll(/href="https:\/\/wa\.me\/(\d+)"/g)].map(match => match[1]);
assert(whatsappLinks.length >= 7);
assert(whatsappLinks.every(number => number === property.whatsappNumber));
const telephoneLinks = [...html.matchAll(/href="tel:\+(\d+)"/g)].map(match => match[1]);
assert.equal(telephoneLinks.length,2);
assert(telephoneLinks.every(number => number === property.telephoneNumber));
const emailLinks = [...html.matchAll(/href="mailto:([^"]+)"/g)].map(match => match[1]);
assert.equal(emailLinks.length,2);
assert(emailLinks.every(email => email === property.email));
const categories = Object.fromEntries(['interior','exterior','vistas'].map(category=>[category,property.photos.filter(p=>p.category===category).length]));
assert.deepEqual(categories,{interior:29,exterior:11,vistas:10});
for (const photo of property.photos) {
  for (const resource of [`images/original/${photo.file}.jpg`,`images/large/${photo.file}.webp`,`images/thumb/${photo.file}.webp`]) {
    assert(fs.statSync(path.join(dist,resource)).size > 5000,`Invalid photo ${resource}`);
  }
}
assert.equal(Object.keys(tour.scenes).length,23);
assert.equal(tour.sceneOrder.length,23);
assert(tour.scenes[tour.firstScene]);
let links = 0;
for (const [id,scene] of Object.entries(tour.scenes)) {
  assert.equal(scene.type,'cubemap');
  assert.equal(scene.cubeMap.length,6);
  for (const resource of [...scene.cubeMap,scene.preview]) assert(fs.statSync(path.join(dist,resource)).size > 1000,`Missing panorama image ${resource}`);
  assert(scene.minPitch < scene.maxPitch);
  assert(scene.minHfov <= scene.hfov && scene.hfov <= scene.maxHfov);
  for (const hotspot of scene.hotSpots) {
    assert(tour.scenes[hotspot.sceneId],`Broken panorama link from ${id}`);
    assert(Number.isFinite(hotspot.pitch) && Number.isFinite(hotspot.yaw));
    links++;
  }
}
assert.equal(links,60);
const reached = new Set();
function explore(id){if(reached.has(id))return;reached.add(id);tour.scenes[id].hotSpots.forEach(hotspot=>explore(hotspot.sceneId));}
explore(tour.firstScene);
assert.equal(reached.size,23,'Every panorama must be reachable from the entrance');
for (const filename of ['index.html','property.js','app.js','tour-data.js','tour.js']) {
  const content = fs.readFileSync(path.join(dist,filename),'utf8');
  assert(!/244930689650|\+244 930 689 650|vdubinava|Andrea Nervegna|Olga Dubinava|remax\.pt/i.test(content),`Unexpected old contact in ${filename}`);
}
const css = fs.readFileSync(path.join(dist,'styles.css'),'utf8');
assert(css.includes('[hidden]{display:none!important}'));
assert(css.includes('@media(max-width:700px)'));
assert(css.includes('prefers-reduced-motion'));
console.log(JSON.stringify({photos:50,panoramas:23,panoramaLinks:links,reachablePanoramas:reached.size,resources:'all present',contacts:'Julio Miranda; WhatsApp +49; phone +351; email',result:'passed'}));
