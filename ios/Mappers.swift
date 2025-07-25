import Stripe
import StripePaymentSheet

class Mappers {
    class func createResult(_ key: String, _ value: NSDictionary?) -> NSDictionary {
        return [key: value ?? NSNull()]
    }

    class func mapToPKContactField(field: String) -> PKContactField {
        switch field {
        case "emailAddress": return PKContactField.emailAddress
        case "name": return PKContactField.name
        case "phoneNumber": return PKContactField.phoneNumber
        case "phoneticName": return PKContactField.phoneticName
        case "postalAddress": return PKContactField.postalAddress
        default: return PKContactField.name
        }
    }

    class func mapFromBankAccountHolderType(_ type: STPBankAccountHolderType?) -> String? {
        if let type = type {
            switch type {
            case STPBankAccountHolderType.company: return "Company"
            case STPBankAccountHolderType.individual: return "Individual"
            default: return nil
            }
        }
        return nil
    }

    class func mapToBankAccountHolderType(_ type: String?) -> STPBankAccountHolderType {
        switch type {
        case "Company": return STPBankAccountHolderType.company
        case "Individual": return STPBankAccountHolderType.individual
        default: return STPBankAccountHolderType.individual
        }
    }

    class func mapFromBankAccountStatus(_ status: STPBankAccountStatus?) -> String? {
        if let status = status {
            switch status {
            case STPBankAccountStatus.errored: return "Errored"
            case STPBankAccountStatus.new: return "New"
            case STPBankAccountStatus.validated: return "Validated"
            case STPBankAccountStatus.verified: return "Verified"
            case STPBankAccountStatus.verificationFailed: return "VerificationFailed"
            default: return nil
            }
        }
        return nil
    }

    class func mapFromBankAccount(_ bankAccount: STPBankAccount?) -> NSDictionary? {
        guard let bankAccount = bankAccount else {
            return nil
        }

        let result: NSDictionary = [
            "id": bankAccount.stripeID,
            "bankName": bankAccount.bankName ?? NSNull(),
            "accountHolderName": bankAccount.accountHolderName ?? NSNull(),
            "accountHolderType": mapFromBankAccountHolderType(bankAccount.accountHolderType) ?? NSNull(),
            "country": bankAccount.country ?? NSNull(),
            "currency": bankAccount.currency ?? NSNull(),
            "routingNumber": bankAccount.routingNumber ?? NSNull(),
            "status": mapFromBankAccountStatus(bankAccount.status) ?? NSNull(),
            "fingerprint": bankAccount.fingerprint ?? NSNull(),
            "last4": bankAccount.last4 ?? NSNull()
        ]
        return result
    }

    class func mapFromCard(_ card: STPCard?) -> NSDictionary? {
        if (card == nil) {
            return nil
        }
        let cardMap: NSDictionary = [
            "brand": mapFromCardBrand(card?.brand) ?? NSNull(),
            "country": card?.country ?? NSNull(),
            "currency": card?.currency ?? NSNull(),
            "expMonth": card?.expMonth ?? NSNull(),
            "expYear": card?.expYear ?? NSNull(),
            "last4": card?.last4 ?? NSNull(),
            "funding": mapFromFunding(card?.funding) ?? NSNull(),
            "name": card?.name ?? NSNull(),
            "address": mapFromAddress(address: card?.address),
            "id": card?.stripeID ?? NSNull(),
        ]
        return cardMap
    }

    class func mapFromAddress(address: STPAddress?) -> NSDictionary {
        let result: NSDictionary = [
            "city": address?.city ?? NSNull(),
            "postalCode": address?.postalCode ?? NSNull(),
            "country": address?.country ?? NSNull(),
            "line1": address?.line1 ?? NSNull(),
            "line2": address?.line2 ?? NSNull(),
            "state": address?.state ?? NSNull(),
        ]

        return result
    }

    class func mapToAddress(address: NSDictionary?) -> STPAddress {
        let result = STPAddress()
        result.city = address?["city"] as? String
        result.country = address?["country"] as? String
        result.line1 = address?["line1"] as? String
        result.line2 = address?["line2"] as? String
        result.postalCode = address?["postalCode"] as? String
        result.state = address?["state"] as? String

        return result
    }

    class func mapFromFunding(_ funding: STPCardFundingType?) -> String? {
        if let funding = funding {
            switch funding {
            case STPCardFundingType.credit: return "Credit"
            case STPCardFundingType.debit: return "Debit"
            case STPCardFundingType.prepaid: return "Prepaid"
            case STPCardFundingType.other: return "Unknown"

            default: return nil
            }
        }
        return nil
    }

    class func mapFromTokenType(_ type: STPTokenType?) -> String? {
        if let type = type {
            switch type {
            case STPTokenType.PII: return "Pii"
            case STPTokenType.account: return "Account"
            case STPTokenType.bankAccount: return "BankAccount"
            case STPTokenType.card: return "Card"
            case STPTokenType.cvcUpdate: return "CvcUpdate"
            default: return nil
            }
        }
        return nil
    }

    class func mapFromToken(token: STPToken) -> NSDictionary {
        let tokenMap: NSDictionary = [
            "id": token.tokenId,
            "bankAccount": mapFromBankAccount(token.bankAccount) ?? NSNull(),
            "created": convertDateToUnixTimestampMilliseconds(date: token.created) ?? NSNull(),
            "card": mapFromCard(token.card) ?? NSNull(),
            "livemode": token.livemode,
            "type": mapFromTokenType(token.type) ?? NSNull(),
        ]

        return tokenMap
    }

    class func mapToShippingMethods(shippingMethods: NSArray?) -> [PKShippingMethod] {
        var shippingMethodsList: [PKShippingMethod] = []

