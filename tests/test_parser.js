// Прогон приложения в реальном Chromium на сгенерированных резюме
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const TRUTH = JSON.parse(fs.readFileSync(path.join(HERE, 'truth.json'), 'utf8'));
const APP = 'file://' + path.join(HERE, '..', 'index.html');

const FIELDS = ['name', 'phone', 'email', 'city', 'birth', 'exp', 'edu'];

function eqName(a, b) {
  if (!a || !b) return a === b;
  const n = s => s.toLowerCase().replace(/[ӣ]/g, 'и').replace(/[ҳ]/g, 'х').replace(/[ҷ]/g, 'ч')
    .replace(/[ғ]/g, 'г').replace(/[қ]/g, 'к').replace(/[ӯ]/g, 'у').replace(/ё/g, 'е')
    .replace(/[^а-яa-z ]/g, '').replace(/\s+/g, ' ').trim();
  return n(a) === n(b);
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  // CDN в контейнере недоступен — проверяем встроенный запасной путь lib/
  await page.goto(APP);
  await page.waitForFunction(() => window.AVB && window.pdfjsLib && window.mammoth, { timeout: 60000 });
  console.log('Библиотеки подняты из локальной папки lib/ (CDN недоступен) — запасной путь работает.');

  // грузим файлы через обычный input (webkitRelativePath не ставится — папку задаём отдельно)
  await page.evaluate(() => document.getElementById('fIn').removeAttribute('hidden'));
  const files = TRUTH.map(t => t.stage);
  await page.setInputFiles('#fIn', files);
  console.log('Файлов передано в форму: ' + await page.evaluate(() => document.getElementById('fIn').files.length));
  try {
    await page.waitForFunction(n => window.AVB.DATA.length >= n, files.length, { timeout: 120000 });
  } catch (e) {
    console.log('Разобрано: ' + await page.evaluate(() => window.AVB.DATA.length));
    console.log('ЖУРНАЛ:\n' + await page.textContent('#log'));
    throw e;
  }

  const data = await page.evaluate(() => window.AVB.DATA.map(c => ({
    file: c.file, name: c.name, phone: c.phone, email: c.email, city: c.city,
    birth: c.birth, exp: c.exp, edu: c.edu, skills: c.skills, langs: c.langs,
    scan: c.scan, chars: c.chars
  })));

  // ---- сверка полей ----
  const tally = {};
  FIELDS.forEach(f => tally[f] = { ok: 0, bad: 0, cases: [] });
  let skRecallHit = 0, skRecallTot = 0, skFalse = 0;
  let lgHit = 0, lgTot = 0;

  console.log('\n═══ ПОЛЯ ПО КАЖДОМУ РЕЗЮМЕ ═══\n');
  for (const t of TRUTH) {
    const c = data.find(d => d.file === t.stage_name);
    if (!c) { console.log('✕ НЕ ЗАГРУЖЕН: ' + t.file); continue; }
    if (t.truth.scan) {
      console.log(`${c.scan ? '✓' : '✕'} ${t.file} — скан определён: ${c.scan} (символов: ${c.chars})`);
      continue;
    }
    const out = [];
    for (const f of FIELDS) {
      const want = t.truth[f] === undefined ? null : t.truth[f];
      let got = c[f];
      let ok;
      if (f === 'name') ok = eqName(got, want);
      else if (f === 'exp') ok = (want === null) ? (got === null) : (got !== null && Math.abs(got - want) <= 0.6);
      else ok = (got ?? null) === (want ?? null);
      tally[f][ok ? 'ok' : 'bad']++;
      if (!ok) tally[f].cases.push(`${t.file}: получено «${got}», ожидалось «${want}»`);
      out.push(`${ok ? '✓' : '✕'}${f}`);
    }
    const want = t.truth.skills || [];
    const hit = want.filter(s => c.skills.includes(s));
    skRecallHit += hit.length; skRecallTot += want.length;
    const extra = c.skills.filter(s => !want.includes(s));
    skFalse += extra.length;
    const wl = t.truth.langs || [];
    lgHit += wl.filter(l => c.langs.includes(l)).length; lgTot += wl.length;

    console.log(`${t.file}`);
    console.log(`   ${out.join(' ')}  | навыки ${hit.length}/${want.length}${extra.length ? ' (лишние: ' + extra.join(', ') + ')' : ''} | языки ${wl.filter(l => c.langs.includes(l)).length}/${wl.length}`);
  }

  console.log('\n═══ ИТОГО ПО ПОЛЯМ ═══\n');
  const N = TRUTH.filter(t => !t.truth.scan).length;
  let totOk = 0, totAll = 0;
  for (const f of FIELDS) {
    const { ok, bad } = tally[f]; totOk += ok; totAll += ok + bad;
    const pct = ((ok / (ok + bad)) * 100).toFixed(0);
    console.log(`${f.padEnd(7)} ${String(ok).padStart(2)}/${ok + bad}  ${pct.padStart(3)}%`);
    tally[f].cases.forEach(c => console.log(`         └ ${c}`));
  }
  console.log(`\nВсего полей верно: ${totOk}/${totAll} = ${((totOk / totAll) * 100).toFixed(1)}%`);
  console.log(`Навыки (полнота):  ${skRecallHit}/${skRecallTot} = ${((skRecallHit / skRecallTot) * 100).toFixed(1)}%, лишних срабатываний: ${skFalse}`);
  console.log(`Языки (полнота):   ${lgHit}/${lgTot} = ${((lgHit / lgTot) * 100).toFixed(1)}%`);

  // ---- ФИО из кириллического имени файла (Playwright такие пути не отдаёт,
  //      поэтому проверяем разбор напрямую на том же тексте) ----
  const cyr = TRUTH.find(t => t.cyr_name_check);
  if (cyr) {
    const got = await page.evaluate(n => {
      const c = window.AVB.DATA.find(x => x.file === n.stage);
      return window.AVB.parseResume(c.raw, { id: 't', file: n.cyr, folder: 'Дизайнер' }).name;
    }, { stage: cyr.stage_name, cyr: cyr.file });
    const ok = eqName(got, cyr.cyr_name_check);
    console.log(`\n${ok ? '✓' : '✕'} ФИО из кириллического имени файла: «${got}»`);
  }

  // ---- проверка шорт-листа ----
  console.log('\n═══ ШОРТ-ЛИСТ: главный бухгалтер, 1С + бухучёт, опыт 5+, высшее ═══\n');
  const short = await page.evaluate(() => {
    const crit = { pos: 'Главный бухгалтер', exp: 5, edu: 4, must: ['1С', 'Бухгалтерский учёт'], nice: ['MS Excel', 'Налоговый учёт', 'Отчётность'], city: '', lang: '', strict: true };
    return window.AVB.DATA.map(c => {
      const s = window.AVB.scoreCandidate(c, crit);
      return { name: c.name || c.file, score: s.score, out: s.out, miss: s.miss };
    }).sort((a, b) => b.score - a.score);
  });
  short.forEach(s => console.log(`  ${String(s.score).padStart(3)}  ${s.out ? '[отсеян] ' : '         '}${s.name}`));

  if (errors.length) { console.log('\n═══ ОШИБКИ В КОНСОЛИ ═══'); [...new Set(errors)].slice(0, 10).forEach(e => console.log('  ' + e)); }
  else console.log('\nОшибок в консоли нет.');

  fs.writeFileSync(path.join(HERE, 'last_run.json'), JSON.stringify(data, null, 1));
  await browser.close();
})();
