require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
# Keep stripe_version in sync with https://github.com/stripe/stripe-identity-react-native/blob/main/stripe-identity-react-native.podspec
stripe_version = '~> 24.19.0'

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

  s.source_files = 'ios/**/*.{h,m,mm,swift}'
  s.exclude_files = [ 'ios/Tests/', 'ios/NewArch/' ]
  # These headers contain c++ code so make sure they are private to avoid
  # being exported to the umbrella header, which is used by swift interop.
  # StripeSwiftInterop.h will cause circular dependency issues.
  s.private_header_files = [ 'ios/StripeSdk.h', 'ios/StripeSwiftInterop.h' ]

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

  s.dependency 'React-Core'
  s.dependency 'Stripe', stripe_version
  s.dependency 'StripePaymentSheet', stripe_version
  s.dependency 'StripePayments', stripe_version
  s.dependency 'StripePaymentsUI', stripe_version
  s.dependency 'StripeApplePay', stripe_version
  s.dependency 'StripeFinancialConnections', stripe_version

  if fabric_enabled
    install_modules_dependencies(s)

    s.subspec "NewArch" do |ss|
      ss.source_files = "ios/NewArch/**/*.{h,m,mm}"
      # These headers contain c++ code so make sure they are private to avoid
      # being exported to the umbrella header, which is used by swift interop.
      ss.private_header_files = '**/*.h'
    end
  end
end
