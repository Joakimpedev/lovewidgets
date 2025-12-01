const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
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
      
      // Only proceed if android folder exists (after prebuild)
      if (!fs.existsSync(androidProjectPath)) {
        console.log('[withAndroidWidget] Android folder not found, skipping file copy (will run during prebuild)');
        return config;
      }

      const widgetSourcePath = path.join(projectRoot, 'widgets', 'android');
      const androidMainPath = path.join(androidProjectPath, 'app', 'src', 'main');
      const androidJavaPath = path.join(androidMainPath, 'java', 'com', 'lovewidgets', 'app', 'widget');
      const androidResPath = path.join(androidMainPath, 'res');
      const androidResLayoutPath = path.join(androidResPath, 'layout');
      const androidResXmlPath = path.join(androidResPath, 'xml');
      const androidResValuesPath = path.join(androidResPath, 'values');

      // Create directories if they don't exist
      [androidJavaPath, androidResLayoutPath, androidResXmlPath, androidResValuesPath].forEach(dir => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });

      // Copy Kotlin file
      const kotlinSource = path.join(widgetSourcePath, 'LoveWidget.kt');
      const kotlinDest = path.join(androidJavaPath, 'LoveWidget.kt');
      if (fs.existsSync(kotlinSource)) {
        fs.copyFileSync(kotlinSource, kotlinDest);
        console.log('[withAndroidWidget] Copied LoveWidget.kt');
      }

      // Copy layout XML
      const layoutSource = path.join(widgetSourcePath, 'widget_layout.xml');
      const layoutDest = path.join(androidResLayoutPath, 'widget_layout.xml');
      if (fs.existsSync(layoutSource)) {
        fs.copyFileSync(layoutSource, layoutDest);
        console.log('[withAndroidWidget] Copied widget_layout.xml');
      }

      // Copy widget info XML
      const widgetInfoSource = path.join(widgetSourcePath, 'widget_info.xml');
      const widgetInfoDest = path.join(androidResXmlPath, 'widget_info.xml');
      if (fs.existsSync(widgetInfoSource)) {
        fs.copyFileSync(widgetInfoSource, widgetInfoDest);
        console.log('[withAndroidWidget] Copied widget_info.xml');
      }

      // Copy strings XML
      const stringsSource = path.join(widgetSourcePath, 'strings.xml');
      const stringsDest = path.join(androidResValuesPath, 'strings.xml');
      if (fs.existsSync(stringsSource)) {
        fs.copyFileSync(stringsSource, stringsDest);
        console.log('[withAndroidWidget] Copied strings.xml');
      }

      return config;
    },
  ]);

  // Step 2: Update AndroidManifest.xml to register the widget
  config = withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const { manifest: manifestData } = manifest;

    // Find or create the <application> tag
    if (!manifestData.application) {
      manifestData.application = [{}];
    }
    const application = manifestData.application[0];

    // Find or create the <receiver> array
    if (!application.receiver) {
      application.receiver = [];
    }

    // Check if widget receiver already exists
    const existingReceiver = application.receiver.find(
      (receiver) => receiver.$?.['android:name'] === '.LoveWidget'
    );

    if (!existingReceiver) {
      // Add the widget receiver
      application.receiver.push({
        $: {
          'android:name': '.LoveWidget',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.appwidget.action.APPWIDGET_UPDATE',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.appwidget.provider',
              'android:resource': '@xml/widget_info',
            },
          },
        ],
      });

      console.log('[withAndroidWidget] Added widget receiver to AndroidManifest.xml');
    }

    return config;
  });

  return config;
}

module.exports = withAndroidWidget;

