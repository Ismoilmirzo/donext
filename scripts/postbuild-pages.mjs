import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error(`Missing build output: ${indexPath}`);
}

fs.copyFileSync(indexPath, path.join(distDir, '404.html'));

const privacyDir = path.join(distDir, 'privacy');
fs.mkdirSync(privacyDir, { recursive: true });
fs.copyFileSync(indexPath, path.join(privacyDir, 'index.html'));
