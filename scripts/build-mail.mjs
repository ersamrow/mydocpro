import {access, cp, writeFile} from 'node:fs/promises';
const vendor = new URL('../vendor/', import.meta.url);
try { await access(new URL('autoload.php', vendor)); }
catch { throw Error('Run composer install --no-dev before building the contact email backend.'); }
const destination = new URL('../dist/api/vendor/', import.meta.url);
await cp(vendor, destination, {recursive:true});
await writeFile(new URL('.htaccess', destination), 'Require all denied\n');
console.log('SMTP dependencies included in dist/api/vendor (excluded from offline cache).');
