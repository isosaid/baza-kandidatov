// Дизайнерские резюме (Canva и т.п.): имя в две-три строки, заголовки с разрядкой, подзаголовок-должность под именем
const { chromium } = require('playwright'); const path = require('path');
const R = path.join(__dirname, '..'), D = path.join(__dirname, 'design_cv');
const EXPECT = {
  'Sorbon_Nabiev_CV.pdf': {name:'Сорбон Набиев', position:'Специалист по глобальным операциям и международным отношениям', category:'Проектная работа и международное сотрудничество', search:'Набиев'},
  'CV_new.pdf':           {name:'Фируза Шарипова', position:'Менеджер по продажам', category:'Маркетинг, дизайн, PR и продажи', search:'Шарипова'},
  'Mukhammad.pdf':        {name:'Мухаммад Раҳимов Аминович', position:'Юрист', category:'Юриспруденция', search:'Раҳимов'},
};
(async()=>{
  const b = await chromium.launch(); const p = await b.newPage();
  await require('./_login').loggedIn(p); await p.goto('file://'+R+'/index.html');
  await p.waitForFunction(()=>window.AVB&&window.pdfjsLib&&window.mammoth,{timeout:60000});
  await p.evaluate(()=>document.getElementById('fIn').removeAttribute('hidden'));
  await p.setInputFiles('#fIn', Object.keys(EXPECT).map(f=>path.join(D,f)));
  await p.waitForFunction(()=>getComputedStyle(loadKpis).display==='grid',null,{timeout:60000});
  let ok=0, all=0;
  for(const [f,e] of Object.entries(EXPECT)){
    const c = await p.evaluate(f=>{ const c = window.AVB.DATA.find(x=>x.file===f); return c && {name:c.name, position:c.position, category:c.category, raw:c.raw}; }, f);
    const found = await p.evaluate(q=>{ qs.value=q; const r = currentFiltered().map(c=>c.file); qs.value=''; return r; }, e.search);
    const checks = [['имя',c&&c.name,e.name],['должность',c&&c.position,e.position],['категория',c&&c.category,e.category],
      ['поиск «'+e.search+'»', found.includes(f), true], ['без разрядки', c && !/(?:^|\n)(?:[А-Я] ){3,}/.test(c.raw), true]];
    for(const [k,got,exp] of checks){ all++; if(got===exp){ ok++; } else console.log('✕', f, k, JSON.stringify(got), '≠', JSON.stringify(exp)); }
  }
  console.log('Пройдено '+ok+'/'+all); await b.close(); process.exit(ok===all?0:1);
})();
