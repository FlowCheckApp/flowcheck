import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        self.window = windowScene.windows.first
    }

    func sceneDidEnterBackground(_ scene: UIScene) {
        evaluateLifecycleJavaScript("""
        (function() {
            try {
                localStorage.setItem('fc-pending-lock', '1');
                window.dispatchEvent(new CustomEvent('fc-native-background'));
                return true;
            } catch (e) {
                return false;
            }
        })();
        """)
    }

    func sceneWillEnterForeground(_ scene: UIScene) {}

    func sceneDidBecomeActive(_ scene: UIScene) {
        evaluateLifecycleJavaScript("""
        (function() {
            try {
                window.dispatchEvent(new CustomEvent('fc-native-active'));
                return true;
            } catch (e) {
                return false;
            }
        })();
        """)
    }

    private func evaluateLifecycleJavaScript(_ script: String) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) { [weak self] in
            guard let webView = self?.findBridgeViewController()?.bridge?.webView else {
                return
            }
            webView.evaluateJavaScript(script, completionHandler: nil)
        }
    }

    private func findBridgeViewController() -> CAPBridgeViewController? {
        let scenes = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }
        let candidateWindows = scenes.flatMap { $0.windows } + (window != nil ? [window!] : [])
        for candidate in candidateWindows {
            if let bridge = findBridgeViewController(from: candidate.rootViewController) {
                return bridge
            }
        }
        return nil
    }

    private func findBridgeViewController(from controller: UIViewController?) -> CAPBridgeViewController? {
        if let bridge = controller as? CAPBridgeViewController {
            return bridge
        }
        if let nav = controller as? UINavigationController {
            return findBridgeViewController(from: nav.visibleViewController)
        }
        if let tab = controller as? UITabBarController {
            return findBridgeViewController(from: tab.selectedViewController)
        }
        if let presented = controller?.presentedViewController {
            return findBridgeViewController(from: presented)
        }
        for child in controller?.children ?? [] {
            if let bridge = findBridgeViewController(from: child) {
                return bridge
            }
        }
        return nil
    }
}
