# Simplest Way to Get OAuth Client ID

Just enable Google Sign-In in Firebase - it will create everything automatically!

## Step 1: Enable Google Sign-In in Firebase (That's It!)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **lovewidgets-41a33**
3. Click **Authentication** (left sidebar)
4. Click **Sign-in method** tab
5. Find **Google** in the list
6. Click on **Google**
7. Toggle **Enable** to **ON**
8. Enter your **Support email** (your email address)
9. Click **Save**

That's it! Firebase will automatically create the OAuth client for you.

## Step 2: Wait 30 Seconds

Give Firebase a moment to create the OAuth client automatically.

## Step 3: Find Your Client ID

After waiting, go to:
1. [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure project is: **lovewidgets-41a33**
3. Go to **APIs & Services** → **Credentials**
4. You'll now see **OAuth 2.0 Client IDs** section
5. Find **Web client (auto created by Google Service)**
6. Click on it
7. Copy the **Client ID** (the long string ending in `.apps.googleusercontent.com`)

## Step 4: Update Code

1. Open `context/AuthContext.tsx`
2. Find line 62: `webClientId: 'YOUR_WEB_CLIENT_ID_HERE',`
3. Replace `YOUR_WEB_CLIENT_ID_HERE` with the Client ID you copied

Done! That's the simplest way - just enable it in Firebase and use what it creates automatically.

