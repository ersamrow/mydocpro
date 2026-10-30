import {access, cp, writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
// npm-only hosting pipelines do not install the PHP dependencies for us.
// Always use the lockfile, including when a previous vendor directory is cached.
console.log('Installing locked SMTP dependencies with Composer…');
const install = spawnSync('composer', ['install', '--no-dev', '--prefer-dist', '--no-interaction', '--no-progress', '--no-scripts', '--no-plugins', '--optimize-autoloader'], {
  cwd: fileURLToPath(new URL('../', import.meta.url)),
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (install.error || install.status !== 0) {
  throw Error('SMTP dependency installation failed. The build environment needs PHP and Composer 2 on PATH. If this is a Node-only builder, build on a PHP/Composer-enabled machine and upload dist/ to PHP-enabled hosting.');
}
const vendor = new URL('../vendor/', import.meta.url);
try { await access(new URL('autoload.php', vendor)); }
catch { throw Error('Run composer install --no-dev before building the contact email backend.'); }
const destination = new URL('../dist/api/vendor/', import.meta.url);
await cp(vendor, destination, {recursive:true});
await writeFile(new URL('.htaccess', destination), 'Require all denied\n');
console.log('SMTP dependencies included in dist/api/vendor (excluded from offline cache).');
