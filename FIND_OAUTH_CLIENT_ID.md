# How to Find Your Firebase OAuth 2.0 Web Client ID

The OAuth 2.0 Client ID is not shown in the Firebase web app configuration code. You need to find it in Google Cloud Console.

## Method 1: Through Firebase Console (Easiest)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **lovewidgets-41a33**
3. Click the **gear icon** (⚙️) next to "Project Overview" → **Project Settings**
4. Scroll down to the **Your apps** section
5. Find your **Web app** (the one with appId: `1:843832822074:web:3d80353773ba2fe21a2803`)
6. Look for a section called **OAuth 2.0 Client IDs** or **OAuth redirect URIs**
7. You should see a **Web client (auto created by Google Service)** with a Client ID

**If you don't see it there**, use Method 2 below.

## Method 2: Through Google Cloud Console (Direct)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in the correct project:
   - Click the project dropdown at the top
   - Select **lovewidgets-41a33** (or search for it)
3. Navigate to **APIs & Services** → **Credentials**
4. Look for **OAuth 2.0 Client IDs**
5. You should see entries like:
   - **Web client (auto created by Google Service)** - This is the one you need!
   - iOS client (auto created by Google Service)
   - Android client (auto created by Google Service)
6. Click on the **Web client** one
7. Copy the **Client ID** (it looks like: `123456789-abcdefghijklmnop.apps.googleusercontent.com`)

## Method 3: If OAuth Client Doesn't Exist Yet

If you don't see an OAuth 2.0 Client ID, you may need to enable Google Sign-In first:

1. Go to Firebase Console → **Authentication** → **Sign-in method**
2. Click on **Google**
3. Toggle **Enable** to ON
4. Enter your **Support email**
5. Click **Save**
6. This will automatically create the OAuth 2.0 Client ID
7. Then go back to Method 1 or 2 to find it

## What the Client ID Looks Like

The Web Client ID will look something like:
```
843832822074-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
```

It's a long string ending in `.apps.googleusercontent.com`

## After Finding It

Once you have the Client ID:
1. Open `context/AuthContext.tsx`
2. Find line 62: `webClientId: 'YOUR_WEB_CLIENT_ID_HERE',`
3. Replace `YOUR_WEB_CLIENT_ID_HERE` with your actual Client ID (keep the quotes)

Example:
```typescript
GoogleSignin.configure({
  webClientId: '843832822074-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com',
  offlineAccess: true,
});
```

