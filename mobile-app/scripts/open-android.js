import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import os from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Root mobile-app and android directories
const mobileAppDir = path.resolve(__dirname, '..');
const androidDir = path.resolve(mobileAppDir, 'android');

console.log('\n======================================================================');
console.log('           📱 PrivateID Mobile Application Manager                     ');
console.log('======================================================================\n');

// 1. Possible Android Studio locations on Windows
const candidatePaths = [
  process.env.CAPACITOR_ANDROID_STUDIO_PATH,
  'C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe',
  'C:\\Program Files (x86)\\Android\\Android Studio\\bin\\studio64.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Programs', 'Android Studio', 'bin', 'studio64.exe'),
  path.join(process.env.PROGRAMFILES || '', 'Android', 'Android Studio', 'bin', 'studio64.exe'),
  path.join(process.env['ProgramFiles(x86)'] || '', 'Android', 'Android Studio', 'bin', 'studio64.exe')
].filter(Boolean);

let foundStudioPath = null;
for (const studioPath of candidatePaths) {
  if (fs.existsSync(studioPath)) {
    foundStudioPath = studioPath;
    break;
  }
}

// 2. Get local network IPs for mobile connection
function getLocalIps() {
  const nets = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(nets)) {
    const isVirtual = /virtual|vbox|vmware|wsl|pseudo|loopback/i.test(name);
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal && !isVirtual && !net.address.startsWith('192.168.56.')) {
        ips.push({ name, address: net.address });
      }
    }
  }
  return ips;
}

const networkIps = getLocalIps();
const primaryIp = (networkIps.find(i => /wi-?fi|wlan/i.test(i.name)) || networkIps[0] || { address: 'localhost' }).address;

if (foundStudioPath) {
  console.log(`[OK] Android Studio found at: ${foundStudioPath}`);
  console.log(`[OK] Launching Android Project: ${androidDir}\n`);
  try {
    const child = spawn(foundStudioPath, [androidDir], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    console.log('Android Studio has been launched successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to spawn Android Studio:', err.message);
  }
} else {
  // Android Studio not installed yet
  console.log('⚠️  Notice: Android Studio is NOT installed on this PC yet.');
  console.log('   (Attempted standard paths: C:\\Program Files\\Android\\Android Studio\\bin\\studio64.exe)\n');

  console.log(`📂 Opening native Android folder in Windows Explorer...`);
  try {
    execSync(`explorer.exe "${androidDir}"`);
    console.log(`[OK] Opened folder: ${androidDir}\n`);
  } catch (e) {
    // ignore
  }

  console.log('----------------------------------------------------------------------');
  console.log('💡 HOW TO USE / TEST THE MOBILE APP:');
  console.log('----------------------------------------------------------------------');
  console.log('Option 1: Direct Mobile Install (PWA - Recommended, 1 Minute):');
  console.log(`  1. Connect your mobile phone to the same Wi-Fi.`);
  console.log(`  2. Open Chrome browser on your phone and go to:`);
  console.log(`     👉  http://${primaryIp}:5173`);
  if (networkIps.length > 1) {
    console.log(`     (Alternative IP: ${networkIps.map(i => `http://${i.address}:5173`).join(', ')})`);
  }
  console.log(`  3. Tap the 3 dots menu (⋮) -> tap "Install app" or "Add to Home Screen".`);
  console.log(`  4. PrivateID will be installed directly on your phone as a full app!\n`);

  console.log('Option 2: Generate .APK file via Android Studio:');
  console.log('  1. Download Android Studio (Free): https://developer.android.com/studio');
  console.log('  2. Install it with default settings.');
  console.log('  3. Re-run: "npm run android:open"');
  console.log('  4. In Android Studio: Click "Build" -> "Build Bundle(s) / APK(s)" -> "Build APK(s)".');
  console.log('======================================================================\n');

  process.exit(0);
}
