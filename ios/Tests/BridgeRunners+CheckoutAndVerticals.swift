import Foundation
@testable import stripe_react_native
@_spi(ReactNativeSDK) import StripeCore
import StripeFinancialConnections
@_spi(STP) import StripePayments
@_spi(LinkControllerPreview) @_spi(CryptoOnrampAlpha) import StripePaymentSheet
import UIKit

extension BridgeRunners {
    static let checkoutAndVerticalRunners: [String: Runner] = [
        "StripeSdk.createCheckout": createCheckout,
        "StripeSdk.updateCheckoutShippingAddress": { fixture in
            let params = try require(fixture.dictionary("params"), "params")
            let resolution = Resolution()
            StripeSdkImpl().updateCheckoutShippingAddress(
                controllerId: try require(fixture.string("controllerId"), "controllerId"),
                params: params,
                resolver: resolution.resolve,
                rejecter: resolution.reject
            )
            return BridgeObservation(roots: [
                "result": resolution.wait().result,
                "address": CheckoutConfigurationMapper.mapAddress(params["address"] as? NSDictionary),
            ])
        },
        "StripeSdk.confirmCheckout": { fixture in
            let controllerId = try require(fixture.string("controllerId"), "controllerId")
            let resolution = Resolution()
            StripeSdkImpl().confirmCheckout(
                controllerId: controllerId,
                resolver: resolution.resolve,
                rejecter: resolution.reject
            )
            return BridgeObservation(roots: [
                "result": resolution.wait().result,
                "completed": completedCheckout(controllerId: controllerId),
            ])
        },
        "StripeSdk.collectBankAccountToken": { fixture in
            try financialConnections(fixture) { sdk, clientSecret, params, resolution in
                sdk.collectBankAccountToken(
                    clientSecret: clientSecret,
                    params: params,
                    resolver: resolution.resolve,
                    rejecter: resolution.reject
                )
            }
        },
        "StripeSdk.collectFinancialConnectionsAccounts": { fixture in
            try financialConnections(fixture) { sdk, clientSecret, params, resolution in
                sdk.collectFinancialConnectionsAccounts(
                    clientSecret: clientSecret,
                    params: params,
                    resolver: resolution.resolve,
                    rejecter: resolution.reject
                )
            }
        },
        "StripeSdk.canAddCardToWallet": { fixture in
            let params = try require(fixture.dictionary("params"), "params")
            let resolution = Resolution()
            StripeSdkImpl().canAddCardToWallet(params: params, resolver: resolution.resolve, rejecter: resolution.reject)
            return BridgeObservation(roots: ["result": resolution.wait().result])
        },
        "StripeSdk.isCardInWallet": { fixture in
            let params = try require(fixture.dictionary("params"), "params")
            return moduleResult { sdk, resolution in
                sdk.isCardInWallet(params: params, resolver: resolution.resolve, rejecter: resolution.reject)
            }
        },
        "StripeSdk.initLinkController": { fixture in
            let params = try require(fixture.dictionary("params"), "params")
            // LinkController.create loads an elements session, so the module creates a recording
            // controller instead; the roots are what the module passes to create.
            let sdk = StripeSdkImpl()
            let controller = RecordingLinkController()
            var created: (appearance: LinkAppearance?, configuration: LinkConfiguration)?
            sdk.createLinkController = { appearance, configuration, completion in
                created = (appearance, configuration)
                completion(.success(controller))
            }
            let resolution = Resolution()
            sdk.initLinkController(params, resolver: resolution.resolve, rejecter: resolution.reject)
            return BridgeObservation(roots: [
                "configuration": created?.configuration as Any,
                "appearance": created?.appearance as Any,
                "result": resolution.wait().result,
            ])
        },
        "StripeSdk.presentLinkController": { _ in
            let observation = moduleResult { sdk, resolution in
                sdk.presentLinkController(resolution.resolve, rejecter: resolution.reject)
            }
            let sdk = StripeSdkImpl()
            sdk.linkController = RecordingLinkController()
            let presented = Resolution()
            sdk.presentLinkController(presented.resolve, rejecter: presented.reject)
            return BridgeObservation(roots: observation.roots.merging([
                "completed": presented.wait().result,
            ]) { first, _ in first })
        },
        "StripeSdk.confirmLinkControllerSetupIntent": { fixture in
            let params = try require(fixture.dictionary("params"), "params")
            let observation = moduleResult { sdk, resolution in
                sdk.confirmLinkControllerSetupIntent(params, resolver: resolution.resolve, rejecter: resolution.reject)
            }
            // A configured controller needs the network, so a module holding a recording one
            // shows the client secret the module hands it.
            let controller = RecordingLinkController()
            let sdk = StripeSdkImpl()
            sdk.linkController = controller
            let confirmed = Resolution()
            sdk.confirmLinkControllerSetupIntent(params, resolver: confirmed.resolve, rejecter: confirmed.reject)
            let completed = confirmed.wait().result
            return BridgeObservation(roots: observation.roots.merging([
                "controller": ["clientSecret": controller.confirmedClientSecret as Any] as NSDictionary,
                "completed": completed,
            ]) { first, _ in first })
        },
    ].merging(onrampRunners) { first, _ in first }

