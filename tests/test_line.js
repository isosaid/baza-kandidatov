// Стаж по линии профессии: «HR» — сначала те, у кого большой стаж именно в HR; бухгалтер, совмещавший кадры год,
// и офис-менеджер с кадровым делопроизводством — ниже и без 100%. Синонимы: HR = персонал = кадры = рекрутер.
const { chromium } = require('playwright'); const fs=require('fs'); const path=require('path');
const R=path.join(__dirname,'..'), D=__dirname+'/hr_line', files=fs.readdirSync(D).map(f=>D+'/'+f);
(async()=>{ const b=await chromium.launch(); const p=await b.newPage(); await require('./_login').loggedIn(p);
 await p.goto('file://'+R+'/index.html'); await p.waitForFunction(()=>window.AVB&&window.pdfjsLib&&window.mammoth,{timeout:60000});
 await p.evaluate(()=>document.getElementById('fIn').removeAttribute('hidden')); await p.setInputFiles('#fIn',files); await p.waitForFunction(n=>window.AVB.DATA.length>=n,files.length,{timeout:60000});
 const run = async q => { await p.click('[data-v=match]'); await p.evaluate(()=>clearCrit()); await p.fill('#qFree',q); await p.evaluate(()=>{applyQuery(); runMatch();});
   return p.evaluate(()=>LAST_SHORT.map(s=>({n:s.c.name.split(' ')[0], sc:s.score, y:s.lineY}))); };
 const a = await run('HR'), b2 = await run('HR менеджер, опыт от 3 лет'), c = await run('Нужен HR-специалист: подбор персонала, кадровое делопроизводство, адаптация');
 const ly = await p.evaluate(()=>{ const L=roleLine('HR'); return Object.fromEntries(DATA.map(c=>[c.name.split(' ')[0], lineYears(c,L)])); });
 [['HR',a],['HR менеджер, от 3 лет',b2],['HR-специалист…',c]].forEach(([q,l])=>console.log(q.padEnd(22), l.map(x=>x.n+' '+x.sc+'%').join(' · ')));
 console.log('стаж по линии HR:', JSON.stringify(ly));
 const pos = (l,n)=>l.findIndex(x=>x.n===n), sc = (l,n)=>(l.find(x=>x.n===n)||{sc:0}).sc;
 const checks = [
   a.slice(0,3).every(x=>['Сафарова','Давлатова','Олимов'].includes(x.n)),          // по «HR» — HR, кадры, рекрутер
   ly['Сафарова']>=12 && ly['Давлатова']>=5 && ly['Олимов']>=5 && ly['Тошева']<=1 && ly['Латипова']<=1 && !ly['Бобоев'],
   pos(b2,'Сафарова')===0, sc(b2,'Тошева')<60, sc(b2,'Латипова')<60,
   sc(c,'Тошева')<60 && sc(c,'Латипова')<60 && pos(c,'Тошева')>pos(c,'Олимов'),
   !a.concat(b2,c).some(x=>x.n==='Бобоев'),                                          // главный бухгалтер не попадает
   !a.concat(b2,c).some(x=>['Тошева','Латипова'].includes(x.n) && x.sc>=100) ];
 console.log('Пройдено '+checks.filter(Boolean).length+'/'+checks.length); await b.close(); process.exit(checks.every(Boolean)?0:1); })();
