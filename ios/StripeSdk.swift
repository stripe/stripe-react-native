@objc(StripeSdk)
class StripeSdk: NSObject {

    @objc(initialise:)
    func initialise(publishableKey: String) -> Void {
        Stripe.setDefaultPublishableKey(publishableKey)
    }

}
