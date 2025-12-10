# In-App Purchase Testing Guide

## ⚠️ Important: Expo Go Doesn't Support IAP

**In-app purchases DO NOT work in Expo Go.** You must use a development or production build to test subscriptions.

## Steps to Test In-App Purchases

### Option 1: Development Build (Recommended for Testing)

#### iOS:
1. **Build a development build:**
   ```bash
   npm run build:ios:dev
   # OR
   eas build --platform ios --profile development
   ```

2. **Install on your device:**
   - Download the build from EAS or install via Xcode
   - Make sure you're signed in with your Apple Developer account on the device

3. **Set up Sandbox Testing Account:**
   - Go to App Store Connect → Users and Access → Sandbox Testers
   - Create a sandbox tester account (use a different email than your main Apple ID)
   - Sign out of your regular Apple ID in Settings → App Store
   - When you try to purchase, sign in with the sandbox account

4. **Test the purchases:**
   - Open your app
   - Navigate to the premium/paywall screen
   - Try purchasing - it will use the sandbox environment
   - Sandbox purchases are free but simulate real purchases

#### Android:
1. **Build a development build:**
   ```bash
   npm run build:android:dev
   # OR
   eas build --platform android --profile development
   ```

2. **Install on your device:**
   - Download the APK from EAS or install via Android Studio

3. **Set up License Testing:**
   - Go to Google Play Console → Settings → License Testing
   - Add your Gmail account as a license tester
   - Make sure your products are in "Active" status in Play Console

4. **Test the purchases:**
   - Open your app
   - Navigate to the premium/paywall screen
   - Try purchasing - test purchases are free

### Option 2: Local Development Build

#### iOS:
```bash
npm run ios
# OR
npx expo run:ios
```

#### Android:
```bash
npm run android
# OR
npx expo run:android
```

**Note:** You still need to be signed in with appropriate accounts and have products configured.

## Prerequisites

### iOS:
1. ✅ Products created in App Store Connect
2. ✅ Products linked to RevenueCat
3. ✅ RevenueCat offering configured with packages
4. ✅ Sandbox tester account created
5. ✅ Development build installed on device

### Android:
1. ✅ Products created in Google Play Console
2. ✅ Products linked to RevenueCat
3. ✅ RevenueCat offering configured with packages
4. ✅ License tester account added
5. ✅ Development build installed on device

## Your Product IDs

- Monthly: `lw_monthly_499`
- Yearly: `lw_yearly_3999`

Make sure these are:
- ✅ Created in App Store Connect (iOS) / Play Console (Android)
- ✅ Linked to RevenueCat products
- ✅ Added to a RevenueCat offering as packages
- ✅ Offering is set as "Current" in RevenueCat

## Troubleshooting

### "No subscription plans available"
- Check that RevenueCat offering is set as "Current"
- Verify products are linked to packages in RevenueCat
- Make sure you're using a development/production build (not Expo Go)

### "Cannot read property 'priceString' of undefined"
- This means packages don't have `storeProduct` attached
- The code now fetches products directly, so this should be fixed
- Check console logs for debug information

### Products don't show up
- Verify product IDs match exactly: `lw_monthly_499` and `lw_yearly_3999`
- Check RevenueCat dashboard to ensure products are linked
- Make sure you're testing on a real device (not simulator for iOS IAP)
- For iOS: Must be signed in with sandbox account when purchasing

### Testing on Simulator
- **iOS Simulator:** IAP doesn't work on iOS Simulator - use a real device
- **Android Emulator:** IAP works on Android emulator if Google Play Services is installed

## Quick Test Checklist

- [ ] Built development build (not Expo Go)
- [ ] Installed on device
- [ ] Products configured in App Store Connect / Play Console
- [ ] Products linked in RevenueCat
- [ ] RevenueCat offering set as "Current"
- [ ] Sandbox account set up (iOS) or License tester (Android)
- [ ] Signed in with test account (iOS) or using test account (Android)
- [ ] App can fetch products from RevenueCat
- [ ] Purchase flow works

## Debug Commands

Add this to your code temporarily to see what RevenueCat returns:

```typescript
import { debugRevenueCatOfferings } from '@/utils/revenueCatDebug';

// Call this in a button press or useEffect
await debugRevenueCatOfferings();
```

This will log all available offerings, packages, and products to the console.


