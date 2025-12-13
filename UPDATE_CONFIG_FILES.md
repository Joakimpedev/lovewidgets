# Update Configuration Files After Enabling Google Sign-In

Firebase has automatically created OAuth clients and updated your config files. You need to download and replace them.

## Step 1: Download Updated Config Files

In Firebase Console, you should see a button to **Download latest configuration file** or similar. Here's how to get them:

### For Android (google-services.json):
1. Firebase Console → **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Find your **Android app** (package: `com.lovewidgets.app`)
4. Click **Download google-services.json**
5. Save the file

### For iOS (GoogleService-Info.plist):
1. Firebase Console → **Project Settings** (gear icon)
2. Scroll to **Your apps** section
3. Find your **iOS app** (bundle ID: `com.lovewidgets.app`)
4. Click **Download GoogleService-Info.plist**
5. Save the file

## Step 2: Replace Files in Your Project

Replace the existing files in your project root:

1. **Replace `google-services.json`** in the root directory
2. **Replace `GoogleService-Info.plist`** in the root directory

**Important**: Make sure to replace the files, don't just add new ones!

## Step 3: Find Your OAuth Client ID

After downloading the config files, you can find the OAuth Client ID:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **lovewidgets-41a33**
3. Go to **APIs & Services** → **Credentials**
4. You'll see **OAuth 2.0 Client IDs** section
5. Find **Web client (auto created by Google Service)**
6. Click on it
7. Copy the **Client ID** (ends in `.apps.googleusercontent.com`)

## Step 4: Update Your Code

1. Open `context/AuthContext.tsx`
2. Find line 62: `webClientId: 'YOUR_WEB_CLIENT_ID_HERE',`
3. Replace `YOUR_WEB_CLIENT_ID_HERE` with the Client ID you copied

## Step 5: Rebuild Your App

After replacing the config files, you need to rebuild:

```bash
# For iOS
npm run ios

# For Android
npm run android
```

Or if you're using EAS:
```bash
npx expo prebuild --clean
```

## What Changed?

The new config files now include the OAuth client information that Firebase created automatically. This is why you need to replace them - they have updated credentials.

