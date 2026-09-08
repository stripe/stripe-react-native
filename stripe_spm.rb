# Resolves the Stripe iOS SDK through Swift Package Manager instead of the
# CocoaPods registry.
#
# == Why this exists
#
# The Stripe native iOS SDK is ending support for CocoaPods. The
# stripe-react-native SDK depends on multiple `Stripe*` pods from stripe-ios,
# which will now only be published via SPM, not CocoaPods. 
# The stripe-react-native pod itself is unaffected since it is loaded from
# node_modules rather than the CocoaPods registry.
# This file's job is to replace the `s.dependency 'Stripe*'` commands from
# the stripe-react-native podspec with a Swift Package Manager resolution.
#
# == How it works
#
# There are three cooperating layers, the last of which is this file:
#
# 1. The podspec (stripe-react-native.podspec) calls `stripe_spm_enabled?` and
#    either declares the Swift package via `stripe_spm_activate!` (SPM mode)
#    or falls back to the classic `s.dependency 'Stripe*'` pod lines.
#
# 2. React Native >= 0.75 provides the actual CocoaPods/SPM bridge:
#    `spm_dependency` (react-native/scripts/cocoapods/spm.rb) records the
#    package declaration at podspec-evaluation time, and
#    `react_native_post_install` later writes it into Pods.xcodeproj as real
#    Xcode objects — an XCRemoteSwiftPackageReference on the project plus
#    XCSwiftPackageProductDependency entries on the stripe-react-native pod
#    target.
#
# 3. This file covers what React Native's bridge doesn't, via hooks installed
#    on `Pod::Installer` (see the bottom of the file). CocoaPods invokes the
#    hooked methods on every install, so users need zero Podfile changes.
#    The work is split across two hooks by which Xcode project it touches:
#
#    `run_podfile_post_install_hooks` (the Pods-project stage):
#      - guards CocoaPods' UUID counter before the normal hooks run, so React
#        Native's SPM apply step can't corrupt Pods.xcodeproj (see
#        `ensure_uuid_counter_safe`), and verifies the project's integrity
#        after they ran (see `verify_pods_project_integrity!`),
#      - fails fast unless the pod builds as a dynamic framework, the only
#        linkage React Native's SPM integration supports (see
#        `verify_dynamic_linkage!`),
#      - links the StripeCryptoOnramp package product when the Onramp subspec
#        is installed (`spm_dependency` silently ignores subspec declarations;
#        see `link_onramp_product`).
#
#    `run_podfile_post_integrate_hooks` (the user-project stage):
#      - maintains a build phase on the app target that embeds SPM-built
#        dynamic frameworks into the app bundle (see EMBED_SCRIPT), or removes
#        it again when SPM resolution is turned off.
#
# == Install lifecycle and ordering
#
# During `pod install`, CocoaPods evaluates the podspec (possibly more than
# once — everything here is idempotent), generates the Pods project, runs
# `run_podfile_post_install_hooks` just before writing that project to disk,
# then runs `integrate_user_project` (which adds its own `[CP] Embed Pods
# Frameworks` phase to the app target and saves the *user's* project), and
# finally runs `run_podfile_post_integrate_hooks`.
# NOTE: CocoaPods can evaluate the podspec multiple times, so everything
# here must be idempotent.
#
# That ordering dictates where each piece of our work must live:
#
#   - Everything that touches Pods.xcodeproj has to happen in the
#     post_install stage, while the project is still in memory and unwritten.
#     A mutation made any later is silently lost (CocoaPods does not save
#     the Pods project again after integration).
#   - The embed phase touches the user's project, and runs in the
#     post_integrate stage. CocoaPods documents post_integrate as existing
#     precisely so that hooks "can alter [the user project] after it is
#     written to the disk", which our helpers do. Running
#     there also means the phase is appended after CocoaPods' own `[CP]`
#     phases regardless of whether the app project is fresh (first install,
#     Expo prebuild --clean) or already integrated.
#   - On very old CocoaPods versions without post_integrate hooks (< 1.10),
#     the user-project stage falls back to the end of the post_install stage.
#     That works too — the analyzer, our hook, and the integrator all share
#     one in-memory instance of the user project, so mutations made before
#     integration survive it — the phase just ends up ordered before the
#     `[CP]` phases on a fresh project.
#
# Within the post_install stage, the user's post_install block runs first —
# React Native's `react_native_post_install` writes the Swift package
# references at that point — and our code runs after it, so it can rely on
# the package reference existing (and raise a clear error when it doesn't).
# Raising there aborts the install before anything is saved.
#
# Note that even though Pods.xcodeproj is regenerated from scratch on every
# install, the *user's* .xcodeproj is not, and so the addition of the embed
# phase msut be idempotent, and we must remove it again if SPM resolution
# is turned off.
#
# == Supported modes
#
#   React Native >= 0.75 (default)        -> Stripe via Swift Package Manager
#   React Native >= 0.75, opt-out below   -> Stripe via CocoaPods registry
#   React Native <  0.75                  -> Stripe via CocoaPods registry
#                                            (no `spm_dependency` available)
#
# To opt out and resolve Stripe through CocoaPods instead (available while
# Stripe continues to publish pods), add this at the top of your Podfile:
#
#   $StripeDisableSPM = true

