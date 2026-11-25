// Оценка ИИ: требования из критериев, обезличивание, расчёт процента платформой, проверка цитат,
// потолок за невыполненное обязательное требование. Портал и модель имитируются (api.php перехватывается).
// Плюс быстрая оценка: «строитель» не должен находиться по факультету или названию работодателя.
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs'); const http=require('http');
const R=path.join(__dirname,'..'), D=__dirname+'/relevance', files=fs.readdirSync(D).map(f=>D+'/'+f);
const srv=http.createServer((q,r)=>{ const f=path.join(R, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);return r.end();} r.writeHead(200,{'Content-Type':/\.html$/.test(f)?'text/html; charset=utf-8':'application/octet-stream'}); r.end(d); }); });
const sent=[];
// ответы «модели» по содержанию резюме
function answer(body){
  const t=body.resume, ids=body.requirements.map(x=>x.id), all=(st,ev)=>ids.map(id=>({id,status:st,evidence:ev}));
  if(/каменщик/i.test(t)) return {requirements:all('yes','Строитель, каменщик 4 разряда'), periods:[{from:'2016-01',to:'present',role:'Строитель',relevant:'yes'},{from:'2013-01',to:'2016-12',role:'Подсобный рабочий',relevant:'partial'}], candidate_level:'senior', summary:'Строитель-каменщик, 8+ лет на стройке.'};
  if(/Инженер-строитель/i.test(t)) return {requirements:all('yes','Инженер-строитель, прораб'), periods:[{from:'2015-01',to:'2024-12',role:'Инженер-строитель',relevant:'yes'}], candidate_level:'lead', summary:'Инженер-строитель и прораб.'};
  if(/SMM/i.test(t)) return {requirements:all('no','Менеджер по работе с клиентами и SMM'), periods:[{from:'2022-02',to:'2023-01',role:'SMM',relevant:'no'},{from:'2023-02',to:'2024-02',role:'Офис-менеджер',relevant:'no'}], candidate_level:'junior', summary:'Опыта в строительстве нет: SMM и офис-менеджер.'};
  if(/Бухгалтер/i.test(t)) return {requirements:all('yes','Руководил строительством жилого комплекса'), periods:[{from:'2017-01',to:'2024-12',role:'Бухгалтер',relevant:'no'}], candidate_level:'middle', summary:'Бухгалтер.'};   // выдуманная цитата
  return {requirements:all('unknown',''), periods:[{from:'2021-01',to:'2023-12',role:'Диспетчер',relevant:'no'}], candidate_level:'junior', summary:'Диспетчер, опыта строителя нет; строительство — только в названии факультета.'};
}
(async()=>{ await new Promise(r=>srv.listen(8771,r)); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1300,height:1200}}); const err=[]; p.on('pageerror',e=>err.push(e.message));
await p.route('**/api.php**', async (route, req)=>{ const a=new URL(req.url()).searchParams.get('a');
  if(a==='ping') return route.fulfill({json:{ok:true,sessid:'s'}});       // как внутри портала
  if(a==='ai_status') return route.fulfill({json:{ok:true,enabled:true,model:'claude-sonnet-5-5'}});
  if(a==='ai'){ const body=JSON.parse(req.postData()); sent.push(body); return route.fulfill({json:{ok:true,result:answer(body),model:'claude-sonnet-5-5'}}); }
  return route.fulfill({json:{ok:false}}); });
await require('./_login').loggedIn(p); await p.goto('http://localhost:8771/index.html'); await p.waitForFunction(()=>window.AVB&&window.pdfjsLib&&window.mammoth,{timeout:60000});
await p.evaluate(()=>{ document.getElementById('fIn').removeAttribute('hidden'); }); await p.setInputFiles('#fIn',files); await p.waitForFunction(n=>window.AVB.DATA.length>=n,files.length,{timeout:60000});
await p.click('[data-v=match]'); await p.fill('#qFree','Нужен строитель в строительную компанию, опыт от 3 лет'); await p.evaluate(()=>{applyQuery(); cTop.value=10; runMatch();});
const quick = await p.evaluate(()=>LAST_SHORT.map(s=>s.c.name));
// для проверки ИИ берём всех пятерых (в шорт-листе после быстрой оценки остаются только строители)
await p.evaluate(()=>{ LAST_SHORT = DATA.map(c=>({c, score:0})); });
await p.evaluate(()=>aiRunShort()); await p.waitForFunction(()=>!AI_RUNNING,null,{timeout:30000});
const ai = await p.evaluate(async()=>{ const crit=LAST_CRIT; const out={}; for(const c of DATA){ const a=await aiAssess(c,crit); out[c.name]={score:a.score, band:a.band, years:a.years, unverified:a.reqs.filter(r=>r.unverified).length, mustNo:a.mustNo}; } return out; });
const card = await p.locator('#matchOut .cand-card').first().innerText();
await p.locator('#matchOut .cand-card').first().locator('.why-toggle').click(); await p.waitForTimeout(200);
await p.locator('#matchOut .cand-card').first().screenshot({path:process.env.SHOT||'/tmp/ai_card.png'}).catch(()=>{});
const leak = sent.some(s=>/\+992|@mail|@gmail|Рахмонов|Юсупова|Каримова|Холова|Назаров|900000001|example\.com/.test(s.resume));
Object.entries(ai).forEach(([k,v])=>console.log(k.padEnd(34), JSON.stringify(v)));
console.log('быстрая оценка, шорт-лист:', quick);
console.log('запросов к ИИ:', sent.length, '| в резюме для ИИ есть ФИО/телефоны/email:', leak, '| требований в запросе:', sent[0]&&sent[0].requirements.length);
const n=Object.fromEntries(Object.entries(ai).map(([k,v])=>[k.split(' ')[0],v]));
const checks=[ quick.length===2 && quick.every(x=>/Рахмонов|Назаров/.test(x)),
  n['Рахмонов'].score>=85, n['Назаров'].score>=85, n['Юсупова'].score<=40, n['Каримова'].score<=50,
  n['Холова'].unverified>0 && n['Холова'].score<=60, !leak, sent.length===5, /ИИ:/.test(card), err.length===0 ];
console.log('Пройдено '+checks.filter(Boolean).length+'/'+checks.length, err); await b.close(); srv.close(); process.exit(checks.every(Boolean)?0:1); })();
