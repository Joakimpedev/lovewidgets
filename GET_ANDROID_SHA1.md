# Get Android SHA-1 Fingerprint

Firebase needs your app's SHA-1 fingerprint to enable Google Sign-In on Android.

## Method 1: Using keytool (Easiest - Works if Java is installed)

### On Windows (PowerShell or Command Prompt):
```powershell
keytool -list -v -keystore $env:USERPROFILE\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### On Windows (Command Prompt):
```cmd
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### On Mac/Linux:
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Look for the line that says:
```
SHA1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

Copy the **SHA1** value (the long string with colons, like: `A1:B2:C3:...`).

## Method 2: Get Debug SHA-1 via Gradle (If Java is set up)

### On Windows (PowerShell):
```powershell
cd android
.\gradlew signingReport
```

### On Mac/Linux:
```bash
cd android
./gradlew signingReport
```

Look for the output that shows:
```
Variant: debug
Config: debug
Store: C:\Users\YourName\.android\debug.keystore
Alias: AndroidDebugKey
SHA1: XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX:XX
```

Copy the **SHA1** value (the long string with colons).

## Method 2: Get SHA-1 from Keystore Directly

If you have a keystore file:

### Debug Keystore (Default):
```bash
keytool -list -v -keystore %USERPROFILE%\.android\debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### Release Keystore (If you have one):
```bash
keytool -list -v -keystore path/to/your/keystore.jks -alias your-alias-name
```

Look for **SHA1** in the output.

## Step 2: Add SHA-1 to Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **lovewidgets-41a33**
3. Go to **Project Settings** (gear icon)
4. Scroll to **Your apps** section
5. Find your **Android app** (package: `com.lovewidgets.app`)
6. Click **Add fingerprint** or the **+** button
7. Paste your SHA-1 fingerprint
8. Click **Save**

## Step 3: Download Updated Config File

After adding the SHA-1:
1. Click **Download google-services.json**
2. Replace the `google-services.json` file in your project root
3. Make sure it's the same file referenced in `app.json`

## Important Notes

- **Debug SHA-1**: Use this for development and testing
- **Release SHA-1**: You'll need to add this later when you create a release keystore for production
- You can add multiple SHA-1 fingerprints (one for debug, one for release)
- After adding SHA-1, you MUST download and replace the `google-services.json` file

## Quick Command (Windows)

If you're in the project root:
```powershell
cd android
.\gradlew signingReport
```

Then copy the SHA1 value and add it to Firebase.

