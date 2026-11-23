// Один человек — одна карточка: повторные отклики на разные позиции, одно резюме дважды, разное написание имени.
// Ловушки: однофамильцы (разные телефоны / разные резюме) объединяться не должны.
const { chromium } = require('playwright'); const path=require('path'); const fs=require('fs');
const R=path.join(__dirname,'..'); const TRUTH=JSON.parse(fs.readFileSync(__dirname+'/truth.json','utf8'));
(async()=>{const b=await chromium.launch(); const p=await b.newPage({viewport:{width:1300,height:1000}}); const err=[]; p.on('pageerror',e=>err.push(e.message));
await require('./_login').loggedIn(p); await p.goto('file://'+R+'/index.html'); await p.waitForFunction(()=>window.AVB&&window.pdfjsLib&&window.mammoth,{timeout:60000});
await p.evaluate(()=>document.getElementById('fIn').removeAttribute('hidden')); await p.setInputFiles('#fIn',TRUTH.map(t=>t.stage));
await p.waitForFunction(n=>window.AVB.DATA.length>=n,TRUTH.length,{timeout:120000});
const distinct = await p.evaluate(()=>DATA.length);
await p.evaluate(async()=>{
  const base = 'Опыт работы 2012–2024 ООО «Авесто Строй» начальник отдела транспорта, логистика, учёт ГСМ, путевые листы, договоры с перевозчиками. Образование высшее ТТУ транспорт. Навыки MS Excel, 1С, переговоры, склад, продажи. Языки русский таджикский английский. Город Москва.';
  const other = 'Опыт работы 2019–2024 банк «Эсхата» кредитный специалист, анализ заёмщиков, кредитные договоры, AML проверка. Образование высшее ТГУК финансы. Навыки кредитование, Excel, работа с клиентами. Город Душанбе.';
  const mk = (id,name,folder,raw,extra={}) => ({id, name, file:id+'.pdf', folder, position:folder, raw, skills:['MS Excel'], langs:[], city:'Душанбе', applied:Date.now()-id.length*1000, added:Date.now(), source:'bitrix', ...extra});
  const R2 = base.replace('2012','2011').replace('путевые листы','путевые листы и маршруты');
  await dbPut([
    // A. одно резюме — три позиции
    mk('dA1','Хуршед Фатоев','Специалист отдела транспорта', base, {phone:'+992 93 555 12 34'}),
    mk('dA2','Хуршед Фатоев','Специалист колл-центра', base, {phone:'+992 93 555 12 34'}),
    mk('dA3','Хуршед Фатоев','Офис-менеджер', base, {phone:'+992935551234'}),
    // B. имя по-разному, один телефон
    mk('dB1','Мухаммад Икбол Ахмедов','Специалист отдела стратегических разработок', other+' стратегия', {phone:'+992 90 111 22 33'}),
    mk('dB2','Мухаммадикбол Ахмедов','Специалист по управлению персоналом', other+' персонал подбор', {phone:'90-111-22-33'}),
    // C. имя по-разному, телефонов нет, тексты похожи
    mk('dC1','Abdunasim Rajabov','Экономист', other.replace('Эсхата','Алиф')),
    mk('dC2','Абдунасим Раджабов','Финансовый аналитик', other.replace('Эсхата','Алиф')+' финансовый анализ'),
    // D. одно резюме дважды, одна позиция
    mk('dD1','Салина Кахорова','Офис-менеджер', 'Салина Кахорова офис-менеджер делопроизводство приём звонков MS Word MS Excel юриспруденция продажи договоры архив документооборот корреспонденция', {email:'salina@mail.ru'}),
    mk('dD2','Салина Кахорова','Офис-менеджер', 'Салина Кахорова офис-менеджер делопроизводство приём звонков MS Word MS Excel юриспруденция продажи договоры архив документооборот корреспонденция', {email:'Salina@mail.ru '}),
    // E. однофамильцы с разными телефонами — разные люди
    mk('dE1','Фаррух Саидов','Водитель', 'Фаррух Саидов водитель категории C перевозка грузов ремонт автомобиля путевые листы доставка по городу стаж вождения', {phone:'+992 92 000 00 01'}),
    mk('dE2','Фаррух Саидов','Программист', 'Фаррух Саидов программист Python JavaScript React базы данных PostgreSQL REST API Git разработка интеграция', {phone:'+992 92 000 00 02'}),
    // H. общий телефон агентства у разных людей — разные люди
    mk('dH1','Манижа Сафарова','Кассир', 'кассир касса инкассация наличные расчёты POS терминал отчёт смены', {phone:'+992 44 600 00 00'}),
    mk('dH2','Комрон Давлатов','Охранник', 'охрана объекта пропускной режим видеонаблюдение обход территории', {phone:'+992 44 600 00 00'}),
    // F. однофамильцы без телефонов, резюме совсем разные — разные люди
    mk('dF1','Зарина Назарова','Бухгалтер', 'бухгалтерский учёт первичная документация 1С зарплата налоги сверка контрагенты авансовые отчёты банковские выписки закрытие месяца'),
    mk('dF2','Зарина Назарова','Дизайнер', 'графический дизайн Figma Photoshop Illustrator брендинг логотипы макеты полиграфия анимация социальные сети визуал'),
    // G. опечатка в имени, резюме почти одинаковые
    mk('dG1','Шахром Алиев','Логист', R2),
    mk('dG2','Шахром Олиев','Экспедитор', R2+' экспедирование'),
  ]);
  DATA = await dbAll(); refresh();
});
const res = await p.evaluate(()=>{ const P=personIndex(); const g=id=>P.of.get(id);
  return { same:{A:g('dA1')===g('dA2')&&g('dA2')===g('dA3'), B:g('dB1')===g('dB2'), C:g('dC1')===g('dC2'), D:g('dD1')===g('dD2'), G:g('dG1')===g('dG2')},
    diff:{H:g('dH1')!==g('dH2'), E:g('dE1')!==g('dE2'), F:g('dF1')!==g('dF2'), AvsG:g('dA1')!==g('dG1')}, records:DATA.length, people:P.groups.size }; });
const truthIds = await p.evaluate(()=>{ const P=personIndex(); return DATA.filter(c=>!c.id.startsWith('d')).map(c=>P.of.get(c.id)); });
const truthDistinct = new Set(truthIds).size===truthIds.length;
// шорт-лист: одна карточка Фатоева с тремя позициями
await p.click('[data-v=match]'); await p.fill('#qFree','Специалист отдела транспорта, опыт от 5 лет, MS Excel'); await p.evaluate(()=>{applyQuery(); runMatch();}); await p.waitForTimeout(500);
const cards = await p.evaluate(()=>[...document.querySelectorAll('#matchOut .cand-card')].map(c=>({n:c.querySelector('.cand-name').textContent, apps:[...c.querySelectorAll('.app-chip')].map(a=>a.textContent)})));
const fat = cards.filter(c=>/Фатоев/.test(c.n));
await p.locator('#matchOut .cand-card').filter({hasText:'Фатоев'}).first().screenshot({path:process.env.SHOT||'/tmp/dedup_card.png'}).catch(()=>{});
await p.click('[data-v=base]').catch(()=>{}); await p.evaluate(()=>{ go('match'); document.querySelector('#v-match [data-tab=base]')?.click(); renderBase(); });
const baseRows = await p.evaluate(()=>[...document.querySelectorAll('#tblBase tbody .nm')].filter(e=>/Фатоев/.test(e.textContent)).length);
const checks = [...Object.values(res.same), ...Object.values(res.diff), truthDistinct, fat.length===1, fat[0] && fat[0].apps.length===3, baseRows===1, err.length===0];
console.log(JSON.stringify(res)); console.log('тестовые резюме разных людей остались разными:', truthDistinct, `(${truthIds.length})`);
console.log('карточек Фатоева в шорт-листе:', fat.length, fat[0]&&fat[0].apps); console.log('строк Фатоева в базе:', baseRows, err);
console.log('Пройдено '+checks.filter(Boolean).length+'/'+checks.length); await b.close(); process.exit(checks.every(Boolean)?0:1);
})();
