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
    func test_contentEqualConfigurationReassignmentDoesNotReEmit() {
        let view = PaymentMethodMessagingElementContainerView(frame: .zero)
        var statuses: [String] = []

        view.onConfigureResult = { payload in
            let result = (payload as NSDictionary?)?["result"] as? NSDictionary
            if let status = result?["status"] as? String {
                statuses.append(status)
            }
        }

        view.configuration = [
            "amount": 1000,
        ]
        XCTAssertEqual(statuses, ["failed"])

        // Same contents, new dictionary — mirrors Fabric rebuilding props from
        // unchanged configuration while applying a height-only style update.
        view.configuration = [
            "amount": 1000,
        ]
        XCTAssertEqual(statuses, ["failed"])
    }

    @MainActor
    func test_contentEqualAppearanceReassignmentDoesNotReCreate() {
        let view = PaymentMethodMessagingElementContainerView(frame: .zero)
        var statuses: [String] = []

        view.onConfigureResult = { payload in
            let result = (payload as NSDictionary?)?["result"] as? NSDictionary
            if let status = result?["status"] as? String {
                statuses.append(status)
            }
        }

        // Seed lastConfig via an invalid configuration so create stays synchronous.
        view.configuration = [
            "amount": 1000,
        ]
        XCTAssertEqual(statuses, ["failed"])

        view.appearance = [
            "style": "alwaysDark",
        ]
        // Appearance didSet re-inits when lastConfig exists; invalid config fails again.
        XCTAssertEqual(statuses, ["failed", "failed"])

        view.appearance = [
            "style": "alwaysDark",
        ]
        XCTAssertEqual(statuses, ["failed", "failed"])
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
