// Новое по ТЗ: архив с Диска, категории должностей, пол, готовность
// к переезду, избранное, вердикты, фильтры поиска.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const APP = 'file://' + path.join(__dirname, '..', 'index.html');

const CATS = [
  ['Главный бухгалтер', '1С, МСФО, налоговый учёт, отчётность', 'Бухгалтерия, финансы и аудит'],
  ['Главный инженер', 'AutoCAD, технадзор, СНиП, монтаж', 'Производственные и технические'],
  ['Юрисконсульт', 'договорная работа, претензионная работа, правовое сопровождение', 'Юриспруденция'],
  ['Графический дизайнер', 'Photoshop, Illustrator, реклама, бренд', 'Маркетинг, дизайн, PR и продажи'],
  ['Менеджер по закупкам', 'тендеры, склад, логистика, снабжение', 'Закупки, логистика и склад'],
  ['Специалист по подбору персонала', 'рекрутинг, кадровое делопроизводство', 'Управление персоналом, HR'],
  ['Системный администратор', 'сети, базы данных, веб', 'IT и цифровые технологии'],
  ['Водитель', 'автомобиль, категория B, транспорт', 'Транспорт'],
  ['Охранник', 'служба охраны, пожарная безопасность, режимный объект', 'Безопасность'],
  ['Координатор проекта', 'международное сотрудничество, донор, грант', 'Проектная работа и международное сотрудничество'],
];

const GENDERS = [
  ['Рахимова Фируза Саидовна', 'ж'], ['Қурбонов Дилшод Раҳимович', 'м'],
  ['Назарова Зарина Фаррухевна', 'ж'], ['Шарипов Бехруз', 'м'],
  ['Хакимова Нилуфар', 'ж'], ['Солиев Джамшед Икромович', 'м'],
  ['Иванов Иван Иванович', 'м'], ['Петрова Анна Сергеевна', 'ж'],
];

