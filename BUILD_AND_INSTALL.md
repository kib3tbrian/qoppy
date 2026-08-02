# Building and Installing Test APK

## Method 1: Direct Install via USB/WiFi (Fastest)

If your device is connected via USB or WiFi debugging, use this method:

```bash
# Check connected devices
adb devices

# Build and install directly
cd android
./gradlew installDebug

# Or with npm/yarn
npm run android
# or
yarn android
```

The app will build and install automatically on your connected device.

## Method 2: Build APK and Transfer (USB/WiFi/Any method)

Build the APK file and then install it manually:

### Step 1: Build Debug APK
```bash
cd android
./gradlew assembleDebug
```

### Step 2: Find the APK
The APK will be located at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Step 3: Install on Device

**Option A: Via ADB (USB/WiFi)**
```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

**Option B: Manual Transfer**
1. Copy `app-debug.apk` to your phone (email, cloud, USB transfer)
2. Open the file on your phone
3. Allow "Install from unknown sources" if prompted
4. Tap Install

## Method 3: Build Release APK (For Testing Production Build)

For testing the production-like version:

```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

⚠️ **Note**: Release builds require signing. Check `android/keystore.properties` for keystore configuration.

## Troubleshooting

### "adb: command not found"
Install Android SDK Platform Tools:
```bash
sudo apt install android-sdk-platform-tools  # Ubuntu/Debian
# or download from: https://developer.android.com/tools/releases/platform-tools
```

### "No devices found"
**USB Debugging:**
1. Enable Developer Options on phone (tap Build Number 7 times)
2. Enable USB Debugging in Developer Options
3. Connect via USB
4. Accept "Allow USB debugging" prompt on phone
5. Run `adb devices` to verify

**WiFi Debugging:**
1. Connect phone and computer to same WiFi
2. Get phone IP: Settings → About → Status → IP address
3. On phone: Enable WiFi debugging (Developer Options)
4. On computer: `adb connect <phone-ip>:5555`
5. Accept prompt on phone

### Build Fails
```bash
# Clean and rebuild
cd android
./gradlew clean
./gradlew assembleDebug
```

## Quick Reference

| Command | Purpose |
|---------|---------|
| `adb devices` | List connected devices |
| `adb connect <ip>:5555` | Connect via WiFi |
| `adb disconnect` | Disconnect WiFi debugging |
| `./gradlew installDebug` | Build & install debug |
| `./gradlew assembleDebug` | Build debug APK only |
| `./gradlew assembleRelease` | Build release APK only |
| `adb install <path-to-apk>` | Install APK file |
| `adb uninstall com.sagent` | Uninstall app |
| `adb logcat` | View app logs |

## After Installation

To view logs while testing:
```bash
adb logcat | grep "ReactNativeJS"
```

Or use React Native CLI:
```bash
npx react-native log-android
```
