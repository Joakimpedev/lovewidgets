# Pre-Release Checklist: iOS & Android

Great! You've customized your privacy policy. Here's what to do BEFORE and AFTER Apple approval for BOTH platforms.

## ⚠️ CRITICAL: Privacy Policy Must Be HOSTED Online

**Important**: You've saved the privacy policy file, but it needs to be **hosted online** (not just on your computer). Apple and Google need a **public URL**.

### Quick Fix - Host It Now (5 minutes):

1. Go to [gist.github.com](https://gist.github.com)
2. Click "New gist" or the "+" button
3. Filename: `privacy-policy.html`
4. Open your `privacy-policy.html` file, copy ALL the content
5. Paste into Gist
6. Make sure "Create public gist" is selected
7. Click "Create public gist"
8. **Copy the URL** - you'll need this for both stores!
9. Save the URL somewhere

**Your URL will look like**: `https://gist.github.com/yourusername/abc123...`

---

## ✅ What's Already Done

- ✅ EAS CLI installed & logged in
- ✅ Privacy policy customized (date, email added)
- ✅ iOS bundle identifier: `com.lovewidgets.app`
- ✅ Android package: `com.lovewidgets.app`
- ✅ Build configurations ready
- ✅ iOS privacy descriptions added

---

## 📋 Do RIGHT NOW (While Waiting for Apple)

### 1. Host Privacy Policy Online ⭐ REQUIRED
- [ ] Upload to GitHub Gist (5 minutes)
- [ ] Test URL works in browser
- [ ] Save the URL for App Store & Play Store

### 2. Create Google Play Console Account ⭐ Do This Now
- [ ] Go to [play.google.com/console](https://play.google.com/console)
- [ ] Sign up with Google account
- [ ] Pay $25 one-time registration fee
- [ ] Wait for approval (usually instant)

**Why now?** Google Play approval can take time, better to start early!

### 3. Test Android Build ⭐ You Can Do This Now!
```bash
npm run build:android:preview
```
Test on a device or emulator to catch issues early.

### 4. Draft Store Content (30-60 minutes)
- [ ] App description (4000 characters)
- [ ] Short description (80 characters for Android)
- [ ] Keywords/tags
- [ ] Prepare screenshot list

---

## 🍎 iOS Checklist (After Apple Approval)

### Immediate Steps:
- [ ] Run `eas credentials` to set up iOS certificates
- [ ] Create app in App Store Connect
- [ ] Add privacy policy URL to App Store Connect
- [ ] Build iOS app: `npm run build:ios:preview`
- [ ] Submit to TestFlight: `npm run submit:ios`
- [ ] Test on iOS device via TestFlight

### App Store Connect Setup:
- [ ] Complete app information
- [ ] Upload screenshots (required sizes)
- [ ] Set app description
- [ ] Set keywords
- [ ] Complete App Privacy questionnaire
- [ ] Set up banking/tax (if selling app)

---

## 🤖 Android Checklist

### Play Console Setup:
- [ ] Create app entry in Play Console
- [ ] Add privacy policy URL
- [ ] Complete Data Safety section
- [ ] Upload app icon
- [ ] Upload screenshots
- [ ] Write app description
- [ ] Set content rating

### Build & Submit:
- [ ] Build production: `npm run build:android:prod`
- [ ] Create release in Play Console
- [ ] Upload AAB file
- [ ] Submit for review

---

## 📝 Content You Need

### App Description (Both Platforms)
Draft this once, use for both:

```
LoveWidgets - Keep Your Loved Ones Close

LoveWidgets helps you stay connected with your partner, bestie, or family through beautiful widgets, shared moments, and heartfelt letters.

✨ Features:
• Beautiful home screen widgets showing your connection status
• Send and receive love letters
• Shared garden that grows as you connect
• Daily activities and challenges to strengthen your bond
• Scrapbook to save precious memories together

Perfect for couples, best friends, and families who want to stay connected throughout the day.
```

### Screenshots Needed

**iOS** (minimum 3 per size):
- 6.7" display: 1290 x 2796 pixels
- 6.5" display: 1242 x 2688 pixels
- 5.5" display: 1242 x 2208 pixels

**Android** (minimum 2):
- Phone screenshots (various sizes)
- Play Console will show exact requirements

**Tip**: You can capture from your Android preview build!

---

## 🎯 Recommended Timeline

### This Week (While Waiting):
1. ✅ Host privacy policy (5 min)
2. ⭐ Create Play Console account ($25, 30 min)
3. ✅ Draft app descriptions (30 min)
4. ✅ Test Android build (20 min)

### After Apple Approval:
1. Set up iOS credentials
2. Create iOS app in App Store Connect
3. Build & submit iOS to TestFlight
4. Finalize Android build & submit

---

## 💰 Costs Summary

- **Apple Developer**: $99/year ✅ Already paid
- **Google Play**: $25 one-time ⚠️ Need to pay
- **EAS Build**: Free tier (slower) or $29/month (faster)

---

## 🚀 Quick Command Reference

```bash
# Build
npm run build:ios:preview      # iOS TestFlight
npm run build:ios:prod         # iOS App Store
npm run build:android:preview  # Android APK
npm run build:android:prod     # Android AAB (Play Store)
npm run build:all:preview      # Both platforms

# Submit
npm run submit:ios             # Submit to App Store
npm run submit:android         # Submit to Play Store

# Credentials
npm run credentials            # Manage certificates
```

---

## ✅ Final Pre-Release Checklist

### Before First Submission:
- [ ] Privacy policy URL ready (GitHub Gist)
- [ ] App descriptions written
- [ ] Support email ready (andersdavan21@gmail.com)
- [ ] Screenshots prepared
- [ ] Google Play Console account created
- [ ] Apple Developer account approved

### iOS:
- [ ] App created in App Store Connect
- [ ] Privacy policy URL added
- [ ] TestFlight build tested

### Android:
- [ ] App created in Play Console
- [ ] Privacy policy URL added
- [ ] Data Safety completed
- [ ] Production build tested

---

## 💡 Pro Tips

1. **Release Strategy**: Consider releasing iOS first, then Android (less overwhelming)
2. **Version Numbers**: Start with 1.0.0 for both, keep in sync
3. **TestFlight**: iOS internal testing (up to 10,000 testers)
4. **Play Console**: Android internal testing (up to 100 testers initially)
5. **Privacy Policy**: Update Gist anytime - URL stays the same

---

**Next Steps**: 
1. ⭐ Host privacy policy on GitHub Gist (5 min)
2. ⭐ Create Google Play Console account (30 min)
3. Test Android build (20 min)

You're almost there! 🚀

