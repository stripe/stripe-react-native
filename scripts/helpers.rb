require 'open3'
require 'json'

def rputs(string)
  puts "\e[31m#{string}\e[0m"
end

def execute(command)
  puts "Executing: #{command}"
  system(command)
end

def execute_or_fail(command)
  puts "Executing: #{command}"
  system(command) or abort "Failed to execute: #{command}"
end

def git_status
  stdout, _, _ = Open3.capture3("git status")
  stdout
end

def current_version
  JSON.parse(File.read("package.json"))["version"]
end

def ensure_on_master(is_dry_run: false)
  status = git_status
  unless status.include?("On branch master")
    if is_dry_run
      rputs "Warning: Not on master branch (continuing for dry run)"
    else
      abort "Error! Must be on master branch to publish"
    end
  end
end

def ensure_up_to_date(is_dry_run: false)
  status = git_status
  unless status.include?("Your branch is up to date with 'origin/master'.")
    if is_dry_run
      rputs "Warning: Not up to date with origin/master (continuing for dry run)"
    else
      abort "Error! Must be up to date with origin/master to publish"
    end
  end
end

def ensure_clean_repo(is_dry_run: false)
  status = git_status
  unless status.include?("working tree clean")
    if is_dry_run
      rputs "Warning: Working tree is dirty (continuing for dry run)"
    else
      abort "Error! Cannot publish with dirty working tree"
    end
  end
end

def ensure_hub_installed
  unless system("which hub > /dev/null 2>&1")
    abort "Error! `hub` is not installed. Please run `brew install hub` and try again."
  end
end

def preflight_checks(is_dry_run: false)
  puts "Fetching git remotes"
  execute_or_fail("git fetch")
  ensure_on_master(is_dry_run: is_dry_run)
  ensure_up_to_date(is_dry_run: is_dry_run)
  ensure_clean_repo(is_dry_run: is_dry_run)
  ensure_hub_installed
end
