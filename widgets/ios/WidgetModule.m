//
//  WidgetModule.m
//  LoveWidgets Native Module Bridge
//
//  Objective-C bridge for WidgetModule Swift class
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WidgetModule, NSObject)

RCT_EXTERN_METHOD(reloadWidget:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(reloadTimelines:(NSString *)kind
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(saveWidgetData:(NSString *)key
                  value:(NSString *)value
                  resolve:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

