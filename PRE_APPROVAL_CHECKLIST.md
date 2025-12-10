# Pre-Approval Checklist: While Waiting for Apple Developer Account

While you wait for Apple Developer account approval (usually 24-48 hours), here's everything you can prepare to hit the ground running!

## ✅ Immediate Actions (Do These Now)

### 1. Install and Configure EAS CLI - ✅ DONE!
~~```bash
npm install -g eas-cli
eas login
eas whoami  # Verify you're logged in as the right account
```~~

**Status**: ✅ Already completed!
- EAS CLI installed and working
- Logged in as: `joakimpe`

### 2. Verify Your Expo Account
- Check that your Expo account (owner: `joakimpe`) is active
- Visit [expo.dev](https://expo.dev) and verify your project appears
- Ensure you have the correct permissions

### 3. Test on Android (Since You're on Windows)
You can build and test the Android version right now:
```bash
npm run build:android:preview
```
This will help you catch any cross-platform issues early!

### 4. Review Your App Configuration
- ✅ Bundle ID: `com.lovewidgets.app` (already set)
- ✅ App Group: `group.com.lovewidgets.data` (already set)
- ⚠️ Review app.json for any missing fields (see below)

## 📝 App Store Connect Preparation

### App Information You'll Need

#### Basic Information
- **App Name**: LoveWidgets (or your preferred name)
- **Subtitle** (optional): A short tagline (e.g., "Stay connected with loved ones")
- **Category**: 
  - Primary: Lifestyle / Social Networking / Entertainment (choose best fit)
  - Secondary: (optional)
- **Age Rating**: You'll complete this in App Store Connect (likely 4+ or 9+)

#### Description (Up to 4000 characters)
Draft your app description. Here's a template to start with:

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

#### Keywords (100 characters max)
Example: `love,widget,partner,couple,relationship,connection,letters,garden,scrapbook,family`

#### Support URL
You'll need a support page. Options:
- Create a simple page on your website
- Use a service like [PrivacyPolicyGenerator](https://www.privacypolicygenerator.info/) (includes support page)
- GitHub Pages (free)

#### Marketing URL (Optional)
Your app's marketing website if you have one

### Screenshots You'll Need

Apple requires screenshots for different device sizes. Prepare these in advance:

#### Required Sizes:
1. **6.7" Display** (iPhone 14 Pro Max, 15 Pro Max, etc.)
   - Required: 1290 x 2796 pixels
   - Need: At least 3 screenshots

2. **6.5" Display** (iPhone 11 Pro Max, XS Max)
   - Required: 1242 x 2688 pixels
   - Need: At least 3 screenshots

3. **5.5" Display** (iPhone 8 Plus, etc.)
   - Required: 1242 x 2208 pixels
   - Need: At least 3 screenshots

#### Screenshot Strategy:
- Show your app's key features
- Highlight the widget functionality
- Show the garden, letters, scrapbook features
- Make them visually appealing with annotations/text overlays
- Use tools like [Screenshot.rocks](https://screenshot.rocks) or [AppMockup](https://app-mockup.com)

**You can generate screenshots from your Android build or use simulators/design tools**

### App Icon Requirements
- **1024 x 1024 pixels** (already have: `./assets/images/icon.png`)
- No transparency
- No rounded corners (Apple adds those)
- Verify your icon meets these requirements

### Privacy Policy (REQUIRED)

**You MUST have a privacy policy URL before submitting to App Store.**

Apple requires this if your app:
- Collects user data (✅ You use Firebase/Auth)
- Uses third-party analytics
- Has in-app purchases (if you add them)

**Quick Options:**

1. **Generate One** (Recommended):
   - Use [PrivacyPolicyGenerator](https://www.privacypolicygenerator.info/)
   - Include: Firebase, Authentication, User Data Collection
   - Host it on GitHub Pages, your website, or similar

2. **Use a Template**:
   - Include sections for:
     - Data Collection (Firebase Auth, Firestore)
     - Data Storage (User profiles, messages, images)
     - Third-Party Services (Firebase)
     - User Rights (Access, Delete data)
     - Contact Information

I'll create a template privacy policy document for you to customize.

## 🔍 Code Review & Preparation

### Review Your App Configuration

Let's check a few things:

#### 1. App Versioning
- Current version: `1.0.0` ✅
- iOS build number: `1` ✅
- Consider: Do you want to start with a lower version for beta testing? (e.g., 0.9.0)

#### 2. Required iOS Permissions
Review what permissions your app needs:
- Photo Library (if using image picker)
- Camera (if using camera)
- Notifications (if you add push notifications later)

Add privacy usage descriptions to `app.json` if needed (I'll help with this).

#### 3. Firebase Configuration
- ✅ Firebase is configured
- ⚠️ Consider: Review Firebase security rules before production
- ⚠️ Consider: Set up Firebase App Check for production

#### 4. Error Handling
- Review error handling throughout the app
- Ensure graceful failures for network issues
- Add loading states where needed

### Test Checklist

Even though you can't build iOS yet, you can:

- [ ] Test on Android emulator/device
- [ ] Review app flow end-to-end
- [ ] Check all navigation paths
- [ ] Test error scenarios
- [ ] Verify Firebase connectivity
- [ ] Test on different screen sizes (if possible)

## 📦 Assets to Prepare

### App Store Listing Assets

1. **App Icon** (1024x1024) - ✅ Already have
2. **Screenshots** (see sizes above)
3. **App Preview Video** (Optional but recommended)
   - 15-30 seconds
   - Show key features
   - Can be created from screen recordings

### Marketing Assets (Optional)

- App Store featured image
- Social media graphics
- Promotional images

## 🔐 Security & Compliance

### Before First Build:

1. **Review Firebase Security Rules**
   - Ensure Firestore rules are properly secured
   - Review Storage rules
   - Test with different user roles

2. **Environment Variables**
   - Ensure no sensitive keys in code (already using Firebase config)
   - Consider using EAS Secrets for production

3. **Data Collection Disclosure**
   - Document what data you collect
   - Ensure privacy policy covers everything

## 📋 App Store Connect Setup (Once Approved)

When your account is approved, you'll need to:

1. **Accept Agreements**
   - Apple Developer Program License Agreement
   - Paid Applications Agreement (if you plan in-app purchases)

2. **Create App Entry**
   - Use bundle ID: `com.lovewidgets.app`
   - Fill in all the information you prepared above

3. **App Privacy Questions**
   - Apple will ask detailed questions about data collection
   - Have your privacy policy ready
   - Be honest about what data you collect

4. **Banking & Tax Info**
   - If you plan to sell the app or have in-app purchases
   - Set up payment information
   - Complete tax forms

## 🚀 Action Items Summary

### Do Right Now:
- [ ] Install EAS CLI: `npm install -g eas-cli`
- [ ] Login to EAS: `eas login`
- [ ] Test Android build: `npm run build:android:preview`
- [ ] Draft app description
- [ ] Prepare privacy policy
- [ ] List required screenshot sizes

### Do While Waiting:
- [ ] Create/draft screenshots
- [ ] Write app description (4000 char limit)
- [ ] Research keywords
- [ ] Set up support URL
- [ ] Review Firebase security rules
- [ ] Test app thoroughly on Android
- [ ] Create app preview video (optional)

### Do After Approval:
- [ ] Run `eas credentials` to set up certificates
- [ ] Create app in App Store Connect
- [ ] Upload screenshots and assets
- [ ] Complete app privacy questionnaire
- [ ] Set up banking (if needed)
- [ ] Build first iOS app: `npm run build:ios:preview`

## 💡 Pro Tips

1. **Start with TestFlight Beta**
   - Submit to TestFlight first (internal testing)
   - Test thoroughly before App Store submission
   - Get feedback from friends/family

2. **Version Strategy**
   - Consider starting at 0.9.0 for beta
   - Move to 1.0.0 when ready for public release

3. **Prepare for Review**
   - Apple review takes 24-48 hours typically
   - Have test accounts ready if needed
   - Prepare responses to potential rejection reasons

4. **Monitor Your Account**
   - Check email for approval notice
   - Check [developer.apple.com](https://developer.apple.com) status
   - Usually approved within 24-48 hours after payment

## 📚 Resources

- [App Store Connect Guide](https://developer.apple.com/app-store-connect/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Privacy Policy Generator](https://www.privacypolicygenerator.info/)

---

**Next Steps**: Start with installing EAS CLI and testing your Android build! 🚀

