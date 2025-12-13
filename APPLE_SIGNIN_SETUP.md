# Apple Sign-In Setup Guide

Your code is already set up! You just need to configure it in Firebase and Apple Developer Console.

## What's Already Done ✅

- ✅ Code is ready (`signInWithApple` function in `AuthContext.tsx`)
- ✅ UI button is ready (shows on iOS in onboarding)
- ✅ `expo-apple-authentication` plugin is configured in `app.json`
- ✅ `usesAppleSignIn: true` is set in `app.json`

## What You Need to Do

### Step 1: Enable Apple Sign-In in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **lovewidgets-41a33**
3. Navigate to **Authentication** → **Sign-in method**
4. Find **Apple** in the list
5. Click on **Apple**
6. Toggle **Enable** to **ON**
7. Click **Save**

**That's it for Firebase!** Apple Sign-In doesn't need OAuth keys like Google - it's simpler.

### Step 2: Enable in Apple Developer Console

1. Go to [Apple Developer Console](https://developer.apple.com/account/)
2. Sign in with your Apple Developer account
3. Navigate to **Certificates, Identifiers & Profiles**
4. Click **Identifiers** in the left sidebar
5. Find and click on your App ID: **com.lovewidgets.app**
6. Scroll down to **Capabilities**
7. Check the box for **Sign In with Apple**
8. Click **Save** (top right)

### Step 3: Rebuild Your App

After enabling in Apple Developer Console, you need to rebuild:

```bash
npx expo prebuild --clean
```

Then build:
```bash
npm run ios
```

Or with EAS:
```bash
eas build --platform ios --profile production
```

## That's It!

Apple Sign-In is simpler than Google - no OAuth keys needed. Just:
1. ✅ Enable in Firebase Console
2. ✅ Enable in Apple Developer Console  
3. ✅ Rebuild your app

## Testing

- Apple Sign-In only works on **real iOS devices** or **iOS simulators** (not Expo Go)
- You need to be signed in with an Apple ID on the device/simulator
- The button will only show on iOS (it's hidden on Android automatically)

## Troubleshooting

**"Sign In with Apple is not available"**
- Make sure you enabled it in Apple Developer Console
- Make sure you rebuilt the app after enabling
- Make sure you're testing on iOS (not Android or Expo Go)

**"Capability not found"**
- Make sure your Apple Developer account is active
- Make sure you're looking at the correct App ID (`com.lovewidgets.app`)

