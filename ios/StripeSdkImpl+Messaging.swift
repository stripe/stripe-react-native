
import Foundation
@_spi(PaymentMethodMessagingElementPreview) import StripePaymentSheet

@objc(StripeSdkImpl)
extension StripeSdkImpl {

  // MARK: Public API wrappers

  @objc(createPaymentMethodMessagingElement:configuration:resolve:reject:)
  public func createPaymentMethodMessagingElement(configuration: NSDictionary,
                                           resolve: @escaping RCTPromiseResolveBlock,
                                           reject: @escaping RCTPromiseRejectBlock) {

    guard let configuration = buildPaymentMethodMessagingElementConfiguration(params: configuration).configuration else {
      resolve(Errors.createError(ErrorType.Failed, "Invalid configuration"))
      return
    }

    Task {
      do {
        let paymentMethodMessagingElement = try await PaymentMethodMessagingElement.create(
          intentConfiguration: intentConfig,
          configuration: configuration
        )
        paymentMethodMessagingElement.delegate = messagingInstanceDelegate
        paymentMethodMessagingElement.presentingViewController = RCTPresentedViewController()
        self.messagingInstance = paymentMethodMessagingElement

        // success: resolve promise
        resolve(nil)

        // publish initial state
        messagingInstanceDelegate.messagingElementDidUpdateHeight(messagingElement: paymentMethodMessagingElement)
      } catch {
        // 1) still resolve the promise so JS hook can finish loading
        resolve(nil)

        // 2) emit a loading‐failed event with the error message
        let msg = error.localizedDescription
        //self.emitter?.emitEmbeddedPaymentElementLoadingFailed(["message": msg])
      }
    }

  }

}

// MARK: PaymentMethodMessagingElementDelegate

class StripeSdkPaymentMethodMessagingElementDelegate: PaymentMethodMessagingElementDelegate {
  weak var sdkImpl: StripeSdkImpl?

  init(sdkImpl: StripeSdkImpl) {
    self.sdkImpl = sdkImpl
  }

  func messagingElementDidUpdateHeight(messagingElement: StripePaymentSheet.PaymentMethodMessagingElement) {
    let newHeight = messagingElement.view.systemLayoutSizeFitting(CGSize(width: messagingElement.view.bounds.width, height: UIView.layoutFittingCompressedSize.height)).height
    self.sdkImpl?.emitter?.emitPaymentMethodMessagingElementDidUpdateHeight(["height": newHeight])
  }

  func embeddedPaymentElementWillPresent(embeddedPaymentElement: EmbeddedPaymentElement) {
    self.sdkImpl?.emitter?.emitPaymentMethodMessagingElementWillPresent()
  }
}

// MARK: Config parsing

extension StripeSdkImpl {
  @nonobjc
  internal func buildPaymentMethodMessagingElementConfiguration(
    params: NSDictionary
  ) -> (error: NSDictionary?, configuration: PaymentMethodMessagingElement.Configuration?) {
    var configuration = PaymentMethodMessagingElement.Configuration()

    configuration.amount = params["amount"] as? Int
    configuration.currency = "usd"
    configuration.countryCode = "US"

    return (nil, configuration)
  }

}
