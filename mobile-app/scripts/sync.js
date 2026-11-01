import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '../..');
const clientDist = path.resolve(rootDir, 'client/dist');
const mobileAppDir = path.resolve(__dirname, '..');
const androidPublicDir = path.resolve(mobileAppDir, 'android/app/src/main/assets/public');

console.log('\n======================================================================');
console.log('           🔄 Syncing Web App into Mobile Android Assets              ');
console.log('======================================================================\n');

// 1. If client/dist doesn't exist, build it
if (!fs.existsSync(clientDist)) {
  console.log('Building web client first...');
  execSync('npm run build', { cwd: path.resolve(rootDir, 'client'), stdio: 'inherit' });
}

// 2. Ensure destination assets/public directory exists
if (!fs.existsSync(androidPublicDir)) {
  fs.mkdirSync(androidPublicDir, { recursive: true });
}

// 3. Helper to copy folder recursively
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

console.log(`Copying built assets from: \n  ${clientDist}\ninto:\n  ${androidPublicDir}`);
copyRecursiveSync(clientDist, androidPublicDir);

console.log('\n[SUCCESS] Mobile app assets updated successfully!');
console.log('Android project in "mobile-app/android" is ready to build!\n');
