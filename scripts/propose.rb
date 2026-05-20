#!/usr/bin/env ruby

require 'optparse'
require 'date'
require 'tmpdir'
require 'shellwords'
require_relative 'helpers'

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

def create_proposal_pr(version)
  branch = "release/propose-#{version}"
  execute_or_fail("git checkout -b #{branch}")

  bump_version(version)
  update_changelog(version)

  execute_or_fail("git add package.json CHANGELOG.md")
  execute_or_fail("git commit -m 'Propose #{version}'")
  execute_or_fail("git push -u origin #{branch}")

  pr_message_file = File.join(Dir.tmpdir, "propose-#{version}-pr-body.md")
  File.write(pr_message_file, <<~BODY)
    Propose #{version}

    - [x] Ensure the CHANGELOG is up to date with all relevant commits since the last release
    - [x] Add the version number for this release & the date to the CHANGELOG, underneath "## Unreleased"
      - e.g. "## 1.2.3 - 2022-02-14"
    - [x] Update the README if necessary (this is only required when there are breaking changes in the release, such as dropping support for an iOS || Android version)
  BODY

  puts ""
  pr_url = `hub pull-request --base master --head #{branch} -F #{pr_message_file.shellescape}`.strip
  File.delete(pr_message_file) if File.exist?(pr_message_file)

  if $?.success?
    puts "Proposal PR created: #{pr_url}"
    system("open", pr_url)
  else
    rputs "Could not create PR via hub. Create it manually:"
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
    header in CHANGELOG.md with the new version and today's date, then opens a PR.

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
create_proposal_pr(version)
