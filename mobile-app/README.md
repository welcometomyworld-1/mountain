# PrivateID — Mobile Application (Android)

This directory contains the dedicated mobile application for **PrivateID**.

---

## 📁 Directory Structure
```
mobile-app/
├── android/                 <-- Native Android Studio & Gradle project
│   ├── app/                 <-- Android app module & AndroidManifest.xml
│   │   └── src/main/assets/public/  <-- Bundled web client assets
│   ├── build.gradle
│   ├── gradlew / gradlew.bat
│   └── settings.gradle
├── scripts/
│   ├── open-android.js      <-- Smart launcher for Android Studio or Explorer
│   └── sync.js              <-- Syncs latest web client into Android assets
├── capacitor.config.ts      <-- Capacitor configuration
├── package.json             <-- Mobile app package definitions
└── README.md                <-- This documentation
```

---

## 🚀 How to Run & Build

### 1. Open the Android Project
From the main project root, run:
```bash
npm run android:open
```
- If **Android Studio** is installed, it will automatically launch and load the project!
- If **Android Studio** is not installed yet, it opens the Android project folder in Windows Explorer and gives clear next steps without crashing.

### 2. Build APK in Android Studio
1. Launch Android Studio with the project (`npm run android:open`).
2. Go to: **Build** ➔ **Build Bundle(s) / APK(s)** ➔ **Build APK(s)**.
3. Android Studio will generate the debug `.apk` file located at:
   `mobile-app/android/app/build/outputs/apk/debug/app-debug.apk`
4. Transfer this `.apk` to any Android phone and install!

### 3. Immediate Mobile Testing via PWA (No Android Studio required!)
1. Connect your phone to the same Wi-Fi as your computer.
2. In your phone's Chrome browser, open:
   `http://<YOUR_LOCAL_IP>:5173` (e.g., `http://172.16.1.140:5173`)
3. Tap the 3 dots menu (⋮) in Chrome.
4. Tap **"Install app"** or **"Add to Home Screen"**.
5. PrivateID will be installed on your mobile home screen with native full-screen experience!
