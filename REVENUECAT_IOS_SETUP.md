# RevenueCat iOS App Setup Guide

## Required Information for RevenueCat iOS App Configuration

### 1. App Bundle ID
**Value**: `com.lovewidgets.app`

This is from your `app.json` file.

---

## Getting App Store Connect API Key (P8, Key ID, Issuer ID)

### Step 1: Go to App Store Connect
1. Open [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Sign in with your Apple Developer account

### Step 2: Navigate to Keys
1. Click **"Users and Access"** in the top menu
2. Click **"Keys"** tab
3. If you don't have a key yet, click **"Generate API Key"** or the **"+"** button

### Step 3: Create/Select a Key
1. **If creating a new key:**
   - Name it something like: "RevenueCat LoveWidgets"
   - Select **"App Manager"** or **"Admin"** role (recommended: Admin)
   - Click **"Generate"**

2. **If you already have a key:**
   - Click on the key name to view details

### Step 4: Download and Get Information
1. **Download the P8 file:**
   - Click **"Download API Key"** button
   - The file will be named like: `AuthKey_XXXXXXXXXX.p8`
   - **⚠️ SAVE THIS FILE SECURELY** - You can only download it once!

2. **Copy the Key ID:**
   - The Key ID is shown next to the key name (format: `ABC123DEFG`)
   - It's also in the filename: `AuthKey_XXXXXXXXXX.p8` where `XXXXXXXXXX` is the Key ID

3. **Copy the Issuer ID:**
   - At the top of the Keys page, you'll see **"Issuer ID"**
   - It looks like: `57246542-96fe-1a63-e053-0824d0110`
   - Copy this UUID

---

## Entering in RevenueCat

### App Details:
- **App name**: `Lovewidgets (App Store)` ✅ (already filled)
- **App Bundle ID**: `com.lovewidgets.app` ← Enter this!

### In-App Purchase Key Configuration:
1. **P8 key file**: 
   - Click "Drop a file here, or click to select"
   - Upload the `.p8` file you downloaded (e.g., `AuthKey_XXXXXXXXXX.p8`)

2. **Key ID**: 
   - Paste the Key ID (the `XXXXXXXXXX` part from filename)

3. **Issuer ID**: 
   - Paste the Issuer ID (the UUID from App Store Connect)

---

## Important Notes

- ⚠️ **You can only download the P8 file once!** Save it securely.
- The Key ID is in the filename after `AuthKey_`
- The Issuer ID is found at the top of the Keys page in App Store Connect
- If you can't find the Issuer ID, it's usually displayed as a UUID at the top of the Keys section

---

## If You Can't Access App Store Connect

If your Apple Developer account is still pending approval, you'll need to wait until it's approved before you can:
- Create an app in App Store Connect
- Generate API keys
- Complete this RevenueCat setup

You can save this setup for later and continue with Android setup first!







