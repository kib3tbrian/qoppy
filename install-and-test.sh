#!/bin/bash
# Install and Test Script for Sagent App

set -e

APK_PATH="android/app/build/outputs/apk/release/app-release.apk"
PACKAGE_NAME="com.sagent"
LOG_FILE="test-logs-$(date +%Y%m%d-%H%M%S).txt"

echo "==================================="
echo "Sagent App - Install & Test Script"
echo "==================================="
echo ""

# Check if APK exists
if [ ! -f "$APK_PATH" ]; then
    echo "❌ Error: APK not found at $APK_PATH"
    echo "Please run: cd android && ./gradlew assembleRelease"
    exit 1
fi

echo "✓ APK found: $APK_PATH"
echo ""

# Check for connected devices
echo "Checking for connected devices..."
DEVICES=$(adb devices | grep -v "List" | grep "device$" | wc -l)

if [ "$DEVICES" -eq 0 ]; then
    echo "❌ No devices connected!"
    echo ""
    echo "Please ensure:"
    echo "  1. USB debugging is enabled on your phone"
    echo "  2. Phone is connected via USB or WiFi"
    echo "  3. You've accepted the USB debugging prompt"
    echo ""
    echo "To connect via WiFi:"
    echo "  adb connect <phone-ip>:5555"
    echo ""
    exit 1
fi

echo "✓ Found $DEVICES device(s)"
adb devices -l
echo ""

# Uninstall old version (if exists)
echo "Removing old version (if exists)..."
adb uninstall "$PACKAGE_NAME" 2>/dev/null || echo "  (no previous installation)"
echo ""

# Install APK
echo "Installing APK..."
adb install "$APK_PATH"
echo ""
echo "✓ App installed successfully!"
echo ""

# Launch app
echo "Launching app..."
adb shell am start -n "$PACKAGE_NAME/.MainActivity"
echo ""
echo "✓ App launched!"
echo ""

# Start capturing logs
echo "==================================="
echo "CAPTURING LOGS (Press Ctrl+C to stop)"
echo "Logs will be saved to: $LOG_FILE"
echo "==================================="
echo ""

# Create log file with header
cat > "$LOG_FILE" << EOF
===========================================
Sagent App Test Logs
Build: Release
Date: $(date)
===========================================

EOF

# Capture logs in real-time and save to file
adb logcat -c  # Clear existing logs first
adb logcat | tee -a "$LOG_FILE" | grep -E "(ReactNativeJS|sagent|ManageCategories|useCategories|useSnippets|Database|SnippetCard)" --color=always

