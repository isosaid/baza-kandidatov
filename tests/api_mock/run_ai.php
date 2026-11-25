<?php
$_SERVER['DOCUMENT_ROOT']=__DIR__; $_SERVER['REQUEST_METHOD']=$argv[1]==='status'?'GET':'POST'; $_GET['a']=$argv[1]==='status'?'ai_status':'ai';
$_REQUEST=['sessid'=>$argv[2]??'S1'];
$GLOBALS['__IN']=$argv[3]??'';
stream_wrapper_unregister('php'); 
class W { public $context; private $d; private $p=0; function stream_open($path){ $this->d = str_contains($path,'input') ? $GLOBALS['__IN'] : ''; return true; } function stream_read($n){ $r=substr($this->d,$this->p,$n); $this->p+=strlen($r); return $r; } function stream_eof(){ return $this->p>=strlen($this->d); } function stream_stat(){ return []; } function stream_write($d){ echo $d; return strlen($d);} }
stream_wrapper_register('php','W');
require __DIR__.'/../../bitrix/api.php';
