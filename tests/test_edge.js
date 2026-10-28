// Проверки на ложные срабатывания — те случаи, которые ломали парсер
const { chromium } = require('playwright');
const path = require('path');

const CASES = [
  { t: 'Фамилия с «оли» не даёт высшее образование',
    text: 'Солиев Джамшед\nОбразование: колледж, среднее специальное', f: c => c.edu, want: 2 },
  { t: 'Слово «олимпиада» не даёт высшее образование',
    text: 'Иванов Пётр\nПобедитель олимпиады по математике\nОбразование: школа', f: c => c.edu, want: 1 },
  { t: '«Кассационная жалоба» не считается навыком «Касса»',
    text: 'Петров Иван\nГотовил кассационные жалобы и иски', f: c => c.skills.includes('Касса'), want: false },
  { t: '«Благодарности» не дают персидский язык',
    text: 'Сидоров Олег\nИмеет благодарности от руководства', f: c => c.langs.includes('персидский'), want: false },
  { t: 'Дата рождения не попадает в телефоны',
    text: 'Назарова Зарина\nДата рождения: 02.11.1986\nГород Душанбе', f: c => c.phones.length, want: 0 },
  { t: 'Годы учёбы не попадают в телефоны',
    text: 'Каримов Акбар\nОбразование\nТНУ, 2004-2009, высшее', f: c => c.phones.length, want: 0 },
  { t: 'Местный номер 918-34-56-78 распознаётся',
    text: 'Назарова Зарина\n918-34-56-78', f: c => c.phone, want: '+992918345678' },
  { t: 'Годы учёбы не засчитываются в стаж',
    text: 'Юсупов Карим\nОбразование\nТНУ, 2004-2009, высшее\nОпыт работы\n01.2020 - 01.2022, ООО «А», менеджер',
    f: c => c.exp, want: 2 },
  { t: 'Стаж считается и без заголовков разделов',
    text: 'Юсупов Карим\n01.2020 - 01.2022, ООО «А», менеджер', f: c => c.exp, want: 2 },
  { t: 'Падежи распознаются: «бухгалтерского учета»',
    text: 'Икромов Сино\nВедение бухгалтерского учета и налогового учета', f: c => c.skills.includes('Бухгалтерский учёт'), want: true },
  { t: 'Таджикский изафет: «Донишгоҳи давлатӣ» → высшее',
    text: 'Қурбонов Дилшод\nДонишгоҳи давлатии Хуҷанд, иқтисодшиносӣ', f: c => c.edu, want: 4 },
  { t: '«наст. время» считается до сегодняшнего дня',
    text: 'Рахимов А.\nОпыт работы\n01.2024 - наст. время, ООО «Б»', f: c => c.exp > 0 && c.exp < 5, want: true },
  { t: 'Пустой текст помечается как скан',
    text: '   ', f: c => c.scan, want: true },
  { t: 'Повторный период не удваивает стаж',
    text: 'Х.\nОпыт работы\n01.2020 - 01.2024, ООО «А»\n01.2021 - 01.2023, ООО «А» (совмещение)', f: c => c.exp, want: 4 },
];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage();
  await require('./_login').loggedIn(p);
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => window.AVB, { timeout: 30000 });
  let ok = 0;
  for (const c of CASES) {
    const got = await p.evaluate(cc => {
      const r = window.AVB.parseResume(cc.text, { id: 'x', file: 'x.txt' });
      return eval('(' + cc.fn + ')')(r);
    }, { text: c.text, fn: c.f.toString() });
    const pass = JSON.stringify(got) === JSON.stringify(c.want);
    if (pass) ok++;
    console.log(`${pass ? '✓' : '✕'} ${c.t}${pass ? '' : `  → получено ${JSON.stringify(got)}, ожидалось ${JSON.stringify(c.want)}`}`);
  }
  console.log(`\nПройдено ${ok}/${CASES.length}`);
  await b.close();
  process.exit(ok === CASES.length ? 0 : 1);
})();
