//
//  NavigationBarManager.m
//  stripe-react-native
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(NavigationBarManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(title, NSString)
RCT_EXPORT_VIEW_PROPERTY(onCloseButtonPress, RCTDirectEventBlock)
@end
