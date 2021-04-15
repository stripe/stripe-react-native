import Foundation

protocol CardFieldDelegate {
    func onDidCreateViewInstance(uuid: String, reference: Any?) -> Void
    func onDidDestroyViewInstance(uuid: String) -> Void
}
