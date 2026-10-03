require 'fileutils'
require 'minitest/autorun'
require 'tmpdir'
require_relative '../native_sdk_versions'

class NativeSdkVersionsTest < Minitest::Test
  Response = Struct.new(:code, :body)

  def setup
    @root = Dir.mktmpdir
    FileUtils.mkdir_p(File.join(@root, 'android'))
    File.write(File.join(@root, 'stripe-react-native.podspec'), "stripe_version = '26.4.0'\n")
    File.write(File.join(@root, 'android/gradle.properties'), "StripeSdk_stripeVersion=23.13.0\n")
  end

  def teardown
    FileUtils.remove_entry(@root)
  end

  def test_fetches_and_normalizes_latest_release_versions
    requests = []
    responses = {
      '/repos/stripe/stripe-ios/releases/latest' => Response.new('200', '{"tag_name":"26.5.0"}'),
      '/repos/stripe/stripe-android/releases/latest' => Response.new('200', '{"tag_name":"v23.14.0"}'),
    }
    http_get = lambda do |uri, headers|
      requests << [uri, headers]
      responses.fetch(uri.path)
    end

    versions = NativeSdkVersions.new(root: @root, token: 'token', http_get: http_get).latest

    assert_equal({ios: '26.5.0', android: '23.14.0'}, versions)
    assert_equal(2, requests.length)
    assert(requests.all? { |_, headers| headers['Authorization'] == 'Bearer token' })
  end

  def test_rejects_an_invalid_release_tag
    response = Response.new('200', '{"tag_name":"latest"}')
    updater = NativeSdkVersions.new(root: @root, http_get: ->(_, _) { response })

    error = assert_raises(NativeSdkVersions::Error) { updater.latest }

    assert_includes(error.message, 'Invalid stripe-ios release version')
  end

  def test_rejects_a_non_string_release_tag
    response = Response.new('200', '{"tag_name":null}')
    updater = NativeSdkVersions.new(root: @root, http_get: ->(_, _) { response })

    error = assert_raises(NativeSdkVersions::Error) { updater.latest }

    assert_includes(error.message, 'tag_name must be a string')
  end

  def test_applies_both_versions
    changes = NativeSdkVersions.new(root: @root).apply(ios: '26.5.0', android: '23.14.0')

    assert_equal("stripe_version = '26.5.0'\n", File.read(File.join(@root, 'stripe-react-native.podspec')))
    assert_equal("StripeSdk_stripeVersion=23.14.0\n", File.read(File.join(@root, 'android/gradle.properties')))
    assert(changes.all?(&:changed))
  end

  def test_validates_every_file_before_writing
    File.write(File.join(@root, 'android/gradle.properties'), "unrelated=true\n")
    updater = NativeSdkVersions.new(root: @root)

    assert_raises(NativeSdkVersions::Error) do
      updater.apply(ios: '26.5.0', android: '23.14.0')
    end

    assert_equal("stripe_version = '26.4.0'\n", File.read(File.join(@root, 'stripe-react-native.podspec')))
  end

  def test_reports_versions_that_are_already_current_as_unchanged
    updater = NativeSdkVersions.new(root: @root)
    changes = updater.apply(ios: '26.4.0', android: '23.13.0')

    refute(changes.any?(&:changed))
  end
end
