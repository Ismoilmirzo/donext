import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error(`Missing build output: ${indexPath}`);
}

fs.copyFileSync(indexPath, path.join(distDir, '404.html'));

const staticRoutes = [
  'auth',
  'privacy',
  'welcome',
  'habits',
  'projects',
  'focus',
  'stats',
  'settings',
  'admin/users',
];

for (const route of staticRoutes) {
  const routeDir = path.join(distDir, route);
  fs.mkdirSync(routeDir, { recursive: true });
  fs.copyFileSync(indexPath, path.join(routeDir, 'index.html'));
}
