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
#    either declares the Swift package via `stripe_spm_activate!` (SPM mode —
#    which first checks that CocoaPods is new enough, see
#    MINIMUM_COCOAPODS_VERSION) or falls back to the classic
#    `s.dependency 'Stripe*'` pod lines.
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
#    `run_podfile_post_install_hooks` (the Pods-project stage; all of it is
#    skipped in the CocoaPods fallback, which creates no project objects and
#    needs nothing from Pods.xcodeproj):
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
#     Expo prebuild --clean) or already integrated. post_integrate hooks have
#     existed since CocoaPods 1.10, which is therefore the oldest CocoaPods
#     SPM mode supports (MINIMUM_COCOAPODS_VERSION); older versions are
#     refused up front rather than worked around.
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
# SPM mode additionally requires CocoaPods >= MINIMUM_COCOAPODS_VERSION and
# fails the install with instructions otherwise; the CocoaPods registry modes
# have no version requirement of their own.
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

  # The oldest CocoaPods release SPM mode works with. The one hard dependency
  # is the post_integrate hook the user-project stage runs from, which
  # CocoaPods added in 1.10.0 (2020-10-20). Everything else this file uses
  # (the build_as_* predicates, Xcodeproj's Swift-package object types, the
  # deterministic-UUID internals the guard below relies on) predates it, and
  # 1.10.0's gemspec requires Xcodeproj >= 1.19.0 — the release that added
  # the build phase's always_out_of_date attribute the embed phase sets — so
  # nothing here needs feature detection beyond this one version check.
  #
  # In practice this floor is never the binding constraint: `spm_dependency`
  # only exists on React Native >= 0.75, and React Native's project template
  # has pinned `cocoapods >= 1.13` since 0.73. The check exists so that an
  # unsupported setup fails at podspec-evaluation time with a clear message
  # (see verify_cocoapods_version!) instead of somewhere deep inside the
  # install.
  MINIMUM_COCOAPODS_VERSION = '1.10'.freeze

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

  # The extra product required by the opt-in Onramp subspec. Deliberately not
  # part of CORE_PRODUCTS: linking it unconditionally would pull crypto-onramp
  # code (and its StripeIdentity dependency subtree) into every app.
  ONRAMP_PRODUCT = 'StripeCryptoOnramp'.freeze
  ONRAMP_SUBSPEC = "#{POD_NAME}/Onramp".freeze

  # Shown in Xcode's build-phases UI; also the key used to find/replace/remove
  # the phase on later installs (if the user moves off of SPM resolution).
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
  #   - Filters to Stripe*.framework so we never touch others.
  #   - Uses file(1) to skip statically linked frameworks: those are already
  #     linked into their consumers, and embedding a static framework in the
  #     bundle can fail App Store validation.
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

    # Fails the install when the running CocoaPods predates
    # MINIMUM_COCOAPODS_VERSION. Called from stripe_spm_activate! — that is,
    # only when SPM mode is about to turn on — so it runs while CocoaPods is
    # still evaluating the podspec, before anything has been resolved,
    # downloaded, or generated, and it never affects the CocoaPods fallback.
    #
    # Skipped rather than failed when the version can't be determined
    # (Pod::VERSION missing or unparseable): that isn't evidence of an old
    # CocoaPods, and inside `pod install` neither case can actually occur.
    #
    # Two presentation details follow from raising inside a podspec. CocoaPods
    # wraps any exception escaping podspec evaluation in a DSLError ("Invalid
    # `stripe-react-native.podspec` file: <message>", followed by the
    # offending podspec line), and DSLError#message prepends the "[!]" marker
    # itself and appends a full stop — so this raises PlainInformative (whose
    # message is unadorned) rather than Informative (which would add a second
    # "[!]"), and the message ends without a trailing period.
    def verify_cocoapods_version!
      return unless defined?(Pod::VERSION) && Gem::Version.correct?(Pod::VERSION)
      return if Gem::Version.new(Pod::VERSION) >= Gem::Version.new(MINIMUM_COCOAPODS_VERSION)

      raise Pod::PlainInformative, <<~MESSAGE.chomp
        [stripe-react-native] Resolving the Stripe iOS SDK through Swift Package
        Manager requires CocoaPods #{MINIMUM_COCOAPODS_VERSION} or newer, but this
        install is running CocoaPods #{Pod::VERSION}. Either:
          * update CocoaPods (React Native's project template requires 1.13 or
            newer; if your project has a Gemfile, run `bundle exec pod install`
            to use the version it pins), or
          * add `$StripeDisableSPM = true` at the top of your Podfile to resolve
            Stripe through CocoaPods instead (available while Stripe continues
            to publish pods)
      MESSAGE
    end

    # Records that SPM mode is on for this install and which stripe-ios
    # version to pin.
    def activate!(version)
      @version = version
    end

    # True when the podspec declared the Swift package this install. When
    # false (RN < 0.75 or $StripeDisableSPM), the installer hooks skip the
    # Pods-project stage entirely and only perform cleanup in the
    # user-project stage (see apply_user_project).
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
    #   3. mutations last
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
    # this file. The helpers save the user's project themselves, because
    # CocoaPods has already saved it by post_integrate time.
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
    # post_install hook creates new project objects. This is provided by
    # React Native on later React Native versions but we need to provide it
    # ourselves for earlier ones.
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
    # spm_dependency-capable release (0.75–0.87) carries the latent bug.
    #
    # To solve this: before any post_install hook runs, raise the generated-
    # UUID high-water mark past every counter-format UUID already in the
    # project, so newly minted UUIDs can't land on an existing object. This
    # protects React Native's writes as well as our own. Runs even when SPM
    # mode is off (cheap, and it protects any other library using
    # `spm_dependency` in the same install); idempotent, so it composes with
    # author libraries' equivalent guards.
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
      # broken on this install.
      if !already_safe && active? && defined?(Pod::UI)
        Pod::UI.puts "[stripe-react-native] Raised the Pods project's UUID counter past " \
                     "index #{max_index} before Swift Package references are written."
      end
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

    # Adds the StripeCryptoOnramp product dependency to the pod's native
    # target when (and only when) the app installs the Onramp subspec.
    #
    # This can't live in the podspec because React Native's SPM manager keys
    # `spm_dependency` registrations by spec name and later looks up Pods
    # project targets by that same name. Subspecs don't get their own targets
    # (they merge into the root pod target), so a registration made against
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
    # this pod. Comparing shell_script means a new SDK version that changes
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
        # phase under build-phase fingerprinting. (The attribute exists on
        # every Xcodeproj a supported CocoaPods can load — see
        # MINIMUM_COCOAPODS_VERSION.)
        phase.always_out_of_date = '1'
        true
      end
    end

    # Inverse of add_embed_phase, used when SPM mode is off. Needed so that
    # if the user opts out of SPM resolution they aren't left with a harmless
    # but confusing dead build phase in their project.
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
# this file's installer hooks into active mode. Called from the podspec. The
# CocoaPods version check comes first so that an unsupported CocoaPods fails
# the install before anything is activated or declared.
def stripe_spm_activate!(spec, version:)
  StripeSPM.verify_cocoapods_version!
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
# The re-hook guards check both public and private visibility: the original
# methods are private in CocoaPods, and `alias_method` preserves visibility,
# so a plain `method_defined?` check would miss the alias and re-hook on a
# second load. (`require` normally dedupes by path; this protects against the
# same file being loaded from two paths.) The wrappers are made private again
# afterwards to leave the class shaped as CocoaPods defined it.
if defined?(Pod::Installer)
  installer_class = Pod::Installer

  # CocoaPods has invoked post_integrate hooks (at the end of
  # integrate_user_project) since 1.10 (MINIMUM_COCOAPODS_VERSION). On older
  # CocoaPods the method doesn't exist, so it can't be hooked — and nothing
  # is lost by not hooking it: SPM mode refuses to activate there
  # (verify_cocoapods_version!), and the CocoaPods fallback's only work at
  # this stage is removing an embed phase left behind by an earlier SPM-mode
  # install, which can't have happened on a CocoaPods this old. So this
  # existence check is not a second code path; it only keeps the file
  # loadable — and the fallback usable — on CocoaPods versions SPM mode
  # doesn't support.
  #
  # Podfiles that set `integrate_targets: false` never reach post_integrate
  # either (CocoaPods skips integrate_user_project entirely), which is fine:
  # without integration there is no user project to embed into.
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
        # against object creation *inside* react_native_post_install.
        # We fail softly only since a future CocoaPods release could change
        # the behavior.
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
        # that the Pods-project stage builds on.
        result = stripe_spm_original_run_podfile_post_install_hooks
        StripeSPM.apply_pods_project(self)
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
