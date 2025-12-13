# Get Web Client ID (OAuth 2.0) - Final Step

You need to get the **Web Client ID** from Google Cloud Console and add it to your code.

## Step 1: Get Web Client ID from Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in project: **lovewidgets-41a33** (check the project dropdown at the top)
3. Navigate to **APIs & Services** → **Credentials**
4. Look for **OAuth 2.0 Client IDs** section
5. Find **Web client (auto created by Google Service)** - this is the one you need!
6. Click on it
7. Copy the **Client ID** (it will look like: `843832822074-xxxxxxxxxxxx.apps.googleusercontent.com`)

**Note**: This is different from the iOS CLIENT_ID in your plist file. You need the **Web client** one.

## Step 2: Add It to Your Code

1. Open `context/AuthContext.tsx`
2. Find line 62: `webClientId: 'YOUR_WEB_CLIENT_ID_HERE',`
3. Replace `YOUR_WEB_CLIENT_ID_HERE` with the Web Client ID you copied

Example:
```typescript
GoogleSignin.configure({
  webClientId: '843832822074-xxxxxxxxxxxx.apps.googleusercontent.com',
  offlineAccess: true,
});
```

## That's It!

After adding the Web Client ID, Google Sign-In will be fully configured and ready to use!

## If You Don't See the Web Client

If you don't see "Web client (auto created by Google Service)" in Google Cloud Console:
- Make sure Google Sign-In is enabled in Firebase Console (Authentication → Sign-in method → Google)
- Wait a few seconds and refresh the page
- It should have been created automatically when you enabled Google Sign-In

