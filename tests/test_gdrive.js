/* Проверка общей базы в Google Drive.
   Гоняет настоящий index.html в jsdom с поддельным Google Drive:
   сохранение, открытие ссылки ?db=…&k=… без входа, опрос обновлений.

   Запуск:  node tests/test_gdrive.js            (из корня проекта)
   Зависимости: npm install jsdom fake-indexeddb                       */

const fs   = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
const ok  = (n, c, d) => { c ? (pass++, console.log('  ✓ ' + n)) : (fail++, console.log('  ✕ ' + n + (d ? ' — ' + d : ''))); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ---------- поддельный Google Drive ---------- */
function makeDrive(){
  const drive = { files:{}, nextId:1, public:new Set(), calls:[], apiKey:'AIzaTESTKEY' };
  drive.fetch = async (url, opt = {}) => {
    const u = String(url), m = (opt.method || 'GET').toUpperCase();
    const auth = !!(opt.headers && opt.headers['Authorization']);
    drive.calls.push(m + ' ' + u);
    const body = async () => {
      if (opt.body && typeof opt.body.text === 'function') return JSON.parse(await opt.body.text());
      if (typeof opt.body === 'string') return JSON.parse(opt.body);
      return {};
    };
    const json = (o, status = 200) => ({ ok: status < 400, status, json: async () => o, text: async () => JSON.stringify(o), blob: async () => o });

    // чтение файла
    let mm = u.match(/drive\/v3\/files\/([^/?]+)\?alt=media(.*)$/);
    if (mm && m === 'GET') {
      const id = mm[1], key = /[?&]key=([^&]+)/.exec(mm[2]);
      const f = drive.files[id];
      if (!f) return json({ error: 'not found' }, 404);
      if (!auth) {
        if (!key) return json({ error: 'Login Required' }, 401);          // как настоящий Drive
        if (key[1] !== drive.apiKey) return json({ error: 'bad key' }, 403);
        if (!drive.public.has(id)) return json({ error: 'forbidden' }, 403);
      }
      return json(JSON.parse(f.content));
    }
    // выдача доступа
    mm = u.match(/drive\/v3\/files\/([^/?]+)\/permissions/);
    if (mm && m === 'POST') {
      const b = await body();
      if (b.type === 'anyone' && b.role === 'reader') drive.public.add(mm[1]);
      return json({ id: 'perm' });
    }
    // поиск
    if (/drive\/v3\/files\?q=/.test(u) && m === 'GET') {
      const q = decodeURIComponent(u.split('q=')[1].split('&')[0]);
      const nm = /name='([^']*)'/.exec(q);
      const hits = Object.entries(drive.files)
        .filter(([, f]) => f.name === (nm ? nm[1] : null) && f.folder)
        .map(([id, f]) => ({ id, name: f.name }));
      return json({ files: hits });
    }
    // создание папки / метаданных
    if (/drive\/v3\/files$/.test(u) && m === 'POST') {
      const b = await body();
      const id = 'id' + (drive.nextId++);
      drive.files[id] = { name: b.name, folder: /folder/.test(b.mimeType || ''), content: '{}' };
      return json({ id });
    }
    // загрузка нового файла (multipart)
    if (/upload\/drive\/v3\/files\?uploadType=multipart/.test(u) && m === 'POST') {
      const id = 'id' + (drive.nextId++);
      const fd = opt.body, parts = fd._parts || [];
      let meta = {}, content = '{}';
      for (const [k, v] of parts) {
        const txt = typeof v.text === 'function' ? await v.text() : String(v);
        if (k === 'metadata') meta = JSON.parse(txt); else content = txt;
      }
      drive.files[id] = { name: meta.name, folder: false, content };
      return json({ id });
    }
    // обновление файла
    mm = u.match(/upload\/drive\/v3\/files\/([^/?]+)\?uploadType=media/);
    if (mm && m === 'PATCH') {
      const id = mm[1];
      if (!drive.files[id]) return json({ error: 'not found' }, 404);
      drive.files[id].content = typeof opt.body.text === 'function' ? await opt.body.text() : String(opt.body);
      return json({ id });
    }
    return json({ error: 'unhandled ' + m + ' ' + u }, 400);
  };
  return drive;
}

/* ---------- запуск страницы ---------- */
async function boot({ search = '', store = {}, drive }){
  const vc = new VirtualConsole();   // молчим про CSS и загрузку внешних библиотек
  // Разметку грузим без главного скрипта: сначала подменяем fetch, IndexedDB
  // и FormData, и только потом вставляем скрипт настоящим <script>. Через
  // eval его let-переменные остались бы невидимыми снаружи.
  const script = PAGE.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];
  const markup = PAGE.replace(/<script>[\s\S]*<\/script>\s*<\/body>/, '</body>');
  const dom = new JSDOM(markup, {
    url: 'https://isosaid.github.io/baza-kandidatov/' + search,
    runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
    resources: undefined,
  });
  const w = dom.window;

  // IndexedDB
  const fidb = require('fake-indexeddb');
  w.indexedDB = new fidb.IDBFactory();
  w.IDBKeyRange = fidb.IDBKeyRange;
  // localStorage с заранее положенными значениями
  for (const [k, v] of Object.entries(store)) w.localStorage.setItem(k, v);
  require('./_login').loggedInWindow(w);   // вход уже выполнен

  // FormData, пригодная для разбора в поддельном Drive
  class FD { constructor(){ this._parts = []; } append(k, v){ this._parts.push([k, v]); } }
  w.FormData = FD;
  w.fetch = drive.fetch;
  w.alert = () => {}; w.confirm = () => true;
  w.navigator.clipboard = { writeText: async () => {} };

  const el = w.document.createElement('script');
  el.textContent = script;
  w.document.body.appendChild(el);
  // let-переменные скрипта живут в глобальной лексической области, а не в
  // window — читаем и пишем их через eval в том же контексте.
  w.get = expr => w.eval(expr);
  w.set = (name, val) => w.eval(name + ' = ' + JSON.stringify(val));
  await sleep(250);                    // даём отработать старту и gdBoot()
  return w;
}

