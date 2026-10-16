# Локальные копии библиотек

Платформа сначала пробует загрузить их с cdnjs.cloudflare.com, и только
если интернета нет — берёт отсюда. Поэтому на портале без выхода в сеть
достаточно того, что уже лежит в этой папке.

| Файл | Пакет | Версия | Лицензия |
|---|---|---|---|
| `pdf.min.js`, `pdf.worker.min.js` | [pdfjs-dist](https://github.com/mozilla/pdf.js) | 3.11.174 | Apache-2.0 |
| `mammoth.browser.min.js` | [mammoth.js](https://github.com/mwilliamson/mammoth.js) | 1.6.0 | BSD-2-Clause |

Обновление:

```bash
npm install pdfjs-dist@<версия> mammoth@<версия>
cp node_modules/pdfjs-dist/build/pdf.min.js        lib/
cp node_modules/pdfjs-dist/build/pdf.worker.min.js lib/
cp node_modules/mammoth/mammoth.browser.min.js     lib/
```

После смены версии поправьте номера в `index.html` (константа `CDN`
и пути в `LIBS_READY`), иначе CDN и локальная копия разойдутся.
