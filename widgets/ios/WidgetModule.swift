//
//  WidgetModule.swift
//  LoveWidgets Native Module
//
//  Native module to reload iOS widgets from React Native
//

import Foundation
import WidgetKit
import React

@objc(WidgetModule)
class WidgetModule: NSObject, RCTBridgeModule {
  
  // App Group identifier for shared storage
  let appGroup = "group.com.lovewidgets.data"
  
  static func moduleName() -> String! {
    return "WidgetModule"
  }
  
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func reloadWidget(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
        resolve(true)
      } else {
        reject("UNSUPPORTED", "Widgets require iOS 14.0 or later", nil)
      }
    }
  }
  
  @objc
  func reloadTimelines(_ kind: String, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    DispatchQueue.main.async {
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadTimelines(ofKind: kind)
        resolve(true)
      } else {
        reject("UNSUPPORTED", "Widgets require iOS 14.0 or later", nil)
      }
    }
  }
  
  @objc
  func saveWidgetData(_ key: String, value: String, resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let sharedDefaults = UserDefaults(suiteName: appGroup) else {
      reject("STORAGE_ERROR", "Failed to access App Group storage", nil)
      return
    }
    
    sharedDefaults.set(value, forKey: key)
    sharedDefaults.synchronize()
    
    // Reload widget timelines after saving data
    DispatchQueue.main.async {
      if #available(iOS 14.0, *) {
        WidgetCenter.shared.reloadAllTimelines()
        resolve(true)
      } else {
        reject("UNSUPPORTED", "Widgets require iOS 14.0 or later", nil)
      }
    }
  }
}

