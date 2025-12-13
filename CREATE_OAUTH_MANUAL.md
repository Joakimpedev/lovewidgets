# Manually Create OAuth 2.0 Client ID

Since you've already set up the consent screen, you can create the OAuth client manually. This is perfectly fine and gives you more control.

## Step 1: Create OAuth Client in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in project: **lovewidgets-41a33**
3. Navigate to **APIs & Services** → **Credentials**
4. Click **+ CREATE CREDENTIALS** at the top
5. Select **OAuth client ID**

## Step 2: Configure the OAuth Client

1. **Application type**: Select **Web application**
2. **Name**: Enter something like "LoveWidgets Web Client" or "Firebase Web Client"
3. **Authorized JavaScript origins**: 
   - Click **+ ADD URI**
   - Add: `https://lovewidgets-41a33.firebaseapp.com`
   - Add: `https://lovewidgets-41a33.web.app` (if you have a web app)
4. **Authorized redirect URIs**:
   - Click **+ ADD URI**
   - Add: `https://lovewidgets-41a33.firebaseapp.com/__/auth/handler`
   - Add: `https://lovewidgets-41a33.web.app/__/auth/handler` (if you have a web app)
5. Click **CREATE**

## Step 3: Copy the Client ID

After creating, you'll see a popup with:
- **Your Client ID** (this is what you need!)
- **Your Client Secret** (you don't need this for mobile apps)

The Client ID will look like:
```
843832822074-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
```

**Copy the Client ID** (the long string ending in `.apps.googleusercontent.com`)

## Step 4: Update Your Code

1. Open `context/AuthContext.tsx`
2. Find line 62: `webClientId: 'YOUR_WEB_CLIENT_ID_HERE',`
3. Replace `YOUR_WEB_CLIENT_ID_HERE` with your actual Client ID

Example:
```typescript
GoogleSignin.configure({
  webClientId: '843832822074-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com',
  offlineAccess: true,
});
```

## Step 5: Enable Google Sign-In in Firebase (Still Required)

Even though you created the OAuth client manually, you still need to enable Google Sign-In in Firebase:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **lovewidgets-41a33**
3. Navigate to **Authentication** → **Sign-in method**
4. Click on **Google**
5. Toggle **Enable** to ON
6. Enter your **Support email**
7. Click **Save**

## Why Both Steps?

- **Google Cloud Console**: Creates the OAuth client credentials
- **Firebase Console**: Enables Google Sign-In as an authentication method for your app

Both are needed for Google Sign-In to work!

## Notes

- The Client ID you create manually will work perfectly with the `@react-native-google-signin/google-signin` package
- You can use the same Client ID for both iOS and Android
- The redirect URIs are mainly for web apps, but it's good to have them configured

