require 'json'
require_relative 'stripe_spm'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
# Keep stripe_version in sync with https://github.com/stripe/stripe-identity-react-native/blob/main/stripe-identity-react-native.podspec
stripe_version = '26.9.0'

fabric_enabled = ENV['RCT_NEW_ARCH_ENABLED'] == '1'

Pod::Spec.new do |s|
  s.name         = 'stripe-react-native'
  s.version      = package['version']
  s.summary      = package['description']
  s.homepage     = package['homepage']
  s.license      = package['license']
  s.authors      = package['author']

  s.platforms    = { ios: '13.0' }
  s.source       = { git: 'https://github.com/stripe/stripe-react-native.git', tag: s.version.to_s }

  # On React Native >= 0.75 the Stripe iOS SDK is resolved through Swift
  # Package Manager (the Stripe iOS SDK is deprecating CocoaPods support);
  # older React Native versions and apps that set `$StripeDisableSPM = true`
  # fall back to the CocoaPods registry via the `unless stripe_spm_enabled?`
  # dependency blocks below. stripe_spm.rb documents the full mechanism.
  # `stripe_version` pins both paths to the same stripe-ios release.
  stripe_spm_activate!(s, version: stripe_version) if stripe_spm_enabled?

  s.header_dir = 'stripe_react_native'
  s.pod_target_xcconfig = {
    'USE_HEADERMAP' => 'YES',
    'DEFINES_MODULE' => 'YES',
    'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
    'SWIFT_COMPILATION_MODE' => 'wholemodule',
  }

  s.test_spec 'Tests' do |test_spec|
    test_spec.platforms    = { ios: '15.1' }
    test_spec.source_files = 'ios/Tests/**/*.{m,swift}'
  end

  if fabric_enabled
    s.default_subspecs = 'Core', 'NewArch'
  else
    s.default_subspecs = 'Core'
  end

  s.subspec 'Core' do |core|
    core.source_files = 'ios/**/*.{h,m,mm,swift}'
    core.exclude_files = [ 'ios/Tests/', 'ios/NewArch/', 'ios/StripeOnrampSdk.h', 'ios/StripeOnrampSdk.mm', 'ios/OnrampErrors.swift' ]
    # These headers contain c++ code so make sure they are private to avoid
    # being exported to the umbrella header, which is used by swift interop.
    # StripeSwiftInterop.h will cause circular dependency issues.
    core.private_header_files = [ 'ios/StripeSdk.h', 'ios/StripeSwiftInterop.h' ]
    core.dependency 'React-Core'
    unless stripe_spm_enabled?
      # CocoaPods fallback for React Native < 0.75 and $StripeDisableSPM users.
      # Keep in sync with StripeSPM::CORE_PRODUCTS in stripe_spm.rb — these are
      # two spellings of the same dependency set.
      core.dependency 'Stripe', stripe_version
      core.dependency 'StripePaymentSheet', stripe_version
      core.dependency 'StripePayments', stripe_version
      core.dependency 'StripePaymentsUI', stripe_version
      core.dependency 'StripeApplePay', stripe_version
      core.dependency 'StripeFinancialConnections', stripe_version
    end
  end

  s.subspec 'Onramp' do |onramp|
    onramp.source_files = [ 'ios/StripeOnrampSdk.h', 'ios/StripeOnrampSdk.mm', 'ios/OnrampErrors.swift' ]
    onramp.dependency 'stripe-react-native/Core'
    unless stripe_spm_enabled?
      # CocoaPods fallback. In SPM mode the StripeCryptoOnramp product is
      # linked at install time by stripe_spm.rb (link_onramp_product), because
      # spm_dependency declarations on subspecs are silently ignored.
      onramp.dependency 'StripeCryptoOnramp', stripe_version
    end
  end

  if fabric_enabled
    install_modules_dependencies(s)

    s.subspec "NewArch" do |ss|
      ss.source_files = "ios/NewArch/**/*.{h,m,mm}"
      # These headers contain c++ code so make sure they are private to avoid
      # being exported to the umbrella header, which is used by swift interop.
      # The pattern must stay scoped to this subspec's own files: CocoaPods
      # globs private_header_files against the entire pod root (for a
      # development pod, the whole repo), and an unscoped '**/*.h' can match
      # dangling header-store symlinks in example/ios/Pods left from a
      # previous install, crashing `pod install` on realpath.
      ss.private_header_files = 'ios/NewArch/**/*.h'
    end
  end
end
