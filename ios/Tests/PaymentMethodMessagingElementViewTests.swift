@testable import stripe_react_native
import XCTest

final class PaymentMethodMessagingElementViewTests: XCTestCase {
    @MainActor
    func test_initialInvalidConfigurationEmitsDirectConfigureFailure() {
        let view = PaymentMethodMessagingElementContainerView(frame: .zero)
        var event: NSDictionary?

        view.onConfigureResult = { payload in
            event = payload as NSDictionary?
        }

        view.configuration = [
            "amount": 1000,
        ]

        let result = event?["result"] as? NSDictionary
        XCTAssertEqual(result?["status"] as? String, "failed")
        XCTAssertEqual(result?["message"] as? String, "currency is required")
        XCTAssertEqual(result?["code"] as? String, "InvalidConfiguration")
    }

    @MainActor
    func test_prepareForRecycleClearsCallbacksSoLateEmitsAreNoOps() {
        let view = PaymentMethodMessagingElementContainerView(frame: .zero)
        var configureCount = 0
        var heightCount = 0

        view.onConfigureResult = { _ in configureCount += 1 }
        view.onHeightChanged = { _ in heightCount += 1 }

        view.configuration = [
            "amount": 1000,
        ]
        XCTAssertEqual(configureCount, 1)

        view.prepareForRecycle()

        XCTAssertNil(view.onConfigureResult)
        XCTAssertNil(view.onHeightChanged)

        view.configuration = [
            "amount": 1000,
        ]
        XCTAssertEqual(configureCount, 1)
        XCTAssertEqual(heightCount, 0)
    }

}