module StripeSPM
  # The lightweight SPM mirror of stripe-ios.
  PACKAGE_URL = 'https://github.com/stripe/stripe-ios-spm.git'.freeze

  # Used when OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH is set (for example
  # for CI testing against unreleased stripe-ios). Branches only exist on the full
  # stripe-ios repo — the stripe-ios-spm mirror only receives release tags.
  BRANCH_OVERRIDE_PACKAGE_URL = 'https://github.com/stripe/stripe-ios.git'.freeze

  POD_NAME = 'stripe-react-native'.freeze

  # The Swift package products the Core subspec needs. This list must be kept in sync
  # with the CocoaPods fallback dependencies in stripe-react-native.podspec.
  CORE_PRODUCTS = %w[
    Stripe
    StripePaymentSheet
    StripePayments
    StripePaymentsUI
    StripeApplePay
    StripeFinancialConnections
  ].freeze

  class << self

    # Records that SPM mode is on for this install and which stripe-ios
    # version to pin.
    def activate!(version)
      @version = version
    end

    # True when the podspec declared the Swift package this install.
    def active?
      !@version.nil?
    end

    def package_url
      override_branch ? BRANCH_OVERRIDE_PACKAGE_URL : PACKAGE_URL
    end

    # The version requirement Xcode stores in the package reference. Pinned to
    # the exact patch release to mirror.
    def requirement
      if override_branch
        { kind: 'branch', branch: override_branch }
      else
        { kind: 'exactVersion', version: @version }
      end
    end

    # Pods-project stage. Called by the post_install hook at the bottom of
    # this file after all regular post_install hooks have run — while
    # Pods.xcodeproj is still in memory and unwritten, which everything here
    # depends on.
    #   1. verify_dynamic_linkage! first, so an unsupported configuration
    #      fails with our actionable message
    #   2. find_package_reference! next, because the remaining steps need the
    #      package reference React Native's SPM integration should have
    #      created by now
    def apply_pods_project(installer)
      # No-op for installs that don't include this SDK (e.g. another project
      # in a monorepo sharing the same CocoaPods process).
      pod_target = installer.pod_targets.find { |target| target.pod_name == POD_NAME }
      return if pod_target.nil?
      return unless active?

      verify_dynamic_linkage!(pod_target)
      find_package_reference!(installer)
    end

    private

    def override_branch
      branch = ENV['OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH']
      branch && !branch.empty? ? branch : nil
    end

    # SPM resolution only works when stripe-react-native builds as a dynamic
    # framework, so fail `pod install` with instructions otherwise.
    # 
    # Note: in the future we could explore a potential solutions that supports
    # static linkage, but for now we require host apps to use dynamic.
    #
    # Note: Pod::Target#build_type is a *private* reader in CocoaPods; only
    # the build_as_* predicates are public API.
    def verify_dynamic_linkage!(pod_target)
      return if pod_target.build_as_dynamic_framework?

      current = if pod_target.build_as_framework?
                  'a static framework'
                elsif pod_target.build_as_dynamic?
                  'a dynamic library'
                else
                  'a static library'
                end
      raise Pod::Informative, <<~MESSAGE
        [stripe-react-native] Resolving the Stripe iOS SDK through Swift Package
        Manager requires dynamic frameworks, but #{POD_NAME} is building as
        #{current}. To fix, add `use_frameworks! :linkage => :dynamic` to your Podfile
        (for Expo, set `"useFrameworks": "dynamic"` via the expo-build-properties plugin).
        If you MUST continue to use static linkage, you can temporarily add
        `$StripeDisableSPM = true` at the top of your Podfile to resolve Stripe
        through CocoaPods instead. WARNING: THIS IS DEPRECATED AND FUTURE STRIPE SDK
        VERSIONS WILL NOT SUPPORT THIS OPTION.
      MESSAGE
    end

    # Locates the XCRemoteSwiftPackageReference that React Native's
    # `react_native_post_install` should have written into Pods.xcodeproj
    # (triggered by the `spm_dependency` call in our podspec). Its absence
    # means the Podfile's post_install never called react_native_post_install
    # (which is possible if the user made changes to the Podfile), and the build
    # would otherwise fail later.
    def find_package_reference!(installer)
      url = package_url
      package = installer.pods_project.root_object.package_references.find do |ref|
        # Local package references respond to :path instead of :repositoryURL;
        # guard so a mixed project can't crash the lookup.
        ref.respond_to?(:repositoryURL) && ref.repositoryURL == url
      end
      return package if package

      raise Pod::Informative, <<~MESSAGE
        [stripe-react-native] The Stripe iOS Swift package was not added to the
        Pods project. Make sure your Podfile's post_install block calls
        `react_native_post_install` (this is part of the standard React Native
        template).
      MESSAGE
    end

  end