        if let methods = shippingMethods as? [[String : Any]] {
            for method in methods {
                let label = method["label"] as? String ?? ""
                let amount = NSDecimalNumber(string: method["amount"] as? String ?? "")
                let identifier = method["identifier"] as! String
                let detail = method["detail"] as? String ?? ""
                let pm = PKShippingMethod.init(
                    label: label,
                    amount: amount,
                    type: method["isPending"] as? Bool ?? false
                        ? PKPaymentSummaryItemType.pending : PKPaymentSummaryItemType.final
                )
                pm.identifier = identifier
                pm.detail = detail
                shippingMethodsList.append(pm)
            }
        }

        return shippingMethodsList
    }

    class func mapFromShippingMethod(shippingMethod: PKShippingMethod) -> NSDictionary {
        let method: NSMutableDictionary = [
            "detail": shippingMethod.detail ?? "",
            "identifier": shippingMethod.identifier ?? "",
            "amount": shippingMethod.amount.stringValue,
            "isPending": shippingMethod.type == .pending,
            "label": shippingMethod.label
        ]

        if #available(iOS 15.0, *) {
            if let dateComponentsRange = shippingMethod.dateComponentsRange {
                method.setObject(
                    convertDateToUnixTimestampSeconds(date: dateComponentsRange.startDateComponents.date) ?? NSNull(),
                    forKey: "startDate" as NSCopying)
                method.setObject(
                    convertDateToUnixTimestampSeconds(date: dateComponentsRange.endDateComponents.date) ?? NSNull(),
                    forKey: "endDate" as NSCopying)
            }
        }

