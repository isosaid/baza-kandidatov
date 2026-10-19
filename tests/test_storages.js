// Портал с сотнями хранилищ: личный диск должен находиться независимо
// от того, на какой странице выдачи он лежит.
const { chromium } = require('playwright');
const path = require('path');

const ME = 117;
// 800 хранилищ; диск пользователя 117 — на 300-й позиции, вне первой страницы
const ALL = [];
for (let i = 1; i <= 800; i++) {
  ALL.push(i === 300
    ? { ID: String(i), NAME: 'Исо Саидов', ENTITY_TYPE: 'user', ENTITY_ID: String(ME), ROOT_OBJECT_ID: '9001' }
    : { ID: String(i), NAME: 'Сотрудник ' + i, ENTITY_TYPE: 'user', ENTITY_ID: String(1000 + i), ROOT_OBJECT_ID: String(20000 + i) });
}
ALL.push({ ID: '900', NAME: 'Общий диск', ENTITY_TYPE: 'common', ENTITY_ID: 'shared', ROOT_OBJECT_ID: '9100' });

const CHILD = {
  '9001': [{ ID: '9010', NAME: 'Резюме', TYPE: 'folder' }, { ID: '9011', NAME: 'Другое', TYPE: 'folder' }],
  '9010': [{ ID: '9020', NAME: 'Маркетолог', TYPE: 'folder' }, { ID: '9021', NAME: 'Стажер', TYPE: 'folder' }],
  '9100': [],
};

async function run(supportsFilter) {
  const b = await chromium.launch();
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'index.html'));
  await p.waitForFunction(() => window.AVB, { timeout: 30000 });
  await p.evaluate(({ all, child, me, sf }) => {
    window.__calls = 0;
    window.BX24 = {
      callMethod(method, params, cb) {
        window.__calls++;
        let data = [];
        if (method === 'user.current') data = { ID: String(me), NAME: 'Исо', LAST_NAME: 'Саидов' };
        else if (method === 'disk.storage.getlist') {
          let list = all;
          if (params && params.filter) {
            if (!sf) list = all;                       // портал игнорирует фильтр
            else list = all.filter(x => Object.keys(params.filter).every(k => String(x[k]) === String(params.filter[k])));
          }
          const start = (params && params.start) || 0;
          data = list.slice(start, start + 50);
        } else if (method === 'disk.folder.getchildren') data = child[String(params.id)] || [];
        setTimeout(() => cb({ error: () => false, data: () => data }), 0);
      }
    };
  }, { all: ALL, child: CHILD, me: ME, sf: supportsFilter });

  await p.click('[data-v=admin]'); await p.waitForTimeout(200);
  await p.click('button:has-text("Выбрать на Диске")');
  await p.waitForSelector('#bxBrowser button', { timeout: 20000 });
  await p.waitForTimeout(600);
  const roots = await p.locator('#bxBrowser .row button').allTextContents();
  const okMy = roots.some(t => t.includes('Мой Диск'));

  let okFolder = false, okPick = false;
  if (okMy) {
    await p.click('#bxBrowser button:has-text("Мой Диск")'); await p.waitForTimeout(400);
    const lvl = await p.locator('#bxBrowser .row button').allTextContents();
    okFolder = lvl.includes('Резюме');
    if (okFolder) {
      await p.click('#bxBrowser button:has-text("Резюме")'); await p.waitForTimeout(400);
      await p.click('#bxBrowser button:has-text("Выбрать эту папку")'); await p.waitForTimeout(300);
      okPick = (await p.inputValue('#bxFolder')) === '9010';
    }
  }
  const calls = await p.evaluate(() => window.__calls);
  await b.close();
  return { okMy, okFolder, okPick, calls, errs, roots, lvl: global.__lvl };
}

(async () => {
  const ok = [];
  const check = (n, c, e) => { ok.push(c); console.log(`${c ? '✓' : '✕'} ${n}${c ? '' : '  → ' + e}`); };

  const a = await run(true);
  check('портал с фильтром: «Мой Диск» найден', a.okMy, a.roots.join(' | '));
  check('портал с фильтром: виден «Резюме»', a.okFolder, '');
  check('портал с фильтром: ID папки подставлен', a.okPick, '');
  check('портал с фильтром: без лишних запросов', a.calls <= 5, `запросов ${a.calls}`);

  const b = await run(false);
  check('портал без фильтра: «Мой Диск» найден перебором', b.okMy, b.roots.join(' | '));
  check('портал без фильтра: виден «Резюме»', b.okFolder, JSON.stringify(b.lvl||[]).slice(0,220));
  check('портал без фильтра: ID папки подставлен', b.okPick, '');
  check('ошибок JS нет', a.errs.length === 0 && b.errs.length === 0, [...a.errs, ...b.errs].join(' | '));

  const passed = ok.filter(Boolean).length;
  console.log(`\nПройдено ${passed}/${ok.length}`);
  process.exit(passed === ok.length ? 0 : 1);
})();
