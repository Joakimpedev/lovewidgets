# Home Screen Widget Implementation

This document describes the complete widget implementation for LoveWidgets, including both iOS and Android support.

## Overview

The widget system allows users to see their partner's latest drawing on their home screen. The implementation includes:

1. **Shared Storage Bridge**: Data layer that allows the React Native app to share image data with native widgets
2. **Native Widget UI**: iOS (SwiftUI) and Android (Kotlin) widget implementations
3. **Update Mechanism**: Native modules that allow React Native to trigger widget updates immediately after a drawing is received

## Architecture

### Data Flow

```
React Native App (Canvas)
  ↓
saveToWidget(imageUrl) → widgetStorage.ts
  ↓
iOS: App Groups (UserDefaults)  |  Android: SharedPreferences
  ↓
Native Widget Extension/Provider
  ↓
Home Screen Widget
```

### Components

#### 1. Shared Storage (`utils/widgetStorage.ts`)

- **iOS**: Uses `react-native-shared-group-preferences` to write to App Group container (`group.com.lovewidgets.data`)
- **Android**: Uses native `WidgetStorageModule` to write to SharedPreferences (`love_widget_prefs`)
- Automatically triggers widget reload after saving

#### 2. Native Modules

**iOS (`widgets/ios/WidgetModule.swift`)**:
- `reloadWidget()`: Calls `WidgetCenter.shared.reloadAllTimelines()` to update all widgets
- `reloadTimelines(kind)`: Updates specific widget kind

**Android (`widgets/android/WidgetStorageModule.kt`)**:
- `saveWidgetData(key, value)`: Saves to SharedPreferences and triggers widget update
- `getWidgetData(key)`: Retrieves data from SharedPreferences
- `reloadWidget()`: Broadcasts update intent to all widget instances

#### 3. Native Widget UI

**iOS (`widgets/ios/LoveWidget.swift`)**:
- SwiftUI widget that reads from App Group UserDefaults
- Displays base64-encoded image or placeholder
- Supports systemSmall and systemMedium sizes

**Android (`widgets/android/LoveWidget.kt`)**:
- AppWidgetProvider that reads from SharedPreferences
- Displays bitmap decoded from base64 data
- Uses RemoteViews for layout

## File Structure

```
widgets/
├── ios/
│   ├── LoveWidget.swift          # Widget UI implementation
│   ├── Info.plist                # Widget extension configuration
│   ├── WidgetModule.swift        # Native module for reloading
│   ├── WidgetModule.m            # Objective-C bridge
│   ├── WidgetModulePackage.swift # Package registration (legacy)
│   └── WidgetModulePackage.m     # Package bridge (legacy)
└── android/
    ├── LoveWidget.kt              # Widget provider
    ├── WidgetStorageModule.kt     # Native module for storage/reload
    ├── WidgetStoragePackage.kt    # Package registration
    ├── widget_layout.xml          # Widget layout
    ├── widget_info.xml            # Widget configuration
    └── strings.xml                # Widget strings

plugins/
├── withIOSWidget.js              # Expo config plugin for iOS
└── withAndroidWidget.js          # Expo config plugin for Android

utils/
└── widgetStorage.ts              # React Native storage bridge
```

## Setup Instructions

### Prerequisites

1. Run `npx expo prebuild` to generate native iOS and Android folders
2. Ensure `react-native-shared-group-preferences` is installed (already in package.json)

### iOS Setup

1. **Add Widget Extension Target** (Manual step required):
   - Open `ios/LoveWidgets.xcworkspace` in Xcode
   - File → New → Target → Widget Extension
   - Name: `LoveWidget`
   - Bundle Identifier: `com.lovewidgets.app.LoveWidget`
   - Language: Swift
   - **Important**: Uncheck "Include Configuration Intent" (we use StaticConfiguration)
   - Delete the auto-generated files and use the files from `ios/LoveWidget/` (copied by plugin)

2. **Configure App Group**:
   - Select the main app target → Signing & Capabilities
   - Add "App Groups" capability
   - Add `group.com.lovewidgets.data`
   - Select the widget extension target → Signing & Capabilities
   - Add "App Groups" capability
   - Add `group.com.lovewidgets.data` (same group)

3. **Add Native Module Files**:
   - The plugin copies `WidgetModule.swift` and `WidgetModule.m` to `ios/LoveWidgets/WidgetModule/`
   - Ensure these files are added to the main app target (not widget extension)
   - In Xcode, right-click the files → "Add Files to LoveWidgets" if needed

4. **Register Native Module**:
   - React Native should auto-discover modules via `RCT_EXTERN_MODULE`
   - If not working, check that `WidgetModule.m` is included in the app target's "Compile Sources"

