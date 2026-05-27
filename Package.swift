// swift-tools-version:5.9
import Foundation
import PackageDescription

let stripeVersion = Version(25, 15, 0)
let stripeBranch = ProcessInfo.processInfo.environment["OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH"]
let stripeURL = "https://github.com/stripe/stripe-ios-spm.git"
let stripeDependency: Package.Dependency
if let stripeBranch, !stripeBranch.isEmpty {
    stripeDependency = .package(
        url: stripeURL,
        branch: stripeBranch
    )
} else {
    stripeDependency = .package(
        url: stripeURL,
        stripeVersion..<Version(25, 16, 0)
    )
}

let packageRoot = URL(fileURLWithPath: #filePath).deletingLastPathComponent()

func sourceFiles(
    in directory: String,
    extensions: Set<String>,
    excluding excludedPaths: Set<String> = []
) -> [String] {
    let directoryURL = packageRoot.appendingPathComponent(directory)
    guard let enumerator = FileManager.default.enumerator(
        at: directoryURL,
        includingPropertiesForKeys: [.isRegularFileKey],
        options: [.skipsHiddenFiles]
    ) else {
        return []
    }

    return enumerator.compactMap { entry -> String? in
        guard let fileURL = entry as? URL,
              extensions.contains(fileURL.pathExtension)
        else {
            return nil
        }

        let relativePath = fileURL.path
            .replacingOccurrences(of: directoryURL.path + "/", with: "")
        let isExcluded = excludedPaths.contains { excludedPath in
            relativePath == excludedPath || relativePath.hasPrefix("\(excludedPath)/")
        }

        return isExcluded ? nil : relativePath
    }.sorted()
}

let reactNativeDependencies: [Target.Dependency] = [
    .byName(name: "React"),
    .byName(name: "React-Core"),
    .byName(name: "rnstripe"),
]

let stripeDependencies: [Target.Dependency] = [
    .product(name: "Stripe", package: "stripe-ios-spm"),
    .product(name: "StripeApplePay", package: "stripe-ios-spm"),
    .product(name: "StripeCore", package: "stripe-ios-spm"),
    .product(name: "StripeFinancialConnections", package: "stripe-ios-spm"),
    .product(name: "StripePaymentSheet", package: "stripe-ios-spm"),
    .product(name: "StripePayments", package: "stripe-ios-spm"),
    .product(name: "StripePaymentsUI", package: "stripe-ios-spm"),
    .product(name: "StripeCryptoOnramp", package: "stripe-ios-spm"),
]

let commonCSettings: [CSetting] = [
    .define("RCT_NEW_ARCH_ENABLED"),
    .headerSearchPath("."),
    .headerSearchPath("NewArch"),
    .headerSearchPath("OldArch"),
]

let package = Package(
    name: "stripe-react-native",
    platforms: [
        .iOS(.v13),
    ],
    products: [
        .library(
            name: "StripeReactNative",
            targets: ["StripeReactNativeBridge"]
        ),
        .library(
            name: "StripeReactNativeOnramp",
            targets: ["StripeReactNativeOnrampBridge"]
        ),
    ],
    dependencies: [
        stripeDependency,
    ],
    targets: [
        .target(
            name: "StripeReactNativeCore",
            dependencies: reactNativeDependencies + stripeDependencies,
            path: "ios",
            sources: sourceFiles(
                in: "ios",
                extensions: ["swift"],
                excluding: ["Tests"]
            ),
            swiftSettings: [
                .define("RCT_NEW_ARCH_ENABLED"),
            ]
        ),
        .target(
            name: "StripeReactNativeBridge",
            dependencies: [
                "StripeReactNativeCore",
            ] + reactNativeDependencies,
            path: "ios",
            sources: sourceFiles(
                in: "ios",
                extensions: ["m", "mm"],
                excluding: ["StripeOnrampSdk.mm"]
            ),
            publicHeadersPath: ".",
            cSettings: commonCSettings,
            cxxSettings: [
                .define("RCT_NEW_ARCH_ENABLED"),
            ]
        ),
        .target(
            name: "StripeReactNativeOnrampBridge",
            dependencies: [
                "StripeReactNativeCore",
                "StripeReactNativeBridge",
            ] + reactNativeDependencies,
            path: "ios",
            sources: [
                "StripeOnrampSdk.mm",
            ],
            publicHeadersPath: ".",
            cSettings: commonCSettings,
            cxxSettings: [
                .define("RCT_NEW_ARCH_ENABLED"),
            ]
        ),
        .testTarget(
            name: "StripeReactNativeTests",
            dependencies: [
                "StripeReactNativeCore",
            ],
            path: "ios/Tests",
            sources: sourceFiles(in: "ios/Tests", extensions: ["swift"]),
            swiftSettings: [
                .define("RCT_NEW_ARCH_ENABLED"),
            ]
        ),
    ]
)
