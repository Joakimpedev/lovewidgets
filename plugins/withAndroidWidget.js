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

      // Copy Kotlin files
      const kotlinFiles = ['LoveWidget.kt', 'WidgetStorageModule.kt', 'WidgetStoragePackage.kt'];
      kotlinFiles.forEach(fileName => {
        const kotlinSource = path.join(widgetSourcePath, fileName);
        const kotlinDest = path.join(androidJavaPath, fileName);
        if (fs.existsSync(kotlinSource)) {
          fs.copyFileSync(kotlinSource, kotlinDest);
          console.log(`[withAndroidWidget] Copied ${fileName}`);
        }
      });

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
      (receiver) => receiver.$?.['android:name'] === 'com.lovewidgets.app.widget.LoveWidget'
    );

    if (!existingReceiver) {
      // Add the widget receiver
      // FIX: Use the FULLY QUALIFIED package name to avoid resolving errors
      application.receiver.push({
        $: {
          'android:name': 'com.lovewidgets.app.widget.LoveWidget', // <--- FIXED HERE
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
              {
                $: {
                  'android:name': 'com.lovewidgets.app.widget.UPDATE',
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

  // Step 3: Register the native module in MainApplication
  config = withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;
    
    // Check if we've already added the package
    if (buildGradle.includes('WidgetStoragePackage')) {
      return config;
    }

    return config;
  });

  // Step 4: Modify MainApplication to register the package
  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const androidProjectPath = path.join(projectRoot, 'android');
      
      if (!fs.existsSync(androidProjectPath)) {
        return config;
      }

      // Find MainApplication file
      const mainApplicationPath = path.join(
        androidProjectPath,
        'app',
        'src',
        'main',
        'java',
        'com',
        'lovewidgets',
        'app',
        'MainApplication.kt'
      );

      // Also check for .java file
      const mainApplicationJavaPath = path.join(
        androidProjectPath,
        'app',
        'src',
        'main',
        'java',
        'com',
        'lovewidgets',
        'app',
        'MainApplication.java'
      );

      let mainApplicationFile = null;
      if (fs.existsSync(mainApplicationPath)) {
        mainApplicationFile = mainApplicationPath;
      } else if (fs.existsSync(mainApplicationJavaPath)) {
        mainApplicationFile = mainApplicationJavaPath;
      }

      if (mainApplicationFile) {
        let content = fs.readFileSync(mainApplicationFile, 'utf8');
        
        // Check if already registered
        if (content.includes('WidgetStoragePackage')) {
          return config;
        }

        // Add import
        if (!content.includes('import com.lovewidgets.app.widget.WidgetStoragePackage')) {
          const importRegex = /(import\s+[^\n]+\n)/g;
          const imports = content.match(importRegex) || [];
          const lastImportIndex = content.lastIndexOf(imports[imports.length - 1] || '');
          if (lastImportIndex !== -1) {
            const insertIndex = lastImportIndex + (imports[imports.length - 1] || '').length;
            content = content.slice(0, insertIndex) + 
                     'import com.lovewidgets.app.widget.WidgetStoragePackage\n' + 
                     content.slice(insertIndex);
          }
        }

        // Add to packages list in getPackages() - Handles both Old and New Architecture patterns
        // Note: For New Arch, MainApplication often auto-links, but manual linking is safe here
        if (content.includes('getPackages()') && !content.includes('WidgetStoragePackage()')) {
          content = content.replace(
            /(packages\.add\([^)]+\))/g,
            (match) => {
              return match + '\n      packages.add(WidgetStoragePackage())';
            }
          );
        } else if (content.includes('PackageList(this).packages.apply') && !content.includes('WidgetStoragePackage()')) {
             // Fallback regex for the specific Kotlin pattern we saw earlier
             const pattern = /PackageList\(this\)\.packages\.apply\s*\{/;
             if (pattern.test(content)) {
                 content = content.replace(pattern, 'PackageList(this).packages.apply {\n            add(WidgetStoragePackage())');
             }
        }

        fs.writeFileSync(mainApplicationFile, content, 'utf8');
        console.log('[withAndroidWidget] Registered WidgetStoragePackage in MainApplication');
      } else {
        console.warn('[withAndroidWidget] MainApplication file not found, native module may not work');
      }

      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidWidget;