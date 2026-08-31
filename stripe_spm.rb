# Resolves the Stripe iOS SDK through Swift Package Manager instead of the
# CocoaPods registry.
#
# == Why this exists
#
# The Stripe iOS SDK is deprecating CocoaPods support, and the CocoaPods trunk
# registry itself stops accepting new versions when it becomes read-only. That
# only affects the `Stripe*` pods this SDK depends on — stripe-react-native's
# own podspec is unaffected, because React Native autolinking always loads it
# from node_modules rather than from the registry. So the job of this file is
# narrow: replace `s.dependency 'Stripe*'` registry lookups with a Swift
# Package Manager resolution of https://github.com/stripe/stripe-ios, while
# CocoaPods remains the delivery vehicle for stripe-react-native itself.
#
# This is the same approach react-native-firebase shipped for the Firebase
# iOS SDK's CocoaPods deprecation (default-on since @react-native-firebase/app
# 26.1.0), so apps using both SDKs get one consistent model.
#
# == How it works
#
# There are three cooperating layers:
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
#    target. No Package.swift is generated anywhere; Xcode itself resolves,
#    checks out, and builds the package when it builds the workspace.
#
# 3. This file covers what React Native's bridge doesn't, via hooks installed
#    on `Pod::Installer` (see the bottom of the file). CocoaPods invokes the
#    hooked methods on every install — even when the Podfile has no
#    post_install/post_integrate block — so users need zero Podfile changes.
#    The work is split across two hooks by which Xcode project it touches:
#
#    `run_podfile_post_install_hooks` (the Pods-project stage):
#      - guards CocoaPods' UUID counter before the normal hooks run, so React
#        Native's SPM apply step can't corrupt Pods.xcodeproj (see
#        `ensure_uuid_counter_safe`), and verifies the project's integrity
#        after they ran (see `verify_pods_project_integrity!`),
#      - fails fast unless the pod builds as a dynamic framework, the only
#        linkage React Native's SPM integration supports (see
#        `verify_dynamic_linkage!` for the full linking story),
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
#
# That ordering dictates where each piece of our work must live:
#
#   - Everything that touches Pods.xcodeproj has to happen in the
#     post_install stage, while the project is still in memory and unwritten
#     — a mutation made any later is silently lost (CocoaPods does not save
#     the Pods project again after integration).
#   - The embed phase touches the user's project, and runs in the
#     post_integrate stage — the hook CocoaPods documents as existing
#     precisely so that hooks "can alter [the user project] after it is
#     written to the disk"; our helpers save the project themselves. Running
#     there also means the phase is appended after CocoaPods' own `[CP]`
#     phases regardless of whether the app project is fresh (first install,
#     Expo prebuild --clean) or already integrated. react-native-firebase's
#     helper moved to this hook for the same reasons.
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
# Note the asymmetry in what persists between installs: Pods.xcodeproj is
# regenerated from scratch on every install, but the *user's* .xcodeproj is
# not — which is why the embed phase must be added idempotently and removed
# again when SPM resolution is turned off.
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
  # The lightweight SPM mirror of stripe-ios. It carries only tagged source
  # releases (no tests/examples/history), which keeps Xcode's package checkout
  # small.
  PACKAGE_URL = 'https://github.com/stripe/stripe-ios-spm.git'.freeze

  # Used when OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH is set (CI testing
  # against unreleased stripe-ios changes). Branches only exist on the full
  # stripe-ios repo — the stripe-ios-spm mirror only receives release tags.
  BRANCH_OVERRIDE_PACKAGE_URL = 'https://github.com/stripe/stripe-ios.git'.freeze

  POD_NAME = 'stripe-react-native'.freeze

  # The Swift package products the Core subspec needs. Keep this list in sync
  # with the CocoaPods fallback dependencies in stripe-react-native.podspec —
  # they are two spellings of the same dependency set.
  CORE_PRODUCTS = %w[
    Stripe
    StripePaymentSheet
    StripePayments
    StripePaymentsUI
    StripeApplePay
    StripeFinancialConnections
  ].freeze

  # The extra product required by the opt-in Onramp subspec. Deliberately not
  # part of CORE_PRODUCTS: linking it unconditionally would pull crypto-onramp
  # code (and its StripeIdentity dependency subtree) into every app.
  ONRAMP_PRODUCT = 'StripeCryptoOnramp'.freeze
  ONRAMP_SUBSPEC = "#{POD_NAME}/Onramp".freeze

  # Shown in Xcode's build-phases UI; also the key used to find/replace/remove
  # the phase on later installs.
  EMBED_PHASE_NAME = '[stripe-react-native] Embed SPM Frameworks'.freeze

  # Embeds SPM-built dynamic frameworks into the app bundle.
  #
  # Why this is needed: stripe-ios's package products are "automatic" linkage
  # libraries, and in some configurations Xcode chooses to build them as real
  # dynamic frameworks (under BUILT_PRODUCTS_DIR/PackageFrameworks for regular
  # builds, and under OBJROOT/UninstalledProducts/<platform> for Archive
  # builds, which never populate PackageFrameworks). Xcode only auto-embeds
  # package frameworks for targets that link them *directly*; frameworks
  # linked by a CocoaPods pod target are invisible to both Xcode's embedding
  # and CocoaPods' "[CP] Embed Pods Frameworks" phase. Without this script the
  # app builds fine and then crashes at launch with
  # "dyld: Library not loaded: @rpath/Stripe....framework".
  #
  # Script details:
  #   - Filters to Stripe*.framework so we never touch frameworks that other
  #     packages/tools manage themselves (e.g. react-native-firebase runs an
  #     equivalent phase for Firebase frameworks).
  #   - Uses file(1) to skip statically linked frameworks: those are already
  #     linked into their consumers, and embedding a static framework in the
  #     bundle fails App Store validation.
  #   - Strips Headers/PrivateHeaders/Modules, which don't belong in a shipped
  #     app bundle.
  #   - Re-signs with --preserve-metadata so the frameworks pick up the app's
  #     signing identity without losing their bundle identifiers/entitlements.
  #   - Skips frameworks already present in the destination (e.g. embedded by
  #     another phase) rather than overwriting them.
  #   - FRAMEWORKS_FOLDER_PATH is unset for build types with no frameworks
  #     folder (some non-app targets); treat that as "nothing to do".
  #
  # The heredoc is single-quoted (<<~'SCRIPT') so ${...} reaches the shell
  # untouched by Ruby interpolation.
  EMBED_SCRIPT = <<~'SCRIPT'.freeze
    set -e
    if [ -z "${FRAMEWORKS_FOLDER_PATH:-}" ]; then
      exit 0
    fi
    DEST="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"
    mkdir -p "$DEST"
    for SEARCH_DIR in "${BUILT_PRODUCTS_DIR}/PackageFrameworks" "${OBJROOT}/UninstalledProducts/${PLATFORM_NAME}"; do
      [ -d "$SEARCH_DIR" ] || continue
      for FRAMEWORK in "$SEARCH_DIR"/Stripe*.framework; do
        [ -d "$FRAMEWORK" ] || continue
        NAME="$(basename "$FRAMEWORK" .framework)"
        BINARY="$FRAMEWORK/$NAME"
        [ -f "$BINARY" ] || continue
        file -b "$BINARY" | grep -q "dynamically linked" || continue
        if [ ! -d "$DEST/$NAME.framework" ]; then
          rsync -a --exclude Headers --exclude PrivateHeaders --exclude Modules "$FRAMEWORK" "$DEST/"
          if [ -n "${EXPANDED_CODE_SIGN_IDENTITY:-}" ] && [ "${CODE_SIGNING_ALLOWED:-NO}" = "YES" ]; then
            codesign --force --sign "$EXPANDED_CODE_SIGN_IDENTITY" --preserve-metadata=identifier,entitlements "$DEST/$NAME.framework"
          fi
        fi
      done
    done
  SCRIPT

  class << self

    # Records that SPM mode is on for this install and which stripe-ios
    # version to pin. Called from the podspec (via stripe_spm_activate!), so
    # it may run more than once per install — CocoaPods can evaluate a podspec
    # repeatedly — which is fine because it only sets state.
    def activate!(version)
      @version = version
    end

    # True when the podspec declared the Swift package this install. When
    # false (RN < 0.75 or $StripeDisableSPM), apply() only performs cleanup.
    def active?
      !@version.nil?
    end

    def package_url
      override_branch ? BRANCH_OVERRIDE_PACKAGE_URL : PACKAGE_URL
    end

    # The version requirement Xcode stores in the package reference. Pinned to
    # the exact release to mirror the exact-version pin the podspec uses for
    # the CocoaPods fallback: the RN SDK is tested against one specific
    # stripe-ios version per release.
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
    # depends on. The order of the steps matters:
    #   1. verify_dynamic_linkage! first, so an unsupported configuration
    #      fails with our actionable message before anything else can fail
    #      more cryptically;
    #   2. find_package_reference! next, because the remaining steps need the
    #      package reference React Native's SPM integration should have
    #      created by now;
    #   3. mutations last, once the configuration is known-good.
    def apply_pods_project(installer)
      # No-op for installs that don't include this SDK (e.g. another project
      # in a monorepo sharing the same CocoaPods process).
      pod_target = installer.pod_targets.find { |target| target.pod_name == POD_NAME }
      return if pod_target.nil?
      return unless active?

      verify_dynamic_linkage!(pod_target)
      package = find_package_reference!(installer)
      link_onramp_product(installer, pod_target, package)
    end

    # User-project stage. Called by the post_integrate hook at the bottom of
    # this file (or, on CocoaPods too old for post_integrate hooks, at the
    # end of the post_install stage — see the lifecycle notes at the top).
    # The helpers save the user's project themselves, because CocoaPods has
    # already saved it by post_integrate time.
    def apply_user_project(installer)
      pod_target = installer.pod_targets.find { |target| target.pod_name == POD_NAME }
      return if pod_target.nil?

      if active?
        add_embed_phase(installer)
      else
        # SPM mode is off, but a previous install may have left the embed
        # phase in the user's project (which, unlike Pods.xcodeproj, is not
        # regenerated on each install). Clean it up so opting out is complete.
        remove_embed_phase(installer)
      end
    end

    # Guards against a UUID-collision bug that corrupts Pods.xcodeproj when a
    # post_install hook creates new project objects — which React Native's
    # SPM integration does for every `spm_dependency` package reference and
    # product (and link_onramp_product below does once more).
    #
    # Background, verified against CocoaPods 1.16.2: `Pod::Project` overrides
    # `generate_available_uuid_list` to mint deterministic UUIDs — a 6-char
    # project prefix, a 7-hex-digit counter, and a trailing '0' — with, per
    # its own comment, *no collision check* against existing objects, "as the
    # Pods project is regenerated each time, and thus all UUIDs will have
    # come from this method". Whenever that freshly-generated assumption
    # breaks (an incremental-installation project loaded from cache, UUID
    # postprocessing that sweeps the counters), the counter restarts near
    # zero while the object table is already full of counter-format UUIDs,
    # and the next `project.new` silently *overwrites* an existing entry in
    # objects_by_uuid — observed in the wild overwriting the root PBXProject
    # itself, after which Xcode refuses to open the Pods project
    # ("The project 'Pods' is damaged and cannot be opened",
    # `-[XCRemoteSwiftPackageReference _setSavedArchiveVersion:]`).
    #
    # React Native fixed this inside its own SPM manager in facebook/
    # react-native#57576, but the fix only ships in RN >= 0.88; every earlier
    # spm_dependency-capable release (0.75–0.87) carries the latent bug —
    # react-native-firebase reproduced it on RN 0.85.3 and ships this same
    # defense.
    #
    # The defense: before any post_install hook runs, raise the generated-
    # UUID high-water mark past every counter-format UUID already in the
    # project, so newly minted UUIDs can't land on an existing object. This
    # protects React Native's writes as well as our own. Runs even when SPM
    # mode is off (cheap, and it protects any other library using
    # `spm_dependency` in the same install); idempotent, so it composes with
    # react-native-firebase's equivalent guard when both SDKs are installed.
    #
    # Reads/writes @generated_uuids/@available_uuids/@uuid_prefix — private
    # internals of Pod::Project/Xcodeproj::Project — which is why the caller
    # wraps this in a rescue: if a future CocoaPods restructures them, the
    # install must degrade to a warning, not break.
    def ensure_uuid_counter_safe(installer)
      project = installer.pods_project
      return unless project

      prefix = project.instance_variable_get(:@uuid_prefix)
      return unless prefix.is_a?(String) && prefix.length >= 6

      counter_prefix = prefix[0, 6]
      max_index = -1
      project.objects_by_uuid.each_key do |uuid|
        # Only counter-format UUIDs participate: prefix + 7 hex digits + '0'.
        next unless uuid.is_a?(String) && uuid.length == 14 &&
                    uuid.start_with?(counter_prefix) && uuid.end_with?('0')

        index = uuid[6, 7].to_i(16)
        max_index = index if index > max_index
      end
      return if max_index < 0

      generated = project.instance_variable_get(:@generated_uuids)
      generated = [] unless generated.is_a?(Array)
      already_safe = generated.size > max_index
      while generated.size <= max_index
        generated << format('%.6s%07X0', prefix, generated.size)
      end
      project.instance_variable_set(:@generated_uuids, generated)
      # Discard pre-minted UUIDs too — they may date from before the raise.
      project.instance_variable_set(:@available_uuids, [])

      # Padding actually happening means the freshly-generated assumption was
      # broken on this install — the load-bearing case, worth one log line.
      # (Quiet when SPM is off: don't add noise to installs we're not part
      # of.)
      if !already_safe && active? && defined?(Pod::UI)
        Pod::UI.puts "[stripe-react-native] Raised the Pods project's UUID counter past " \
                     "index #{max_index} before Swift Package references are written."
      end
    end

    # Post-condition check for the failure class ensure_uuid_counter_safe
    # defends against: after the regular post_install hooks (React Native's
    # SPM writes included) have run, the Pods project's rootObject UUID must
    # still resolve to that same PBXProject. If a `project.new` reused its
    # UUID, objects_by_uuid holds the new object at that key while
    # @root_object still points at the original — and saving would write a
    # pbxproj whose rootObject points at a non-project object, which Xcode
    # cannot open. There is no safe way to continue past that, so this raises
    # (aborting the install before the corrupt project is written) rather
    # than warning like the soft guard above.
    def verify_pods_project_integrity!(installer)
      return unless active?

      project = installer.pods_project
      return unless project
      return unless project.respond_to?(:root_object) && project.respond_to?(:objects_by_uuid)

      root = project.root_object
      resolved = root && project.objects_by_uuid[root.uuid]
      return if root &&
                resolved.equal?(root) &&
                resolved.respond_to?(:isa) &&
                resolved.isa == 'PBXProject'

      raise Pod::Informative, <<~MESSAGE
        [stripe-react-native] The Pods project failed an integrity check after
        post_install hooks ran: its rootObject no longer resolves to the
        project object, which means a newly created object (typically a Swift
        Package reference) was assigned a UUID that collided with an existing
        one. Saving this project would leave Pods.xcodeproj unopenable by
        Xcode.

        Delete `ios/Pods` and re-run `pod install`. If the error persists,
        please report it at
        https://github.com/stripe/stripe-react-native/issues (including your
        React Native and CocoaPods versions); `$StripeDisableSPM = true` at
        the top of your Podfile is the interim workaround.
      MESSAGE
    end

    private

    def override_branch
      branch = ENV['OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH']
      branch && !branch.empty? ? branch : nil
    end

    # SPM resolution only works when stripe-react-native builds as a dynamic
    # framework, so fail `pod install` with instructions otherwise.
    #
    # Background: stripe-ios's package products use "automatic" linkage, which
    # Xcode resolves by statically absorbing the product into each consumer.
    # When the pod is a static library (React Native's default) the Stripe
    # code never makes it into anything the app links — Xcode builds the
    # package targets, the pod compiles against their Swift modules, and the
    # final app link then fails with undefined Stripe symbols, because a
    # static library can't carry its dependencies and nothing else links them.
    # Dynamic frameworks don't have that problem: the pod framework links the
    # Stripe products into itself. This mirrors react-native-firebase, which
    # enforces the same requirement for the same reason.
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
        #{current}. Either:
          * add `use_frameworks! :linkage => :dynamic` to your Podfile (for Expo,
            set `"useFrameworks": "dynamic"` via the expo-build-properties
            plugin), or
          * add `$StripeDisableSPM = true` at the top of your Podfile to resolve
            Stripe through CocoaPods instead (available while Stripe continues
            to publish pods).
      MESSAGE
    end

    # Locates the XCRemoteSwiftPackageReference that React Native's
    # `react_native_post_install` should have written into Pods.xcodeproj
    # (triggered by the `spm_dependency` call in our podspec). Its absence
    # means the Podfile's post_install never called react_native_post_install
    # — possible in hand-rolled Podfiles — and the build would otherwise fail
    # later with baffling "no such module 'Stripe'" errors, so surface it here
    # with the fix spelled out.
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
        template), or opt out of Swift Package Manager resolution by adding
        `$StripeDisableSPM = true` at the top of your Podfile.
      MESSAGE
    end

    # Adds the StripeCryptoOnramp product dependency to the pod's native
    # target when (and only when) the app installs the Onramp subspec.
    #
    # Why this can't live in the podspec: React Native's SPM manager keys
    # `spm_dependency` registrations by spec name and later looks up Pods
    # project targets by that same name. Subspecs don't get their own targets
    # — they merge into the root pod target — so a registration made against
    # "stripe-react-native/Onramp" never matches a target and is silently
    # dropped. Declaring the product at the root instead would link Onramp
    # into every app. The Onramp-only fallback pod dependency in the podspec
    # has the same conditionality via subspec selection; this reproduces it
    # for SPM by inspecting which subspecs the installer actually resolved.
    #
    # This mirrors what react-native/scripts/cocoapods/spm.rb does when it
    # links products (find-or-create the reference, then attach), so the
    # object shapes stay consistent with the core-product entries.
    def link_onramp_product(installer, pod_target, package)
      return unless pod_target.specs.any? { |spec| spec.name == ONRAMP_SUBSPEC }

      native_target = installer.pods_project.targets.find { |target| target.name == pod_target.label }
      return if native_target.nil?
      # Idempotency: podspecs can be evaluated multiple times per install, and
      # nothing prevents this hook from running against a project that already
      # has the product attached.
      return if native_target.package_product_dependencies.any? { |dep| dep.product_name == ONRAMP_PRODUCT }

      product = installer.pods_project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
      product.package = package
      product.product_name = ONRAMP_PRODUCT
      native_target.package_product_dependencies << product
    end

    # Installs (or refreshes) the embed phase on every app target that links
    # this pod. Comparing shell_script means an SDK upgrade that changes
    # EMBED_SCRIPT rewrites the phase in place, while an unchanged script
    # leaves the user's project untouched (keeping repeat `pod install` runs
    # diff-free).
    def add_embed_phase(installer)
      each_user_app_target(installer) do |user_target|
        phase = user_target.shell_script_build_phases.find { |p| p.name == EMBED_PHASE_NAME }
        next false if phase && phase.shell_script == EMBED_SCRIPT

        phase ||= user_target.new_shell_script_build_phase(EMBED_PHASE_NAME)
        phase.shell_path = '/bin/sh'
        phase.shell_script = EMBED_SCRIPT
        # The phase has no input/output file lists (the set of frameworks
        # isn't knowable statically), so mark it always-run to avoid Xcode's
        # "will be run during every build" warning turning into a skipped
        # phase under build-phase fingerprinting. Guarded because older
        # Xcodeproj gems don't model the attribute.
        phase.always_out_of_date = '1' if phase.respond_to?(:always_out_of_date=)
        true
      end
    end

    # Inverse of add_embed_phase, used when SPM mode is off. Needed because
    # the embed phase lives in the user's project, which survives between
    # installs — without this, opting out would leave a stale (harmless but
    # confusing) build phase behind.
    def remove_embed_phase(installer)
      each_user_app_target(installer) do |user_target|
        phase = user_target.shell_script_build_phases.find { |p| p.name == EMBED_PHASE_NAME }
        next false if phase.nil?

        phase.remove_from_project
        true
      end
    end

    # Yields every application target that links the stripe-react-native pod;
    # saves the containing project when the block returns true for any target.
    #
    # Only :application targets are considered: unit-test and extension
    # targets don't embed these frameworks (tests load them from the host
    # app). Saving only on change keeps no-op installs from rewriting the
    # user's project file.
    def each_user_app_target(installer)
      installer.aggregate_targets.each do |aggregate_target|
        next unless aggregate_target.pod_targets.any? { |target| target.pod_name == POD_NAME }

        # user_project is nil for non-integrating installs (e.g.
        # `integrate_targets: false` setups); nothing to embed into there.
        project = aggregate_target.user_project
        next if project.nil?

        changed = false
        aggregate_target.user_targets.each do |user_target|
          next unless user_target.respond_to?(:symbol_type) && user_target.symbol_type == :application

          changed = true if yield(user_target)
        end
        project.save if changed
      end
    end
  end
