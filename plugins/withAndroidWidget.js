const { withAndroidManifest, withDangerousMod, withAppBuildGradle } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin for Android Widget
 * Copies widget files and registers the widget in AndroidManifest.xml
 */
function withAndroidWidget(config) {
  // Step 1: Copy widget files to native Android directories
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidProjectPath = path.join(projectRoot, 'android');
      
      if (!fs.existsSync(androidProjectPath)) {
        console.log('[withAndroidWidget] Android folder not found, skipping file copy (will run during prebuild)');
        return config;
      }

      const widgetSourcePath = path.join(projectRoot, 'widgets', 'android');
      const androidMainPath = path.join(androidProjectPath, 'app', 'src', 'main');
      const androidJavaPath = path.join(androidMainPath, 'java', 'com', 'lovewidgets', 'app', 'widget');
      const androidResPath = path.join(androidMainPath, 'res');

      // Create directories
      fs.mkdirSync(androidJavaPath, { recursive: true });
      fs.mkdirSync(path.join(androidResPath, 'layout'), { recursive: true });
      fs.mkdirSync(path.join(androidResPath, 'xml'), { recursive: true });
      fs.mkdirSync(path.join(androidResPath, 'values'), { recursive: true });

      // Copy Kotlin files
      ['LoveWidget.kt', 'WidgetStorageModule.kt', 'WidgetStoragePackage.kt'].forEach(fileName => {
        const src = path.join(widgetSourcePath, fileName);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(androidJavaPath, fileName));
      });

      // Copy Resources
      const copyRes = (file, folder) => {
        const src = path.join(widgetSourcePath, file);
        if (fs.existsSync(src)) fs.copyFileSync(src, path.join(androidResPath, folder, file));
      };
      
      copyRes('widget_layout.xml', 'layout');
      copyRes('widget_info.xml', 'xml');
      copyRes('strings.xml', 'values');

      return config;
    },
  ]);

  // Step 2: Update AndroidManifest.xml
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    const widgetReceiverName = 'com.lovewidgets.app.widget.LoveWidget';

    if (!mainApplication.receiver) mainApplication.receiver = [];

    // Avoid duplicate registration
    if (!mainApplication.receiver.some(r => r.$['android:name'] === widgetReceiverName)) {
      mainApplication.receiver.push({
        $: { 'android:name': widgetReceiverName, 'android:exported': 'true' },
        'intent-filter': [{
          action: [
            { $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } },
            { $: { 'android:name': 'com.lovewidgets.app.widget.UPDATE' } }
          ]
        }],
        'meta-data': [{
          $: { 'android:name': 'android.appwidget.provider', 'android:resource': '@xml/widget_info' }
        }]
      });
    }
    return config;
  });

  // Step 3: Modify MainApplication.kt to register the Package
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const androidRoot = path.join(config.modRequest.projectRoot, 'android');
      // Locate MainApplication.kt
      const mainAppPath = path.join(androidRoot, 'app', 'src', 'main', 'java', 'com', 'lovewidgets', 'app', 'MainApplication.kt');
      
      if (!fs.existsSync(mainAppPath)) {
        console.warn('[withAndroidWidget] Could not find MainApplication.kt');
        return config;
      }

      let content = fs.readFileSync(mainAppPath, 'utf8');

      // 1. Add the Import
      if (!content.includes('import com.lovewidgets.app.widget.WidgetStoragePackage')) {
        // Add import after the package declaration
        content = content.replace(
          /package com\.lovewidgets\.app/,
          'package com.lovewidgets.app\n\nimport com.lovewidgets.app.widget.WidgetStoragePackage'
        );
      }

      // 2. Add the Package to the List
      // We look for the standard Expo comment: "// add(MyReactNativePackage())"
      if (!content.includes('add(WidgetStoragePackage())')) {
        const anchor = '// add(MyReactNativePackage())';
        if (content.includes(anchor)) {
          content = content.replace(anchor, `${anchor}\n            add(WidgetStoragePackage())`);
          console.log('[withAndroidWidget] Registered WidgetStoragePackage');
        } else {
          // Fallback: Try to find the closing brace of the apply block
          const fallbackAnchor = 'PackageList(this).packages.apply {';
          if (content.includes(fallbackAnchor)) {
             content = content.replace(fallbackAnchor, `${fallbackAnchor}\n            add(WidgetStoragePackage())`);
          }
        }
      }
      
      fs.writeFileSync(mainAppPath, content);
      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidWidget;