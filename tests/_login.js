/* Тесты проверяют платформу, а не экран входа: ставим сессию до загрузки страницы,
   как будто пользователь уже вошёл. Сам вход проверяет test_login.js. */
const SESSION = () => JSON.stringify({ login: 'iso@avesto.tj', exp: Date.now() + 3600e3 });
async function loggedIn(page){
  await page.addInitScript(s => { try{ sessionStorage.setItem('avb_session', s); }catch(e){} }, SESSION());
}
function loggedInWindow(w){ w.sessionStorage.setItem('avb_session', SESSION()); }
module.exports = { loggedIn, loggedInWindow };
