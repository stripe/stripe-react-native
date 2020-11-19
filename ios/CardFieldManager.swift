//
//  CardField.swift
//  StripeSdk
//
//  Created by Arkadiusz Kubaczkowski on 17/11/2020.
//  Copyright © 2020 Facebook. All rights reserved.
//

import Foundation

@objc(CardFieldManager)
class CardFieldManager: RCTViewManager {    
    override func view() -> UIView! {
        return CardFieldView()
    }
    
    override class func requiresMainQueueSetup() -> Bool {
        return false
    }
}
