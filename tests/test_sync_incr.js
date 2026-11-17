// Инкрементальная синхронизация: скачиваются только новые и изменённые файлы; автозапуск раз в час и в одной вкладке
const { chromium } = require('playwright'); const R=require('path').join(__dirname,'..'); const fs=require('fs'); const path=require('path'); const http=require('http');
const N=300; const VAC=['Бухгалтер','Юрист','Водитель','Маркетолог','Программист'];
let files=[]; for(let i=1;i<=N;i++) files.push({ID:String(5000+i),NAME:`cv_${i}.txt`,SIZE:'500',UPDATE_TIME:'2026-11-01T10:00:00+05:00',CREATE_TIME:'2026-11-01T10:00:00+05:00',PATH:[VAC[i%5],`Кандидат${i} Тестов 01.11.2026`],DETAIL_URL:'/disk/'+i});
let downloads=0, lists=0;
const body=f=>`Кандидат${f.ID} Тестов\nДолжность: ${f.PATH[0]}\nТелефон: +992 90 ${f.ID}\nОпыт работы 2018–2024 ${f.PATH[0]} в ООО «Сомон»${f.v?' версия '+f.v:''}`;
const srv=http.createServer((q,r)=>{ const u=new URL(q.url,'http://x');
  if(u.pathname.endsWith('api.php')){ const a=u.searchParams.get('a'); r.setHeader('Content-Type','application/json; charset=utf-8');
    if(a==='ping') return r.end(JSON.stringify({ok:true,sessid:'s'}));
    if(a==='list'){ lists++; return r.end(JSON.stringify({ok:true,root:{id:58451,name:'Резюме'},folders:N,count:files.length,ms:5,items:files})); }
    if(a==='file'){ downloads++; const f=files.find(x=>x.ID===u.searchParams.get('id')); r.setHeader('Content-Type','text/plain; charset=utf-8'); return r.end(body(f)); }
    return r.end('{}'); }
  const f=path.join(R, decodeURIComponent(u.pathname)); fs.readFile(f,(e,d)=>{ if(e){r.writeHead(404);return r.end();} r.writeHead(200,{'Content-Type':/\.html$/.test(f)?'text/html; charset=utf-8':'application/octet-stream'}); r.end(d); }); });
async function open(ctx, page){ const p=await ctx.newPage(); await p.goto('http://localhost:8770/'+page); await p.waitForFunction(()=>window.AVB,{timeout:60000}); return p; }
async function syncNow(p){ await p.evaluate(()=>bxSync()); }
async function upgrade(){
  const b=await chromium.launch(); const ctx=await b.newContext(); await ctx.addInitScript(s=>{ try{ sessionStorage.setItem('avb_session', s); }catch(e){} }, JSON.stringify({login:'iso@avesto.tj',exp:Date.now()+3600e3}));
  let p=await open(ctx,'_old.html'); await p.evaluate(()=>{ localStorage.setItem('avb_folder','58451'); bxFolder.value='58451'; }); await syncNow(p); await p.close();
  p=await open(ctx,'index.html'); await p.evaluate(()=>{ bxFolder.value='58451'; });
  downloads=0; const t0=Date.now(); await syncNow(p); const t1=Date.now()-t0;
  downloads2=downloads; downloads=0; await syncNow(p);
  console.log('Переход со старой версии: первая синхронизация скачала', downloads2, 'файлов за', (t1/1000).toFixed(1),'с; следующая —', downloads);
  // таймер: страница открыта, прошёл час
  await p.clock.install(); lists=0;
  await p.evaluate(()=>{ SYNC.last=Date.now()-59*60000; const s=JSON.parse(localStorage.getItem('avb_sync')); s.last=SYNC.last; localStorage.setItem('avb_sync',JSON.stringify(s)); armSync(); });
  await p.clock.runFor(60000); await p.waitForTimeout(1500); const a=lists;
  await p.clock.runFor(60000); await p.waitForTimeout(3000); const c=lists;
  console.log('Таймер: через 59+1 мин запусков', a, '; через 61 мин —', c);
  await b.close(); }
let downloads2=0;
async function run(page){
  const b=await chromium.launch(); const ctx=await b.newContext(); await ctx.addInitScript(s=>{ try{ sessionStorage.setItem('avb_session', s); }catch(e){} }, JSON.stringify({login:'iso@avesto.tj',exp:Date.now()+3600e3}));
  const res={};
  let p=await open(ctx,page); await p.evaluate(()=>{ localStorage.setItem('avb_folder','58451'); bxFolder.value='58451'; });
  downloads=0; await syncNow(p); res['1. первая синхронизация (300 файлов)']=downloads;
  downloads=0; await syncNow(p); res['2. повторная синхронизация, ничего не менялось']=downloads;
  // 3 новых + 2 изменённых
  for(let i=N+1;i<=N+3;i++) files.push({ID:String(5000+i),NAME:`cv_${i}.txt`,SIZE:'500',UPDATE_TIME:'2026-11-17T10:00:00+05:00',PATH:['Юрист',`Новый${i} Тестов 17.11.2026`]});
  files[10]={...files[10],UPDATE_TIME:'2026-11-17T11:00:00+05:00',v:2}; files[20]={...files[20],UPDATE_TIME:'2026-11-17T11:00:00+05:00',v:2};
  downloads=0; await syncNow(p); res['3. 3 новых + 2 изменённых на Диске']=downloads;
  res['   записей в базе']=await p.evaluate(()=>DATA.length);
  res['   изменённый файл переразобран']=await p.evaluate(()=>/версия 2/.test((DATA.find(c=>c.id==='bx:5011')||{}).raw||''));
  await p.close();
  // открыть заново через 10 минут
  downloads=0; lists=0; p=await open(ctx,page); await p.waitForTimeout(4000); res['4. открыть заново через 10 мин: запусков синхронизации']=lists;
  await p.close();
  // открыть заново через 61 мин (сдвигаем отметку последней синхронизации)
  await (async()=>{ const q=await open(ctx,page); await q.evaluate(()=>{ const s=JSON.parse(localStorage.getItem('avb_sync')); s.last=Date.now()-61*60000; localStorage.setItem('avb_sync',JSON.stringify(s)); }); await q.close(); })();
  downloads=0; lists=0; p=await open(ctx,page); const p2=await open(ctx,page); await p.waitForTimeout(6000);
  res['5. открыть 2 вкладки через 61 мин: запусков / скачано файлов']=lists+' / '+downloads;
  await b.close(); return res; }
(async()=>{ await new Promise(r=>srv.listen(8770,r));
  const n=await run('index.html');
  const pass=[n['1. первая синхронизация (300 файлов)']===300, n['2. повторная синхронизация, ничего не менялось']===0,
    n['3. 3 новых + 2 изменённых на Диске']===5, n['   записей в базе']===303, n['   изменённый файл переразобран']===true,
    n['4. открыть заново через 10 мин: запусков синхронизации']===0, n['5. открыть 2 вкладки через 61 мин: запусков / скачано файлов']==='1 / 0'];
  Object.keys(n).forEach(k=>console.log(k.padEnd(62), n[k]));
  console.log('Пройдено '+pass.filter(Boolean).length+'/'+pass.length); srv.close(); process.exit(pass.every(Boolean)?0:1); })();