end

# True when the Stripe iOS SDK should be resolved through Swift Package
# Manager for this install. Evaluated by the podspec.
#
# `defined?(spm_dependency)` effectively checks if the React Native version is
# >= 0.75 since this is the version that introduces `spm_dependency`. The user's
# Podfile will require `react_native_pods.rb`, which defines `spm_dependency` as
# a top-level function, so the function is visibile here exactly when the app's
# React Native version supports it.
#
# `$StripeDisableSPM` is the user-facing opt-out. The value is compared to
# `true` (not just "defined") so tooling that emits `$StripeDisableSPM =
# false` gets SPM resolution as expected.
def stripe_spm_enabled?
  return false unless defined?(spm_dependency)
  return false if defined?($StripeDisableSPM) && $StripeDisableSPM == true

  true
end

# Declares the stripe-ios Swift package on the given (root) spec and switches
# this file's installer hook into active mode. Called from the podspec.
def stripe_spm_activate!(spec, version:)
  StripeSPM.activate!(version)
  spm_dependency(
    spec,
    url: StripeSPM.package_url,
    requirement: StripeSPM.requirement,
    products: StripeSPM::CORE_PRODUCTS
  )
end

# Run the Pods-project integration after the Podfile's regular post_install
# hook, which is where react_native_post_install writes the package reference.
if defined?(Pod::Installer)
  installer_class = Pod::Installer

  unless installer_class.method_defined?(:stripe_spm_original_run_podfile_post_install_hooks) ||
         installer_class.private_method_defined?(:stripe_spm_original_run_podfile_post_install_hooks)
    post_install_was_private = installer_class.private_method_defined?(:run_podfile_post_install_hooks)
    installer_class.class_eval do
      alias_method :stripe_spm_original_run_podfile_post_install_hooks, :run_podfile_post_install_hooks

      define_method(:run_podfile_post_install_hooks) do
        result = stripe_spm_original_run_podfile_post_install_hooks
        StripeSPM.apply_pods_project(self)
        result
      end
    end
    installer_class.send(:private, :run_podfile_post_install_hooks) if post_install_was_private
  end
end
