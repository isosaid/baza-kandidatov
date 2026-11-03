<?php
/* =====================================================================
   База кандидатов — серверная часть для размещения на портале Битрикс24.
   Лежит рядом с index.php (папка /baza-kandidatov/). Читает Диск прямо на
   сервере, без REST и без вебхука:

     api.php?a=ping                — проверка: вход в портал есть?
     api.php?a=list&root=58451     — все резюме папки одним ответом
     api.php?a=file&id=12345       — сам файл резюме (для разбора и просмотра)

   Доступ: только пользователь, вошедший в портал; только файлы внутри
   выбранной папки; только те, что этому пользователю разрешено читать на Диске.
   ===================================================================== */
define('NO_KEEP_STATISTIC', true);
define('NO_AGENT_STATISTIC', true);
define('NO_AGENT_CHECK', true);
define('STOP_STATISTICS', true);
require $_SERVER['DOCUMENT_ROOT'] . '/bitrix/modules/main/include/prolog_before.php';

use Bitrix\Main\Loader;
use Bitrix\Disk\Folder;
use Bitrix\Disk\File;
use Bitrix\Disk\BaseObject;
use Bitrix\Disk\Security\DiskSecurityContext;

const RESUME_EXT = '/\.(pdf|docx?|rtf|txt|odt)$/iu';
const MAX_DEPTH  = 12;

function out($data, $code = 200){
    while (ob_get_level()) ob_end_clean();
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

global $USER;
if (!is_object($USER) || !$USER->IsAuthorized()) out(['ok' => false, 'error' => 'Нужно войти в портал'], 401);
if (!Loader::includeModule('disk'))              out(['ok' => false, 'error' => 'Модуль «Диск» не подключён'], 500);

$uid = (int)$USER->GetID();
$sc  = new DiskSecurityContext($uid);          // права текущего пользователя
$a   = (string)($_GET['a'] ?? 'ping');

if ($a === 'ping') {
    out(['ok' => true, 'user' => ['id' => $uid, 'name' => trim($USER->GetFirstName() . ' ' . $USER->GetLastName())]]);
}

if ($a === 'list') {
    @set_time_limit(300);
    $rootId = (int)($_GET['root'] ?? 0);
    $root = $rootId ? Folder::loadById($rootId) : null;
    if (!$root || !$root->canRead($sc)) out(['ok' => false, 'error' => "Папка $rootId не найдена или нет доступа"], 404);

    $urls  = \Bitrix\Disk\Driver::getInstance()->getUrlManager();
    $items = []; $folders = 0; $t0 = microtime(true);
    $walk = function ($folder, array $path, $depth) use (&$walk, &$items, &$folders, $sc, $urls) {
        $folders++;
        foreach ($folder->getChildren($sc) as $obj) {
            if ($obj instanceof Folder) {
                if ($depth < MAX_DEPTH) $walk($obj, array_merge($path, [$obj->getName()]), $depth + 1);
            } elseif ($obj instanceof File && preg_match(RESUME_EXT, $obj->getName())) {
                $url = '';
                try { $url = $urls->getPathFileDetail($obj); } catch (\Throwable $e) {}
                $items[] = [
                    'ID'          => (string)$obj->getId(),
                    'NAME'        => $obj->getName(),
                    'SIZE'        => (string)$obj->getSize(),
                    'CREATE_TIME' => $obj->getCreateTime() ? $obj->getCreateTime()->format('c') : null,
                    'UPDATE_TIME' => $obj->getUpdateTime() ? $obj->getUpdateTime()->format('c') : null,
                    'PATH'        => $path,                         // папки от выбранной вниз до файла
                    'DETAIL_URL'  => $url,
                ];
            }
        }
    };
    $walk($root, [], 0);
    out(['ok' => true, 'root' => ['id' => $rootId, 'name' => $root->getName()], 'folders' => $folders,
         'count' => count($items), 'ms' => (int)((microtime(true) - $t0) * 1000), 'items' => $items]);
}

if ($a === 'file') {
    $id   = (int)($_GET['id'] ?? 0);
    $file = $id ? File::loadById($id) : null;
    if (!$file || !$file->canRead($sc)) out(['ok' => false, 'error' => 'Файл не найден или нет доступа'], 404);
    if (!preg_match(RESUME_EXT, $file->getName()))    out(['ok' => false, 'error' => 'Это не файл резюме'], 403);

    // только из папки с резюме: поднимаемся по родителям до неё
    $rootId = (int)($_GET['root'] ?? 0);
    if ($rootId) {
        $p = $file->getParent(); $inside = false;
        for ($i = 0; $p && $i < MAX_DEPTH + 2; $i++) {
            if ((int)$p->getId() === $rootId) { $inside = true; break; }
            $p = $p->getParent();
        }
        if (!$inside) out(['ok' => false, 'error' => 'Файл вне папки с резюме'], 403);
    }

    $fa  = \CFile::MakeFileArray($file->getFileId());
    $src = $fa['tmp_name'] ?? '';
    if (!$src || !is_file($src)) out(['ok' => false, 'error' => 'Файл не найден на сервере'], 404);

    while (ob_get_level()) ob_end_clean();
    $name = $file->getName();
    header('Content-Type: ' . ($fa['type'] ?: 'application/octet-stream'));
    header('Content-Length: ' . filesize($src));
    header("Content-Disposition: inline; filename*=UTF-8''" . rawurlencode($name));
    header('Cache-Control: private, max-age=300');
    header('X-Content-Type-Options: nosniff');
    readfile($src);
    exit;
}

out(['ok' => false, 'error' => 'Неизвестное действие'], 400);