### Android Setup

1. **Verify Plugin Execution**:
   - After `npx expo prebuild`, check that files are copied to:
     - `android/app/src/main/java/com/lovewidgets/app/widget/`
     - `android/app/src/main/res/layout/widget_layout.xml`
     - `android/app/src/main/res/xml/widget_info.xml`

2. **Verify AndroidManifest.xml**:
   - The plugin should have added the widget receiver
   - Check `android/app/src/main/AndroidManifest.xml` for:
     ```xml
     <receiver android:name=".LoveWidget" android:exported="true">
       ...
     </receiver>
     ```

3. **Verify MainApplication Registration**:
   - Check `android/app/src/main/java/com/lovewidgets/app/MainApplication.kt` (or `.java`)
   - Should include `WidgetStoragePackage()` in the packages list
   - If missing, the plugin should have added it, but you may need to add manually:
     ```kotlin
     import com.lovewidgets.app.widget.WidgetStoragePackage
     // ...
     packages.add(WidgetStoragePackage())
     ```

4. **Build and Test**:
   - Run `npx expo run:android`
   - Add widget to home screen: Long press → Widgets → LoveWidgets

## Usage

### From React Native

The widget is automatically updated when a user sends a drawing:

```typescript
import { saveToWidget } from '@/utils/widgetStorage';

// In canvas.tsx, after converting image to base64:
await saveToWidget(imageUrl);
// This automatically:
// 1. Saves to App Group (iOS) or SharedPreferences (Android)
// 2. Triggers widget reload
```

### Manual Widget Reload (if needed)

```typescript
import { reloadWidget } from '@/utils/widgetStorage';

await reloadWidget();
```

## Testing

### iOS

1. Build and run the app: `npx expo run:ios`
2. Send a drawing from the canvas screen
3. Add widget to home screen:
   - Long press home screen → "+" → Search "LoveWidget" → Add
4. Verify widget shows the latest drawing
5. Send another drawing and verify widget updates (may take a few seconds)

### Android

1. Build and run the app: `npx expo run:android`
2. Send a drawing from the canvas screen
3. Add widget to home screen:
   - Long press home screen → Widgets → Find "LoveWidgets" → Add
4. Verify widget shows the latest drawing
5. Send another drawing and verify widget updates immediately

## Troubleshooting

### iOS

**Widget not showing image**:
- Verify App Group is configured for both app and widget extension
- Check Xcode console for errors reading from UserDefaults
- Verify `group.com.lovewidgets.data` matches in both targets

**Widget not updating**:
- Check that `WidgetModule` is properly registered
- Verify `WidgetCenter.shared.reloadAllTimelines()` is being called
- Check React Native logs for native module errors

**Native module not found**:
- Ensure `WidgetModule.swift` and `WidgetModule.m` are in the app target (not widget extension)
- Check that files are included in "Compile Sources" build phase
- Verify `RCT_EXTERN_MODULE` bridge is working

### Android

**Widget not showing image**:
- Check logcat for "LoveWidget" logs
- Verify SharedPreferences key matches: `@widget_image`
- Verify SharedPreferences name: `love_widget_prefs`
- Check that bitmap decoding is successful

**Widget not updating**:
- Verify `WidgetStorageModule` is registered in MainApplication
- Check that broadcast intent is being sent
- Verify widget receiver is registered in AndroidManifest.xml

**Native module not found**:
- Check that `WidgetStoragePackage` is added to MainApplication packages
- Verify Kotlin files are in correct package: `com.lovewidgets.app.widget`
- Rebuild the app: `npx expo run:android`

## Configuration

### App Groups (iOS)

Configured in `app.json`:
```json
"ios": {
  "entitlements": {
    "com.apple.security.application-groups": [
      "group.com.lovewidgets.data"
    ]
  }
}
```

### Widget Sizes

**iOS**: Supports `.systemSmall` and `.systemMedium` (configured in `LoveWidget.swift`)

**Android**: Supports all sizes (configured in `widget_info.xml` with `resizeMode="horizontal|vertical"`)

## Future Enhancements

- [ ] Support for large widget sizes
- [ ] Multiple widget configurations (show different data)
- [ ] Widget deep linking (tap widget to open app)
- [ ] Widget refresh on app background/foreground
- [ ] Error state handling (network issues, etc.)
- [ ] Widget analytics

## Notes

- Widgets run in separate processes from the main app
- iOS widgets update via Timeline (every 15 minutes by default, or when reloaded)
- Android widgets update via broadcast intents (immediate when triggered)
- Base64 image data is stored directly (no file I/O needed)
- Widget storage is separate from app storage (App Groups/SharedPreferences)

