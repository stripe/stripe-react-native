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

    private

    def override_branch
      branch = ENV['OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH']
      branch && !branch.empty? ? branch : nil
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

# Declares the stripe-ios Swift package on the given (root) spec. Called from
# the podspec when SPM resolution is enabled.
def stripe_spm_activate!(spec, version:)
  StripeSPM.activate!(version)
  spm_dependency(
    spec,
    url: StripeSPM.package_url,
    requirement: StripeSPM.requirement,
    products: StripeSPM::CORE_PRODUCTS
  )
end
