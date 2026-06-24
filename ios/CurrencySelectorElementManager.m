//
//  CurrencySelectorElementManager.m
//  stripe-react-native
//
//  Created by Nick Porter on 5/7/26.
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(StripeCurrencySelectorElementManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(sessionKey, NSString)
RCT_EXPORT_VIEW_PROPERTY(disabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(appearance, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(onHeightChange, RCTDirectEventBlock)
@end