        return method
    }

    class func mapFromShippingContact(shippingContact: PKContact) -> NSDictionary {
        let name: NSDictionary = [
            "familyName": shippingContact.name?.familyName ?? "",
            "namePrefix": shippingContact.name?.namePrefix ?? "",
            "nameSuffix": shippingContact.name?.nameSuffix ?? "",
            "givenName": shippingContact.name?.givenName ?? "",
            "middleName": shippingContact.name?.middleName ?? "",
            "nickname": shippingContact.name?.nickname ?? "",
        ]
        let contact: NSDictionary = [
            "emailAddress": shippingContact.emailAddress ?? "",
            "phoneNumber": shippingContact.phoneNumber?.stringValue ?? "",
            "name": name,
            "postalAddress": [
                "city": shippingContact.postalAddress?.city,
                "country": shippingContact.postalAddress?.country,
                "postalCode": shippingContact.postalAddress?.postalCode,
                "state": shippingContact.postalAddress?.state,
                "street": shippingContact.postalAddress?.street,
                "isoCountryCode": shippingContact.postalAddress?.isoCountryCode,
                "subAdministrativeArea": shippingContact.postalAddress?.subAdministrativeArea,
                "subLocality": shippingContact.postalAddress?.subLocality,
            ],
        ]

        return contact
    }

    class func mapAddressFields(_ addressFields: [String]) -> [String] {
        return addressFields.map {
            if ($0 == "street") {
                return CNPostalAddressStreetKey
            } else if ($0 == "city") {
                return CNPostalAddressCityKey
            } else if ($0 == "subAdministrativeArea") {
                return CNPostalAddressSubAdministrativeAreaKey
            } else if ($0 == "state") {
                return CNPostalAddressStateKey
            } else if ($0 == "postalCode") {
                return CNPostalAddressPostalCodeKey
            } else if ($0 == "country") {
                return CNPostalAddressCountryKey
            } else if ($0 == "countryCode") {
                return CNPostalAddressISOCountryCodeKey
            } else if ($0 == "subLocality") {
                return CNPostalAddressSubLocalityKey
            }
            return ""
        }
    }

    class func mapIntentStatus(status: STPPaymentIntentStatus?) -> String {
        if let status = status {
            switch status {
            case STPPaymentIntentStatus.succeeded: return "Succeeded"
            case STPPaymentIntentStatus.requiresPaymentMethod: return "RequiresPaymentMethod"
            case STPPaymentIntentStatus.requiresConfirmation: return "RequiresConfirmation"
            case STPPaymentIntentStatus.canceled: return "Canceled"
            case STPPaymentIntentStatus.processing: return "Processing"
            case STPPaymentIntentStatus.requiresAction: return "RequiresAction"
            case STPPaymentIntentStatus.requiresCapture: return "RequiresCapture"
            default: return "Unknown"
            }
        }
        return "Unknown"
    }

    class func mapPaymentMethodType(type: STPPaymentMethodType) -> String {
        switch type {
        case STPPaymentMethodType.card: return "Card"
        case STPPaymentMethodType.alipay: return "Alipay"
        case STPPaymentMethodType.grabPay: return "GrabPay"
        case STPPaymentMethodType.iDEAL: return "Ideal"
        case STPPaymentMethodType.FPX: return "Fpx"
        case STPPaymentMethodType.cardPresent: return "CardPresent"
        case STPPaymentMethodType.SEPADebit: return "SepaDebit"
        case STPPaymentMethodType.AUBECSDebit: return "AuBecsDebit"
        case STPPaymentMethodType.bacsDebit: return "BacsDebit"
        case STPPaymentMethodType.giropay: return "Giropay"
        case STPPaymentMethodType.przelewy24: return "P24"
        case STPPaymentMethodType.EPS: return "Eps"
        case STPPaymentMethodType.bancontact: return "Bancontact"
        case STPPaymentMethodType.OXXO: return "Oxxo"
        case STPPaymentMethodType.UPI: return "Upi"
        case STPPaymentMethodType.afterpayClearpay: return "AfterpayClearpay"
        case STPPaymentMethodType.klarna: return "Klarna"
        case STPPaymentMethodType.USBankAccount: return "USBankAccount"
        case STPPaymentMethodType.payPal: return "PayPal"
        case STPPaymentMethodType.affirm: return "Affirm"
        case STPPaymentMethodType.cashApp: return "CashApp"
        case STPPaymentMethodType.revolutPay: return "RevolutPay"
        case STPPaymentMethodType.unknown: return "Unknown"
        default: return "Unknown"
        }
    }

    class func mapToPaymentMethodType(type: String?) -> STPPaymentMethodType? {
        if let type = type {
            switch type {
            case "Card": return STPPaymentMethodType.card
            case "Alipay": return STPPaymentMethodType.alipay
            case "GrabPay": return STPPaymentMethodType.grabPay
            case "Ideal": return STPPaymentMethodType.iDEAL
            case "Fpx": return STPPaymentMethodType.FPX
            case "CardPresent": return STPPaymentMethodType.cardPresent
            case "SepaDebit": return STPPaymentMethodType.SEPADebit
            case "AuBecsDebit": return STPPaymentMethodType.AUBECSDebit
            case "BacsDebit": return STPPaymentMethodType.bacsDebit
            case "Giropay": return STPPaymentMethodType.giropay
            case "P24": return STPPaymentMethodType.przelewy24
            case "Eps": return STPPaymentMethodType.EPS
            case "Bancontact": return STPPaymentMethodType.bancontact
            case "Oxxo": return STPPaymentMethodType.OXXO
            case "Upi": return STPPaymentMethodType.UPI
            case "AfterpayClearpay": return STPPaymentMethodType.afterpayClearpay
            case "Klarna": return STPPaymentMethodType.klarna
            case "WeChatPay": return STPPaymentMethodType.weChatPay
            case "USBankAccount": return STPPaymentMethodType.USBankAccount
            case "PayPal": return STPPaymentMethodType.payPal
            case "Affirm": return STPPaymentMethodType.affirm
            case "CashApp": return STPPaymentMethodType.cashApp
            case "RevolutPay": return STPPaymentMethodType.revolutPay
            default: return STPPaymentMethodType.unknown
            }
        }
        return nil
    }

    class func mapCaptureMethod(_ captureMethod: STPPaymentIntentCaptureMethod?) -> String {
        if let captureMethod = captureMethod {
            switch captureMethod {
            case STPPaymentIntentCaptureMethod.automatic: return "Automatic"
            case STPPaymentIntentCaptureMethod.manual: return "Manual"
            default: return "Unknown"
            }
        }
        return "Unknown"
    }

    class func mapConfirmationMethod(_ confirmationMethod: STPPaymentIntentConfirmationMethod?) -> String {
        if let confirmationMethod = confirmationMethod {
            switch confirmationMethod {
            case STPPaymentIntentConfirmationMethod.automatic: return "Automatic"
            case STPPaymentIntentConfirmationMethod.manual: return "Manual"
            default: return "Unknown"
            }
        }
        return "Unknown"
    }

    class func mapIntentShipping(_ shipping: STPPaymentIntentShippingDetails) -> NSDictionary {
        var addressDetails = NSDictionary()
        if let address = shipping.address {
            addressDetails = [
                "city": address.city ?? NSNull(),
                "state": address.state ?? NSNull(),
                "country": address.country ?? NSNull(),
                "line1": address.line1 ?? NSNull(),
                "line2":address.line2 ?? NSNull(),
                "postalCode": address.postalCode ?? NSNull(),
            ]
        }
        let shippingDetails: NSDictionary = [
            "address": addressDetails,
            "name": shipping.name ?? NSNull(),
            "phone": shipping.phone ?? NSNull(),
            "trackingNumber": shipping.trackingNumber ?? NSNull(),
            "carrier": shipping.carrier ?? NSNull(),
        ]
        return shippingDetails
    }

    class func mapFromPaymentIntent (paymentIntent: STPPaymentIntent) -> NSDictionary {
        let intent: NSMutableDictionary = [
            "id": paymentIntent.stripeId,
            "currency": paymentIntent.currency,
            "status": Mappers.mapIntentStatus(status: paymentIntent.status),
            "description": paymentIntent.description,
            "clientSecret": paymentIntent.clientSecret,
            "receiptEmail": paymentIntent.receiptEmail ?? NSNull(),
            "livemode": paymentIntent.livemode,
            "paymentMethodId": paymentIntent.paymentMethodId ?? NSNull(),
            "paymentMethod": mapFromPaymentMethod(paymentIntent.paymentMethod) ?? NSNull(),
            "captureMethod": mapCaptureMethod(paymentIntent.captureMethod),
            "confirmationMethod": mapConfirmationMethod(paymentIntent.confirmationMethod),
            "created": convertDateToUnixTimestampMilliseconds(date: paymentIntent.created) ?? NSNull(),
            "amount": paymentIntent.amount,
            "lastPaymentError": NSNull(),
            "shipping": NSNull(),
            "canceledAt": NSNull(),
            "nextAction": mapNextAction(nextAction: paymentIntent.nextAction) ?? NSNull(),
        ]

        if let lastPaymentError = paymentIntent.lastPaymentError {
            let paymentError: NSMutableDictionary = [
                "code": lastPaymentError.code ?? NSNull(),
                "message": lastPaymentError.message ?? NSNull(),
                "type": mapFromPaymentIntentLastPaymentErrorType(lastPaymentError.type) ?? NSNull(),
                "declineCode": lastPaymentError.declineCode ?? NSNull(),
                "paymentMethod": mapFromPaymentMethod(lastPaymentError.paymentMethod) ?? NSNull()
            ]

            intent.setValue(paymentError, forKey: "lastPaymentError")
        }

        if let shipping = paymentIntent.shipping {
            intent.setValue(mapIntentShipping(shipping), forKey: "shipping")
        }

        if let canceledAt = paymentIntent.canceledAt {
            intent.setValue(convertDateToUnixTimestampMilliseconds(date: canceledAt), forKey: "canceledAt")
        }

        return intent;
    }

    class func mapNextAction(nextAction: STPIntentAction?) -> NSDictionary? {
        if let it = nextAction {
            switch it.type {
            case .verifyWithMicrodeposits:
                return [
                    "type": "verifyWithMicrodeposits",
                    "redirectUrl": it.verifyWithMicrodeposits?.hostedVerificationURL.absoluteString ?? NSNull(),
                    "microdepositType": it.verifyWithMicrodeposits?.microdepositType.description ?? NSNull(),
                    "arrivalDate": it.verifyWithMicrodeposits?.arrivalDate.timeIntervalSince1970.description ?? NSNull(),
                ]
            case .redirectToURL:
                return [
                    "type": "urlRedirect",
                    "redirectUrl": it.redirectToURL?.url.absoluteString ?? NSNull()
                ]
            case .weChatPayRedirectToApp:
                return [
                    "type": "weChatRedirect",
                    "redirectUrl": it.weChatPayRedirectToApp?.nativeURL?.absoluteString ?? NSNull()
                ]
            case .alipayHandleRedirect:
                return [
                    "type": "alipayRedirect",
                    "redirectUrl": it.alipayHandleRedirect?.url.absoluteString ?? NSNull(),
                    "nativeRedirectUrl": it.alipayHandleRedirect?.nativeURL?.absoluteString ?? NSNull(),
                ]
            case .OXXODisplayDetails:
                return [
                    "type": "oxxoVoucher",
                    "expiration": it.oxxoDisplayDetails?.expiresAfter.timeIntervalSince1970 ?? NSNull(),
                    "voucherURL": it.oxxoDisplayDetails?.hostedVoucherURL.absoluteString ?? NSNull(),
                    "voucherNumber": it.oxxoDisplayDetails?.number ?? NSNull(),
                ]
            case .boletoDisplayDetails:
                return [
                    "type": "boletoVoucher",
                    "voucherURL": it.boletoDisplayDetails?.hostedVoucherURL.absoluteString ?? NSNull(),
                ]
            case .konbiniDisplayDetails:
                return [
                    "type": "konbiniVoucher",
                    "voucherURL": it.konbiniDisplayDetails?.hostedVoucherURL.absoluteString ?? NSNull(),
                ]
            default: // .useStripeSDK, .BLIKAuthorize, .unknown
                return nil
            }
        } else {
            return nil
        }
    }

    class func mapFromPaymentIntentLastPaymentErrorType(_ errorType: STPPaymentIntentLastPaymentErrorType?) -> String? {
        if let errorType = errorType {
            switch errorType {
            case STPPaymentIntentLastPaymentErrorType.apiConnection: return "api_connection_error"
            case STPPaymentIntentLastPaymentErrorType.api: return "api_error"
            case STPPaymentIntentLastPaymentErrorType.authentication: return "authentication_error"
            case STPPaymentIntentLastPaymentErrorType.card: return "card_error"
            case STPPaymentIntentLastPaymentErrorType.idempotency: return "idempotency_error"
            case STPPaymentIntentLastPaymentErrorType.invalidRequest: return "invalid_request_error"
            case STPPaymentIntentLastPaymentErrorType.rateLimit: return "rate_limit_error"
            case STPPaymentIntentLastPaymentErrorType.unknown: return nil
            default: return nil
            }
        }
        return nil
    }

    class func mapFromSetupIntentLastPaymentErrorType(_ errorType: STPSetupIntentLastSetupErrorType?) -> String? {
        if let errorType = errorType {
            switch errorType {
            case STPSetupIntentLastSetupErrorType.apiConnection: return "api_connection_error"
            case STPSetupIntentLastSetupErrorType.API: return "api_error"
            case STPSetupIntentLastSetupErrorType.authentication: return "authentication_error"
            case STPSetupIntentLastSetupErrorType.card: return "card_error"
            case STPSetupIntentLastSetupErrorType.idempotency: return "idempotency_error"
            case STPSetupIntentLastSetupErrorType.invalidRequest: return "invalid_request_error"
            case STPSetupIntentLastSetupErrorType.rateLimit: return "rate_limit_error"
            case STPSetupIntentLastSetupErrorType.unknown: return nil
            default: return nil
            }
        }
        return nil
    }

    class func mapToBillingDetails(billingDetails: NSDictionary?) -> STPPaymentMethodBillingDetails? {
        guard let billingDetails = billingDetails else {
            return nil
        }
        let billing = STPPaymentMethodBillingDetails()
        billing.email = billingDetails["email"] as? String
        billing.phone = billingDetails["phone"] as? String
        billing.name = billingDetails["name"] as? String

        let address = STPPaymentMethodAddress()

        if let addressMap = billingDetails["address"] as? NSDictionary {
            address.city = addressMap["city"] as? String
            address.postalCode = addressMap["postalCode"] as? String
            address.country = addressMap["country"] as? String
            address.line1 = addressMap["line1"] as? String
            address.line2 = addressMap["line2"] as? String
            address.state = addressMap["state"] as? String
        }

        billing.address = address

        return billing
    }

    class func mapToShippingDetails(shippingDetails: NSDictionary?) -> STPPaymentIntentShippingDetailsParams? {
        guard let shippingDetails = shippingDetails else {
            return nil
        }

        let shippingAddress = STPPaymentIntentShippingDetailsAddressParams(line1: "")

        if let addressMap = shippingDetails["address"] as? NSDictionary {
            shippingAddress.city = addressMap["city"] as? String
            shippingAddress.postalCode = addressMap["postalCode"] as? String
            shippingAddress.country = addressMap["country"] as? String
            shippingAddress.line1 = addressMap["line1"] as? String ?? ""
            shippingAddress.line2 = addressMap["line2"] as? String
            shippingAddress.state = addressMap["state"] as? String
        }

        let shipping = STPPaymentIntentShippingDetailsParams(address: shippingAddress, name: shippingDetails["name"] as? String ?? "")

        return shipping
    }

    class func mapFromBillingDetails(billingDetails: STPPaymentMethodBillingDetails?) -> NSDictionary {
        let billing: NSDictionary = [
            "email": billingDetails?.email ?? NSNull(),
            "phone": billingDetails?.phone ?? NSNull(),
            "name": billingDetails?.name ?? NSNull(),
            "address": [
                "city": billingDetails?.address?.city,
                "postalCode": billingDetails?.address?.postalCode,
                "country": billingDetails?.address?.country,
                "line1": billingDetails?.address?.line1,
                "line2": billingDetails?.address?.line2,
                "state": billingDetails?.address?.state,
            ],
        ]

        return billing
    }

    class func mapFromCardBrand(_ brand: STPCardBrand?) -> String? {
        if let brand = brand {
            switch brand {
            case STPCardBrand.visa: return "Visa"
            case STPCardBrand.amex: return "AmericanExpress"
            case STPCardBrand.mastercard: return "MasterCard"
            case STPCardBrand.discover: return "Discover"
            case STPCardBrand.JCB: return "JCB"
            case STPCardBrand.dinersClub: return "DinersClub"
            case STPCardBrand.unionPay: return "UnionPay"
            case STPCardBrand.unknown: return "Unknown"
            default: return nil
            }
        }
        return nil
    }

    class func mapToCardBrand(_ brand: String?) -> STPCardBrand {
        if let brand = brand {
            switch brand {
            case "Visa": return STPCardBrand.visa
            case "AmericanExpress" : return STPCardBrand.amex
            case "MasterCard": return STPCardBrand.mastercard
            case "Discover": return STPCardBrand.discover
            case "JCB": return STPCardBrand.JCB
            case "DinersClub": return STPCardBrand.dinersClub
            case "UnionPay": return STPCardBrand.unionPay
            case "Unknown": return STPCardBrand.unknown
            default: return STPCardBrand.unknown
            }
        }
        return STPCardBrand.unknown
    }

    class func mapFromPaymentMethod(_ paymentMethod: STPPaymentMethod?) -> NSDictionary? {
        guard let paymentMethod = paymentMethod else {
            return nil
        }
        let card: NSDictionary = [
            "brand": Mappers.mapFromCardBrand(paymentMethod.card?.brand) ?? NSNull(),
            "country": paymentMethod.card?.country ?? NSNull(),
            "expYear": paymentMethod.card?.expYear ?? NSNull(),
            "expMonth": paymentMethod.card?.expMonth ?? NSNull(),
            "fingerprint": paymentMethod.card?.fingerprint ?? NSNull(),
            "funding": paymentMethod.card?.funding ?? NSNull(),
            "last4": paymentMethod.card?.last4 ?? NSNull(),
            "preferredNetwork": paymentMethod.card?.networks?.preferred ?? NSNull(),
            "availableNetworks": paymentMethod.card?.networks?.available ?? NSNull(),
            "threeDSecureUsage": [
              "isSupported": paymentMethod.card?.threeDSecureUsage?.supported ?? false
            ],
        ]

        let sepaDebit: NSDictionary = [
            "bankCode": paymentMethod.sepaDebit?.bankCode ?? NSNull(),
            "country": paymentMethod.sepaDebit?.country ?? NSNull(),
            "fingerprint": paymentMethod.sepaDebit?.fingerprint ?? NSNull(),
            "last4": paymentMethod.sepaDebit?.last4 ?? NSNull(),
        ]
        let bacsDebit: NSDictionary = [
            "fingerprint": paymentMethod.bacsDebit?.fingerprint ?? NSNull(),
            "last4": paymentMethod.bacsDebit?.last4 ?? NSNull(),
            "sortCode": paymentMethod.bacsDebit?.sortCode ?? NSNull()
        ]
        let auBECSDebit: NSDictionary = [
            "bsbNumber": paymentMethod.auBECSDebit?.bsbNumber ?? NSNull(),
            "fingerprint": paymentMethod.auBECSDebit?.fingerprint ?? NSNull(),
            "last4": paymentMethod.auBECSDebit?.last4 ?? NSNull()
        ]
        let USBankAccount: NSDictionary = [
            "routingNumber": paymentMethod.usBankAccount?.routingNumber ?? NSNull(),
            "accountHolderType": mapFromUSBankAccountHolderType(type: paymentMethod.usBankAccount?.accountHolderType),
            "accountType": mapFromUSBankAccountType(type: paymentMethod.usBankAccount?.accountType),
            "last4": paymentMethod.usBankAccount?.last4 ?? NSNull(),
            "bankName": paymentMethod.usBankAccount?.bankName ?? NSNull(),
            "linkedAccount": paymentMethod.usBankAccount?.linkedAccount ?? NSNull(),
            "fingerprint": paymentMethod.usBankAccount?.fingerprint ?? NSNull(),
            "preferredNetworks": paymentMethod.usBankAccount?.networks?.preferred ?? NSNull(),
            "supportedNetworks": paymentMethod.usBankAccount?.networks?.supported ?? NSNull(),
        ]
        let method: NSDictionary = [
            "id": paymentMethod.stripeId,
            "paymentMethodType": Mappers.mapPaymentMethodType(type: paymentMethod.type),
            "livemode": paymentMethod.liveMode,
            "customerId": paymentMethod.customerId ?? NSNull(),
            "billingDetails": Mappers.mapFromBillingDetails(billingDetails: paymentMethod.billingDetails),
            "Card": card,
            "Ideal": [
                "bankIdentifierCode": paymentMethod.iDEAL?.bankIdentifierCode ?? "",
                "bankName": paymentMethod.iDEAL?.bankName ?? ""
            ],
            "Fpx": [
                "bank": paymentMethod.fpx?.bankIdentifierCode ?? "",
            ],
            "SepaDebit": sepaDebit,
            "BacsDebit": bacsDebit,
            "AuBecsDebit": auBECSDebit,
            "Upi": [
                "vpa": paymentMethod.upi?.vpa
            ],
            "USBankAccount": USBankAccount
        ]
        return method
    }

    class func mapIntentStatus(status: STPSetupIntentStatus?) -> String {
        if let status = status {
            switch status {
            case STPSetupIntentStatus.succeeded: return "Succeeded"
            case STPSetupIntentStatus.requiresPaymentMethod: return "RequiresPaymentMethod"
            case STPSetupIntentStatus.requiresConfirmation: return "RequiresConfirmation"
            case STPSetupIntentStatus.canceled: return "Canceled"
            case STPSetupIntentStatus.processing: return "Processing"
            case STPSetupIntentStatus.requiresAction: return "RequiresAction"
            case STPSetupIntentStatus.unknown: return "Unknown"
            default: return "Unknown"
            }
        }
        return "Unknown"
    }

    class func mapFromSetupIntentUsage(usage: STPSetupIntentUsage?) -> String {
        if let usage = usage {
            switch usage {
            case STPSetupIntentUsage.none: return "None"
            case STPSetupIntentUsage.offSession: return "OffSession"
            case STPSetupIntentUsage.onSession: return "OnSession"
            case STPSetupIntentUsage.unknown: return "Unknown"
            default: return "Unknown"
            }
        }
        return "Unknown"
    }

    class func mapToPaymentIntentFutureUsage(usage: String?) -> STPPaymentIntentSetupFutureUsage {
        if let usage = usage {
            switch usage {
            case "None": return STPPaymentIntentSetupFutureUsage.none
            case "OffSession": return STPPaymentIntentSetupFutureUsage.offSession
            case "OnSession": return STPPaymentIntentSetupFutureUsage.onSession
            case "Unknown": return STPPaymentIntentSetupFutureUsage.unknown
            default: return STPPaymentIntentSetupFutureUsage.unknown
            }
        }
        return STPPaymentIntentSetupFutureUsage.unknown
    }

    class func mapFromSetupIntent(setupIntent: STPSetupIntent) -> NSDictionary {
        let intent: NSMutableDictionary = [
            "id": setupIntent.stripeID,
            "clientSecret": setupIntent.clientSecret,
            "status": mapIntentStatus(status: setupIntent.status),
            "description": setupIntent.stripeDescription ?? NSNull(),
            "livemode": setupIntent.livemode,
            "paymentMethodTypes": NSArray(),
            "usage": mapFromSetupIntentUsage(usage: setupIntent.usage),
            "paymentMethodId": setupIntent.paymentMethodID ?? NSNull(),
            "paymentMethod": mapFromPaymentMethod(setupIntent.paymentMethod) ?? NSNull(),
            "created": NSNull(),
            "lastSetupError": NSNull(),
            "nextAction": mapNextAction(nextAction: setupIntent.nextAction) ?? NSNull(),
        ]


        let types = setupIntent.paymentMethodTypes.map {
            mapPaymentMethodType(type: STPPaymentMethodType.init(rawValue: Int(truncating: $0))!)
        }

        intent.setValue(types, forKey: "paymentMethodTypes")
        intent.setValue(convertDateToUnixTimestampMilliseconds(date: setupIntent.created), forKey: "created")

        if let lastSetupError = setupIntent.lastSetupError {
            let setupError: NSMutableDictionary = [
                "code": lastSetupError.code ?? NSNull(),
                "message": lastSetupError.message ?? NSNull(),
                "type": mapFromSetupIntentLastPaymentErrorType(lastSetupError.type) ?? NSNull(),
                "declineCode": lastSetupError.declineCode ?? NSNull(),
                "paymentMethod": mapFromPaymentMethod(lastSetupError.paymentMethod) ?? NSNull()
            ]
            intent.setValue(setupError, forKey: "lastSetupError")
        }

        return intent
    }

    @available(iOS 13.0, *)
    class func mapToUserInterfaceStyle(_ style: String?) -> PaymentSheet.UserInterfaceStyle {
        switch style {
        case "alwaysDark": return PaymentSheet.UserInterfaceStyle.alwaysDark
        case "alwaysLight": return PaymentSheet.UserInterfaceStyle.alwaysLight
        default: return PaymentSheet.UserInterfaceStyle.automatic
        }
    }

    class func mapToReturnURL(urlScheme: String) -> String {
        return urlScheme + "://safepay"
    }

    class func mapToFinancialConnectionsReturnURL(urlScheme: String) -> String {
        return urlScheme + "://financial_connections_redirect"
    }

    class func mapUICustomization(_ params: NSDictionary) -> STPThreeDSUICustomization {
        let uiCustomization = STPThreeDSUICustomization()
        if let labelSettings = params["label"] as? Dictionary<String, Any?> {
            if let headingTextColor = labelSettings["headingTextColor"] as? String {
                uiCustomization.labelCustomization.headingTextColor = UIColor(hexString: headingTextColor)
            }
            if let textColor = labelSettings["textColor"] as? String {
                uiCustomization.labelCustomization.textColor = UIColor(hexString: textColor)
            }
            if let headingFontSize = labelSettings["headingFontSize"] as? Int {
                uiCustomization.labelCustomization.headingFont = UIFont.systemFont(ofSize: CGFloat(headingFontSize))
            }
            if let textFontSize = labelSettings["textFontSize"] as? Int {
                uiCustomization.labelCustomization.font = UIFont.systemFont(ofSize: CGFloat(textFontSize))
            }
        }

        if let navigationBarSettings = params["navigationBar"] as? Dictionary<String, Any?> {
            if let barTintColor = navigationBarSettings["barTintColor"] as? String {
                uiCustomization.navigationBarCustomization.barTintColor = UIColor(hexString: barTintColor)
            }
            if let barStyle = navigationBarSettings["barStyle"] as? Int {
                uiCustomization.navigationBarCustomization.barStyle = UIBarStyle(rawValue: barStyle) ?? .default
            }
            if let headerText = navigationBarSettings["headerText"] as? String {
                uiCustomization.navigationBarCustomization.headerText = headerText
            }
            if let buttonText = navigationBarSettings["buttonText"] as? String {
                uiCustomization.navigationBarCustomization.buttonText = buttonText
            }
            if let textFontSize = navigationBarSettings["textFontSize"] as? Int {
                uiCustomization.navigationBarCustomization.font = UIFont.systemFont(ofSize: CGFloat(textFontSize))
            }
            if let textColor = navigationBarSettings["textColor"] as? String {
                uiCustomization.navigationBarCustomization.textColor = UIColor(hexString: textColor)
            }
            if let translucent = navigationBarSettings["translucent"] as? Bool {
                uiCustomization.navigationBarCustomization.translucent = translucent
            }
        }

        if let textFieldSettings = params["textField"] as? Dictionary<String, Any?> {
            if let borderColor = textFieldSettings["borderColor"] as? String {
                uiCustomization.textFieldCustomization.borderColor = UIColor(hexString: borderColor)
            }
            if let borderWidth = textFieldSettings["borderWidth"] as? Int {
                uiCustomization.textFieldCustomization.borderWidth = CGFloat(borderWidth)
            }
            if let borderRadius = textFieldSettings["borderRadius"] as? Int {
                uiCustomization.textFieldCustomization.cornerRadius = CGFloat(borderRadius)
            }
            if let textColor = textFieldSettings["textColor"] as? String {
                uiCustomization.textFieldCustomization.textColor = UIColor(hexString: textColor)
            }
            if let textFontSize = textFieldSettings["textFontSize"] as? Int {
                uiCustomization.textFieldCustomization.font = UIFont.systemFont(ofSize: CGFloat(textFontSize))
            }
        }

        if let footerSettings = params["footer"] as? Dictionary<String, Any?> {
            if let backgroundColor = footerSettings["backgroundColor"] as? String {
                uiCustomization.footerCustomization.backgroundColor = UIColor(hexString: backgroundColor)
            }
            if let chevronColor = footerSettings["chevronColor"] as? String {
                uiCustomization.footerCustomization.chevronColor = UIColor(hexString: chevronColor)
            }
            if let headingTextColor = footerSettings["headingTextColor"] as? String {
                uiCustomization.footerCustomization.headingTextColor = UIColor(hexString: headingTextColor)
            }
            if let textColor = footerSettings["textColor"] as? String {
                uiCustomization.footerCustomization.textColor = UIColor(hexString: textColor)
            }
        }

        if let submitButtonSettings = params["submitButton"] as? Dictionary<String, Any?> {
            let buttonCustomization = uiCustomization.buttonCustomization(for: STPThreeDSCustomizationButtonType.submit)

            if let backgroundColor = submitButtonSettings["backgroundColor"] as? String {
                buttonCustomization.backgroundColor = UIColor(hexString: backgroundColor)
            }
            if let borderRadius = submitButtonSettings["borderRadius"] as? Int {
                buttonCustomization.cornerRadius = CGFloat(borderRadius)
            }
            if let textFontSize = submitButtonSettings["textFontSize"] as? Int {
                buttonCustomization.font = UIFont.systemFont(ofSize: CGFloat(textFontSize))
            }
            if let textColor = submitButtonSettings["textColor"] as? String {
                buttonCustomization.textColor = UIColor(hexString: textColor)
            }

            uiCustomization.setButtonCustomization(buttonCustomization, for: STPThreeDSCustomizationButtonType.submit)
        }

        if let submitButtonSettings = params["cancelButton"] as? Dictionary<String, Any?> {
            let buttonCustomization = uiCustomization.buttonCustomization(for: STPThreeDSCustomizationButtonType.cancel)

            if let backgroundColor = submitButtonSettings["backgroundColor"] as? String {
                buttonCustomization.backgroundColor = UIColor(hexString: backgroundColor)
            }
            if let borderRadius = submitButtonSettings["borderRadius"] as? Int {
                buttonCustomization.cornerRadius = CGFloat(borderRadius)
            }
            if let textFontSize = submitButtonSettings["textFontSize"] as? Int {
                buttonCustomization.font = UIFont.systemFont(ofSize: CGFloat(textFontSize))
            }
            if let textColor = submitButtonSettings["textColor"] as? String {
                buttonCustomization.textColor = UIColor(hexString: textColor)
            }

            uiCustomization.setButtonCustomization(buttonCustomization, for: STPThreeDSCustomizationButtonType.cancel)
        }

        if let submitButtonSettings = params["continueButton"] as? Dictionary<String, Any?> {
            let buttonCustomization = uiCustomization.buttonCustomization(for: STPThreeDSCustomizationButtonType.continue)

            if let backgroundColor = submitButtonSettings["backgroundColor"] as? String {
                buttonCustomization.backgroundColor = UIColor(hexString: backgroundColor)
            }
            if let borderRadius = submitButtonSettings["borderRadius"] as? Int {
                buttonCustomization.cornerRadius = CGFloat(borderRadius)
            }
            if let textFontSize = submitButtonSettings["textFontSize"] as? Int {
                buttonCustomization.font = UIFont.systemFont(ofSize: CGFloat(textFontSize))
            }
            if let textColor = submitButtonSettings["textColor"] as? String {
                buttonCustomization.textColor = UIColor(hexString: textColor)
            }

            uiCustomization.setButtonCustomization(buttonCustomization, for: STPThreeDSCustomizationButtonType.continue)
        }

        if let submitButtonSettings = params["nextButton"] as? Dictionary<String, Any?> {
            let buttonCustomization = uiCustomization.buttonCustomization(for: STPThreeDSCustomizationButtonType.next)

            if let backgroundColor = submitButtonSettings["backgroundColor"] as? String {
                buttonCustomization.backgroundColor = UIColor(hexString: backgroundColor)
            }
            if let borderRadius = submitButtonSettings["borderRadius"] as? Int {
                buttonCustomization.cornerRadius = CGFloat(borderRadius)
            }
            if let textFontSize = submitButtonSettings["textFontSize"] as? Int {
                buttonCustomization.font = UIFont.systemFont(ofSize: CGFloat(textFontSize))
            }
            if let textColor = submitButtonSettings["textColor"] as? String {
                buttonCustomization.textColor = UIColor(hexString: textColor)
            }

            uiCustomization.setButtonCustomization(buttonCustomization, for: STPThreeDSCustomizationButtonType.next)
        }

        if let submitButtonSettings = params["resendButton"] as? Dictionary<String, Any?> {
            let buttonCustomization = uiCustomization.buttonCustomization(for: STPThreeDSCustomizationButtonType.resend)

            if let backgroundColor = submitButtonSettings["backgroundColor"] as? String {
                buttonCustomization.backgroundColor = UIColor(hexString: backgroundColor)
            }
            if let borderRadius = submitButtonSettings["borderRadius"] as? Int {
                buttonCustomization.cornerRadius = CGFloat(borderRadius)
            }
            if let textFontSize = submitButtonSettings["textFontSize"] as? Int {
                buttonCustomization.font = UIFont.systemFont(ofSize: CGFloat(textFontSize))
            }
            if let textColor = submitButtonSettings["textColor"] as? String {
                buttonCustomization.textColor = UIColor(hexString: textColor)
            }

            uiCustomization.setButtonCustomization(buttonCustomization, for: STPThreeDSCustomizationButtonType.resend)
        }

        if let backgroundColor = params["backgroundColor"] as? String {
            uiCustomization.backgroundColor = UIColor(hexString: backgroundColor)
        }


        return uiCustomization
    }

    class func convertDateToUnixTimestampMilliseconds(date: Date?) -> String? {
        if let date = date {
            let value = date.timeIntervalSince1970 * 1000.0
            return String(format: "%.0f", value)
        }
        return nil
    }

    class func convertDateToUnixTimestampSeconds(date: Date?) -> String? {
        if let date = date {
            let value = date.timeIntervalSince1970
            return String(format: "%.0f", value)
        }
        return nil
    }

    class func mapFromCardValidationState(state: STPCardValidationState?) -> String {
        if let state = state {
            switch state {
            case STPCardValidationState.valid: return "Valid"
            case STPCardValidationState.invalid: return "Invalid"
            case STPCardValidationState.incomplete: return "Incomplete"
            default: return "Unknown"
            }
        }
        return "Unknown"
    }

    class func mapToPKAddPassButtonStyle(style: String?) -> PKAddPassButtonStyle {
        if let style = style {
            if (style == "onDarkBackground") {
                return .blackOutline
            }
        }
        return .black
    }

    class func mapFromUSBankAccountHolderType(type: STPPaymentMethodUSBankAccountHolderType?) -> String {
        if let type = type {
            switch type {
                case STPPaymentMethodUSBankAccountHolderType.company: return "Company"
                case STPPaymentMethodUSBankAccountHolderType.individual: return "Individual"
                case STPPaymentMethodUSBankAccountHolderType.unknown: return "Unknown"
            }
        }
        return "Unknown"
    }

    class func mapToUSBankAccountHolderType(type: String?) -> STPPaymentMethodUSBankAccountHolderType {
        switch type {
            case "Company": return STPPaymentMethodUSBankAccountHolderType.company
            case "Individual": return STPPaymentMethodUSBankAccountHolderType.individual
            default: return STPPaymentMethodUSBankAccountHolderType.individual
        }
    }

    class func mapFromUSBankAccountType(type: STPPaymentMethodUSBankAccountType?) -> String {
        if let type = type {
            switch type {
                case STPPaymentMethodUSBankAccountType.savings: return "Savings"
                case STPPaymentMethodUSBankAccountType.checking: return "Checking"
                case STPPaymentMethodUSBankAccountType.unknown: return "Unknown"
            }
        }
        return "Unknown"
    }

    class func mapToUSBankAccountType(type: String?) -> STPPaymentMethodUSBankAccountType {
        switch type {
            case "Savings": return STPPaymentMethodUSBankAccountType.savings
            case "Checking": return STPPaymentMethodUSBankAccountType.checking
            default: return STPPaymentMethodUSBankAccountType.checking
        }
    }

    class func intToCardBrand(int: Int) -> STPCardBrand? {
        switch int {
        case 0:
            return STPCardBrand.JCB
        case 1:
            return STPCardBrand.amex
        case 2:
            return STPCardBrand.cartesBancaires
        case 3:
            return STPCardBrand.dinersClub
        case 4:
            return STPCardBrand.discover
        case 5:
            return STPCardBrand.mastercard
        case 6:
            return STPCardBrand.unionPay
        case 7:
            return STPCardBrand.visa
        case 8:
            return STPCardBrand.unknown
        default:
            return nil
        }
    }

    class func financialConnectionsEventToMap(_ event: FinancialConnectionsEvent) -> [String: Any] {
      var metadata: [String: Any] = [:]

      if let manualEntry = event.metadata.manualEntry {
        metadata["manualEntry"] = manualEntry
      }

      if let institutionName = event.metadata.institutionName {
        metadata["institutionName"] = institutionName
      }

      if let errorCode = event.metadata.errorCode {
        metadata["errorCode"] = errorCode.rawValue
      }

      let mappedEvent: [String: Any] = [
        "name": event.name.rawValue,
        "metadata": metadata
      ]

      return mappedEvent
    }
}
