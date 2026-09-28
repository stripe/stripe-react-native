@testable import stripe_react_native
import StripeIdentity
import UIKit
import XCTest

class IdentityVerificationSheetTests: XCTestCase {
    func testMapsCompletionAndCancellationWithoutAnError() {
        let completed = StripeSdkImpl.mapIdentityVerificationSheetResult(.flowCompleted)
        let canceled = StripeSdkImpl.mapIdentityVerificationSheetResult(.flowCanceled)

        XCTAssertEqual(completed["status"] as? String, "FlowCompleted")
        XCTAssertNil(completed["error"])
        XCTAssertEqual(canceled["status"] as? String, "FlowCanceled")
        XCTAssertNil(canceled["error"])
    }

    func testFailurePreservesErrorDetailsWithoutAnExtraErrorEnvelope() throws {
        let underlyingError = NSError(domain: "Identity", code: 1, userInfo: [NSLocalizedDescriptionKey: "Verification failed"])
        let error = NSError(domain: "Identity", code: 2, userInfo: [NSUnderlyingErrorKey: underlyingError])

        let result = StripeSdkImpl.mapIdentityVerificationSheetResult(.flowFailed(error: error))
        let details = try XCTUnwrap(result["error"] as? NSDictionary)

        XCTAssertEqual(result["status"] as? String, "FlowFailed")
        XCTAssertEqual(details["code"] as? String, "FlowFailed")
        XCTAssertEqual(details["message"] as? String, "Verification failed")
        XCTAssertNil(details["error"])
    }

    func testMissingCredentialsResolveWithoutStripeInitialization() {
        let resolved = expectation(description: "Resolves invalid Identity options")
        let sdk = StripeSdkImpl()

        sdk.presentIdentityVerificationSheet(options: ["sessionId": "  "], resolver: { response in
            let result = response as? NSDictionary
            let error = result?["error"] as? NSDictionary
            XCTAssertEqual(result?["status"] as? String, "FlowFailed")
            XCTAssertEqual(error?["message"] as? String, "sessionId and ephemeralKeySecret are required.")
            resolved.fulfill()
        }, rejecter: { _, _, _ in
            XCTFail("Identity errors must resolve with a FlowFailed result")
            resolved.fulfill()
        })

        waitForExpectations(timeout: 1)
    }

    @MainActor
    func testDetachedPresenterResolvesFailureWithoutRetainingSheet() {
        assertPresenterResolvesFailure(UIViewController())
    }

    @MainActor
    func testDismissingPresenterResolvesFailureWithoutRetainingSheet() {
        let presenter = IdentityPresentationStateViewController()
        let window = UIWindow()
        window.addSubview(presenter.view)
        presenter.dismissing = true

        withExtendedLifetime(window) {
            assertPresenterResolvesFailure(presenter)
        }
    }

    @MainActor
    func testPresentingPresenterResolvesFailureWithoutRetainingSheet() {
        let presenter = IdentityPresentationStateViewController()
        let window = UIWindow()
        window.addSubview(presenter.view)
        presenter.presenting = true

        withExtendedLifetime(window) {
            assertPresenterResolvesFailure(presenter)
        }
    }

    @MainActor
    func testStablePresentedModalIsReady() {
        let presenter = IdentityPresentationStateViewController()
        let window = UIWindow()
        window.addSubview(presenter.view)
        presenter.modalPresenter = UIViewController()

        withExtendedLifetime(window) {
            XCTAssertTrue(StripeSdkImpl.isIdentityVerificationSheetPresenterReady(presenter))
        }
    }

    @MainActor
    private func assertPresenterResolvesFailure(_ presenter: UIViewController, file: StaticString = #filePath, line: UInt = #line) {
        let sdk = StripeSdkImpl()
        let sheet = IdentityVerificationSheet(
            verificationSessionId: "vs_test",
            ephemeralKeySecret: "ek_test",
            configuration: .init(brandLogo: UIImage())
        )
        var response: NSDictionary?

        sdk.presentIdentityVerificationSheet(sheet, from: presenter) { response = $0 as? NSDictionary }

        XCTAssertEqual(response?["status"] as? String, "FlowFailed", file: file, line: line)
        let error = response?["error"] as? NSDictionary
        XCTAssertEqual(error?["code"] as? String, "FlowFailed", file: file, line: line)
        XCTAssertTrue((error?["message"] as? String)?.contains("not ready") == true, file: file, line: line)
        XCTAssertNil(sdk.identityVerificationSheet, file: file, line: line)
    }
}

private class IdentityPresentationStateViewController: UIViewController {
    var presenting = false
    var dismissing = false
    var modalPresenter: UIViewController?

    override var isBeingPresented: Bool { presenting }
    override var isBeingDismissed: Bool { dismissing }
    override var presentingViewController: UIViewController? { modalPresenter }
}
