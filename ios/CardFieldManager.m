//
//  CardField.m
//  StripeSdk
//
//  Created by Arkadiusz Kubaczkowski on 17/11/2020.
//  Copyright © 2020 Facebook. All rights reserved.
//

#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"
#import "RCTViewManager.h"
#import <Stripe/Stripe.h>

@interface RCT_EXTERN_MODULE(CardFieldManager, RCTViewManager)
RCT_EXPORT_VIEW_PROPERTY(postalCodeEnabled, BOOL)
RCT_EXPORT_VIEW_PROPERTY(value, NSDictionary)
RCT_EXPORT_VIEW_PROPERTY(onCardChange, RCTDirectEventBlock)
@end
