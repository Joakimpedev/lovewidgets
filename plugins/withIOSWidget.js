const { withDangerousMod, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const APP_GROUP_ID = 'group.com.lovewidgets.data';
const WIDGET_BUNDLE_ID = 'com.lovewidgets.app.widget';
const WIDGET_TARGET_NAME = 'LoveWidget';
const DEPLOYMENT_TARGET = '17.0';

/**
 * Expo Config Plugin for iOS Widget
 * Creates a Widget Extension target and configures App Groups
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
      const iosWidgetPath = path.join(iosProjectPath, WIDGET_TARGET_NAME);
      
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

      return config;
    },
  ]);

  // Step 2: Modify Xcode project to create Widget Extension target
  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const projectPath = config.modRequest.projectPath;
    const platformProjectRoot = config.modRequest.platformProjectRoot;

    const mainAppTargetName = 'LoveWidgets';
    const mainAppTarget = project.getTarget(mainAppTargetName);
    
    if (!mainAppTarget) {
      console.warn(`[withIOSWidget] Main app target "${mainAppTargetName}" not found`);
      return config;
    }

    // Check if widget target already exists
    const existingWidgetTarget = project.getTarget(WIDGET_TARGET_NAME);
    if (existingWidgetTarget) {
      console.log('[withIOSWidget] Widget target already exists, skipping creation');
      // Still need to ensure entitlements are set
      ensureAppGroupEntitlements(project, mainAppTarget, existingWidgetTarget, platformProjectRoot);
      return config;
    }

    // Get main app target UUID
    const mainAppTargetUuid = mainAppTarget.uuid;

    // Add target to project - this will create the target and return it
    project.addTarget(WIDGET_TARGET_NAME, 'app_extension', WIDGET_TARGET_NAME);
    const widgetTargetObj = project.getTarget(WIDGET_TARGET_NAME);
    
    if (!widgetTargetObj) {
      console.error('[withIOSWidget] Failed to create widget target');
      return config;
    }
    
    const widgetTargetUuid = widgetTargetObj.uuid;

    // Set build settings for widget target
    project.addBuildProperty('PRODUCT_BUNDLE_IDENTIFIER', WIDGET_BUNDLE_ID, null, WIDGET_TARGET_NAME);
    project.addBuildProperty('IPHONEOS_DEPLOYMENT_TARGET', DEPLOYMENT_TARGET, null, WIDGET_TARGET_NAME);
    project.addBuildProperty('SWIFT_VERSION', '5.0', null, WIDGET_TARGET_NAME);
    project.addBuildProperty('TARGETED_DEVICE_FAMILY', '1,2', null, WIDGET_TARGET_NAME);
    project.addBuildProperty('SKIP_INSTALL', 'YES', null, WIDGET_TARGET_NAME);
    project.addBuildProperty('INFOPLIST_FILE', `${WIDGET_TARGET_NAME}/Info.plist`, null, WIDGET_TARGET_NAME);
    project.addBuildProperty('CODE_SIGN_ENTITLEMENTS', `${WIDGET_TARGET_NAME}/${WIDGET_TARGET_NAME}.entitlements`, null, WIDGET_TARGET_NAME);

    // Add frameworks
    project.addFramework('WidgetKit.framework', { target: WIDGET_TARGET_NAME, customFramework: false });
    project.addFramework('SwiftUI.framework', { target: WIDGET_TARGET_NAME, customFramework: false });

    // Create widget source group
    const widgetGroupPath = `${WIDGET_TARGET_NAME}`;
    const widgetGroup = project.addPbxGroup([], WIDGET_TARGET_NAME, widgetGroupPath);
    
    // Add files to widget target
    const swiftFilePath = path.join(platformProjectRoot, WIDGET_TARGET_NAME, 'LoveWidget.swift');
    const plistFilePath = path.join(platformProjectRoot, WIDGET_TARGET_NAME, 'Info.plist');
    
    if (fs.existsSync(swiftFilePath)) {
      const swiftFileRef = project.addSourceFile(`${WIDGET_TARGET_NAME}/LoveWidget.swift`, {
        target: WIDGET_TARGET_NAME,
        compilerFlags: '',
      });
      project.addToPbxGroup(swiftFileRef.uuid, widgetGroup.uuid);
    }

    if (fs.existsSync(plistFilePath)) {
      const plistFileRef = project.addFile(`${WIDGET_TARGET_NAME}/Info.plist`, widgetGroup.uuid, {
        target: WIDGET_TARGET_NAME,
        lastKnownFileType: 'text.plist.xml',
      });
    }

    // Create entitlements file for widget
    const widgetEntitlementsPath = path.join(platformProjectRoot, WIDGET_TARGET_NAME, `${WIDGET_TARGET_NAME}.entitlements`);
    if (!fs.existsSync(widgetEntitlementsPath)) {
      const widgetEntitlements = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>com.apple.security.application-groups</key>
	<array>
		<string>${APP_GROUP_ID}</string>
	</array>
</dict>
</plist>`;
      fs.writeFileSync(widgetEntitlementsPath, widgetEntitlements);
      console.log('[withIOSWidget] Created widget entitlements file');
      
      // Add entitlements file to project
      const entitlementsFileRef = project.addFile(`${WIDGET_TARGET_NAME}/${WIDGET_TARGET_NAME}.entitlements`, widgetGroup.uuid, {
        target: WIDGET_TARGET_NAME,
        lastKnownFileType: 'text.plist.entitlements',
      });
    }

    // Ensure main app has App Group entitlement
    ensureAppGroupEntitlements(project, mainAppTarget, widgetTargetObj, platformProjectRoot);

    // Add widget target as dependency of main app (embed extension)
    try {
      project.addTargetDependency(mainAppTargetUuid, [{ target: widgetTargetUuid }]);
    } catch (error) {
      console.warn('[withIOSWidget] Could not add target dependency:', error.message);
    }

    console.log('[withIOSWidget] Successfully created Widget Extension target');

    return config;
  });

  return config;
}

/**
 * Ensures App Group entitlements are set for both main app and widget target
 */
function ensureAppGroupEntitlements(project, mainAppTarget, widgetTarget, platformProjectRoot) {
  const mainAppTargetName = mainAppTarget.name;
  const mainAppEntitlementsPath = path.join(platformProjectRoot, `${mainAppTargetName}.entitlements`);
  
  // Read existing entitlements or create new
  let entitlementsContent = '';
  if (fs.existsSync(mainAppEntitlementsPath)) {
    entitlementsContent = fs.readFileSync(mainAppEntitlementsPath, 'utf8');
  } else {
    // Create basic entitlements structure
    entitlementsContent = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
</dict>
</plist>`;
  }

  // Check if App Group is already present
  if (!entitlementsContent.includes(APP_GROUP_ID)) {
    // Add App Group to entitlements
    // Find the </dict> tag and insert before it
    const appGroupEntry = `	<key>com.apple.security.application-groups</key>
	<array>
		<string>${APP_GROUP_ID}</string>
	</array>
`;
    
    entitlementsContent = entitlementsContent.replace(
      '</dict>',
      `${appGroupEntry}</dict>`
    );
    
    fs.writeFileSync(mainAppEntitlementsPath, entitlementsContent);
    console.log('[withIOSWidget] Added App Group to main app entitlements');
  }

  // Ensure main app build setting points to entitlements
  const currentEntitlements = project.getBuildProperty('CODE_SIGN_ENTITLEMENTS', 'Debug', mainAppTargetName);
  if (!currentEntitlements) {
    project.addBuildProperty('CODE_SIGN_ENTITLEMENTS', `${mainAppTargetName}/${mainAppTargetName}.entitlements`, null, mainAppTargetName);
  }
}

module.exports = withIOSWidget;
