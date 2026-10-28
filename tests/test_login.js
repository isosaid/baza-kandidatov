/* Вход по логину и паролю. Настоящих паролей здесь нет: тест добавляет
   временного пользователя с хешем, посчитанным тем же способом, что tools/hash_user.js. */
const path = require('path'), crypto = require('crypto');
const { chromium } = require('playwright');
let pass = 0, fail = 0;
const ok = (name, cond, why='') => { cond ? pass++ : fail++; console.log((cond?'✓ ':'✕ ')+name+(cond||!why?'':' — '+why)); };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + path.join(__dirname, '..', 'index.html')); await p.waitForTimeout(800);
  const vis = () => p.evaluate(() => getComputedStyle(document.querySelector('.app')).display !== 'none');
  ok('без входа платформа скрыта', !(await vis()));
  ok('без входа база не открыта', await p.evaluate(() => typeof DB === 'undefined' || !DB));
  const iter = await p.evaluate(() => AUTH_ITER);
  const salt = crypto.randomBytes(16).toString('hex'), login = 'Test.User@avesto.tj', pw = 'Проверка-123';
  const hash = crypto.pbkdf2Sync(pw, salt + ':' + login.toLowerCase(), iter, 32, 'sha256').toString('hex');
  await p.evaluate(u => AUTH_USERS.push(u), { login, role: 'hr', salt, hash });
  const tryLogin = async (l, x) => { await p.fill('#lgLogin', l); await p.fill('#lgPass', x); await p.click('#lgBtn'); await p.waitForTimeout(500); };
  await tryLogin(login, 'неверно');
  ok('неверный пароль не пускает', !(await vis()));
  ok('сообщение об ошибке', /Неверный логин или пароль/.test(await p.textContent('#lgErr')));
  await tryLogin('nobody@avesto.tj', pw);
  ok('несуществующий логин не пускает', !(await vis()));
  await tryLogin(login.toUpperCase(), pw);
  ok('верный пароль пускает, логин без учёта регистра', await vis());
  ok('база открылась после входа', await p.evaluate(() => !!DB));
  ok('в панели — кто вошёл', (await p.textContent('#meBox')).includes(login));
  // временный пользователь живёт до перезагрузки — сохранение входа проверяем на настоящем логине
  await p.evaluate(() => sessionStorage.setItem('avb_session', JSON.stringify({login:'iso@avesto.tj', exp:Date.now()+36e5})));
  await p.reload(); await p.waitForTimeout(800);
  ok('вход держится в этой вкладке после обновления', await vis());
  await p.evaluate(() => sessionStorage.setItem('avb_session', JSON.stringify({login:'iso@avesto.tj', exp:Date.now()-1000})));
  await p.reload(); await p.waitForTimeout(800);
  ok('просроченный вход не действует', !(await vis()));
  await p.evaluate(() => sessionStorage.setItem('avb_session', JSON.stringify({login:'iso@avesto.tj', exp:Date.now()+36e5})));
  await p.reload(); await p.waitForTimeout(800);
  await p.evaluate(() => doLogout());
  ok('«Выйти» закрывает платформу', !(await vis()));
  await p.reload(); await p.waitForTimeout(800);
  ok('после выхода снова просит войти', !(await vis()));
  for (let i = 0; i < 6; i++) await tryLogin(login, 'x' + i);
  ok('после 5 ошибок — пауза', /Подождите/.test(await p.textContent('#lgErr')));
  const html = require('fs').readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  ok('в коде нет поля password/pass у пользователей', !/AUTH_USERS\s*=\s*\[[^\]]*"(pass|password)"/.test(html));
  ok('ошибок JS нет', !errs.length, errs.join('; '));
  console.log(`\nПройдено ${pass}/${pass + fail}`);
  await b.close(); process.exit(fail ? 1 : 0);
})();
