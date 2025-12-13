# Create OAuth 2.0 Client ID for Google Sign-In

If you don't see any OAuth 2.0 clients, you need to enable Google Sign-In in Firebase first. This will automatically create the OAuth client.

## Step 1: Enable Google Sign-In in Firebase

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **lovewidgets-41a33**
3. Navigate to **Authentication** (in the left sidebar)
4. Click on **Sign-in method** tab
5. Find **Google** in the list of providers
6. Click on **Google**
7. Toggle the **Enable** switch to **ON**
8. Enter your **Support email** (this is required - use your email address)
9. Click **Save**

## Step 2: Wait a Few Seconds

After enabling Google Sign-In, Firebase automatically creates the OAuth 2.0 Client ID. Wait 10-30 seconds for it to be created.

## Step 3: Find the OAuth Client ID

Now go back to find the Client ID:

### Option A: Through Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in project: **lovewidgets-41a33**
3. Navigate to **APIs & Services** → **Credentials**
4. You should now see **OAuth 2.0 Client IDs** section
5. Look for **Web client (auto created by Google Service)**
6. Click on it to see the **Client ID**
7. Copy the Client ID (it ends in `.apps.googleusercontent.com`)

### Option B: Through Firebase Console
1. Go to Firebase Console → **Project Settings** (gear icon)
2. Scroll down to **Your apps** section
3. Find your **Web app**
4. Look for **OAuth 2.0 Client IDs** section
5. You should see the Web client ID there

## Step 4: Update Your Code

Once you have the Client ID:
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

## Troubleshooting

### Still don't see it after enabling?
- Wait a bit longer (sometimes takes up to a minute)
- Refresh the Google Cloud Console page
- Make sure you're looking in the correct project
- Try going to Firebase Console → Authentication → Sign-in method → Google to verify it's enabled

### Need to create it manually?
If automatic creation doesn't work, you can create it manually:
1. Google Cloud Console → APIs & Services → Credentials
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Application type: **Web application**
4. Name: "Web client"
5. Authorized JavaScript origins: Add `https://lovewidgets-41a33.firebaseapp.com`
6. Authorized redirect URIs: Add `https://lovewidgets-41a33.firebaseapp.com/__/auth/handler`
7. Click **Create**
8. Copy the Client ID