    /// Creates the controller through createCheckout, with the checkout session endpoints
    /// answered by CheckoutTestFixtures; the configuration root is the mapper createCheckout calls.
    /// When the mapper rejects the input, createCheckout rejects before any request.
    private static func createCheckout(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let params = try require(fixture.dictionary("params"), "params")
        let controllerId = try require(fixture.string("controllerId"), "controllerId")
        func create() -> Any? {
            let resolution = Resolution()
            let sdk = StripeSdkImpl()
            sdk.createCheckout(
                params: params,
                controllerId: controllerId,
                resolver: resolution.resolve,
                rejecter: resolution.reject
            )
            let result = resolution.wait().result
            sdk.destroyCheckout(controllerId: controllerId, resolver: { _ in }, rejecter: { _, _, _ in })
            return result
        }
        do {
            let configuration = try CheckoutConfigurationMapper.map(
                params: params,
                merchantIdentifier: merchantIdentifier,
                didSelectPaymentOption: {}
            )
            let result = withFailingStripeAPI(answering: ["/checkout_client/": CheckoutTestFixtures.response()]) {
                create()
            }
            return BridgeObservation(
                roots: ["configuration": configuration, "result": result],
                aliases: ["clientSecret": "configuration.clientSecret"]
            )
        } catch {
            return BridgeObservation(roots: ["result": create()])
        }
    }

    /// Creates a controller under `controllerId` and confirms it from a presenter in a window. The
    /// session has no payment option, so the SDK confirms without presenting, and its `/confirm`
    /// request gets a completed, paid session.
    private static func completedCheckout(controllerId: String) -> Any? {
        withFailingStripeAPI(answering: [
            "/init": CheckoutTestFixtures.response(),
            "/confirm": CheckoutTestFixtures.response(status: "complete", paymentStatus: "paid"),
        ]) {
            let sdk = StripeSdkImpl()
            let window = UIWindow(frame: UIScreen.main.bounds)
            window.rootViewController = UIViewController()
            window.makeKeyAndVisible()
            defer { window.isHidden = true }
            sdk.checkoutPresentingViewControllerProvider = { window.rootViewController }
            let created = Resolution()
            sdk.createCheckout(
                params: ["clientSecret": "cs_test_secret", "returnURL": "https://bridge-contracts.example/checkout"],
                controllerId: controllerId,
                resolver: created.resolve,
                rejecter: created.reject
            )
            _ = created.wait()
            let confirmed = Resolution()
            sdk.confirmCheckout(controllerId: controllerId, resolver: confirmed.resolve, rejecter: confirmed.reject)
            let result = confirmed.wait().result
            sdk.destroyCheckout(controllerId: controllerId, resolver: { _ in }, rejecter: { _, _, _ in })
            return result
        }
    }

    /// Maps the options, and calls the method only when the consent is invalid, which it reports before presenting.
    private static func financialConnections(
        _ fixture: BridgeFixture,
        call: (StripeSdkImpl, String, NSDictionary, Resolution) -> Void
    ) throws -> BridgeObservation {
        let clientSecret = try require(fixture.string("clientSecret"), "clientSecret")
        let params = try require(fixture.dictionary("params"), "params")
        do {
            return BridgeObservation(roots: [
                "preCollectedConsent": try FinancialConnections.mapToPreCollectedConsent(params),
                "configuration": FinancialConnectionsSheet.Configuration(from: params),
            ])
        } catch {
            return withPublishableKey {
                let resolution = Resolution()
                call(StripeSdkImpl(), clientSecret, params, resolution)
                return BridgeObservation(roots: ["result": resolution.result])
            }
        }
    }

