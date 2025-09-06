require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
# Keep stripe_version in sync with https://github.com/stripe/stripe-identity-react-native/blob/main/stripe-identity-react-native.podspec
stripe_version = '~> 24.23.0'

rct_new_arch = ENV['RCT_NEW_ARCH_ENABLED']
fabric_enabled = false

# Method 1: Check RCT_NEW_ARCH_ENABLED (traditional React Native)
if !rct_new_arch.nil?
  fabric_enabled = rct_new_arch == '1'
else
  # Method 2: Check for Expo's Podfile.properties.json
  # Navigate up from node_modules/@stripe/stripe-react-native to the app root
  app_root = File.expand_path('../../..', __dir__)
  podfile_properties_path = File.join(app_root, 'ios', 'Podfile.properties.json')
  if File.exist?(podfile_properties_path)
    begin
      podfile_properties = JSON.parse(File.read(podfile_properties_path))
      if podfile_properties.key?('newArchEnabled')
        fabric_enabled = podfile_properties['newArchEnabled'] == true || podfile_properties['newArchEnabled'] == 'true'
      end
    rescue JSON::ParserError
      # Ignore parsing errors and keep fabric_enabled as false
      fabric_enabled = false
    end
  end
end

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
    'GCC_PREPROCESSOR_DEFINITIONS' => fabric_enabled ? 'RCT_NEW_ARCH_ENABLED=1' : ''
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
    core.dependency 'React-Core'
    core.dependency 'Stripe', stripe_version
    core.dependency 'StripePaymentSheet', stripe_version
    core.dependency 'StripePayments', stripe_version
    core.dependency 'StripePaymentsUI', stripe_version
    core.dependency 'StripeApplePay', stripe_version
    core.dependency 'StripeFinancialConnections', stripe_version
  end

  s.subspec 'Onramp' do |onramp|
    onramp.dependency 'stripe-react-native/Core'
    onramp.dependency 'StripeCryptoOnramp', stripe_version
  end

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
