'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const webDir = path.join(ROOT, 'web');
const distDir = path.join(ROOT, 'dist');
const required = ['index.html', 'accounts.css', 'accounts-data.js', 'accounts-runtime.js'];

for (const name of required) {
  const source = path.join(webDir, name);
  if (!fs.existsSync(source)) throw new Error(`缺少网页文件：${source}`);
}
fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
for (const name of required) {
  fs.copyFileSync(path.join(webDir, name), path.join(distDir, name));
}
fs.writeFileSync(path.join(distDir, '.nojekyll'), '', 'utf8');
process.stdout.write(`built ${distDir}\n`);
