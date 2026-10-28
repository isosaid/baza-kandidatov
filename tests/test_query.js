// Разбор свободного описания вакансии в структурированные критерии
const { chromium } = require('playwright');
const path = require('path');

const CASES = [
  { q: 'Нужен главный бухгалтер. Опыт от 5 лет, обязательно 1С и МСФО, высшее образование, Душанбе.',
    want: { pos: 'Нужен главный бухгалтер', exp: 5, edu: 4, city: 'Душанбе', skills: ['1С', 'МСФО'] } },
  { q: 'Требуется главный инженер для строительной компании. Опыт работы от 7 лет, знание строительных норм, AutoCAD, управление командой от 20 человек. Душанбе или готов к переезду.',
    want: { exp: 7, city: 'Душанбе', skills: ['AutoCAD', 'Строительные нормы', 'Управление командой'] } },
  { q: 'Ищем специалиста AML в банк, опыт 3 года, английский язык, высшее.',
    want: { exp: 3, edu: 4, lang: 'английский', skills: ['AML'] } },
  { q: 'Графический дизайнер, Photoshop, Illustrator, CorelDRAW, Бохтар',
    want: { city: 'Бохтар', skills: ['Photoshop', 'Illustrator', 'CorelDRAW', 'Графический дизайн'] } },
  { q: 'Сарҳисобдор лозим аст. Таҷриба аз 5 сол, 1С, маълумоти олӣ, Хуҷанд.',
    want: { exp: 5, edu: 4, city: 'Худжанд', skills: ['1С'] } },
  { q: 'Юрист с опытом договорной работы от 4 лет, Куляб',
    want: { exp: 4, city: 'Куляб', skills: ['Юриспруденция', 'Договорная работа'] } },
];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await require('./_login').loggedIn(p);
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => window.AVB, { timeout: 30000 });
  let ok = 0, total = 0;
  for (const c of CASES) {
    const got = await p.evaluate(q => window.AVB.parseQuery(q), c.q);
    const probs = [];
    for (const k of Object.keys(c.want)) {
      total++;
      if (k === 'skills') {
        const missing = c.want.skills.filter(s => !got.skills.includes(s));
        if (missing.length) probs.push(`навыки не найдены: ${missing.join(', ')}`); else ok++;
      } else if (k === 'pos') {
        if (got.pos && got.pos.includes('бухгалтер')) ok++; else probs.push(`позиция: «${got.pos}»`);
      } else {
        if (got[k] === c.want[k]) ok++; else probs.push(`${k}: получено ${JSON.stringify(got[k])}, ожидалось ${JSON.stringify(c.want[k])}`);
      }
    }
    console.log(`${probs.length ? '✕' : '✓'} ${c.q.slice(0, 62)}…`);
    if (probs.length) probs.forEach(x => console.log(`    └ ${x}`));
    else console.log(`    поз.: «${got.pos}» · опыт ${got.exp} · обр. ${got.edu} · ${got.city || '—'} · ${got.lang || '—'} · навыки: ${got.skills.join(', ') || '—'}`);
  }
  console.log(`\nПройдено проверок: ${ok}/${total}`);
  await b.close();
  process.exit(ok === total ? 0 : 1);
})();
