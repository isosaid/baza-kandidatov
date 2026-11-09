// Подбор папки вакансии при загрузке и размещение на Диске (портал имитируется: api.php перехватывается)
const { chromium } = require('playwright'); const R=require('path').join(__dirname,'..'); const D=__dirname+'/place_data'; const fs=require('fs'); const path=require('path');
const MAP=JSON.parse(fs.readFileSync(D+'/map.json','utf8'));
const base=Object.keys(MAP).filter(a=>a.startsWith('base')).map(a=>[MAP[a],D+'/'+a]);
const fresh=Object.keys(MAP).filter(a=>a.startsWith('new')).map(a=>D+'/'+a);
const http=require('http');
const srv=http.createServer((q,r)=>{ const f=path.join(R, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);return r.end();} r.writeHead(200,{'Content-Type':/\.html$/.test(f)?'text/html; charset=utf-8':/\.js$/.test(f)?'text/javascript':'application/octet-stream'}); r.end(d); }); });
(async()=>{ await new Promise(r=>srv.listen(8766,r)); const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1300,height:1000}}); const err=[]; p.on('pageerror',e=>err.push(e.message));
const uploads=[]; let srvOn=false; 
await p.route('**/api.php**', async (route, req)=>{ const u=new URL(req.url()); const a=u.searchParams.get('a');
  if(a==='ping') return route.fulfill({json: srvOn ? {ok:true,user:{id:1,name:'Тест'},sessid:'abc123'} : {ok:false}});
  if(a==='upload'){ const body=req.postDataBuffer().toString('latin1'); const get=k=>{const m=body.match(new RegExp('name="'+k+'"\\r\\n\\r\\n([^\\r]*)'));return m?Buffer.from(m[1],'latin1').toString('utf8'):null};
    uploads.push({sessid:get('sessid'),root:get('root'),vacancy:get('vacancy'),person:get('person'),new:get('new'),size:body.length});
    return route.fulfill({json:{ok:true,item:{ID:String(90000+uploads.length),NAME:'x.txt',SIZE:'1',PATH:['Резюме',get('vacancy'),get('person')],DETAIL_URL:'/disk/'+uploads.length}}}); }
  return route.fulfill({json:{ok:false,error:'?'}}); });
await require(R+'/tests/_login').loggedIn(p); await p.goto('http://localhost:8766/index.html'); await p.waitForFunction(()=>window.AVB&&window.pdfjsLib&&window.mammoth,{timeout:60000});
await p.evaluate(()=>{window.AVB_NO_AUTOSYNC=true; document.getElementById('fIn').removeAttribute('hidden')});
await p.setInputFiles('#fIn',base.map(x=>x[1])); await p.waitForFunction(n=>window.AVB.DATA.length>=n,base.length,{timeout:60000});
await p.evaluate(async m=>{ for(const c of window.AVB.DATA){ c.folder=m[c.file]; } await dbPut(window.AVB.DATA); DATA=await dbAll(); }, Object.fromEntries(base.map(([f,x])=>[path.basename(x),f])));
await p.click('[data-v=admin]'); await p.click('text=Проверить на базе'); await p.waitForFunction(()=>/Проверено/.test(vacEvalOut.textContent),null,{timeout:30000});
console.log('ПРОВЕРКА:', await p.textContent('#vacEvalOut'));
await p.click('[data-v=load]'); await p.evaluate(()=>{placeCard.style.display='none'}); const baseUploads=uploads.length; srvOn=true; await p.evaluate(()=>{SRV_OK=null;}); await p.setInputFiles('#fIn',fresh); await p.waitForFunction(()=>getComputedStyle(placeCard).display==='block'&&PLACE.length>=9,null,{timeout:60000}); await p.waitForFunction(()=>/Размещено/.test(placeStatus.textContent),null,{timeout:30000});
const rows=await p.evaluate(()=>PLACE.map(id=>DATA.find(c=>c.id===id)).filter(Boolean).map(c=>({f:c.file,folder:c.folder,how:c.vacAI&&c.vacAI.how,top:(c.vacAI.top||[]).map(x=>x.folder+':'+x.score).join(' | ')})));
let ok=0; rows.forEach(r=>{const exp=MAP[r.f]; const hit=r.folder===exp; ok+=hit; console.log(hit?'✓':'✕', r.f.padEnd(30), '→', String(r.folder).padEnd(24), r.how, ' ', r.top);});
console.log('новых угадано:', ok+'/'+rows.length);

// ручная смена у одного и размещение
await p.waitForFunction(()=>/Размещено/.test(placeStatus.textContent),null,{timeout:30000});   // сохраняется на Диск сам, без кнопки
console.log(await p.textContent('#placeStatus'));
console.log('upload[0]:', JSON.stringify(uploads[0]), ' всего:', uploads.length);
const after=await p.evaluate(()=>({place:PLACE.slice(0,2), local:DATA.filter(c=>c.id.startsWith('f:')&&/new|_6/.test(c.file)).length, bx:DATA.filter(c=>c.id.startsWith('bx:9')).map(c=>c.folder+' / '+c.bxPersonDir).slice(0,2)}));
console.log(JSON.stringify(after));

const evalOk = /первого варианта: <b>(\d+)%/.exec(await p.innerHTML('#vacEvalOut'));
  const pass = [ok===rows.length, uploads.length===9, uploads.every(u=>u.sessid==='abc123'), uploads.every(u=>u.root==='58451') && baseUploads===0, uploads.map(u=>u.vacancy).join()===rows.map(r=>r.folder).join() || console.log('vac', uploads.map(u=>u.vacancy)), after.local===0, err.length===0, evalOk && +evalOk[1]>=80];
  console.log('Пройдено '+pass.filter(Boolean).length+'/'+pass.length); await b.close(); srv.close(); process.exit(pass.every(Boolean)?0:1);})();
