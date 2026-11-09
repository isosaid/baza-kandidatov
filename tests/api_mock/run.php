<?php
// $argv: sessid vacancy person filename new
$_SERVER['DOCUMENT_ROOT']=__DIR__; $_SERVER['REQUEST_METHOD']='POST'; $_GET['a']='upload';
$tmp=tempnam(sys_get_temp_dir(),'cv'); file_put_contents($tmp, str_repeat('x', 1234));
$_POST=['sessid'=>$argv[1],'root'=>'101','vacancy'=>$argv[2],'person'=>$argv[3]]; if(!empty($argv[5])) $_POST['new']='1';
$_REQUEST=$_POST; $_FILES['file']=['name'=>$argv[4],'type'=>'application/pdf','tmp_name'=>$tmp,'size'=>1234,'error'=>0];
function http_response_code_($c){}
require __DIR__.'/../../bitrix/api.php';
