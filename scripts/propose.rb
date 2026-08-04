#!/usr/bin/env ruby

require 'optparse'
require 'date'
require 'tmpdir'
require 'shellwords'
require_relative 'helpers'

@release_type = nil
@headless = false

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

def proposal_branch(version)
  "release/propose-#{version}"
end

def proposal_pr_title(version)
  "Propose #{version}"
end

def proposal_pr_body
  <<~BODY
    - [x] Ensure the CHANGELOG is up to date with all relevant commits since the last release
    - [x] Add the version number for this release & the date to the CHANGELOG, underneath "## Unreleased"
      - e.g. "## 1.2.3 - 2022-02-14"
    - [x] Update the README if necessary (this is only required when there are breaking changes in the release, such as dropping support for an iOS || Android version)
  BODY
end

def proposal_pr_url(branch)
  "https://github.com/stripe/stripe-react-native/compare/#{branch}?expand=1"
end

def print_headless_summary(version, branch)
  puts ""
  puts "Headless proposal branch pushed."
  puts ""
  puts "PR title:"
  puts proposal_pr_title(version)
  puts ""
  puts "PR body:"
  puts proposal_pr_body
  puts "Create PR:"
  puts proposal_pr_url(branch)
end

def create_proposal_branch(version, headless:)
  branch = proposal_branch(version)
  if headless
    execute_or_fail("git checkout -B #{branch}")
  else
    execute_or_fail("git checkout -b #{branch}")
  end

  bump_version(version)
  update_changelog(version)

  execute_or_fail("git add package.json CHANGELOG.md")
  execute_or_fail("git commit -m #{proposal_pr_title(version).shellescape}")

  if headless
    execute_or_fail("git push --force-with-lease -u origin #{branch}")
    print_headless_summary(version, branch)
  else
    execute_or_fail("git push -u origin #{branch}")
  end

  branch
end

def create_proposal_pr(version)
  branch = create_proposal_branch(version, headless: false)
  pr_message_file = File.join(Dir.tmpdir, "propose-#{version}-pr-body.md")
  File.write(pr_message_file, proposal_pr_body)

  puts ""
  pr_url = `GH_HOST=github.com gh pr create --repo stripe/stripe-react-native --base master --head #{branch} --title #{proposal_pr_title(version).shellescape} --body-file #{pr_message_file.shellescape}`.strip
  File.delete(pr_message_file) if File.exist?(pr_message_file)

  if $?.success?
    puts "Proposal PR created: #{pr_url}"
    system("open", pr_url)
  else
    rputs "Could not create PR via gh. Create it manually:"
    puts "  #{proposal_pr_url(branch)}"
    system("open", proposal_pr_url(branch))
  end
end

OptionParser.new do |opts|
  opts.banner = <<~BANNER
    USAGE:
        ./scripts/propose.rb [--headless] <release_type>

    Creates a proposal PR for the next release. Replaces the '## Unreleased'
    header in CHANGELOG.md with the new version and today's date, then opens a PR.
    In headless mode, creates and pushes the proposal branch, then prints PR
    details without creating a PR, opening a browser, or requiring gh auth.

    ARGS:
        <release_type>    "patch", "minor", or "major"
  BANNER

  opts.on("--headless", "Create and push the proposal branch, then print PR details without using gh") do
    @headless = true
  end

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

preflight_checks(require_gh: !@headless)

version = next_version
puts "Proposing #{version} (currently #{current_version})"
if @headless
  create_proposal_branch(version, headless: true)
else
  create_proposal_pr(version)
end
