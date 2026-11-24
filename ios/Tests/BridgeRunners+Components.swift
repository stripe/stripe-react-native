import Contacts
import Foundation
import PassKit
@testable import stripe_react_native
@_spi(STP) import StripeCore
@_spi(STP) @_spi(InternalOnlyAPI) import StripePayments
@_spi(PaymentMethodMessagingElementPreview) import StripePaymentSheet
@testable import StripePaymentsUI
import UIKit

/// Component runners set fixture props on the native view, as React does, then read back
/// the state the prop setters put on the Stripe views.
extension BridgeRunners {
    static let componentRunners: [String: Runner] = [
        "component:CardField": cardField,
        "component:CardForm": cardForm,
        "component:AuBECSDebitForm": auBecsDebitForm,
        "component:PaymentMethodMessagingElementView": paymentMethodMessaging,
        "component:AddressSheetView": addressSheet,
        "component:ApplePayButton": applePayButton,
        "component:AddToWalletButton": addToWallet,
    ]

    /// The element view loads its message over the network, so this calls the mappers the view calls.
    private static func paymentMethodMessaging(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let appearance = PaymentMethodMessagingElementConfig.buildAppearanceFromParams(params: fixture.dictionary("appearance"))
        let style: String = switch appearance.style {
        case .alwaysDark: "dark"
        case .alwaysLight: "light"
        case .flat: "flat"
        default: "automatic"
        }
        let (_, built) = PaymentMethodMessagingElementConfig.buildPaymentMethodMessagingElementConfiguration(
            params: try require(fixture.dictionary("configuration"), "configuration")
        )
        let configuration = try require(built, "configuration")
        let (results, request) = try configureResults(fixture)
        return BridgeObservation(roots: [
            "events": ["onConfigureResult": results] as NSDictionary,
            "request": request as NSDictionary,
            "appearance": ["style": style] as NSDictionary,
            "configuration": [
                "amount": configuration.amount,
                "currency": configuration.currency,
                "country": configuration.countryCode as Any,
                "locale": configuration.locale as Any,
                "paymentMethodTypes": configuration.paymentMethodTypes?.map { STPPaymentMethod.string(from: $0) ?? "unknown" } as Any,
            ] as NSDictionary,
        ])
    }

    /// The onConfigureResult bodies the view sends for the fixture props, up to the first
    /// terminal status, and the query of the element's load request, which fails locally.
    private static func configureResults(_ fixture: BridgeFixture) throws -> (results: [Any], request: [String: String]) {
        let view = PaymentMethodMessagingElementContainerView(frame: .zero)
        defer { view.prepareForRecycle() }
        var results: [Any] = []
        let terminal = Resolution()
        view.onConfigureResult = { body in
            results.append(body as Any)
            if (body?["result"] as? [String: Any])?["status"] as? String != "loading" { terminal.resolve(nil) }
        }
        let query = try withFailingStripeAPI {
            view.appearance = fixture.dictionary("appearance")
            view.configuration = try require(fixture.dictionary("configuration"), "configuration")
            _ = terminal.wait()
            return stubbedRequests.compactMap { $0.url }.compactMap { URLComponents(url: $0, resolvingAgainstBaseURL: false) }
                .first { $0.path == "/config" }?.queryItems ?? []
        }
        // The publishable key the run sets is left out; every other parameter comes from the props.
        var request: [String: String] = [:]
        for item in query where item.name != "key" {
            request[item.name] = item.value
        }
        return (results, request)
    }

    private static func addressSheet(_ fixture: BridgeFixture) throws -> BridgeObservation {
        // An appearance that does not map fails the sheet before it presents, so the view can be
        // shown after initStripe without presenting UI.
        if (try? PaymentSheetAppearance.buildAppearanceFromParams(userParams: fixture.dictionary("appearance"))) == nil {
            return BridgeObservation(roots: ["events": ["onErrorAction": addressSheetErrorWhenShown(fixture) as Any] as NSDictionary])
        }
        let defaults = try require(fixture.dictionary("defaultValues"), "defaultValues")
        let configuration = try AddressSheetUtils.buildConfiguration(
            appearance: fixture.dictionary("appearance"),
            defaultValues: defaults,
            additionalFields: fixture.dictionary("additionalFields"),
            allowedCountries: [],
            autocompleteCountries: [],
            buttonTitle: nil,
            sheetTitle: nil
        )
        return BridgeObservation(
            roots: [
                "appearance": ["primaryColor": configuration.appearance.colors.primary] as NSDictionary,
                "defaultValues": AddressSheetUtils.buildDefaultValues(params: defaults),
                "additionalFields": AddressSheetUtils.buildAdditionalFieldsConfiguration(params: fixture.dictionary("additionalFields")),
                "submitResult": AddressSheetUtils.buildResult(address: AddressSheetUtils.buildAddressDetails(params: defaults)) as NSDictionary,
                "events": ["onErrorAction": addressSheetErrorWithoutPublishableKey() as Any] as NSDictionary,
            ],
            aliases: [
                "additionalFields.phoneNumber": "additionalFields.phone",
                // The view sends this map as the onSubmitAction event body.
                "submitResult": "submitResult.result",
            ]
        )
    }

