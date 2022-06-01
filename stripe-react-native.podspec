require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
stripe_version = '~> 22.4.0'

Pod::Spec.new do |s|
  s.name         = 'stripe-react-native'
  s.version      = package['version']
  s.summary      = package['description']
  s.homepage     = package['homepage']
  s.license      = package['license']
  s.authors      = package['author']

  s.platforms    = { ios: '12.0' }
  s.source       = { git: 'https://github.com/stripe/stripe-react-native.git', tag: s.version.to_s }

  s.source_files = 'ios/**/*.{h,m,mm,swift}'

  s.dependency 'React-Core'
  s.dependency 'Stripe', stripe_version
  s.dependency 'StripeFinancialConnections', stripe_version
end
