# Android SDK Setup Guide

This guide will help you set up the Android SDK on Windows so you can build and run the Android app.

## Option 1: Install Android Studio (Recommended)

### Step 1: Download and Install Android Studio

1. Download Android Studio from: https://developer.android.com/studio
2. Run the installer and follow the setup wizard
3. During installation, make sure to install:
   - Android SDK
   - Android SDK Platform
   - Android Virtual Device (AVD) - for emulator

### Step 2: Configure Environment Variables

After installing Android Studio, you need to set the `ANDROID_HOME` environment variable:

1. **Find your SDK location**:
   - Open Android Studio
   - Go to **File → Settings** (or **Android Studio → Preferences** on Mac)
   - Navigate to **Appearance & Behavior → System Settings → Android SDK**
   - Note the "Android SDK Location" path (usually `C:\Users\YourName\AppData\Local\Android\Sdk`)

2. **Set ANDROID_HOME in Windows**:
   - Press `Win + X` and select **System**
   - Click **Advanced system settings**
   - Click **Environment Variables**
   - Under **User variables**, click **New**
   - Variable name: `ANDROID_HOME`
   - Variable value: Your SDK path (e.g., `C:\Users\YourName\AppData\Local\Android\Sdk`)
   - Click **OK**

3. **Add to PATH**:
   - In the same Environment Variables window, find **Path** under User variables
   - Click **Edit**
   - Click **New** and add: `%ANDROID_HOME%\platform-tools`
   - Click **New** and add: `%ANDROID_HOME%\tools`
   - Click **New** and add: `%ANDROID_HOME%\tools\bin`
   - Click **OK** on all windows

4. **Restart your terminal/PowerShell**:
   - Close all PowerShell/Command Prompt windows
   - Open a new PowerShell window
   - Verify with: `echo $env:ANDROID_HOME`

### Step 3: Install Required SDK Components

1. Open Android Studio
2. Go to **Tools → SDK Manager**
3. In the **SDK Platforms** tab, check:
   - ✅ Android 14.0 (API 34) or latest
   - ✅ Android 13.0 (API 33) - recommended
4. In the **SDK Tools** tab, check:
   - ✅ Android SDK Build-Tools
   - ✅ Android SDK Command-line Tools
   - ✅ Android SDK Platform-Tools
   - ✅ Android Emulator
5. Click **Apply** and wait for installation

### Step 4: Verify Installation

Open a new PowerShell window and run:

```powershell
# Check ANDROID_HOME
echo $env:ANDROID_HOME

# Check adb (Android Debug Bridge)
adb version

# Check if SDK is found
$env:ANDROID_HOME
```

If these commands work, you're all set!

## Option 2: Quick Setup via PowerShell (If Android Studio is Already Installed)

If you already have Android Studio installed but the environment variables aren't set:

```powershell
# Find your SDK location (usually in one of these)
$sdkPath = "$env:LOCALAPPDATA\Android\Sdk"
# Or check: C:\Users\$env:USERNAME\AppData\Local\Android\Sdk

# Set for current session
$env:ANDROID_HOME = $sdkPath
$env:PATH += ";$sdkPath\platform-tools;$sdkPath\tools"

# Verify
adb version
```

**Note**: This only sets it for the current PowerShell session. For permanent setup, use Option 1.

## Option 3: Use EAS Build (Cloud Build - No Local SDK Needed)

If you don't want to set up the Android SDK locally, you can use Expo's cloud build service:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for Android (cloud build)
eas build --platform android --profile development
```

This builds your app in the cloud, so you don't need the Android SDK installed locally.

## Troubleshooting

### "adb is not recognized"
- Make sure `%ANDROID_HOME%\platform-tools` is in your PATH
- Restart your terminal after setting environment variables

### "Failed to resolve Android SDK path"
- Verify `ANDROID_HOME` is set correctly: `echo $env:ANDROID_HOME`
- Make sure the path exists and contains `platform-tools` folder

### "SDK not found"
- Open Android Studio → SDK Manager
- Make sure at least one Android SDK Platform is installed
- Check that the SDK location matches your `ANDROID_HOME` variable

### Still having issues?

1. **Check if Android Studio is installed**:
   - Look for Android Studio in your Start menu
   - If not installed, use Option 1 above

2. **Verify SDK location**:
   - Open Android Studio
   - File → Settings → Android SDK
   - Copy the exact path shown
   - Set that as `ANDROID_HOME`

3. **Use EAS Build instead** (Option 3) - no local setup needed!

## Next Steps

Once the Android SDK is set up:

1. **Generate native Android folder** (if not already done):
   ```bash
   npx expo prebuild --platform android
   ```

2. **Run the app**:
   ```bash
   npx expo run:android
   ```

3. **Or start Expo and connect**:
   ```bash
   npx expo start
   # Then press 'a' to open on Android emulator/device
   ```

## Testing the Widget

After the app builds successfully:

1. Send a drawing from the canvas screen
2. Long press on your Android home screen
3. Select "Widgets"
4. Find "LoveWidgets" and add the widget
5. Verify it shows your latest drawing!