end

# True when the Stripe iOS SDK should be resolved through Swift Package
# Manager for this install. Evaluated by the podspec, which requires this
# file.
#
# `defined?(spm_dependency)` is the React Native >= 0.75 detection: the user's
# Podfile requires react_native_pods.rb, which defines `spm_dependency` as a
# top-level function, and CocoaPods evaluates podspecs in the same Ruby
# process, so the function is visible here exactly when the app's React
# Native version supports it.
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

# Install the Pod::Installer hooks (once) as soon as the podspec requires
# this file.
#
# Why hook `run_podfile_post_install_hooks`/`run_podfile_post_integrate_hooks`
# instead of asking users to call a helper from their Podfile: CocoaPods
# invokes both methods on every install even when the Podfile defines no
# corresponding block, so the integration works with zero Podfile changes —
# including the cleanup path when the user has opted out. Pod::Installer is a
# stable, semantically versioned public class, making it a safer patch target
# than React Native's private cocoapods scripts. (react-native-firebase hooks
# the same two methods for the same reasons.)
#
# The re-hook guards check both public and private visibility: the original
# methods are private in CocoaPods, and `alias_method` preserves visibility,
# so a plain `method_defined?` check would miss the alias and re-hook on a
# second load. (`require` normally dedupes by path; this protects against the
# same file being loaded from two paths.) The wrappers are defined with
# `define_method` so they can capture `post_integrate_supported`, and are
# made private again afterwards to leave the class shaped as CocoaPods
# defined it.
if defined?(Pod::Installer)
  installer_class = Pod::Installer

  # CocoaPods has invoked post_integrate hooks (at the end of
  # integrate_user_project) since 1.10. When the method is missing — or when
  # a Podfile sets `integrate_targets: false`, in which case CocoaPods never
  # calls it — the user-project stage has to run from post_install instead.
  # The integrate_targets case needs no special handling: without
  # integration there is no user project to embed into, and
  # apply_user_project no-ops.
  post_integrate_supported =
    installer_class.method_defined?(:run_podfile_post_integrate_hooks) ||
    installer_class.private_method_defined?(:run_podfile_post_integrate_hooks)

  unless installer_class.method_defined?(:stripe_spm_original_run_podfile_post_install_hooks) ||
         installer_class.private_method_defined?(:stripe_spm_original_run_podfile_post_install_hooks)
    post_install_was_private = installer_class.private_method_defined?(:run_podfile_post_install_hooks)
    installer_class.class_eval do
      alias_method :stripe_spm_original_run_podfile_post_install_hooks, :run_podfile_post_install_hooks

      define_method(:run_podfile_post_install_hooks) do
        # The UUID guard must run before the regular hooks: it is defending
        # against object creation *inside* react_native_post_install. Soft
        # failure only — it pokes CocoaPods internals, and a CocoaPods
        # release changing those must not break `pod install`.
        begin
          StripeSPM.ensure_uuid_counter_safe(self)
        rescue StandardError => e
          if defined?(Pod::UI)
            Pod::UI.warn "[stripe-react-native] Couldn't guard the Pods project's UUID counter " \
                         "(#{e.class}: #{e.message}). If this install leaves Pods.xcodeproj " \
                         'unopenable by Xcode, delete ios/Pods and report the error at ' \
                         'https://github.com/stripe/stripe-react-native/issues.'
          end
        end
        # Run the regular hooks next: react_native_post_install (called from
        # the user's post_install block) writes the Swift package references
        # that the integrity check and the Pods-project stage build on.
        result = stripe_spm_original_run_podfile_post_install_hooks
        # Deliberately not rescued: continuing past a corrupted project would
        # only trade this message for an inscrutable Xcode failure later.
        StripeSPM.verify_pods_project_integrity!(self)
        StripeSPM.apply_pods_project(self)
        # Old CocoaPods without post_integrate hooks: run the user-project
        # stage here instead (see the lifecycle notes at the top).
        StripeSPM.apply_user_project(self) unless post_integrate_supported
        result
      end
    end
    installer_class.send(:private, :run_podfile_post_install_hooks) if post_install_was_private
  end

  if post_integrate_supported &&
     !installer_class.method_defined?(:stripe_spm_original_run_podfile_post_integrate_hooks) &&
     !installer_class.private_method_defined?(:stripe_spm_original_run_podfile_post_integrate_hooks)
    post_integrate_was_private = installer_class.private_method_defined?(:run_podfile_post_integrate_hooks)
    installer_class.class_eval do
      alias_method :stripe_spm_original_run_podfile_post_integrate_hooks, :run_podfile_post_integrate_hooks

      define_method(:run_podfile_post_integrate_hooks) do
        # The user's own post_integrate block (if any) runs first, ours after.
        result = stripe_spm_original_run_podfile_post_integrate_hooks
        StripeSPM.apply_user_project(self)
        result
      end
    end
    installer_class.send(:private, :run_podfile_post_integrate_hooks) if post_integrate_was_private
  end
end
