import Stripe
@testable import stripe_react_native
import XCTest

class ThreeDSecureConfigurationTests: XCTestCase {
    private var previousTimeout: Int = 10

    override func setUp() {
        super.setUp()
        previousTimeout = STPPaymentHandler.shared().threeDSCustomizationSettings.authenticationTimeout
    }

    override func tearDown() {
        STPPaymentHandler.shared().threeDSCustomizationSettings.authenticationTimeout = previousTimeout
        super.tearDown()
    }

    func test_configure3dSecure_setsAuthenticationTimeout() {
        let sdk = StripeSdkImpl()
        sdk.configure3dSecure(["timeout": 5])

        XCTAssertEqual(
            STPPaymentHandler.shared().threeDSCustomizationSettings.authenticationTimeout,
            5
        )
    }
}
