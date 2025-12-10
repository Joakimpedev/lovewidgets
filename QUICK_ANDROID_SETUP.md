# Quick Android Setup for LoveWidgets

## The Problem
Your Android SDK is not set up. You need it to build and run the Android app locally.

## Solution Options

### ✅ Option 1: Install Android Studio (Best for Local Testing)

**Time: ~15-20 minutes**

1. **Download Android Studio**:
   - Go to: https://developer.android.com/studio
   - Download and install (it's a large download, ~1GB)

2. **During Installation**:
   - Make sure to check "Android SDK" and "Android Virtual Device"
   - Let it install the default SDK components

3. **After Installation - Set Environment Variable**:
   
   Open PowerShell as Administrator and run:
   ```powershell
   # Find your SDK path (usually this)
   $sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
   
   # Set permanently for your user
   [System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkPath, "User")
   
   # Add to PATH
   $currentPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
   $newPath = "$currentPath;$sdkPath\platform-tools;$sdkPath\tools"
   [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
   ```

4. **Restart PowerShell** and verify:
   ```powershell
   echo $env:ANDROID_HOME
   adb version
   ```

5. **Then run**:
   ```bash
   npx expo prebuild --platform android
   npx expo run:android
   ```

---

### ✅ Option 2: Use EAS Build (Cloud Build - No Local Setup!)

**Time: ~5 minutes**

This builds your app in the cloud, so you don't need Android SDK installed:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login (create free Expo account if needed)
eas login

# Build for Android in the cloud
eas build --platform android --profile development

# Or build for preview/testing
eas build --platform android --profile preview
```

After the build completes, you'll get an APK file you can install on your Android device.

**Note**: EAS Build is free for development builds, but has limits for production builds.

---

### ✅ Option 3: Use Expo Go (Quick Testing - Limited)

**Time: ~2 minutes**

For quick testing (but widgets won't work in Expo Go):

```bash
npx expo start
# Then scan QR code with Expo Go app on your phone
```

**Limitation**: Native widgets don't work in Expo Go - you need a development build.

---

## Recommended Path

1. **For widget testing**: Use **Option 1** (Android Studio) - widgets require native code
2. **For quick app testing**: Use **Option 2** (EAS Build) - no local setup needed
3. **For UI testing only**: Use **Option 3** (Expo Go) - but widgets won't work

## After Setup

Once you have Android SDK set up, you can test the widget:

1. Build and run: `npx expo run:android`
2. Send a drawing from the canvas
3. Add widget to home screen: Long press → Widgets → LoveWidgets
4. Verify widget shows your latest drawing!

## Need Help?

- Full setup guide: See `ANDROID_SDK_SETUP.md`
- Widget implementation: See `WIDGET_IMPLEMENTATION.md`

