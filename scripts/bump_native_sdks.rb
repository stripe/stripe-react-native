#!/usr/bin/env ruby

require 'optparse'
require 'shellwords'
require_relative 'helpers'
require_relative 'native_sdk_versions'

class NativeSdkBumper
  def initialize(root: Dir.pwd)
    @root = root
    @updater = NativeSdkVersions.new(root: root)
  end

  def update
    puts "Fetching latest native SDK releases"
    versions = @updater.latest
    changes = @updater.apply(versions)

    changes.each do |change|
      status = change.changed ? "#{change.previous_version} -> #{change.version}" : "already at #{change.version}"
      puts "#{change.name}: #{status}"
    end

    [changes, versions]
  rescue NativeSdkVersions::Error => e
    abort "Error! #{e.message}"
  end
end

def create_pr(changes, versions)
  changed = changes.select(&:changed)
  if changed.empty?
    puts "Native SDK versions are already up to date; no PR needed."
    return
  end

  branch = "chore/bump-native-sdks"
  branch += "-ios-#{versions.fetch(:ios)}" if changes.find { |change| change.name == 'stripe-ios' && change.changed }
  branch += "-android-#{versions.fetch(:android)}" if changes.find { |change| change.name == 'stripe-android' && change.changed }

  existing_pr = `gh pr list --state open --head #{branch.shellescape} --json number --jq '.[0].number'`.strip
  abort "A PR is already open for #{branch} (##{existing_pr})." unless existing_pr.empty?

  execute_or_fail("git checkout -b #{branch.shellescape}")

  ios_changed = changed.any? { |change| change.name == 'stripe-ios' }
  execute_or_fail("yarn update-pods") if ios_changed

  files = changed.map(&:path)
  files << 'example/ios/Podfile.lock' if ios_changed
  execute_or_fail("git add #{files.map(&:shellescape).join(' ')}")

  title_parts = changed.map { |change| "#{change.name} #{change.version}" }
  title = "chore: bump #{title_parts.join(', ')}"
  body = changed.map do |change|
    release_tag = change.name == 'stripe-ios' ? change.version : "v#{change.version}"
    "- `#{change.path}`: `#{change.previous_version}` -> `#{change.version}` (https://github.com/stripe/#{change.name}/releases/tag/#{release_tag})"
  end.join("\n")
  body += "\n\n_Automated by [`bump_native_sdks.rb`](scripts/bump_native_sdks.rb)_"

  execute_or_fail("git commit -m #{title.shellescape}")
  execute_or_fail("git push -u origin #{branch.shellescape}")
  execute_or_fail("gh pr create --repo stripe/stripe-react-native --base master --head #{branch.shellescape} --title #{title.shellescape} --body #{body.shellescape}")
end

if __FILE__ == $PROGRAM_NAME
  create_pr_mode = false
  OptionParser.new do |opts|
    opts.banner = <<~BANNER
      USAGE:
          ./scripts/bump_native_sdks.rb [--create-pr]

      Updates the stripe-ios and stripe-android pins to their latest GitHub
      releases. With --create-pr, creates a branch, commits the changes, pushes
      it, and opens a pull request.
    BANNER

    opts.on('--create-pr', 'Create and push a native SDK version bump PR') { create_pr_mode = true }
    opts.on('-h', '--help', 'Show this help message') { puts opts; exit }
  end.parse!

  Dir.chdir(`git rev-parse --show-toplevel`.strip)

  bumper = NativeSdkBumper.new
  changes, versions = bumper.update
  create_pr(changes, versions) if create_pr_mode
end
