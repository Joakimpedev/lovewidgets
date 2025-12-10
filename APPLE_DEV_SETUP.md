# Apple Developer Account Setup Guide (Windows)

This guide will walk you through connecting your LoveWidgets app to your Apple Developer account and preparing it for App Store submission, all from Windows using Expo's cloud-based build service (EAS Build).

## Overview

Since you're on Windows, you cannot build iOS apps directly. Instead, we'll use **EAS Build** (Expo Application Services) which builds your iOS app in the cloud on macOS machines. This is the recommended approach for Windows developers.

## Prerequisites

1. ✅ **Apple Developer Account** ($99/year)
   - Sign up at [developer.apple.com](https://developer.apple.com)
   - You need an **Individual** or **Organization** account
   - Wait for approval (usually 24-48 hours)

2. ✅ **Expo Account** (Free tier works, but consider paid for faster builds)
   - Sign up at [expo.dev](https://expo.dev)
   - Your project is already connected (owner: `joakimpe`)

3. ✅ **EAS CLI** installed
   - We'll verify/install this in Step 1

## Step-by-Step Setup

### Step 1: Install and Configure EAS CLI

```bash
npm install -g eas-cli
```

Verify installation:
```bash
eas --version
```

Login to your Expo account:
```bash
eas login
```

Make sure you're using the correct account (the one with owner `joakimpe`):
```bash
eas whoami
```

If you need to switch accounts:
```bash
eas logout
eas login
```

### Step 2: Configure Your Apple Developer Credentials

EAS can automatically manage certificates and provisioning profiles for you. You have two options:

#### Option A: Automatic Credential Management (Recommended)

EAS will handle everything automatically. Just ensure you're logged into your Apple Developer account.

**On your Windows machine, you'll need:**

1. **App Store Connect API Key** (Recommended for automation)
   - Go to [App Store Connect](https://appstoreconnect.apple.com)
   - Users and Access → Keys → App Store Connect API
   - Click "+" to create a new key
   - Download the `.p8` file (you can only download once!)
   - Note the Key ID
   - Note the Issuer ID (found at top of Keys page)

   Store these securely (but DON'T commit to git - they're already in .gitignore)

2. **Or use Apple ID authentication** (Simpler but requires manual steps)
   - EAS will prompt you during builds

#### Option B: Manual Certificate Upload (Advanced)

If you already have certificates, you can upload them, but Option A is easier.

### Step 3: Configure Bundle Identifier in App Store Connect

1. Log into [App Store Connect](https://appstoreconnect.apple.com)
2. Click **"My Apps"** → **"+"** → **"New App"**
3. Fill in:
   - **Platform**: iOS
   - **Name**: LoveWidgets (or your preferred name)
   - **Primary Language**: Choose your language
   - **Bundle ID**: `com.lovewidgets.app` (must match app.json)
   - **SKU**: Any unique identifier (e.g., `lovewidgets-ios-001`)
   - **User Access**: Full Access

4. Click **Create**
5. Complete the app information (you can come back to this later)

### Step 4: Link EAS to Your Apple Developer Account

Run this command to set up credentials:

```bash
eas credentials
```

This will:
- Detect if credentials are configured
- Allow you to set up iOS credentials
- Guide you through certificate generation

**If using App Store Connect API Key:**
```bash
eas credentials
# Select: iOS
# Select: Set up App Store Connect API Key
# Enter: Key ID, Issuer ID, Path to .p8 file
```

**If using Apple ID:**
```bash
eas credentials
# Select: iOS
# EAS will guide you through Apple ID login (may open browser)
```

### Step 5: Update eas.json with Your Information

After setting up credentials, you may need to update `eas.json` with your App Store Connect details:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@example.com",  // Your Apple ID email
        "ascAppId": "1234567890",                 // Found in App Store Connect URL
        "appleTeamId": "ABC123DEFG"               // Found in Apple Developer portal
      }
    }
  }
}
```

**To find these values:**
- `appleId`: Your Apple ID email
- `ascAppId`: 
  - Go to App Store Connect → My Apps → Your App
  - Look at the URL: `https://appstoreconnect.apple.com/apps/[ASC_APP_ID]/...`
