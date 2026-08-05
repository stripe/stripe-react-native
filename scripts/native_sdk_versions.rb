require 'json'
require 'net/http'
require 'uri'

class NativeSdkVersions
  class Error < StandardError; end

  Change = Struct.new(:name, :path, :previous_version, :version, :changed, keyword_init: true)

  SDK_CONFIG = {
    ios: {
      name: 'stripe-ios',
      repo: 'stripe/stripe-ios',
      path: 'stripe-react-native.podspec',
      pattern: /^stripe_version = '([^']+)'$/,
      replacement: ->(version) { "stripe_version = '#{version}'" },
    },
    android: {
      name: 'stripe-android',
      repo: 'stripe/stripe-android',
      path: 'android/gradle.properties',
      pattern: /^StripeSdk_stripeVersion=(\S+)$/,
      replacement: ->(version) { "StripeSdk_stripeVersion=#{version}" },
    },
  }.freeze

  VERSION_PATTERN = /\A\d+\.\d+\.\d+\z/

  def initialize(root: Dir.pwd, token: ENV['GITHUB_TOKEN'] || ENV['GH_TOKEN'], http_get: nil)
    @root = root
    @token = token
    @http_get = http_get || method(:get)
  end

  def latest
    SDK_CONFIG.to_h do |key, config|
      [key, latest_for(config)]
    end
  end

  def apply(versions)
    plans = SDK_CONFIG.map do |key, config|
      version = versions.fetch(key)
      validate_version!(version, config[:name])

      path = File.join(@root, config[:path])
      contents = File.read(path)
      matches = contents.scan(config[:pattern])
      unless matches.length == 1
        raise Error, "Expected exactly one #{config[:name]} version in #{config[:path]}"
      end

      previous_version = matches.first.first
      updated_contents = contents.sub(config[:pattern], config[:replacement].call(version))
      change = Change.new(
        name: config[:name],
        path: config[:path],
        previous_version: previous_version,
        version: version,
        changed: previous_version != version,
      )
      [path, updated_contents, change]
    end

    plans.each do |path, updated_contents, change|
      File.write(path, updated_contents) if change.changed
    end

    plans.map(&:last)
  rescue KeyError => e
    raise Error, "Missing native SDK version: #{e.message}"
  end

  private

  def latest_for(config)
    uri = URI("https://api.github.com/repos/#{config[:repo]}/releases/latest")
    response = @http_get.call(uri, request_headers)
    unless response.code.to_i == 200
      raise Error, "GitHub returned HTTP #{response.code} for #{config[:repo]} releases/latest"
    end

    tag = JSON.parse(response.body).fetch('tag_name')
    unless tag.is_a?(String)
      raise Error, "Invalid GitHub release response for #{config[:repo]}: tag_name must be a string"
    end

    version = tag.delete_prefix('v')
    validate_version!(version, config[:name])
    version
  rescue JSON::ParserError, KeyError => e
    raise Error, "Invalid GitHub release response for #{config[:repo]}: #{e.message}"
  end

  def request_headers
    headers = {
      'Accept' => 'application/vnd.github+json',
      'User-Agent' => 'stripe-react-native-release-proposer',
      'X-GitHub-Api-Version' => '2022-11-28',
    }
    headers['Authorization'] = "Bearer #{@token}" unless @token.nil? || @token.empty?
    headers
  end

  def get(uri, headers)
    request = Net::HTTP::Get.new(uri)
    headers.each { |name, value| request[name] = value }
    Net::HTTP.start(uri.host, uri.port, use_ssl: uri.scheme == 'https') do |http|
      http.request(request)
    end
  rescue SocketError, SystemCallError, Timeout::Error => e
    raise Error, "Could not reach GitHub Releases: #{e.message}"
  end

  def validate_version!(version, name)
    return if version.is_a?(String) && version.match?(VERSION_PATTERN)

    raise Error, "Invalid #{name} release version: #{version.inspect}"
  end
end