    /// Runs with a publishable key and an STPAPIClient.shared whose requests never leave the
    /// process: a request whose URL path contains a key of `answers` gets that JSON, and every
    /// other request a 400 invalid_request_error. `requests` is what the run sent.
    static func withFailingStripeAPI<T>(
        answering answers: [String: [String: Any]] = [:],
        _ run: () throws -> T
    ) rethrows -> T {
        let client = STPAPIClient.shared
        let saved = (client.apiURL, client.urlSession)
        defer {
            (client.apiURL, client.urlSession) = saved
            FailingAPIURLProtocol.state.reset([:])
        }
        FailingAPIURLProtocol.state.reset(answers)
        let session = URLSessionConfiguration.ephemeral
        session.protocolClasses = [FailingAPIURLProtocol.self]
        client.apiURL = URL(string: "https://bridge-contracts.test")!
        client.urlSession = URLSession(configuration: session)
        return try withPublishableKey(run)
    }

    /// The requests sent inside the current `withFailingStripeAPI` run.
    static var stubbedRequests: [URLRequest] { FailingAPIURLProtocol.state.requests }
}

/// Records the client secret the module confirms with; the customer completes every flow with a card.
private final class RecordingLinkController: LinkControllerBridging {
    private(set) var confirmedClientSecret: String?

    var paymentMethodPreview: LinkController.PaymentMethodPreview? { nil }

    private let paymentMethod = STPPaymentMethod.decodedObject(fromAPIResponse: [
        "id": "pm_bridge_contracts",
        "object": "payment_method",
        "type": "card",
        "livemode": false,
        "created": 1_700_000_000,
        "card": ["brand": "visa", "last4": "4242", "exp_month": 12, "exp_year": 2030],
    ])!

    func present(
        email: String,
        phoneNumber: String?,
        from presentingViewController: UIViewController,
        completion: @escaping (Result<LinkController.PaymentMethodResult, Error>) -> Void
    ) {
        completion(.success(.completed(paymentMethod)))
    }

    func confirmSetupIntent(
        clientSecret: String,
        from presentingViewController: UIViewController,
        completion: @escaping (Result<LinkController.PaymentMethodResult, Error>) -> Void
    ) {
        confirmedClientSecret = clientSecret
        completion(.success(.completed(paymentMethod)))
    }
}

/// Answers every request of the session it is installed in, whatever the host, so nothing
/// reaches the network.
private final class FailingAPIURLProtocol: URLProtocol {
    /// URLSession loads on its own queue, so the answers and recorded requests sit behind a lock.
    final class State: @unchecked Sendable {
        private let lock = NSLock()
        private var answers: [String: [String: Any]] = [:]
        private var recorded: [URLRequest] = []

        var requests: [URLRequest] { lock.withLock { recorded } }

        func reset(_ answers: [String: [String: Any]]) {
            lock.withLock { (self.answers, recorded) = (answers, []) }
        }

        func record(_ request: URLRequest) -> [String: Any]? {
            lock.withLock {
                recorded.append(request)
                let path = request.url?.path ?? ""
                return answers.first { path.contains($0.key) }?.value
            }
        }
    }

    static let state = State()

    override static func canInit(with request: URLRequest) -> Bool { true }

    override static func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        let answer = Self.state.record(request)
        let body = answer ?? ["error": ["type": "invalid_request_error", "message": "Bridge contract stub"]]
        let response = HTTPURLResponse(url: request.url!, statusCode: answer == nil ? 400 : 200, httpVersion: nil, headerFields: nil)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: try! JSONSerialization.data(withJSONObject: body))
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}

#if canImport(StripeCryptoOnramp)
@_spi(CryptoOnrampAlpha) import StripeCryptoOnramp

