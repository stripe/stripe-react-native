@objc(StripeSdk)
class StripeSdk: NSObject {

    @objc(multiply:withB:withResolver:withRejecter:)
    func multiply(a: Float, b: Float, resolve:RCTPromiseResolveBlock,reject:RCTPromiseRejectBlock) -> Void {
        resolve("a*b")
//        TODO: below line is just a test of Stripe usage
        Stripe.setDefaultPublishableKey("publishableKey")
    }
}
