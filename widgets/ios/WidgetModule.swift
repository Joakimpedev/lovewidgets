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
}