extension BridgeRunners {
    /// Without a configured coordinator each call resolves its not-configured error; the
    /// mapper roots pin what the call would pass to the coordinator.
    static let onrampRunners: [String: Runner] = [
        "OnrampSdk.configureOnramp": { fixture in
            let config = try require(fixture.dictionary("config"), "config")
            let observation = moduleResult { sdk, resolution in
                sdk.configureOnramp(config: config, resolver: resolution.resolve, rejecter: resolution.reject)
            }
            return BridgeObservation(roots: observation.roots.merging([
                "configuration": Mappers.mapToOnrampConfiguration(config),
            ]) { first, _ in first })
        },
        "OnrampSdk.registerLinkUser": { fixture in
            let info = try require(fixture.dictionary("info"), "info")
            let observation = configuredResult { sdk, resolution in
                sdk.registerLinkUser(info: info, resolver: resolution.resolve, rejecter: resolution.reject)
            }
            // A configured coordinator needs the network, so a module holding a recording one
            // shows the user details the module hands it.
            let coordinator = RecordingOnrampCoordinator()
            withPublishableKey {
                let sdk = StripeSdkImpl()
                sdk.cryptoOnrampCoordinator = coordinator
                let registered = Resolution()
                sdk.registerLinkUser(info: info, resolver: registered.resolve, rejecter: registered.reject)
                _ = registered.wait()
            }
            return BridgeObservation(roots: observation.roots.merging([
                "info": coordinator.registeredUser as Any,
            ]) { first, _ in first })
        },
        "OnrampSdk.attachKycInfo": { fixture in
            let kycInfo = try require(fixture.dictionary("kycInfo"), "kycInfo")
            let observation = configuredResult { sdk, resolution in
                sdk.attachKycInfo(info: kycInfo, resolver: resolution.resolve, rejecter: resolution.reject)
            }
            return BridgeObservation(roots: observation.roots.merging([
                "kycInfo": try Mappers.mapToKycInfo(try require(kycInfo as? [String: Any], "kycInfo")),
            ]) { first, _ in first })
        },
        "OnrampSdk.submitIdentifiers": { fixture in
            let identifiers = try require(fixture.array("identifiers"), "identifiers")
            let observation = configuredResult { sdk, resolution in
                sdk.submitIdentifiers(identifiers: identifiers, resolver: resolution.resolve, rejecter: resolution.reject)
            }
            // ComplianceIdentifier is a struct, so its fields are read here.
            let mapped = try require(identifiers as? [[String: Any]], "identifiers")
                .map(Mappers.mapToComplianceIdentifier)
                .map { ["type": $0.type.rawValue, "value": $0.value] as NSDictionary }
            return BridgeObservation(roots: observation.roots.merging(["identifiers": mapped as NSArray]) { first, _ in first })
        },
        "OnrampSdk.presentKycInfoVerification": { fixture in
            let address = try require(fixture.dictionary("updatedAddress"), "updatedAddress")
            let observation = configuredResult { sdk, resolution in
                sdk.presentKycInfoVerification(
                    updatedAddressDictionary: address,
                    resolver: resolution.resolve,
                    rejecter: resolution.reject
                )
            }
            return BridgeObservation(roots: observation.roots.merging([
                "address": Mappers.mapToKycAddress(try require(address as? [String: Any], "updatedAddress")),
            ]) { first, _ in first })
        },
        "OnrampSdk.collectPaymentMethod": { fixture in
            let paymentMethod = try require(fixture.string("paymentMethod"), "paymentMethod")
            let platformPayParams = try require(fixture.dictionary("platformPayParams"), "platformPayParams")
            let observation = configuredResult { sdk, resolution in
                sdk.collectPaymentMethod(
                    paymentMethod: paymentMethod,
                    platformPayParams: platformPayParams,
                    resolver: resolution.resolve,
                    rejecter: resolution.reject
                )
            }
            // initStripe stores the merchant identifier the Apple Pay request is built with.
            let coordinator = RecordingOnrampCoordinator()
            withPublishableKey {
                let sdk = StripeSdkImpl()
                sdk.merchantIdentifier = "merchant.com.stripe.bridge"
                sdk.cryptoOnrampCoordinator = coordinator
                let collected = Resolution()
                sdk.collectPaymentMethod(
                    paymentMethod: paymentMethod,
                    platformPayParams: platformPayParams,
                    resolver: collected.resolve,
                    rejecter: collected.reject
                )
                _ = collected.wait()
            }
            var selection: [String: Any] = [:]
            switch coordinator.collectedType {
            case .applePay(let request)?:
                selection = ["kind": "applePay", "applePay": request]
            case .card?: selection = ["kind": "card"]
            case .bankAccount?: selection = ["kind": "bankAccount"]
            case .cardAndBankAccount?: selection = ["kind": "cardAndBankAccount"]
            case nil: break
            }
            return BridgeObservation(roots: observation.roots.merging([
                "selection": selection as NSDictionary,
            ]) { first, _ in first })
        },
        "OnrampSdk.getCryptoTokenDisplayData": { fixture in
            let token = try require(fixture.dictionary("token"), "token")
            return moduleResult { sdk, resolution in
                sdk.getCryptoTokenDisplayData(token: token, resolver: resolution.resolve, rejecter: resolution.reject)
            }
        },
    ]

