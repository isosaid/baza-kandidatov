<?php
namespace Bitrix\Main { class Loader { static function includeModule($m){ return true; } } }
namespace Bitrix\Disk\Security { class DiskSecurityContext { function __construct($u){} } }
namespace Bitrix\Disk {
  class BaseObject { static $all=[]; static $seq=100; public $id,$name,$parent,$kids=[]; public $canAdd=true;
    function __construct($n,$p=null){ $this->id=++self::$seq; $this->name=$n; $this->parent=$p; if($p) $p->kids[]=$this; self::$all[$this->id]=$this; }
    static function loadById($id){ $o=self::$all[$id]??null; return $o instanceof static ? $o : null; }
    function getId(){return $this->id;} function getName(){return $this->name;} function getParent(){return $this->parent;}
    function canRead($sc){return true;} function canAdd($sc){return $this->canAdd;} function getErrors(){return [];}
    function getCreateTime(){return null;} function getUpdateTime(){return null;} }
  class Folder extends BaseObject { function getChildren($sc){return $this->kids;}
    function addSubFolder($d,$r=[],$u=false){ return new Folder($d['NAME'],$this); }
    function uploadFile($fa,$d,$r=[],$u=false){ $f=new File($d['NAME'],$this); $f->size=$fa['size']; return $f; } }
  class File extends BaseObject { public $size=0; function getSize(){return $this->size;} function getFileId(){return 1;} }
  class Driver { static function getInstance(){ return new self; } function getUrlManager(){ return new class { function getPathFileDetail($f){ return '/disk/file/'.$f->getId(); } }; } }
}
namespace {
  class U { function IsAuthorized(){return true;} function GetID(){return 7;} function GetFirstName(){return 'Исо';} function GetLastName(){return '';} }
  $USER = new U;
  function bitrix_sessid(){ return 'S1'; } function check_bitrix_sessid(){ return ($_REQUEST['sessid']??'')==='S1'; }
  // дерево: 200 «Резюме» → «Юрист», «Бухгалтер»
  $root = new \Bitrix\Disk\Folder('Резюме'); $GLOBALS['ROOT']=$root->getId();
  new \Bitrix\Disk\Folder('Юрист',$root); new \Bitrix\Disk\Folder('Бухгалтер',$root);
  register_shutdown_function(function(){ $t=[]; $w=function($f,$d)use(&$w,&$t){ $t[]=str_repeat('  ',$d).$f->getName().($f instanceof \Bitrix\Disk\File?' ('.$f->getSize().' Б)':''); if($f instanceof \Bitrix\Disk\Folder) foreach($f->kids as $k)$w($k,$d+1); };
    $w(\Bitrix\Disk\BaseObject::$all[$GLOBALS['ROOT']],0); fwrite(STDERR, implode("\n",$t)."\n"); });
}
