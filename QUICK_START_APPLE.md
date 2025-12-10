# Quick Start: Apple Developer Setup

## ✅ What's Been Configured

1. **iOS Bundle Identifier**: `com.lovewidgets.app` (added to app.json)
2. **EAS Build Profiles**: Development, Preview, and Production configurations
3. **Build Scripts**: Added npm scripts for easy building/submitting
4. **Setup Guide**: See `APPLE_DEV_SETUP.md` for complete instructions

## 🚀 Quick Start (3 Steps)

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

### Step 2: Set Up Credentials
```bash
eas credentials
# Select: iOS
# Choose automatic setup (recommended)
```

### Step 3: Build Your App
```bash
npm run build:ios:preview
# or
npm run build:ios:prod
```

## 📝 Prerequisites You Need

- [ ] Apple Developer Account ($99/year) - [Sign up](https://developer.apple.com)
- [ ] Expo Account (already have: `joakimpe`)
- [ ] App Store Connect app created (see full guide)

## 📚 Full Documentation

See **`APPLE_DEV_SETUP.md`** for:
- Detailed step-by-step instructions
- Troubleshooting guide
- Testing strategies for Windows
- App Store submission process

## 🎯 Next Steps

1. Get Apple Developer account (if not done)
2. Run `eas credentials` to set up iOS certificates
3. Create app in App Store Connect
4. Build your first iOS app: `npm run build:ios:preview`
5. Test on device via TestFlight

## ⚠️ Important Notes

- You're on Windows, so you'll use **EAS Build** (cloud builds) - no local iOS builds needed
- First build takes 15-20 minutes
- Free EAS accounts have queue times; paid accounts get priority
- Widget plugins are currently disabled (can enable later)

## 🛠️ Available Commands

```bash
# Build iOS
npm run build:ios:dev      # Development build
npm run build:ios:preview  # Preview/TestFlight build
npm run build:ios:prod     # Production/App Store build

# Build Android
npm run build:android:dev
npm run build:android:preview
npm run build:android:prod

# Build Both
npm run build:all:preview
npm run build:all:prod

# Submit to Stores
npm run submit:ios         # Submit iOS to App Store
npm run submit:android     # Submit Android to Google Play

# Credentials
npm run credentials        # Manage certificates/profiles
```

---

**Ready to start?** Check out `APPLE_DEV_SETUP.md` for the complete guide! 🎉

