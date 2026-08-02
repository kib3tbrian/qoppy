# Install and Test Sagent App

## Quick Install

Your release APK is ready at: `android/app/build/outputs/apk/release/app-release.apk`

### Option 1: Direct Install via ADB (Fastest)

```bash
# Run this single command from the project root
./install-and-test.sh
```

This script will:
1. Check for connected devices
2. Uninstall old version
3. Install the new APK
4. Launch the app
5. Start capturing logs filtered for debugging

### Option 2: Manual Steps

```bash
# 1. Check devices
adb devices

# 2. Uninstall old version (if exists)
adb uninstall com.sagent

# 3. Install APK
adb install android/app/build/outputs/apk/release/app-release.apk

# 4. Launch app
adb shell am start -n com.sagent/.MainActivity

# 5. Watch logs (in real-time)
adb logcat | grep -E "(ReactNativeJS|ManageCategories|useCategories|useSnippets|Database|SnippetCard)"
```

### Option 3: Transfer APK to Phone

If ADB isn't working:

```bash
# Copy APK to a location you can access
cp android/app/build/outputs/apk/release/app-release.apk ~/app-release.apk

# Then transfer to phone via:
# - Email attachment
# - Google Drive / Dropbox
# - USB file transfer
# - Any file sharing method

# On phone: Open the APK file and install
```

## Capturing Logs for Debugging

Once the app is running, capture logs:

```bash
# Save all logs to file
adb logcat > sagent-test-logs.txt

# Or filtered logs only
adb logcat | grep -E "(ReactNativeJS|ManageCategories|useCategories|useSnippets|Database|SnippetCard)" > sagent-filtered-logs.txt
```

## What to Test

### 1. Category Deletion Bug
- Go to Settings → Manage Categories
- Try to delete different categories (NOT "Welcome")
- **Expected**: Only "Welcome" should be undeletable
- **Watch for**: Console logs showing category IDs and canDelete status

### 2. Favorites Toggle Bug
- Go to Home screen
- Tap the heart icon on any card to favorite/unfavorite
- **Expected**: Heart should fill/unfill, card should move to Favorites screen
- **Watch for**: Console logs showing toggleFavorite calls and DB changes

### 3. Anonymous vs Signed-In Flow
- Launch app (starts anonymous)
- Try to tap any card action (copy, share, favorite, edit, delete)
- **Expected**: AuthModal should appear asking for Google sign-in
- Sign in with Google
- Try card actions again
- **Expected**: Actions should work without prompting again

### 4. Settings Display
- Before signing in: Should show "?" and "Guest Account"
- After signing in: Should show first letter of email and actual email address

## Log Patterns to Look For

### Category Deletion
```
[ManageCategories] CategoryRow - id: sales, canDelete: true
[ManageCategories] Delete pressed for: sales
[useCategories] deleteCategory called with: sales
[Database] deleteCategory transaction starting for: sales
[Database] Found 5 orphaned snippets, moving to welcome
[Database] Category 'sales' deleted successfully
```

### Favorite Toggle
```
[SnippetCard] Favorite toggled for snippet: abc123
[useSnippets] toggleFavorite called with: abc123
[useSnippets] Optimistic update - isFavorite: true
[Database] toggleFavorite called for: abc123
[Database] toggleFavorite completed - changes: 1
```

## Stopping Log Capture

Press `Ctrl+C` in the terminal to stop capturing logs.

The `install-and-test.sh` script automatically saves logs to a timestamped file like `test-logs-20260802-143022.txt`.
