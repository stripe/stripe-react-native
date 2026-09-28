import Foundation
import React
import StripeIdentity
import UIKit

extension StripeSdkImpl {
    @objc(presentIdentityVerificationSheet:resolver:rejecter:)
    public func presentIdentityVerificationSheet(
        options: NSDictionary,
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        DispatchQueue.main.async {
            guard let sessionId = options["sessionId"] as? String,
                  !sessionId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
                  let ephemeralKeySecret = options["ephemeralKeySecret"] as? String,
                  !ephemeralKeySecret.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                resolve(Self.identityVerificationSheetFailure("sessionId and ephemeralKeySecret are required."))
                return
            }
            guard self.identityVerificationSheet == nil else {
                resolve(Self.identityVerificationSheetFailure("An Identity verification sheet is already being presented."))
                return
            }
            guard let brandLogo = options["brandLogo"], let logo = RCTConvert.uiImage(brandLogo) else {
                resolve(Self.identityVerificationSheetFailure("brandLogo must resolve to a valid image."))
                return
            }
            guard let rootViewController = RCTKeyWindow()?.rootViewController else {
                resolve(Self.identityVerificationSheetFailure("No view controller is available to present Identity verification. Retry when the app is visible."))
                return
            }

            let sheet = IdentityVerificationSheet(
                verificationSessionId: sessionId,
                ephemeralKeySecret: ephemeralKeySecret,
                configuration: .init(brandLogo: logo)
            )
            self.presentIdentityVerificationSheet(sheet, from: findViewControllerPresenter(from: rootViewController), resolver: resolve)
        }
    }

    @MainActor
    func presentIdentityVerificationSheet(
        _ sheet: IdentityVerificationSheet,
        from presenter: UIViewController,
        resolver resolve: @escaping RCTPromiseResolveBlock
    ) {
        // UIKit can ignore presentation during a transition without calling the
        // sheet's completion, leaving the promise and presentation lock pending.
        guard Self.isIdentityVerificationSheetPresenterReady(presenter) else {
            resolve(Self.identityVerificationSheetFailure("The view controller is not ready to present Identity verification. Retry after the current transition finishes."))
            return
        }

        identityVerificationSheet = sheet
        sheet.present(from: presenter) { result in
            self.identityVerificationSheet = nil
            resolve(Self.mapIdentityVerificationSheetResult(result))
        }
    }

    @MainActor
    static func isIdentityVerificationSheetPresenterReady(_ presenter: UIViewController) -> Bool {
        return presenter.viewIfLoaded?.window != nil && !presenter.isBeingDismissed && !presenter.isBeingPresented
    }

    static func mapIdentityVerificationSheetResult(_ result: IdentityVerificationSheet.VerificationFlowResult) -> NSDictionary {
        switch result {
        case .flowCompleted:
            return ["status": "FlowCompleted"]
        case .flowCanceled:
            return ["status": "FlowCanceled"]
        case .flowFailed(let error):
            return [
                "status": "FlowFailed",
                "error": Errors.createError("FlowFailed", error)["error"] ?? NSNull(),
            ]
        }
    }

    private static func identityVerificationSheetFailure(_ message: String) -> NSDictionary {
        return [
            "status": "FlowFailed",
            "error": Errors.createError("FlowFailed", message)["error"] ?? NSNull(),
        ]
    }
}
