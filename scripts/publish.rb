#!/usr/bin/env ruby

require 'optparse'
require 'open3'

@is_dry_run = false
@release_type = nil
@step_index = 1

VALID_RELEASE_TYPES = %w[patch minor major].freeze

def rputs(string)
  puts "\e[31m#{string}\e[0m"
end

def execute(command)
  puts "Executing: #{command}"
  system(command)
end

def execute_or_fail(command)
  puts "Executing: #{command}"
  system(command) or raise "Failed to execute: #{command}"
end

def git_status
  stdout, _, _ = Open3.capture3("git status")
  stdout
end

def ensure_on_master
  status = git_status
  unless status.include?("On branch master")
    if @is_dry_run
      rputs "Warning: Not on master branch (continuing for dry run)"
    else
      abort "Error! Must be on master branch to publish"
    end
  end
end

def ensure_up_to_date
  status = git_status
  unless status.include?("Your branch is up to date with 'origin/master'.")
    if @is_dry_run
      rputs "Warning: Not up to date with origin/master (continuing for dry run)"
    else
      abort "Error! Must be up to date with origin/master to publish"
    end
  end
end

def ensure_clean_repo
  status = git_status
  unless status.include?("working tree clean")
    if @is_dry_run
      rputs "Warning: Working tree is dirty (continuing for dry run)"
    else
      abort "Error! Cannot publish with dirty working tree"
    end
  end
end

def preflight_checks
  puts "Fetching git remotes"
  execute_or_fail("git fetch")
  ensure_on_master
  ensure_up_to_date
  ensure_clean_repo
end

def install_dependencies
  puts "Installing dependencies according to lockfile"
  execute_or_fail("yarn install --frozen-lockfile")
end

def run_tests
  puts "Running tests"
  execute_or_fail("yarn run test")
end

def bump_version
  @branch_name = "release-branch-#{rand(10000..99999)}"
  execute_or_fail("git checkout -b #{@branch_name}")

  puts "Bumping package.json #{@release_type} version and tagging commit"
  execute_or_fail("yarn version --#{@release_type}")
end

def publish_to_npm
  if @is_dry_run
    puts ""
    puts "[dry-run] Would publish to npm with: npm publish --ignore-scripts --access=public"
    puts "[dry-run] Would push branch '#{@branch_name}' with tags to origin"
    puts "[dry-run] Would create a GitHub release"
    puts ""
    puts "Dry run complete. Cleaning up..."
    execute("git checkout master")
    execute("git branch -D #{@branch_name}")
  else
    puts "Publishing release"
    execute_or_fail("npm publish --ignore-scripts --access=public")
    puts "Published to npm!"

    puts "Pushing git commit and tag"
    execute_or_fail("git push -u origin #{@branch_name} --follow-tags")

    puts ""
    puts "Tag pushed! Please open a PR for your version bump: https://github.com/stripe/stripe-react-native/pulls"
    puts ""
  end
end

def create_github_release
  return if @is_dry_run

  changelog_lines = File.readlines("CHANGELOG.md")
  version_and_date = nil
  changelog = ""
  collecting = false

  changelog_lines.each do |line|
    if line.match?(/^##\s+\d/)
      if collecting
        break
      else
        collecting = true
        version_and_date = line.sub(/^##\s+/, "").strip
      end
    elsif collecting
      changelog += line
    end
  end

  unless version_and_date
    rputs "Warning: Could not parse version from CHANGELOG.md, skipping GitHub release"
    return
  end

  current_version = version_and_date.split(" -").first.strip

  release_notes = <<~NOTES
    #{version_and_date}

    #{changelog.strip}

    Please [see the changelog](https://github.com/stripe/stripe-react-native/blob/master/CHANGELOG.md) for additional details.
  NOTES

  if system("which hub > /dev/null 2>&1")
    puts "Creating GitHub release for tag: v#{current_version}"
    puts ""
    print "    "
    execute_or_fail("hub release create -m #{release_notes.shellescape} \"v#{current_version}\"")
  else
    puts ""
    puts "Remember to create a release on GitHub at https://github.com/stripe/stripe-react-native/releases/new"
    puts ""
    puts release_notes
  end
end

def execute_steps(steps, step_index)
  step_count = steps.length

  if step_index > 1
    steps = steps.drop(step_index - 1)
    rputs "Continuing from step #{step_index}: #{steps.first[:name]}"
  end

  steps.each_with_index do |step, i|
    current_step = step_index + i
    rputs "# #{step[:name]} (step #{current_step}/#{step_count})"
    step[:action].call
  rescue => e
    rputs "Failed at step #{current_step}: #{step[:name]}"
    rputs "Restart with --continue-from #{current_step} to re-run from this step."
    raise
  end
end

OptionParser.new do |opts|
  opts.banner = <<~BANNER
    USAGE:
        ./scripts/publish [OPTIONS] <release_type>

    ARGS:
        <release_type>    A Semantic Versioning release type: "patch", "minor", or "major".

    OPTIONS:
  BANNER

  opts.on("--dry-run", "Run all steps except actual npm publish, git push, and GitHub release") do
    @is_dry_run = true
  end

  opts.on("--continue-from NUMBER", Integer, "Continue from a specified step") do |n|
    @step_index = n
  end

  opts.on("-h", "--help", "Show this help message") do
    puts opts
    exit
  end
end.parse!

@release_type = ARGV.shift

if @release_type.nil?
  abort "Error! Missing release type argument. Must be one of: #{VALID_RELEASE_TYPES.join(', ')}"
end

unless VALID_RELEASE_TYPES.include?(@release_type)
  abort "Error! Invalid release type '#{@release_type}'. Must be one of: #{VALID_RELEASE_TYPES.join(', ')}"
end

Dir.chdir(`git rev-parse --show-toplevel`.strip)

steps = [
  { name: "Preflight checks", action: method(:preflight_checks) },
  { name: "Install dependencies", action: method(:install_dependencies) },
  { name: "Run tests", action: method(:run_tests) },
  { name: "Bump version", action: method(:bump_version) },
  { name: "Publish to npm", action: method(:publish_to_npm) },
  { name: "Create GitHub release", action: method(:create_github_release) },
]

execute_steps(steps, @step_index)