    /// A publishable key is set, so the call reaches its coordinator check.
    private static func configuredResult(_ call: (StripeSdkImpl, Resolution) -> Void) -> BridgeObservation {
        withPublishableKey { moduleResult(call) }
    }
}

/// Records what the module hands the coordinator for the calls the runners make; any other
/// call fails.
private final class RecordingOnrampCoordinator: CryptoOnrampCoordinating {
    struct NotRecorded: Error {}

    private(set) var registeredUser: NSDictionary?
    private(set) var collectedType: PaymentMethodType?

    func registerLinkUser(email: String, fullName: String?, phone: String, country: String) async throws -> String {
        registeredUser = ["email": email, "fullName": fullName as Any, "phone": phone, "country": country]
        return "cus_bridge_contracts"
    }

    func collectPaymentMethod(type: PaymentMethodType, from viewController: UIViewController) async throws -> CollectPaymentMethodResult {
        collectedType = type
        return .canceled
    }

    func hasLinkAccount(with email: String) async throws -> Bool { throw NotRecorded() }
    func updatePhoneNumber(to phoneNumber: String) async throws { throw NotRecorded() }
    func authenticateUserWithToken(_ linkAuthTokenClientSecret: String) async throws { throw NotRecorded() }
    func authorize(linkAuthIntentId: String, from viewController: UIViewController) async throws -> AuthorizationResult { throw NotRecorded() }
    func attachKYCInfo(info: KycInfo) async throws { throw NotRecorded() }
    func retrieveMissingIdentifiers() async throws -> ComplianceIdentifierRequirements { throw NotRecorded() }
    func submitIdentifiers(_ identifiers: [ComplianceIdentifier]) async throws -> SubmitIdentifiersResult { throw NotRecorded() }
    func presentUserAttestation(from viewController: UIViewController) async throws -> UserAttestationResult { throw NotRecorded() }
    func fulfillKYCRequirements(from viewController: UIViewController) async throws -> FulfillKYCRequirementsResult { throw NotRecorded() }
    func presentTermsAndConditionsIfNeeded(from viewController: UIViewController) async throws -> PartnerTermsResult { throw NotRecorded() }
    func presentTermsOfServiceIfNeeded(from viewController: UIViewController) async throws -> PartnerTermsResult { throw NotRecorded() }
    func verifyKYCInfo(updatedAddress: Address?, from viewController: UIViewController) async throws -> VerifyKYCResult { throw NotRecorded() }
    func verifyIdentity(from viewController: UIViewController) async throws -> IdentityVerificationResult { throw NotRecorded() }
    func registerWalletAddress(walletAddress: String, network: CryptoNetwork) async throws { throw NotRecorded() }
    func deleteWalletAddress(walletId: String) async throws { throw NotRecorded() }
    func getWalletOwnershipChallenge(walletAddress: String, network: CryptoNetwork) async throws -> WalletOwnershipChallenge { throw NotRecorded() }
    func submitWalletOwnershipSignature(challengeId: String, signature: String) async throws -> CryptoConsumerWallet { throw NotRecorded() }
    func createCryptoPaymentToken() async throws -> String { throw NotRecorded() }
    func performCheckout(
        onrampSessionId: String,
        authenticationContext: STPAuthenticationContext,
        onrampSessionClientSecretProvider: @escaping (_ onrampSessionId: String) async throws -> String
    ) async throws -> CheckoutResult { throw NotRecorded() }
    func logOut() async throws { throw NotRecorded() }
}
#else
extension BridgeRunners {
    static let onrampRunners: [String: Runner] = [:]
}
#endif