    /// Showing the sheet before initStripe is the error a unit test can reach without presenting UI.
    private static func addressSheetErrorWithoutPublishableKey() -> [AnyHashable: Any]? {
        let view = AddressSheetView(frame: .zero)
        var error: [AnyHashable: Any]?
        view.onErrorAction = { error = $0 }
        // publishableKey falls back to StripeAPI.defaultPublishableKey, which earlier
        // fixtures set. Both have to be cleared or the sheet does not take the no-key path.
        let savedKey = STPAPIClient.shared.publishableKey
        let savedDefault = StripeAPI.defaultPublishableKey
        StripeAPI.defaultPublishableKey = nil
        STPAPIClient.shared.publishableKey = nil
        defer {
            StripeAPI.defaultPublishableKey = savedDefault
            STPAPIClient.shared.publishableKey = savedKey
        }
        view.visible = true
        view.didSetProps()
        return error
    }

    /// Shows the sheet with the fixture props after initStripe, as React does when visible turns true.
    private static func addressSheetErrorWhenShown(_ fixture: BridgeFixture) -> [AnyHashable: Any]? {
        let view = AddressSheetView(frame: .zero)
        var error: [AnyHashable: Any]?
        view.onErrorAction = { error = $0 }
        view.appearance = fixture.dictionary("appearance")
        view.visible = true
        withPublishableKey { view.didSetProps() }
        return error
    }

    /// Tapping the button hands its callbacks to the Apple Pay delegate; the delegate calls
    /// are what PassKit would make when the customer changes the shipping method or contact.
    private static func applePayButton(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let sdk = StripeSdkImpl.shared
        defer {
            sdk.shippingMethodUpdateJSCallback = nil
            sdk.shippingContactUpdateJSCallback = nil
            sdk.shippingMethodUpdateCompletion = nil
            sdk.shippingContactUpdateCompletion = nil
            sdk.couponCodeEnteredJSCallback = nil
            sdk.platformPayOrderTrackingJSCallback = nil
        }
        var events: [String: Any] = [:]
        let view = ApplePayButtonView(frame: .zero)
        view.onShippingMethodSelectedAction = { events["onShippingMethodSelectedAction"] = $0 }
        view.onShippingContactSelectedAction = { events["onShippingContactSelectedAction"] = $0 }
        view.hasShippingMethodCallback = true
        view.hasShippingContactCallback = true
        view.handleApplePayButtonTapped()

        let (_, request) = ApplePayUtils.createPaymentRequest(merchantIdentifier: "merchant.com.stripe.bridge", params: [
            "merchantCountryCode": "US",
            "currencyCode": "USD",
            "cartItems": [["paymentType": "Immediate", "label": "Bridge Contracts, Inc.", "amount": "12.50"]],
        ])
        let controller = try require(PKPaymentAuthorizationViewController(paymentRequest: try require(request, "request")), "controller")
        let method = PKShippingMethod(label: "Express", amount: NSDecimalNumber(string: "2.50"))
        method.identifier = "express"
        sdk.paymentAuthorizationViewController(controller, didSelect: method) { _ in }
        let contact = PKContact()
        contact.name = PersonNameComponents(givenName: "Jenny", familyName: "Rosen")
        sdk.paymentAuthorizationViewController(controller, didSelectShippingContact: contact) { _ in }
        return BridgeObservation(roots: ["events": events as NSDictionary])
    }

    private static func addToWallet(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let view = AddToWalletButtonView(frame: .zero)
        view.cardDetails = fixture.dictionary("cardDetails")
        view.ephemeralKey = fixture.dictionary("ephemeralKey")
        var key: [AnyHashable: Any]?
        view.createIssuingCardKey(withAPIVersion: "2020-08-27") { json, _ in key = json }
        let (error, passRequest) = view.buildRequestConfiguration()

        var completed: [AnyHashable: Any]?
        view.onCompleteAction = { completed = $0 }
        if passRequest == nil {
            // beginPushProvisioning sends this error and returns before the sheet exists.
            view.onCompleteAction?(error as? [AnyHashable: Any])
        } else {
            // PassKit calls the delegate when the customer closes the wallet sheet. The sheet is
            // never shown, so a plain view controller stands in for it; the view only dismisses it.
            let canceled = NSError(domain: PKPassKitErrorDomain, code: PKAddPaymentPassError.userCancelled.rawValue)
            let standIn = UIViewController()
            withExtendedLifetime(standIn) {
                let sheet = Unmanaged<PKAddPaymentPassViewController>
                    .fromOpaque(Unmanaged.passUnretained(standIn).toOpaque())
                    .takeUnretainedValue()
                view.addPaymentPassViewController(sheet, didFinishAdding: nil, error: canceled)
            }
        }

        return BridgeObservation(
            roots: [
                "ephemeralKey": key.map { $0 as NSDictionary },
                "passRequest": passRequest ?? error,
                "events": ["onCompleteAction": completed as Any] as NSDictionary,
            ],
            aliases: [
                "passRequest.name": "passRequest.cardholderName",
                "passRequest.description": "passRequest.localizedDescription",
                "passRequest.lastFour": "passRequest.primaryAccountSuffix",
                "passRequest.brand": "passRequest.paymentNetwork",
            ]
        )
    }

