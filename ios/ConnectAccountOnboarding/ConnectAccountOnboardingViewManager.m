//
//  ConnectAccountOnboardingViewManager.m
//  stripe-react-native
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(ConnectAccountOnboardingViewManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(visible, BOOL)
RCT_EXPORT_VIEW_PROPERTY(title, NSString)
RCT_REMAP_VIEW_PROPERTY(backgroundColor, backgroundColorValue, NSString)
RCT_REMAP_VIEW_PROPERTY(textColor, textColorValue, NSString)
RCT_EXPORT_VIEW_PROPERTY(onExitAction, RCTDirectEventBlock)
@end
