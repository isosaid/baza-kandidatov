// Обозреватель Диска и синхронизация — на поддельном портале Битрикс24
// со структурой «Мой Диск → Резюме → направления → файлы резюме».
const { chromium } = require('playwright');
const path = require('path');

const RESUME = (fio, city, exp, skills) => [
  fio, `Город: ${city}`, 'Телефон: +992 93 111 22 33', `${fio.split(' ')[0].toLowerCase()}@mail.ru`,
  'Образование', 'Таджикский национальный университет, высшее',
  'Опыт работы', `01.${2026 - exp} - 01.2026, ООО «Тест», специалист`,
  'Навыки', skills, 'Языки: таджикский, русский'
].join('\n');

const DISK = {
  'disk.storage.getlist': [
    { ID: '1', NAME: 'Мой Диск', ENTITY_TYPE: 'user', ROOT_OBJECT_ID: '100' },
    { ID: '2', NAME: 'Общий диск', ENTITY_TYPE: 'common', ROOT_OBJECT_ID: '200' },
  ],
  '100': [
    { ID: '110', NAME: 'Резюме', TYPE: 'folder' },
    { ID: '111', NAME: 'Загруженные файлы', TYPE: 'folder' },
    { ID: '112', NAME: 'Зодруз Шеф', TYPE: 'folder' },
  ],
  '110': [
    { ID: '120', NAME: 'Бухгалтер', TYPE: 'folder' },
    { ID: '121', NAME: 'Юрист', TYPE: 'folder' },
  ],
  '120': [
    { ID: '1201', NAME: 'Rahimova.txt', TYPE: 'file', RESUME: ['Рахимова Фируза Саидовна', 'Душанбе', 10, '1С, MS Excel, бухгалтерский учёт'] },
    { ID: '1202', NAME: 'Qurbonov.txt', TYPE: 'file', RESUME: ['Қурбонов Дилшод Раҳимович', 'Хуҷанд', 8, '1С, складской учёт'] },
    { ID: '1203', NAME: 'photo.jpg', TYPE: 'file', RESUME: null },
  ],
  '121': [
    { ID: '1211', NAME: 'Nazarova.txt', TYPE: 'file', RESUME: ['Назарова Зарина Фаррухевна', 'Куляб', 7, 'договорная работа, трудовой кодекс'] },
  ],
  '200': [],
  '111': [], '112': [],
};

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 950 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => window.AVB, { timeout: 30000 });

  // поддельный портал
  await p.evaluate(({ disk, resumeSrc }) => {
    const mk = new Function('return ' + resumeSrc)();
    window.BX24 = {
      callMethod(method, params, cb) {
        let data = [];
        if (method === 'disk.storage.getlist') data = disk['disk.storage.getlist'];
        else if (method === 'disk.folder.getchildren') {
          data = (disk[String(params.id)] || []).map(it => it.RESUME
            ? { ...it, DOWNLOAD_URL: 'data:text/plain;charset=utf-8,' + encodeURIComponent(mk(...it.RESUME)), DETAIL_URL: 'https://portal/x/' + it.ID }
            : it);
        } else if (method === 'user.current') data = { NAME: 'Тест', LAST_NAME: 'Тестов', ID: 1 };
        setTimeout(() => cb({ error: () => false, data: () => data }), 0);
      }
    };
  }, { disk: DISK, resumeSrc: RESUME.toString() });

  const ok = [];
  const check = (name, cond, extra) => { ok.push(cond); console.log(`${cond ? '✓' : '✕'} ${name}${cond ? '' : '  → ' + extra}`); };

  await p.click('[data-v=bx]'); await p.waitForTimeout(200);

  // 1. список хранилищ
  await p.click('button:has-text("Выбрать на Диске")');
  await p.waitForSelector('#bxBrowser .row', { timeout: 5000 });
  const storages = await p.locator('#bxBrowser .row button').allTextContents();
  check('показаны хранилища Диска', storages.some(s => s.includes('Мой Диск')), storages.join(' | '));

  // 2. вход в Мой Диск
  await p.click('#bxBrowser button:has-text("Мой Диск")'); await p.waitForTimeout(300);
  const lvl1 = await p.locator('#bxBrowser .row button').allTextContents();
  check('внутри Моего Диска видна папка «Резюме»', lvl1.includes('Резюме'), lvl1.join(' | '));

  // 3. вход в Резюме — должны быть направления
  await p.click('#bxBrowser button:has-text("Резюме")'); await p.waitForTimeout(300);
  const lvl2 = await p.locator('#bxBrowser .row button').allTextContents();
  check('внутри «Резюме» видны направления', lvl2.includes('Бухгалтер') && lvl2.includes('Юрист'), lvl2.join(' | '));

  // 4. выбор папки подставляет ID
  await p.click('#bxBrowser button:has-text("Выбрать эту папку")'); await p.waitForTimeout(300);
  const fid = await p.inputValue('#bxFolder');
  check('ID папки подставлен в поле', fid === '110', `получено «${fid}»`);

  // 5. синхронизация
  await p.click('button:has-text("Синхронизировать папку")');
  await p.waitForFunction(() => window.AVB.DATA.length >= 3, { timeout: 30000 }).catch(() => {});
  const data = await p.evaluate(() => window.AVB.DATA.map(c => ({ n: c.name, f: c.folder, s: c.source, sk: c.skills.length, exp: c.exp })));
  check('загружены только резюме, без картинки', data.length === 3, `получено ${data.length}`);
  check('позиция взята из названия папки-направления',
    data.filter(c => c.f === 'Бухгалтер').length === 2 && data.filter(c => c.f === 'Юрист').length === 1,
    JSON.stringify(data.map(c => c.f)));
  check('источник помечен как Битрикс24', data.every(c => c.s === 'bitrix'), JSON.stringify(data.map(c => c.s)));
  check('поля разобраны', data.every(c => c.n && c.sk > 0 && c.exp > 0), JSON.stringify(data));

  // 6. повторная синхронизация не создаёт дубликатов
  await p.click('button:has-text("Синхронизировать папку")');
  await p.waitForTimeout(2500);
  const again = await p.evaluate(() => window.AVB.DATA.length);
  check('повторная синхронизация не дублирует', again === 3, `стало ${again}`);

  await p.screenshot({ path: path.join(__dirname, 'bitrix_browser.png') });
  check('ошибок JS нет', errs.length === 0, errs.join(' | '));

  const passed = ok.filter(Boolean).length;
  console.log(`\nПройдено ${passed}/${ok.length}`);
  await b.close();
  process.exit(passed === ok.length ? 0 : 1);
})();