const RELOC = [
  ['Душанбе или готов к переезду', 'yes'],
  ['Рассматривает переезд в другой город', 'yes'],
  ['К переезду не готов, только Душанбе', 'no'],
  ['Проживает в Душанбе', null],
];

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1400, height: 1000 } });
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await require('./_login').loggedIn(p);
  await p.goto(APP);
  await p.waitForFunction(() => window.AVB && window.JSZip, { timeout: 40000 });

  const ok = [];
  const check = (n, c, extra) => { ok.push(c); console.log(`${c ? '✓' : '✕'} ${n}${c ? '' : '  → ' + extra}`); };

  // ---- категории ----
  let catHit = 0;
  const catBad = [];
  for (const [pos, skills, want] of CATS) {
    const got = await p.evaluate(([pos, skills]) => window.AVB.pickCategory(pos + '. Навыки: ' + skills, pos, skills.split(', ')), [pos, skills]);
    if (got === want) catHit++; else catBad.push(`${pos}: «${got}» вместо «${want}»`);
  }
  check(`категории должностей ${catHit}/${CATS.length}`, catHit === CATS.length, catBad.join('; '));

  // ---- пол ----
  let gHit = 0; const gBad = [];
  for (const [name, want] of GENDERS) {
    const got = await p.evaluate(n => window.AVB.pickGender(n), name);
    if (got === want) gHit++; else gBad.push(`${name}: «${got}» вместо «${want}»`);
  }
  check(`пол по фамилии и отчеству ${gHit}/${GENDERS.length}`, gHit === GENDERS.length, gBad.join('; '));

  // ---- переезд ----
  let rHit = 0; const rBad = [];
  for (const [txt, want] of RELOC) {
    const got = await p.evaluate(t => window.AVB.pickRelocation(t), txt);
    if (got === want) rHit++; else rBad.push(`«${txt}»: ${got} вместо ${want}`);
  }
  check(`готовность к переезду ${rHit}/${RELOC.length}`, rHit === RELOC.length, rBad.join('; '));

  // ---- архив с Диска ----
  const zipPath = path.join(__dirname, 'stage', 'rezume_arhiv.zip');
  await p.evaluate(async () => {
    const z = new JSZip();
    const mk = (fio, city, exp, skills) => [fio, 'Город: ' + city, 'Телефон: +992 93 111 22 33',
      'Образование', 'ТНУ, высшее', 'Опыт работы', `01.${2026 - exp} - 01.2026, ООО «Тест»`,
      'Навыки', skills, 'Языки: таджикский, русский'].join('\n');
    z.folder('Резюме/Бухгалтер').file('Rahimova.txt', mk('Рахимова Фируза Саидовна', 'Душанбе', 10, '1С, МСФО, отчётность'));
    z.folder('Резюме/Бухгалтер').file('Qurbonov.txt', mk('Қурбонов Дилшод Раҳимович', 'Хуҷанд', 8, '1С, складской учёт'));
    z.folder('Резюме/Юрист').file('Nazarova.txt', mk('Назарова Зарина Фаррухевна', 'Куляб', 7, 'договорная работа, трудовой кодекс'));
    z.folder('Резюме/Юрист').file('logo.png', 'not a resume');
    const blob = await z.generateAsync({ type: 'blob' });
    window.__zip = new File([blob], 'rezume_arhiv.zip');
  });
  const zipB64 = await p.evaluate(() => new Promise(r => {
    const fr = new FileReader(); fr.onload = () => r(fr.result.split(',')[1]); fr.readAsDataURL(window.__zip);
  }));
  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  fs.writeFileSync(zipPath, Buffer.from(zipB64, 'base64'));

  await p.click('[data-v=load]');
  await p.setInputFiles('#fIn', [zipPath]);
  await p.waitForFunction(() => window.AVB.DATA.length >= 3, { timeout: 40000 }).catch(() => { });
  const data = await p.evaluate(() => window.AVB.DATA.map(c => ({ n: c.name, f: c.folder, cat: c.category, g: c.gender, exp: c.exp })));
  check('архив распакован, картинка пропущена', data.length === 3, `получено ${data.length}`);
  check('направление из папки внутри архива',
    data.filter(c => c.f === 'Бухгалтер').length === 2 && data.filter(c => c.f === 'Юрист').length === 1,
    JSON.stringify(data.map(c => c.f)));
  check('категория проставлена всем', data.every(c => c.cat), JSON.stringify(data.map(c => c.cat)));
  check('пол определён всем', data.every(c => c.g), JSON.stringify(data.map(c => c.g)));

  // ---- фильтр по категории на вкладке «Все резюме» ----
  await p.click('[data-v=base]'); await p.waitForTimeout(300);
  const chips = await p.locator('#catChips .chip').allTextContents();
  check('чипы категорий построены', chips.length >= 2, chips.join(' | '));
  await p.locator('#catChips .chip').nth(1).click(); await p.waitForTimeout(300);
  const rowsFiltered = await p.locator('#tblBase tbody tr').count();
  await p.locator('#catChips .chip').first().click(); await p.waitForTimeout(300);
  const rowsAll = await p.locator('#tblBase tbody tr').count();
  check('фильтр по категории сужает список', rowsFiltered < rowsAll && rowsFiltered > 0, `${rowsFiltered} из ${rowsAll}`);

  // ---- поиск с доп. фильтрами ----
  await p.click('[data-v=match]'); await p.waitForTimeout(200);
  await p.click('#moreT'); await p.waitForTimeout(250);
  await p.fill('#cPos', 'Бухгалтер');
  await p.fill('#mustIn', '1С'); await p.press('#mustIn', 'Enter');
  await p.selectOption('#cGender', 'ж');
  await p.click('button:has-text("Найти кандидатов")'); await p.waitForTimeout(600);
  const cards = await p.locator('.cand-card').count();
  check('фильтр по полу применяется к пулу', cards === 1, `карточек ${cards}`);

  // ---- вердикт ----
  await p.locator('.cand-card button:has-text("Подходит")').first().click(); await p.waitForTimeout(600);
  const verdict = await p.evaluate(() => window.AVB.DATA.filter(c => c.verdict === 'fit').length);
  check('вердикт «подходит» сохранён', verdict === 1, `отмечено ${verdict}`);

  // ---- избранное ----
  p.on('dialog', d => d.accept('Бухгалтер — октябрь'));
  await p.click('button:has-text("Сохранить шорт-лист в избранное")'); await p.waitForTimeout(600);
  const fav = await p.evaluate(() => window.AVB.FAV.length);
  check('шорт-лист сохранён в избранное', fav === 1, `подборок ${fav}`);
  const hist = await p.evaluate(() => window.AVB.HIST.length);
  check('поиск попал в историю', hist >= 1, `записей ${hist}`);

  await p.click('[data-v=fav]'); await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(__dirname, 'fav.png') });
  const favTxt = await p.textContent('#favOut');
  check('подборка видна на экране избранного', favTxt.includes('Бухгалтер'), favTxt.slice(0, 80));

  // ---- админ-панель ----
  await p.click('[data-v=admin]'); await p.waitForTimeout(400);
  await p.fill('#uName', 'Малика К.');
  await p.click('#v-admin button:has-text("Добавить")'); await p.waitForTimeout(300);
  const users = await p.locator('#usersTbl tbody tr').count();
  check('пользователь добавлен в список', users === 1, `строк ${users}`);
  await p.locator('#syncChips .chip').nth(3).click(); await p.waitForTimeout(300);
  const iv = await p.evaluate(() => JSON.parse(localStorage.getItem('avb_sync')).interval);
  check('интервал синхронизации сохранён', iv > 0, `интервал ${iv}`);
  await p.screenshot({ path: path.join(__dirname, 'admin.png') });

  check('ошибок JS нет', errs.length === 0, [...new Set(errs)].slice(0, 3).join(' | '));

  const passed = ok.filter(Boolean).length;
  console.log(`\nПройдено ${passed}/${ok.length}`);
  await b.close();
  process.exit(passed === ok.length ? 0 : 1);
})();
