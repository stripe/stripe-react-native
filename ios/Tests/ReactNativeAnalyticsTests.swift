@testable import stripe_react_native
@_spi(ReactNativeSDK) import StripeCore
import XCTest

class ReactNativeAnalyticsTests: XCTestCase {

    func test_pluginDetection_reactNativeBridgeExists() {
        // Tests the assumption in StripeCore's PluginDetector.swift that
        // NSClassFromString("RCTBridge") != nil in a React Native environment.
        XCTAssertNotNil(NSClassFromString("RCTBridge"))
    }

    func test_isNewArchitecture_matchesBuildConfig() {
        #if RCT_NEW_ARCH_ENABLED
        XCTAssertTrue(StripeSdkImpl.isNewArchitecture)
        #else
        XCTAssertFalse(StripeSdkImpl.isNewArchitecture)
        #endif
    }

    func test_reactNativeVersion_isValid() {
        let version = StripeSdkImpl.reactNativeVersion
        XCTAssertFalse(version.isEmpty)
        // Should be a semver-like string (e.g. "0.76.0")
        let components = version.split(separator: ".")
        XCTAssertEqual(components.count, 3, "Expected semver format major.minor.patch, got: \(version)")
    }

    func test_reactNativeAnalytics_propertiesAreSet() {
        // Simulate what initialise() does
        ReactNativeAnalytics.isNewArchitecture = StripeSdkImpl.isNewArchitecture
        ReactNativeAnalytics.reactNativeVersion = StripeSdkImpl.reactNativeVersion

        XCTAssertNotNil(ReactNativeAnalytics.isNewArchitecture)
        XCTAssertNotNil(ReactNativeAnalytics.reactNativeVersion)
        XCTAssertEqual(ReactNativeAnalytics.isNewArchitecture, StripeSdkImpl.isNewArchitecture)
        XCTAssertEqual(ReactNativeAnalytics.reactNativeVersion, StripeSdkImpl.reactNativeVersion)
    }
}
