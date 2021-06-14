import Foundation

@objc(CardFieldManager)
class CardFieldManager: RCTViewManager, CardFieldDelegate {
    public let cardFieldMap: NSMutableDictionary = [:]
    
    func onDidCreateViewInstance(id: String, reference: Any?) -> Void {
        cardFieldMap[id] = reference
    }
    
    func onDidDestroyViewInstance(id: String) {
        cardFieldMap[id] = nil
    }
    
    public func getCardFieldReference(id: String) -> Any? {
        return self.cardFieldMap[id]
    }
    
    override func view() -> UIView! {
        // as it's reasonable we handle only one CardField component on the same screen
        if (cardFieldMap[CARD_FIELD_INSTANCE_ID] != nil) {
            // TODO: throw an exception
        }
        return CardFieldView(delegate: self)
    }
    
    
    @objc func focus(_ reactTag: NSNumber) {
        self.bridge!.uiManager.addUIBlock { (_: RCTUIManager?, viewRegistry: [NSNumber: UIView]?) in
            let view: CardFieldView = (viewRegistry![reactTag] as? CardFieldView)!
            view.focus()
        }
    }
    
    @objc func blur(_ reactTag: NSNumber) {
        self.bridge!.uiManager.addUIBlock { (_: RCTUIManager?, viewRegistry: [NSNumber: UIView]?) in
            let view: CardFieldView = (viewRegistry![reactTag] as? CardFieldView)!
            view.blur()
        }
    }
    
    @objc func clear(_ reactTag: NSNumber) {
        self.bridge!.uiManager.addUIBlock { (_: RCTUIManager?, viewRegistry: [NSNumber: UIView]?) in
            let view: CardFieldView = (viewRegistry![reactTag] as? CardFieldView)!
            view.clear()
        }
    }
    
    override class func requiresMainQueueSetup() -> Bool {
        return false
    }
}
