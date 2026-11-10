import Foundation
@testable import stripe_react_native
import XCTest

@MainActor
final class IntentCreationCallbackPromiseTests: XCTestCase {
    func test_intentCreationCallbackResolvesAfterCompleting() {
        let sdk = StripeSdkImpl()
        var callbackInvoked = false
        sdk.paymentSheetIntentCreationCallback = { result in
            guard case .success("pi_secret_test") = result else {
                XCTFail("Expected success with client secret")
                return
            }
            callbackInvoked = true
        }

        let resolved = expectation(description: "intentCreationCallback resolves")
        sdk.intentCreationCallback(
            result: ["clientSecret": "pi_secret_test"],
            resolver: { value in
                XCTAssertTrue(value == nil || value is NSNull)
                resolved.fulfill()
            },
            rejecter: { _, _, _ in
                XCTFail("intentCreationCallback should not reject")
            }
        )

        wait(for: [resolved], timeout: 1)
        XCTAssertTrue(callbackInvoked)
    }

    func test_confirmationTokenCreationCallbackResolvesAfterCompleting() {
        let sdk = StripeSdkImpl()
        var callbackInvoked = false
        sdk.paymentSheetConfirmationTokenIntentCreationCallback = { result in
            guard case .success("ct_secret_test") = result else {
                XCTFail("Expected success with client secret")
                return
            }
            callbackInvoked = true
        }

        let resolved = expectation(description: "confirmationTokenCreationCallback resolves")
        sdk.confirmationTokenCreationCallback(
            result: ["clientSecret": "ct_secret_test"],
            resolver: { value in
                XCTAssertTrue(value == nil || value is NSNull)
                resolved.fulfill()
            },
            rejecter: { _, _, _ in
                XCTFail("confirmationTokenCreationCallback should not reject")
            }
        )

        wait(for: [resolved], timeout: 1)
        XCTAssertTrue(callbackInvoked)
    }
}
