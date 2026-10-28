/* Строка для AUTH_USERS в index.html: новый пользователь или новый пароль.
   node tools/hash_user.js <логин> <роль: admin|hr|head>
   Пароль спрашивается в терминале и никуда не сохраняется. */
const crypto = require('crypto');
const readline = require('readline');
const ITER = 150000;                       // должно совпадать с AUTH_ITER в index.html
const [login, role = 'hr'] = process.argv.slice(2);
if (!login) { console.error('Использование: node tools/hash_user.js <логин> [admin|hr|head]'); process.exit(1); }
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Пароль: ', pass => {
  rl.close();
  if (!pass) { console.error('Пустой пароль'); process.exit(1); }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(pass, salt + ':' + login.trim().toLowerCase(), ITER, 32, 'sha256').toString('hex');
  console.log('\nДобавьте или замените в AUTH_USERS:\n' + JSON.stringify({ login: login.trim(), role, salt, hash }) + ',');
});
