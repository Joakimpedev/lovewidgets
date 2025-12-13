# Add SHA-1 to Firebase

You have the SHA-1 from EAS! Here's what to do:

## Your Production SHA-1 (From EAS)

```
49:5F:EA:6E:D8:DA:09:B1:32:5B:0B:10:03:64:F2:43:5B:06:A4:CB
```

## Step 1: Add SHA-1 to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **lovewidgets-41a33**
3. Go to **Project Settings** (gear icon)
4. Scroll to **Your apps** section
5. Find your **Android app** (package: `com.lovewidgets.app`)
6. Click **Add fingerprint** or the **+** button next to "SHA certificate fingerprints"
7. Paste this SHA-1: `49:5F:EA:6E:D8:DA:09:B1:32:5B:0B:10:03:64:F2:43:5B:06:A4:CB`
8. Click **Save**

## Step 2: Download Updated Config File

After adding the SHA-1:
1. Click **Download google-services.json**
2. Replace the `google-services.json` file in your project root
3. Make sure it's the same file referenced in `app.json`

## Step 3: Get Debug SHA-1 (For Development Builds)

If you also want to test Google Sign-In in development builds, you'll need the debug SHA-1:

### Option A: Install Java (Recommended)
1. Download Java: https://adoptium.net/temurin/releases/ (Windows x64, JDK 17)
2. Install it
3. Close and reopen PowerShell
4. Run:
   ```powershell
   keytool -list -v -keystore $env:USERPROFILE\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
5. Copy the SHA1 value
6. Add it to Firebase as well (you can have multiple SHA-1 fingerprints)

### Option B: Build a Development Build First
If you build a development build with EAS, it will create credentials and you can get the SHA-1 from there too.

## Important Notes

- **Production SHA-1**: This is what you have now - use it for production builds
- **Debug SHA-1**: Needed if you want to test Google Sign-In in development builds
- You can add **multiple SHA-1 fingerprints** in Firebase (one for debug, one for production)
- After adding SHA-1, you **MUST** download and replace the `google-services.json` file

## Next Steps

1. Add the SHA-1 above to Firebase
2. Download the updated `google-services.json`
3. Replace it in your project
4. You're ready to go!