- `appleTeamId`:
  - Go to [developer.apple.com](https://developer.apple.com/account)
  - Membership → Team ID (looks like: `ABC123DEFG`)

### Step 6: Build Your First iOS App

Now you can build your iOS app in the cloud!

**Development Build** (for testing with development client):
```bash
eas build --platform ios --profile development
```

**Preview Build** (for TestFlight/internal testing):
```bash
eas build --platform ios --profile preview
```

**Production Build** (for App Store):
```bash
eas build --platform ios --profile production
```

The build will:
1. Upload your code to EAS servers
2. Build on a macOS machine in the cloud
3. Provide a download link when complete
4. Take 10-20 minutes (first build is slower)

### Step 7: Submit to TestFlight

Once you have a production build:

```bash
eas submit --platform ios --profile production
```

This will:
- Upload your build to App Store Connect
- Process it for TestFlight (takes ~30-60 minutes)
- Make it available in TestFlight for testing

### Step 8: Enable Widget Plugins (When Ready)

Currently, your iOS widget plugins are commented out in `app.json`. When you're ready to enable them:

1. Uncomment the widget plugin lines in `app.json`:
```json
"plugins": [
  "expo-router",
  ["expo-splash-screen", {...}],
  "expo-dev-client",
  "./plugins/withAndroidWidget.js",
  "./plugins/withIOSWidget.js"
]
```

2. Rebuild your app with:
```bash
eas build --platform ios --profile production --clear-cache
```

## Important Notes for Windows Development

### What You CAN'T Do on Windows:
- ❌ Run iOS Simulator
- ❌ Test native iOS features directly
- ❌ Use Xcode
- ❌ Build iOS apps locally

### What You CAN Do on Windows:
- ✅ Develop React Native/Expo code
- ✅ Test in Expo Go (limited features)
- ✅ Use EAS Build for cloud builds
- ✅ Test on physical iOS devices via TestFlight
- ✅ Submit to App Store
- ✅ Use Android emulator for testing Android version

### Testing Options:
1. **Expo Go** (Quick testing, limited features)
   ```bash
   npx expo start
   ```
   Scan QR code with Expo Go app

2. **Development Build on Device** (Full features)
   - Build development version: `eas build --platform ios --profile development`
   - Install on device via link or TestFlight
   - Run: `npx expo start --dev-client`

3. **TestFlight** (Production-like testing)
   - Build preview/production: `eas build --platform ios --profile preview`
   - Submit to TestFlight: `eas submit --platform ios`
   - Install via TestFlight app

## Troubleshooting

### Build Fails with Certificate Errors
- Run `eas credentials` and reconfigure
- Check that your Apple Developer account is active
- Verify bundle identifier matches App Store Connect

### "No devices registered"
- For development builds, you may need to register your device UDID
- Run: `eas device:create`
- Follow prompts to add device

### Widget Extension Issues
- Widgets require additional configuration
- Make sure `withIOSWidget.js` plugin is properly configured
- Widget builds take longer (additional target to compile)

### Build Queue Time
- Free EAS accounts have longer queue times
- Paid accounts ($29/month) get priority builds
- Consider upgrading if building frequently

## Next Steps

1. ✅ Get Apple Developer account (if not done)
2. ✅ Set up EAS credentials
3. ✅ Create App Store Connect app entry
4. ✅ Build first iOS app
5. ✅ Test on physical device via TestFlight
6. ✅ Iterate and improve
7. ✅ Submit for App Store review

## Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Apple Developer Portal](https://developer.apple.com)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Expo Discord](https://chat.expo.dev) - Great for help!

## Current Configuration

- **Bundle Identifier**: `com.lovewidgets.app`
- **App Group**: `group.com.lovewidgets.data`
- **Expo Owner**: `joakimpe`
- **EAS Project ID**: `3e7a71c6-9779-42ca-88b9-ba578c28d007`

Good luck with your iOS release! 🚀

