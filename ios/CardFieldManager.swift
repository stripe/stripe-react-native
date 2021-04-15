import Foundation

@objc(CardFieldManager)
class CardFieldManager: RCTViewManager {
    static let shared = CardFieldManager()
    
    let cardFieldMap: NSMutableDictionary = [:]
    
    public func getCardFieldReference(uuid: String) -> Any? {
        return CardFieldManager.shared.cardFieldMap["uuid"]
    }
    
    override func view() -> UIView! {
        return CardFieldView()
    }
    
    override class func requiresMainQueueSetup() -> Bool {
        return false
    }
}
