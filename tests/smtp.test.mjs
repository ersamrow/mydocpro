import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

function configuration(overrides={}) {
 const result=spawnSync('php',['-r', `require 'public/api/smtp.php'; try { $m=contactMailer(); echo json_encode([$m->Mailer,$m->Host,$m->Port,$m->SMTPSecure,$m->SMTPAuth,$m->Username,$m->From,$m->SMTPDebug,$m->SMTPOptions]); } catch (Throwable $e) { echo 'INVALID'; }`], {
  encoding:'utf8',env:{...process.env,SMTP_HOST:'smtp.example.com',SMTP_PORT:'587',SMTP_ENCRYPTION:'tls',SMTP_USERNAME:'test@example.com',SMTP_PASSWORD:'test-only',CONTACT_FROM_EMAIL:'sender@example.com',CONTACT_ADMIN_EMAIL:'admin@example.com',...overrides}
 });
 assert.equal(result.status,0,result.stderr);
 return result.stdout==='INVALID' ? null : JSON.parse(result.stdout);
}
test('SMTP reads environment, authenticates and uses TLS with debug off',()=>{
 assert.deepEqual(configuration(),['smtp','smtp.example.com',587,'tls',true,'test@example.com','sender@example.com',0,[]]);
 assert.equal(configuration({SMTP_ENCRYPTION:'ssl',SMTP_PORT:'465'})[3],'ssl');
});
test('missing credentials and invalid SMTP settings fail closed',()=>{
 for(const overrides of [{SMTP_PASSWORD:''},{SMTP_HOST:''},{CONTACT_ADMIN_EMAIL:''},{SMTP_PORT:'abc'},{SMTP_PORT:'70000'},{SMTP_ENCRYPTION:'none'},{SMTP_HOST:'smtp.example.com;evil.example.com'}]) assert.equal(configuration(overrides),null);
});
