# Why Web Client ID for Mobile Apps?

This is a common question! Here's why:

## The OAuth Flow

Even though your app runs on Android/iOS, Google Sign-In uses **OAuth 2.0**, which is a web-based authentication protocol. Here's what happens:

1. **Your mobile app** (Android/iOS) initiates sign-in
2. **Google's OAuth servers** handle the authentication
3. **The Web Client ID** identifies your app to Google's servers
4. Google returns an ID token to your app
5. Your app uses that token to sign in to Firebase

## Why Not Use Android/iOS Client IDs?

Your config files (`google-services.json` and `GoogleService-Info.plist`) have:
- **Android Client ID** - Used by Firebase SDK for Android-specific features
- **iOS Client ID** - Used by Firebase SDK for iOS-specific features  
- **Web Client ID** - Used by the OAuth flow (what `@react-native-google-signin/google-signin` needs)

## The React Native Library

The `@react-native-google-signin/google-signin` library specifically requires the **Web Client ID** because:
- It uses OAuth 2.0 protocol (web-based)
- It needs to communicate with Google's OAuth servers
- The Web Client ID is what Google's servers recognize for OAuth flows

## Think of It Like This

- **Android/iOS Client IDs** = For Firebase SDK features (database, storage, etc.)
- **Web Client ID** = For OAuth authentication flow (signing in)

Both are needed, but for different purposes:
- Firebase uses the platform-specific IDs
- Google Sign-In uses the Web Client ID for the OAuth flow

## Bottom Line

Even though it's called "Web Client ID", it's the correct one to use for Google Sign-In on mobile apps. The name is just because OAuth is a web protocol, but it works perfectly for Android and iOS apps!

