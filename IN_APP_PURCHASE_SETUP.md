# In-App Purchase Setup Guide: Real Testing on Android & iOS

Perfect question! Yes, you can set up **REAL testing environments** for both Android and iOS that test actual payment flows, premium locked content, and currency displays. Here's how:

## ✅ What You Can Test (Both Platforms)

- ✅ **Real payment screens** (native OS payment dialogs)
- ✅ **Premium subscription purchases**
- ✅ **One-time purchases**
- ✅ **Premium locked content** (with real locks)
- ✅ **Currency displays** ($X.XX prices)
- ✅ **Purchase receipts** (real receipts from Apple/Google)
- ✅ **Restore purchases** functionality

## 🎯 The Answer: Yes, It Works the Same!

With the right library, **95% of your code will be identical** for both iOS and Android. The platforms handle the payment UI, you just handle the logic.

---

## 📦 Step 1: Choose an IAP Library

You have two main options:

### Option A: Expo In-App Purchases (Recommended for Expo)

**Library**: `expo-in-app-purchases`

**Pros**:
- ✅ Official Expo package
- ✅ Works with EAS builds
- ✅ Same code for iOS & Android
- ✅ Handles receipts automatically

**Cons**:
- ⚠️ Need to manage products yourself

### Option B: RevenueCat (Recommended for Production)

**Library**: `react-native-purchases`

**Pros**:
- ✅ Industry standard
- ✅ Cross-platform products (define once, works both)
- ✅ Handles receipts & validation
- ✅ Analytics built-in
- ✅ Better for subscriptions

**Cons**:
- ⚠️ More setup (but worth it)
- ⚠️ Free tier available (paid plans for advanced features)

---

## 🚀 Quick Start: Expo In-App Purchases

Let's set this up! I'll guide you through the easiest path.

### Step 1: Install the Package

```bash
npx expo install expo-in-app-purchases
```

### Step 2: Configure app.json

Add the plugin:

```json
{
  "expo": {
    "plugins": [
      "expo-in-app-purchases"
    ]
  }
}
```

---

## 🤖 Android Setup (Do This First!)

### Step 1: Create Products in Google Play Console

1. Go to [play.google.com/console](https://play.google.com/console)
2. Select your app
3. Go to **Monetize** → **Products** → **Subscriptions** (or **In-app products**)
4. Click **Create product**

**For Testing, Create:**
- **Premium Subscription**: `premium_monthly` - $4.99/month
- **One-time Purchase**: `premium_lifetime` - $19.99 one-time
- **Product IDs** must match your code exactly!

### Step 2: Set Up Test Accounts

1. In Play Console, go to **Setup** → **License testing**
2. Add your test email addresses
3. Create a test account (or use existing Google account)

### Step 3: Test with Test Account

1. Build your app: `npm run build:android:preview`
2. Install on device
3. Sign in with test Google account
4. Make purchases - they'll use **test payment cards** (no real charges!)

### Step 4: Configure License Testing

1. Play Console → **Monetize** → **License testing**
2. Add tester email addresses
3. Testers can use special test cards:
   - Always approve: `4242 4242 4242 4242`
   - Always decline: `4000 0000 0000 0002`

---

## 🍎 iOS Setup (After Apple Approval)

### Step 1: Create Products in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Select your app
3. Go to **Features** → **In-App Purchases**
4. Click **+** to create product

**Create Same Products:**
- **Premium Subscription**: `premium_monthly` - $4.99/month
- **One-time Purchase**: `premium_lifetime` - $19.99 one-time

**Important**: Product IDs must match Android exactly!

### Step 2: Set Up Sandbox Testers

1. App Store Connect → **Users and Access** → **Sandbox Testers**
2. Create test Apple IDs (use fake emails)
3. You'll use these to test purchases

### Step 3: Test in Sandbox Mode

1. Build app: `npm run build:ios:preview`
2. Install via TestFlight
3. Sign out of real Apple ID in App Store
4. Make purchase - prompts for sandbox account
5. Sign in with sandbox test account
6. Purchase goes through (no real charge!)

---

## 💻 Code Implementation (Works on Both!)

Here's how your code will look:

```typescript
import * as InAppPurchases from 'expo-in-app-purchases';

// Product IDs (same for both platforms!)
const PRODUCT_IDS = {
  PREMIUM_MONTHLY: 'premium_monthly',
  PREMIUM_LIFETIME: 'premium_lifetime',
};

// Initialize (same code for iOS & Android)
async function initPurchases() {
  await InAppPurchases.connectAsync();
  
  // Get available products
  const { results } = await InAppPurchases.getProductsAsync(Object.values(PRODUCT_IDS));
  // results contains prices, titles, descriptions - all localized!
}

// Purchase (same code!)
async function purchasePremium() {
  try {
    await InAppPurchases.purchaseItemAsync(PRODUCT_IDS.PREMIUM_MONTHLY);
    // Purchase complete!
    // Update user's premium status in Firestore
  } catch (error) {
    // Handle error
  }
}

// Restore purchases (same code!)
async function restorePurchases() {
  await InAppPurchases.getPurchaseHistoryAsync();
  // Check receipts and restore premium status
}
```

**See? Same code for both platforms!** 🎉

---

## 🎨 Your Current Premium System

I noticed you already have:
- ✅ `isPremium` flag in user profile
- ✅ Premium locked content (affections, scrapbook)
- ✅ Shop system for in-app currency

**We can integrate IAP to toggle `isPremium`!**

### Integration Plan:

1. **When user purchases premium** → Set `isPremium: true` in Firestore
2. **When subscription expires** → Set `isPremium: false`
3. **Your existing premium checks** → Already work! Just need to connect to IAP

---

## 🧪 Testing Environment Setup

### Android Testing (You Can Do This NOW!)

1. **Create Play Console account** ($25 one-time)
2. **Create app** in Play Console
3. **Add test products**:
   ```
   Product ID: premium_monthly
   Price: $4.99
   Type: Subscription (monthly)
   ```
4. **Add license testers** (your email)
5. **Build app**: `npm run build:android:preview`
6. **Install on device** with test account
7. **Test purchases** - uses test cards, no real charge!

### iOS Testing (After Apple Approval)

1. **Create products** in App Store Connect
2. **Add sandbox testers**
3. **Build app**: `npm run build:ios:preview`
4. **Install via TestFlight**
5. **Test purchases** - uses sandbox accounts, no real charge!

---

## 💰 Pricing Display

Both platforms give you:
- ✅ **Localized prices** (automatically converts currency)
- ✅ **Formatted prices** ($4.99, €4.99, etc.)
- ✅ **Product titles/descriptions** (localized)

You just request products and display what they return!

---

## 🔐 Premium Lock Implementation

Your existing code already handles this! We just need to connect IAP:

```typescript
// Your existing check (already works!)
if (option.isPremium && !isPremium) {
  // Show premium unlock modal
  showPremiumModal();
}

// New: Premium unlock modal that calls IAP
function showPremiumModal() {
  // Show modal with:
  // - "Unlock Premium - $4.99/month"
  // - "Buy Lifetime - $19.99"
  // - Button triggers purchasePremium()
}
```

---

## 📋 Implementation Checklist

### Setup (Do Once):
- [ ] Install `expo-in-app-purchases` package
- [ ] Add plugin to `app.json`
- [ ] Create products in Google Play Console
- [ ] Create products in App Store Connect (after approval)
- [ ] Set up test accounts for both

### Code (Write Once, Works Both):
- [ ] Initialize IAP connection
- [ ] Fetch available products
- [ ] Display prices from products
- [ ] Handle purchase flow
- [ ] Update Firestore `isPremium` status
- [ ] Handle restore purchases
- [ ] Handle subscription expiry

### Testing:
- [ ] Test Android purchases (test account)
- [ ] Test iOS purchases (sandbox account)
- [ ] Test premium locked content
- [ ] Test restore purchases
- [ ] Test subscription renewal

---

## 🎯 Recommended Approach

1. **Start with Android** (you can test now!)
   - Set up Play Console
   - Create test products
   - Build and test

2. **Use same product IDs for iOS**
   - When Apple approves, create products with SAME IDs
   - Your code will work immediately!

3. **Your existing premium system stays**
   - Just connect IAP to toggle `isPremium`
   - All your locked content already works!

---

## 💡 Pro Tips

1. **Use Same Product IDs**: Make Android and iOS products use identical IDs - code stays the same!

2. **Test Accounts Are Free**: 
   - Android: Use test Google accounts (no charges)
   - iOS: Use sandbox Apple IDs (no charges)

3. **Real Payment UI**: Both platforms show native payment dialogs - you don't build those!

4. **Currency Display**: Platforms handle currency conversion automatically

5. **Receipt Validation**: Both platforms provide receipts - validate server-side for production

---

## 🚀 Next Steps

1. **Create Play Console account** ($25) - you can do this now
2. **Install IAP package**: `npx expo install expo-in-app-purchases`
3. **Create test products** in Play Console
4. **I can help you write the integration code** - connect IAP to your existing premium system

Would you like me to:
- ✅ Set up the IAP package installation?
- ✅ Create the integration code to connect to your existing premium system?
- ✅ Create premium unlock modals with pricing?

**The best part**: Once you set it up for Android, iOS will work with the same code! 🎉

