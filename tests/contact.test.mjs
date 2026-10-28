import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

// Execute the real handler with a fake transport: never send test emails.
const directory = mkdtempSync(join(tmpdir(), 'mydocpro-contact-test-'));
const source = readFileSync(new URL('../public/api/contact.php', import.meta.url), 'utf8')
 .replace('<?php', '').replace('declare(strict_types=1);', '')
 .replace("require_once __DIR__ . '/smtp.php';", '')
 .replace('contactMailer()', 'null')
 .replaceAll('contactSend($mailer, ', 'test_mail(')
 .replace("sys_get_temp_dir() . '/mydocpro-contact-limits.json'", "getenv('CONTACT_TEST_STORE')");
let counter = 0;
function request(data, {method='POST', fail=0, store}={}) {
 const code = `function test_mail($to,$subject,$body,$headers) { static $n=0; $n++; file_put_contents('php://stderr', json_encode([$to,$subject,$body,$headers])."\\n"); return $n !== ${fail}; }
 register_shutdown_function(function(){file_put_contents('php://stderr','STATUS:'.http_response_code());});
 $_SERVER=['REQUEST_METHOD'=>'${method}','HTTP_ACCEPT'=>'application/json','REMOTE_ADDR'=>'127.0.0.1'];
 $_POST=json_decode(base64_decode('${Buffer.from(JSON.stringify(data)).toString('base64')}'),true);
 ${source}`;
 const result=spawnSync('php',['-r',code], {encoding:'utf8',env:{...process.env,CONTACT_ADMIN_EMAIL:'admin@example.com',CONTACT_FROM_EMAIL:'sender@example.com',CONTACT_TEST_STORE:store || join(directory,`${counter++}.json`)}});
 assert.equal(result.status,0,result.stderr);
 return {status:Number(result.stderr.match(/STATUS:(\d+)/)?.[1]), body:JSON.parse(result.stdout), emails:result.stderr.split('\n').filter(s=>s.startsWith('[')).map(s=>JSON.parse(s))};
}
const valid={name:'A User',email:'user@example.com',subject:'Tool help',message:'Please help me resize my photo.',website:''};
test('contact validation rejects invalid submissions without sending',()=>{
 assert.equal(request(valid,{method:'GET'}).status,405);
 for(const data of [{...valid,email:'bad'}, {...valid,email:'user@example.com\r\nBcc: bad@example.com'}, {...valid,name:[]}, {...valid,message:'short'}, {...valid,website:'spam'}, {...valid,subject:'x'.repeat(601)}]) {
  const r=request(data); assert.equal(r.status,400); assert.equal(r.emails.length,0);
 }
});
test('admin and user receive separate messages with correct reply addresses',()=>{
 const r=request(valid); assert.equal(r.status,200); assert.equal(r.emails.length,2);
 assert.equal(r.emails[0][0],'admin@example.com'); assert.equal(r.emails[0][3]['Reply-To'],valid.email);
 assert.ok(r.emails[0][2].includes(valid.message));
 assert.equal(r.emails[1][0],valid.email); assert.equal(r.emails[1][3]['Reply-To'],'admin@example.com');
 assert.ok(!r.emails[1][2].includes(valid.message));
});
test('transport failures distinguish unsent and partial success',()=>{
 const failed=request(valid,{fail:1}); assert.equal(failed.status,503); assert.equal(failed.emails.length,1);
 const partial=request(valid,{fail:2}); assert.equal(partial.status,200); assert.match(partial.body.message,/do not need to submit again/);
});
test('sixth submission is limited',()=>{
 const store=join(directory,'limit.json');
 for(let i=0;i<5;i++) assert.equal(request(valid,{store}).status,200);
 const r=request(valid,{store}); assert.equal(r.status,429); assert.equal(r.emails.length,0);
});
test.after(()=>rmSync(directory,{recursive:true,force:true}));
