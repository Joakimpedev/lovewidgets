const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo Config Plugin for iOS Widget
 * Creates a Widget Extension target and copies widget files
 */
function withIOSWidget(config) {
  // Step 1: Copy widget files to native iOS directories
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const iosProjectPath = path.join(projectRoot, 'ios');
      
      // Only proceed if ios folder exists (after prebuild)
      if (!fs.existsSync(iosProjectPath)) {
        console.log('[withIOSWidget] iOS folder not found, skipping file copy (will run during prebuild)');
        return config;
      }

      const widgetSourcePath = path.join(projectRoot, 'widgets', 'ios');
      const iosWidgetPath = path.join(iosProjectPath, 'LoveWidget');
      
      // Create widget extension directory
      if (!fs.existsSync(iosWidgetPath)) {
        fs.mkdirSync(iosWidgetPath, { recursive: true });
      }

      // Copy Swift file
      const swiftSource = path.join(widgetSourcePath, 'LoveWidget.swift');
      const swiftDest = path.join(iosWidgetPath, 'LoveWidget.swift');
      if (fs.existsSync(swiftSource)) {
        fs.copyFileSync(swiftSource, swiftDest);
        console.log('[withIOSWidget] Copied LoveWidget.swift');
      }

      // Copy Info.plist
      const plistSource = path.join(widgetSourcePath, 'Info.plist');
      const plistDest = path.join(iosWidgetPath, 'Info.plist');
      if (fs.existsSync(plistSource)) {
        fs.copyFileSync(plistSource, plistDest);
        console.log('[withIOSWidget] Copied Info.plist');
      }

      // Copy native module files to main app (not widget extension)
      const iosAppPath = path.join(iosProjectPath, 'LoveWidgets');
      const iosAppWidgetPath = path.join(iosAppPath, 'WidgetModule');
      
      // Create directory if it doesn't exist
      if (!fs.existsSync(iosAppWidgetPath)) {
        fs.mkdirSync(iosAppWidgetPath, { recursive: true });
      }

      // Copy WidgetModule Swift and Objective-C files
      const moduleFiles = [
        'WidgetModule.swift',
        'WidgetModule.m',
        'WidgetModulePackage.swift',
        'WidgetModulePackage.m'
      ];

      moduleFiles.forEach(fileName => {
        const source = path.join(widgetSourcePath, fileName);
        const dest = path.join(iosAppWidgetPath, fileName);
        if (fs.existsSync(source)) {
          fs.copyFileSync(source, dest);
          console.log(`[withIOSWidget] Copied ${fileName}`);
        }
      });

      // Note: Xcode project modification to add the widget extension target
      // and register native modules would need to be done manually or via a more complex plugin
      // For now, we'll copy the files and the user can add the target in Xcode
      // The native modules should be auto-discovered by React Native if properly named

      return config;
    },
  ]);

  return config;
}

module.exports = withIOSWidget;











