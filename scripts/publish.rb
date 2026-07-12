#!/usr/bin/env ruby

require 'optparse'
require 'shellwords'
require_relative 'helpers'

@is_dry_run = false
@step_index = 1

def ensure_node_version
  version_file = File.join(Dir.pwd, ".node-version")
  abort "Error! .node-version file not found" unless File.exist?(version_file)

  required_version = File.read(version_file).strip
  installed_versions, _, _ = Open3.capture3("nodenv versions --bare")

  unless installed_versions.split("\n").map(&:strip).include?(required_version)
    puts "Node #{required_version} not installed, installing via nodenv..."
    execute_or_fail("nodenv install #{required_version}")
    execute_or_fail("nodenv rehash")
  end

  execute_or_fail("nodenv local #{required_version}")
  puts "Using node #{required_version}"
end

def ensure_npm_logged_in
  stdout, _, status = Open3.capture3("npm whoami")
  if status.success?
    puts "Logged into npm as #{stdout.strip}"
  else
    abort "Error! Not logged into npm. Please run `npm login` and try again."
  end
end

def ensure_nodenv_yarn_install
  nodenv_root = `nodenv root`.strip
  unless Dir.exist?(File.join(nodenv_root, "plugins", "nodenv-yarn-install"))
    abort "Error! `nodenv-yarn-install` plugin is not installed. Please install it: See https://github.com/pine/nodenv-yarn-install for details."
  end
end

def pre_release_checks
  ensure_nodenv_yarn_install
  ensure_node_version
  ensure_npm_logged_in
end

def install_dependencies
  puts "Installing dependencies according to lockfile"
  execute_or_fail("yarn install --frozen-lockfile")
end

def run_tests
  puts "Running tests"
  execute_or_fail("yarn run test")
end

def create_git_tag
  version = current_version
  tag = "v#{version}"
  puts "Creating git tag: #{tag}"
  execute_or_fail("git tag #{tag}")
end

def publish_to_npm
  version = current_version

  if @is_dry_run
    puts ""
    puts "[dry-run] Would publish to npm with: npm publish --ignore-scripts --access=public"
    puts "[dry-run] Would push tag v#{version} to origin"
    puts "[dry-run] Would create a GitHub release"
    puts ""
    puts "Dry run complete. Cleaning up..."
    execute("git tag -d v#{version}")
  else
    puts "Publishing release"
    execute_or_fail("npm publish --ignore-scripts --access=public")
    puts "Published to npm!"

    puts "Pushing git tag"
    execute_or_fail("git push origin v#{version}")

    puts ""
    puts "Published v#{version}!"
    puts ""
  end
end

def create_github_release
  if @is_dry_run
    puts "[dry-run] Would create GitHub release for current version from CHANGELOG.md"
    return
  end

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

  release_notes = <<~NOTES
    #{version_and_date}

    #{changelog.strip}

    Please [see the changelog](https://github.com/stripe/stripe-react-native/blob/master/CHANGELOG.md) for additional details.
  NOTES

  if system("which gh > /dev/null 2>&1")
    puts "Creating GitHub release for tag: v#{current_version}"
    puts ""
    print "    "
    execute_or_fail("GH_HOST=github.com gh release create \"v#{current_version}\" --repo stripe/stripe-react-native --title #{version_and_date.shellescape} --notes #{changelog.strip.shellescape}")
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
    rputs "Failed at step #{current_step}: #{step[:name]}: #{e.message}"
    rputs "Restart with --continue-from #{current_step} to re-run from this step."
    raise
  end
end

OptionParser.new do |opts|
  opts.banner = <<~BANNER
    USAGE:
        ./scripts/publish.rb [OPTIONS]

    Publishes the current version from package.json to npm, creates a git tag,
    and creates a GitHub release. Run this after the proposal PR has been merged.

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

Dir.chdir(`git rev-parse --show-toplevel`.strip)

puts "Publishing v#{current_version}"

steps = [
  { name: "Preflight checks", action: -> { preflight_checks(is_dry_run: @is_dry_run) } },
  { name: "Prerelease checks", action: method(:pre_release_checks) },
  { name: "Install dependencies", action: method(:install_dependencies) },
  { name: "Run tests", action: method(:run_tests) },
  { name: "Create git tag", action: method(:create_git_tag) },
  { name: "Publish to npm", action: method(:publish_to_npm) },
  { name: "Create GitHub release", action: method(:create_github_release) },
]

execute_steps(steps, @step_index)
