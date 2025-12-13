# Simplest Way to Get SHA-1 (No Android Studio Needed)

You don't need Android Studio! Here are the easiest options:

## Option 1: Skip It For Now (Testing Only)

If you're just testing Google Sign-In in development:
1. In Firebase Console, you can **skip adding SHA-1 for now**
2. Google Sign-In will work, but you might see warnings
3. You can add it later when you're ready for production

**Note**: For production builds, you'll need to add the SHA-1 from your release keystore.

## Option 2: Get It From EAS (If Using EAS Build)

If you're using EAS Build (Expo Application Services):

```bash
eas credentials
```

Then select Android → View credentials → You'll see the SHA-1 there.

## Option 3: Install Java and Use keytool (5 minutes)

1. **Download Java**: https://adoptium.net/temurin/releases/
   - Choose: Windows x64, JDK 17 or 21
   - Download the installer (.msi file)
   - Install it (just click Next, Next, Next)

2. **After installing, open a NEW PowerShell window** (important - close and reopen)

3. **Run this command**:
   ```powershell
   keytool -list -v -keystore $env:USERPROFILE\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```

4. **Look for the SHA1 line** and copy it

5. **Paste it in Firebase Console** → Project Settings → Your apps → Android app → Add fingerprint

## Option 4: Use Online Keystore Viewer (Not Recommended)

There are online tools, but **NOT recommended** for security reasons (you'd be uploading your keystore).

## Recommendation

**For now**: Skip adding SHA-1 if you're just testing. Google Sign-In will still work in development.

**Later**: When you create a production build, EAS will give you the SHA-1, or you can install Java and get it then.

The SHA-1 is mainly needed for production builds. For development/testing, you can proceed without it.

