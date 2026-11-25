<?php
/* Подключение оценки ИИ «Базы кандидатов».
   1. Скопируйте этот файл в ai_config.php в ту же папку (/baza-kandidatov/ на портале).
   2. Впишите ключ API Anthropic (console.anthropic.com → API keys).
   Файл ai_config.php не выкладывайте в GitHub и никому не пересылайте: ключ даёт доступ к оплачиваемому API.
   Резюме уходят в ИИ без ФИО, телефонов, email и адреса. */
return [
    'key'   => 'sk-ant-...',
    'model' => 'claude-sonnet-5-5',   // точнее; дешевле — 'claude-haiku-5-5'
];
