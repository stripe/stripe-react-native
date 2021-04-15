import Foundation

@objc(CardFieldManager)
class CardFieldManager: RCTViewManager, CardFieldDelegate {
    func onDidCreateViewInstance(uuid: String, reference: Any?) {
        cardFieldMap[uuid] = reference
    }
    
    func onDidDestroyViewInstance(uuid: String) {
        cardFieldMap[uuid] = nil
    }
    
    public let cardFieldMap: NSMutableDictionary = [:]
    
    public func getCardFieldReference(uuid: String) -> Any? {
        return self.cardFieldMap[uuid]
    }
    
    override func view() -> UIView! {
        return CardFieldView(delegate: self)
    }
    
    override class func requiresMainQueueSetup() -> Bool {
        return false
    }
}
