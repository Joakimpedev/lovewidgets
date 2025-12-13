# Social Authentication Setup Guide

This guide will walk you through setting up Sign in with Apple and Sign in with Google for LoveWidgets.

## Prerequisites

- Firebase project configured
- Apple Developer account (for Apple Sign In)
- Google Cloud Console access (for Google Sign In)

---

## Part 1: Firebase Console Configuration

### 1.1 Enable Authentication Providers

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **lovewidgets-41a33**
3. Navigate to **Authentication** → **Sign-in method**
4. Enable the following providers:

#### Apple Sign In
1. Click on **Apple** provider
2. Toggle **Enable** to ON
3. Click **Save**

#### Google Sign In
1. Click on **Google** provider
2. Toggle **Enable** to ON
3. Enter your **Support email** (required)
4. Click **Save**

---

## Part 2: Apple Sign In Setup (iOS)

### 2.1 Apple Developer Console

1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Select **Identifiers** → Your App ID (`com.lovewidgets.app`)
4. Enable **Sign In with Apple** capability
5. Click **Save**

### 2.2 Configure in Xcode

1. Open your project in Xcode: `ios/LoveWidgets.xcworkspace`
2. Select your app target: **LoveWidgets**
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability**
5. Add **Sign In with Apple**
6. Ensure your provisioning profile includes this capability

### 2.3 Firebase Console - Apple Configuration

1. In Firebase Console → **Authentication** → **Sign-in method** → **Apple**
2. You'll need to add your **Service ID** and **Apple Team ID**:
   - **Service ID**: Create one in Apple Developer Console → **Identifiers** → **Services IDs**
   - **Apple Team ID**: Found in Apple Developer account (top right)
3. Download the **OAuth key** (.p8 file) from Apple Developer Console
4. Upload the key in Firebase Console
5. Add your **Bundle ID**: `com.lovewidgets.app`

**Note**: The `expo-apple-authentication` plugin in `app.json` handles most of this automatically, but you still need to enable it in Apple Developer Console.

---

## Part 3: Google Sign In Setup

**Important for Android Users**: Google Sign In is the standard authentication method on Android. When users sign in with Google, they can easily make in-app purchases using their existing Google Play account. This provides a seamless payment experience.

### 3.1 Get Web Client ID from Firebase

1. Go to Firebase Console → **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Find your **Web app** (or create one if it doesn't exist)
4. Look for **OAuth 2.0 Client IDs** section
5. Copy the **Web client ID** (looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)

### 3.2 Update Code with Web Client ID

1. Open `context/AuthContext.tsx`
2. Find the line: `webClientId: 'YOUR_WEB_CLIENT_ID_HERE',`
3. Replace `YOUR_WEB_CLIENT_ID_HERE` with your actual Web Client ID from step 3.1

### 3.3 Android Configuration

The `google-services.json` file you already have should work, but verify:

1. Ensure `google-services.json` is in the root directory
2. Ensure it's properly configured in `app.json` (already done)
3. The package name in `google-services.json` should match: `com.lovewidgets.app`

**Android Payment Integration**: 
- When Android users sign in with Google, they're already authenticated with their Google account
- In-app purchases through RevenueCat/Google Play will use the same Google account
- No additional authentication is needed for payments - it's seamless!

### 3.4 iOS Configuration

1. Ensure `GoogleService-Info.plist` is in the root directory
2. Ensure it's properly configured in `app.json` (already done)
3. The bundle ID in `GoogleService-Info.plist` should match: `com.lovewidgets.app`

---

## Part 4: Testing

### 4.1 Test on iOS Device/Simulator

1. Build and run the app: `npm run ios`
2. Navigate to the sign-in screen
3. Test **Sign in with Apple** (iOS only)
4. Test **Sign in with Google**

### 4.2 Test on Android Device/Emulator

1. Build and run the app: `npm run android`
2. Navigate to the sign-in screen
3. Test **Sign in with Google** (Apple Sign In not available on Android)
4. **Important**: On Android, Google Sign In is the primary method and integrates seamlessly with Google Play payments

### 4.3 Common Issues

#### Apple Sign In not showing
- Ensure you're testing on iOS device or simulator (not Expo Go)
- Verify Sign In with Apple is enabled in Apple Developer Console
- Check that the capability is added in Xcode

#### Google Sign In fails
- Verify the Web Client ID is correct in `AuthContext.tsx`
- Ensure `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) are up to date
- Check that Google Sign In is enabled in Firebase Console

#### "Sign in was canceled" error
- This is normal if the user cancels the sign-in flow
- The error is handled gracefully and won't be shown to the user

---

## Part 5: Production Checklist

Before releasing to production:

- [ ] Apple Sign In enabled in Apple Developer Console
- [ ] Apple Sign In configured in Firebase Console
- [ ] Google Sign In enabled in Firebase Console
- [ ] Web Client ID added to `AuthContext.tsx`
- [ ] Tested on iOS device (Apple Sign In)
- [ ] Tested on Android device (Google Sign In)
- [ ] Tested on iOS device (Google Sign In)
- [ ] Verified user profiles are created correctly in Firestore
- [ ] Verified RevenueCat user ID is set correctly after social sign-in

---

## Part 6: Code Locations

### Files Modified:
- `context/AuthContext.tsx` - Added `signInWithApple()` and `signInWithGoogle()` methods
- `app/onboarding.tsx` - Added UI buttons and handlers for social sign-in
- `app.json` - Added `expo-apple-authentication` plugin and `usesAppleSignIn` flag
- `package.json` - Added `expo-apple-authentication` and `@react-native-google-signin/google-signin`

### Key Functions:
- `signInWithApple()` - Handles Apple authentication flow
- `signInWithGoogle()` - Handles Google authentication flow
- Both methods integrate with Firebase Auth and create user profiles automatically

---

## Additional Notes

### Apple Sign In on Android
Apple Sign In is only available on iOS. On Android, only Google Sign In will be shown.

### Android Payment Integration
**For Android users, Google Sign In provides the best payment experience:**
- When users sign in with Google, they're authenticated with their Google account
- In-app purchases through RevenueCat/Google Play automatically use the same Google account
- No additional authentication steps needed for payments - it's seamless!
- Users can pay using their existing Google Play payment methods (credit card, PayPal, etc.)
- This is the standard and expected experience on Android

### User Profile Creation
When users sign in with Apple or Google, their profile is automatically created in Firestore via the `completeOnboarding()` function, just like email/password sign-up.

### RevenueCat Integration
After successful social sign-in, the RevenueCat user ID is automatically set via the `setRevenueCatUserId()` call in `app/_layout.tsx`.

---

## Support

If you encounter issues:
1. Check Firebase Console → Authentication → Users to see if accounts are being created
2. Check device logs for detailed error messages
3. Verify all configuration steps above are completed
4. Ensure you're testing on a development build (not Expo Go) for native modules to work