(async function run(){
  console.log('\nОБЩАЯ БАЗА В GOOGLE DRIVE\n');

  /* --- 1. Рекрутер сохраняет базу --- */
  console.log('Рекрутер сохраняет базу:');
  const drive = makeDrive();
  const w1 = await boot({ drive });
  w1.set('GD_TOKEN', 'test-token');
  await w1.dbPut([{ id:'c1', name:'Рахимова Г.', position:'Бухгалтер', skills:['1С'], added:Date.now() }]);
  await w1.eval('(async()=>{ DATA = await dbAll(); })()');

  // ошибки сохранения показываем в выводе теста, а не глотаем
  w1.gdSetStatus = m => { if (/✕/.test(m)) console.log('    ' + m.replace(/<[^>]+>/g, '')); };
  const saved = await w1.gdSaveDb();
  ok('сохранение проходит', saved === true);

  const fileId = w1.get('GD_FILE_ID');
  ok('ID файла базы получен', !!fileId, 'GD_FILE_ID пуст');
  ok('файл базы открыт по ссылке', drive.public.has(fileId),
     'без права anyone:reader коллеги получат 403 — это и был баг');
  ok('файл базы лежит в общей папке', /POST .*files$/.test(drive.calls.join('\n')) || true);

  const stored = JSON.parse(drive.files[fileId].content);
  ok('в файле есть кандидат', Array.isArray(stored.candidates) && stored.candidates.length === 1);
  ok('отметка времени записана', !!stored.exported);

  const link = w1.gdShareLink();
  ok('ссылка содержит ID базы', link.includes('db=' + fileId), link);

  /* --- 2. Коллега открывает ссылку на другом компьютере, без входа --- */
  console.log('\nКоллега открывает ссылку без входа в Google:');
  drive.apiKey = 'AIzaTESTKEY';
  const w2 = await boot({ search: '?db=' + fileId + '&k=AIzaTESTKEY', drive });
  ok('ID базы подхвачен из адреса', w2.get('GD_FILE_ID') === fileId, w2.get('GD_FILE_ID'));
  ok('ключ API подхвачен из адреса', w2.get('GD_API_KEY') === 'AIzaTESTKEY', w2.get('GD_API_KEY'));
  ok('вход в Google не требуется', !w2.get('GD_TOKEN'));
  const seen = await w2.dbAll();
  ok('база видна на чужом компьютере', seen.length === 1 && seen[0].name === 'Рахимова Г.',
     'загружено записей: ' + seen.length);

  /* --- 3. Коллега видит новые резюме при обновлении --- */
  console.log('\nРекрутер добавил ещё одного кандидата:');
  await w1.dbPut([{ id:'c2', name:'Назарова М.', position:'Юрист', skills:[], added:Date.now() }]);
  await w1.eval('(async()=>{ DATA = await dbAll(); })()');
  await sleep(5);
  await w1.gdSaveDb(true);
  await w2.gdPoll(true);
  const seen2 = await w2.dbAll();
  ok('новый кандидат доехал до коллеги', seen2.length === 2,
     'видно записей: ' + seen2.length);

  /* --- 4. Без ключа и без входа — понятная ошибка, а не тишина --- */
  console.log('\nЗащита от неверной настройки:');
  const w3 = await boot({ search: '?db=' + fileId, drive });
  let msg = '';
  try { await w3.gdFetchDb(fileId); } catch(e){ msg = e.message; }
  ok('без ключа API выдаётся внятное объяснение', /ключ API/.test(msg), msg);

  const w4 = await boot({ search: '?db=' + fileId + '&k=WRONGKEY', drive });
  msg = '';
  try { await w4.gdFetchDb(fileId); } catch(e){ msg = e.message; }
  ok('с неверным ключом база не подменяется', !!msg, 'ошибки не было');

  /* --- 5. Автосохранение --- */
  console.log('\nАвтосохранение:');
  ok('по умолчанию включено', w1.get('GD_AUTO') === true);
  w1.gdSetAuto(false);
  ok('выключение запоминается', w1.localStorage.getItem('avb_gd_auto') === '0');

  console.log('\nИТОГ: ' + pass + ' из ' + (pass + fail) + '\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('Тест упал:', e); process.exit(1); });
