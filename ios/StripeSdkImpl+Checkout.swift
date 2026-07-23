//
//  StripeSdkImpl+Checkout.swift
//  stripe-react-native
//
//  Created by Nick Porter on 4/29/26.
//

import Foundation

extension StripeSdkImpl {
    @objc(initCheckoutSession:configuration:resolver:rejecter:)
    public func initCheckoutSession(
        clientSecret _: String,
        configuration _: NSDictionary,
        resolver _: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        rejectCheckoutUnavailable(reject)
    }

    @objc(checkoutUpdateShippingAddress:address:name:phone:resolver:rejecter:)
    public func checkoutUpdateShippingAddress(
        sessionKey _: String,
        address _: NSDictionary,
        name _: String?,
        phone _: String?,
        resolver _: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        rejectCheckoutUnavailable(reject)
    }

    @objc(checkoutApplyPromotionCode:code:resolver:rejecter:)
    public func checkoutApplyPromotionCode(
        sessionKey _: String,
        code _: String,
        resolver _: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        rejectCheckoutUnavailable(reject)
    }

    @objc(checkoutRemovePromotionCode:resolver:rejecter:)
    public func checkoutRemovePromotionCode(
        sessionKey _: String,
        resolver _: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        rejectCheckoutUnavailable(reject)
    }

    @objc(checkoutUpdateLineItemQuantity:lineItemId:quantity:resolver:rejecter:)
    public func checkoutUpdateLineItemQuantity(
        sessionKey _: String,
        lineItemId _: String,
        quantity _: Double,
        resolver _: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        rejectCheckoutUnavailable(reject)
    }

    @objc(checkoutSelectShippingOption:id:resolver:rejecter:)
    public func checkoutSelectShippingOption(
        sessionKey _: String,
        id _: String,
        resolver _: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        rejectCheckoutUnavailable(reject)
    }

    @objc(checkoutRunServerUpdateStart:resolver:rejecter:)
    public func checkoutRunServerUpdateStart(
        sessionKey _: String,
        resolver _: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        rejectCheckoutUnavailable(reject)
    }

    @objc(checkoutRunServerUpdateComplete:error:resolver:rejecter:)
    public func checkoutRunServerUpdateComplete(
        sessionKey _: String,
        error _: String?,
        resolver _: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        rejectCheckoutUnavailable(reject)
    }

    private func rejectCheckoutUnavailable(_ reject: RCTPromiseRejectBlock) {
        reject(ErrorType.Failed, StripeSdkImpl.checkoutUnavailableMessage, nil)
    }
}
