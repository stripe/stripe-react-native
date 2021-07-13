import Foundation

@objc(CardFormManager)
class CardFormManager: RCTViewManager, CardFieldDelegate {
    public let cardFormMap: NSMutableDictionary = [:]
    
    func onDidCreateViewInstance(id: String, reference: Any?) -> Void {
        cardFormMap[id] = reference
    }
    
    func onDidDestroyViewInstance(id: String) {
        cardFormMap[id] = nil
    }
    
    public func getReference(id: String) -> Any? {
        return self.cardFormMap[id]
    }
    
    override func view() -> UIView! {
        return CardFormView(delegate: self)
    }
    
    override class func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc func focus(_ reactTag: NSNumber) {
        self.bridge!.uiManager.addUIBlock { (_: RCTUIManager?, viewRegistry: [NSNumber: UIView]?) in
            let view: CardFormView = (viewRegistry![reactTag] as? CardFormView)!
            view.focus()
        }
    }
    
    @objc func blur(_ reactTag: NSNumber) {
        self.bridge!.uiManager.addUIBlock { (_: RCTUIManager?, viewRegistry: [NSNumber: UIView]?) in
            let view: CardFormView = (viewRegistry![reactTag] as? CardFormView)!
            view.blur()
        }
    }
}