    private static func color(_ cgColor: CGColor?) -> Any { cgColor.map { UIColor(cgColor: $0) } as Any }

    /// React sets the props, then calls didSetProps; a second call stands for a re-render.
    /// Filling the form with a complete card is what makes STPCardFormView call its delegate.
    private static func cardForm(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let view = CardFormView(frame: .zero)
        var events: [String: Any] = [:]
        view.onFormComplete = { events["onFormComplete"] = $0 }
        if let cardStyle = fixture.dictionary("cardStyle") { view.cardStyle = cardStyle }
        view.didSetProps()
        let first = view.cardForm
        view.didSetProps()
        let form = try require(view.cardForm, "cardForm")
        let style: NSDictionary = [
            "backgroundColor": form.backgroundColor as Any,
            "borderColor": color(form.layer.borderColor),
            "borderRadius": form.layer.cornerRadius,
        ]

        let card = STPPaymentMethodCardParams()
        card.number = "4242424242424242"
        card.expMonth = 12
        card.expYear = 2034
        card.cvc = "123"
        let billingDetails = STPPaymentMethodBillingDetails()
        billingDetails.address = STPPaymentMethodAddress()
        billingDetails.address?.country = "US"
        billingDetails.address?.postalCode = "94107"
        form.cardParams = STPPaymentMethodParams(card: card, billingDetails: billingDetails, metadata: nil)
        view.cardFormView(form, didChangeToStateComplete: form.cardParams != nil)

        return BridgeObservation(roots: [
            "cardStyle": style,
            "rebuildsFormOnPropsUpdate": form !== first,
            "events": events as NSDictionary,
        ])
    }

    private static func auBecsDebitForm(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let view = AuBECSDebitFormView(frame: .zero)
        if let formStyle = fixture.dictionary("formStyle") { view.formStyle = formStyle }
        view.didSetProps()
        let first = view.auBecsFormView
        view.didSetProps()
        let form = try require(view.auBecsFormView, "auBecsFormView")
        return BridgeObservation(roots: [
            "formStyle": [
                "borderWidth": form.layer.borderWidth,
                "backgroundColor": form.formBackgroundColor,
                "borderColor": color(form.layer.borderColor),
                "borderRadius": form.layer.cornerRadius,
                "textColor": form.formTextColor,
                "fontSize": form.formFont.pointSize,
                "placeholderColor": form.formPlaceholderColor,
                "textErrorColor": form.formTextErrorColor,
            ] as NSDictionary,
            "rebuildsFormOnPropsUpdate": form !== first,
        ])
    }

    /// Filling the field with a complete card is what makes STPPaymentCardTextField call its delegate.
    private static func cardField(_ fixture: BridgeFixture) throws -> BridgeObservation {
        let view = CardFieldView(frame: .zero)
        var events: [String: Any] = [:]
        view.onCardChange = { events["onCardChange"] = $0 }
        if let cardStyle = fixture.dictionary("cardStyle") { view.cardStyle = cardStyle }
        if let placeholders = fixture.dictionary("placeholders") { view.placeholders = placeholders }
        let field = try require(
            Mirror(reflecting: view).children.first { $0.label == "cardField" }?.value as? STPPaymentCardTextField,
            "cardField"
        )

        let card = STPPaymentMethodCardParams()
        card.number = "4242424242424242"
        card.expMonth = 12
        card.expYear = 2034
        card.cvc = "123"
        let billingDetails = STPPaymentMethodBillingDetails()
        billingDetails.address = STPPaymentMethodAddress()
        billingDetails.address?.postalCode = "94107"
        field.paymentMethodParams = STPPaymentMethodParams(card: card, billingDetails: billingDetails, metadata: nil)
        view.paymentCardTextFieldDidChange(field)

        return BridgeObservation(roots: [
            "events": events as NSDictionary,
            "cardStyle": [
                "borderWidth": field.borderWidth,
                "backgroundColor": field.backgroundColor as Any,
                "borderColor": field.borderColor as Any,
                // STPPaymentCardTextField.cornerRadius returns the previous value; the layer has the applied one.
                "borderRadius": field.layer.cornerRadius,
                "textColor": field.textColor,
                "fontSize": field.font.pointSize,
                "placeholderColor": field.placeholderColor,
                "textErrorColor": field.textErrorColor as Any,
            ] as NSDictionary,
            "placeholders": [
                "number": field.numberPlaceholder as Any,
                "expiration": field.expirationPlaceholder as Any,
                "postalCode": field.postalCodePlaceholder as Any,
            ] as NSDictionary,
        ])
    }
}
