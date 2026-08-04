#!/usr/bin/env ruby

require 'optparse'
require 'date'
require 'tmpdir'
require 'shellwords'
require_relative 'helpers'
require_relative 'native_sdk_versions'

@release_type = nil

VALID_RELEASE_TYPES = %w[patch minor major].freeze

def next_version
  parts = current_version.split(".").map(&:to_i)
  case @release_type
  when "major"
    parts[0] += 1
    parts[1] = 0
    parts[2] = 0
  when "minor"
    parts[1] += 1
    parts[2] = 0
  when "patch"
    parts[2] += 1
  end
  parts.join(".")
end

def update_changelog(version)
  changelog = File.read("CHANGELOG.md")
  header = "## #{version} - #{Date.today}"

  unless changelog.include?("## Unreleased")
    abort "Error! CHANGELOG.md is missing an '## Unreleased' section"
  end

  File.write("CHANGELOG.md", changelog.sub("## Unreleased", header))
end

def bump_version(version)
  execute_or_fail("yarn version --no-git-tag-version --new-version #{version}")
end

def create_proposal_pr(version, native_sdk_updater, native_sdk_versions)
  branch = "release/propose-#{version}"
  execute_or_fail("git checkout -b #{branch}")

  bump_version(version)
  update_changelog(version)
  begin
    native_sdk_changes = native_sdk_updater.apply(native_sdk_versions)
  rescue NativeSdkVersions::Error => e
    abort "Error! #{e.message}"
  end
  native_sdk_changes.each do |change|
    status = change.changed ? "#{change.previous_version} -> #{change.version}" : "already at #{change.version}"
    puts "#{change.name}: #{status}"
  end

  ios_changed = native_sdk_changes.any? { |change| change.name == 'stripe-ios' && change.changed }
  execute_or_fail("yarn update-pods") if ios_changed

  files_to_add = ['package.json', 'CHANGELOG.md']
  files_to_add.concat(native_sdk_changes.select(&:changed).map(&:path))
  files_to_add << 'example/ios/Podfile.lock' if ios_changed
  execute_or_fail("git add #{files_to_add.map(&:shellescape).join(' ')}")
  execute_or_fail("git commit -m 'Propose #{version}'")
  execute_or_fail("git push -u origin #{branch}")

  pr_message_file = File.join(Dir.tmpdir, "propose-#{version}-pr-body.md")
  File.write(pr_message_file, <<~BODY)
    - [x] Ensure the CHANGELOG is up to date with all relevant commits since the last release
    - [x] Add the version number for this release & the date to the CHANGELOG, underneath "## Unreleased"
      - e.g. "## 1.2.3 - 2022-02-14"
    - [x] Update stripe-ios to the latest GitHub release (#{native_sdk_versions.fetch(:ios)})
    - [x] Update stripe-android to the latest GitHub release (#{native_sdk_versions.fetch(:android)})
    - [x] Update the README if necessary (this is only required when there are breaking changes in the release, such as dropping support for an iOS || Android version)
  BODY

  puts ""
  pr_url = `GH_HOST=github.com gh pr create --repo stripe/stripe-react-native --base master --head #{branch} --title "Propose #{version}" --body-file #{pr_message_file.shellescape}`.strip
  File.delete(pr_message_file) if File.exist?(pr_message_file)

  if $?.success?
    puts "Proposal PR created: #{pr_url}"
    system("open", pr_url)
  else
    rputs "Could not create PR via gh. Create it manually:"
    url = "https://github.com/stripe/stripe-react-native/compare/#{branch}?expand=1"
    puts "  #{url}"
    system("open", url)
  end
end

OptionParser.new do |opts|
  opts.banner = <<~BANNER
    USAGE:
        ./scripts/propose.rb <release_type>

    Creates a proposal PR for the next release. Replaces the '## Unreleased'
    header in CHANGELOG.md with the new version and today's date, updates the
    native SDK pins to the latest GitHub releases, then opens a PR.

    ARGS:
        <release_type>    "patch", "minor", or "major"
  BANNER

  opts.on("-h", "--help", "Show this help message") do
    puts opts
    exit
  end
end.parse!

@release_type = ARGV.shift

if @release_type.nil?
  abort "Error! Missing release type. Must be one of: #{VALID_RELEASE_TYPES.join(', ')}"
end

unless VALID_RELEASE_TYPES.include?(@release_type)
  abort "Error! Invalid release type '#{@release_type}'. Must be one of: #{VALID_RELEASE_TYPES.join(', ')}"
end

Dir.chdir(`git rev-parse --show-toplevel`.strip)

preflight_checks

version = next_version
puts "Proposing #{version} (currently #{current_version})"
native_sdk_updater = NativeSdkVersions.new
puts "Fetching latest native SDK releases"
begin
  native_sdk_versions = native_sdk_updater.latest
rescue NativeSdkVersions::Error => e
  abort "Error! #{e.message}"
end
create_proposal_pr(version, native_sdk_updater, native_sdk_versions)
