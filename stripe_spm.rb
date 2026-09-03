# Resolves the Stripe iOS SDK through Swift Package Manager instead of the
# CocoaPods registry.
#
# React Native >= 0.75 provides `spm_dependency` (react-native/scripts/cocoapods/spm.rb):
# a podspec declares Swift package products, and `react_native_post_install`
# writes the package reference into Pods.xcodeproj so that Xcode resolves and
# builds the package. This file layers on the pieces that helper doesn't cover,
# via a hook on `Pod::Installer#run_podfile_post_install_hooks` (which CocoaPods
# always invokes, so no Podfile changes are required):
#   - fails fast unless the pod builds as a dynamic framework, the only linkage
#     React Native's SPM integration supports
#   - links the StripeCryptoOnramp package product when the Onramp subspec is
#     installed (`spm_dependency` only applies to root specs, so the product
#     cannot be declared on the subspec itself)
#   - adds a build phase to the app target that embeds SPM-built dynamic
#     frameworks into the app bundle; Xcode only embeds package frameworks
#     that are linked directly by the app target, not ones linked by pods
#
# To opt out and resolve Stripe through CocoaPods instead (available while
# Stripe continues to publish pods), add this at the top of your Podfile:
#
#   $StripeDisableSPM = true

module StripeSPM
  PACKAGE_URL = 'https://github.com/stripe/stripe-ios-spm.git'.freeze
  # Branches only exist on the full stripe-ios repo, not the release-tag-only
  # stripe-ios-spm mirror.
  BRANCH_OVERRIDE_PACKAGE_URL = 'https://github.com/stripe/stripe-ios.git'.freeze
  POD_NAME = 'stripe-react-native'.freeze
  CORE_PRODUCTS = %w[
    Stripe
    StripePaymentSheet
    StripePayments
    StripePaymentsUI
    StripeApplePay
    StripeFinancialConnections
  ].freeze
  ONRAMP_PRODUCT = 'StripeCryptoOnramp'.freeze
  ONRAMP_SUBSPEC = "#{POD_NAME}/Onramp".freeze
  EMBED_PHASE_NAME = '[stripe-react-native] Embed SPM Frameworks'.freeze

  # Xcode builds automatic-linkage package products as dynamic frameworks
  # under PackageFrameworks in some configurations (and under
  # UninstalledProducts when archiving). Frameworks built statically are
  # already linked into their consumers and must not ship in the bundle.
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

    def activate!(version)
      @version = version
    end

    def active?
      !@version.nil?
    end

    def package_url
      override_branch ? BRANCH_OVERRIDE_PACKAGE_URL : PACKAGE_URL
    end

    def requirement
      if override_branch
        { kind: 'branch', branch: override_branch }
      else
        { kind: 'exactVersion', version: @version }
      end
    end

    def apply(installer)
      pod_target = installer.pod_targets.find { |target| target.pod_name == POD_NAME }
      return if pod_target.nil?

      unless active?
        remove_embed_phase(installer)
        return
      end

      verify_dynamic_linkage!(pod_target)
      package = find_package_reference!(installer)
      link_onramp_product(installer, pod_target, package)
      add_embed_phase(installer)
    end

    private

    def override_branch
      branch = ENV['OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH']
      branch && !branch.empty? ? branch : nil
    end

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

    def find_package_reference!(installer)
      url = package_url
      package = installer.pods_project.root_object.package_references.find do |ref|
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

    def link_onramp_product(installer, pod_target, package)
      return unless pod_target.specs.any? { |spec| spec.name == ONRAMP_SUBSPEC }

      native_target = installer.pods_project.targets.find { |target| target.name == pod_target.label }
      return if native_target.nil?
      return if native_target.package_product_dependencies.any? { |dep| dep.product_name == ONRAMP_PRODUCT }

      product = installer.pods_project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
      product.package = package
      product.product_name = ONRAMP_PRODUCT
      native_target.package_product_dependencies << product
    end

    def add_embed_phase(installer)
      each_user_app_target(installer) do |user_target|
        phase = user_target.shell_script_build_phases.find { |p| p.name == EMBED_PHASE_NAME }
        next false if phase && phase.shell_script == EMBED_SCRIPT

        phase ||= user_target.new_shell_script_build_phase(EMBED_PHASE_NAME)
        phase.shell_path = '/bin/sh'
        phase.shell_script = EMBED_SCRIPT
        phase.always_out_of_date = '1' if phase.respond_to?(:always_out_of_date=)
        true
      end
    end

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
    def each_user_app_target(installer)
      installer.aggregate_targets.each do |aggregate_target|
        next unless aggregate_target.pod_targets.any? { |target| target.pod_name == POD_NAME }

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

def stripe_spm_enabled?
  return false unless defined?(spm_dependency)
  return false if defined?($StripeDisableSPM) && $StripeDisableSPM == true

  true
end

def stripe_spm_activate!(spec, version:)
  StripeSPM.activate!(version)
  spm_dependency(
    spec,
    url: StripeSPM.package_url,
    requirement: StripeSPM.requirement,
    products: StripeSPM::CORE_PRODUCTS
  )
end

if defined?(Pod::Installer) &&
   !Pod::Installer.method_defined?(:stripe_spm_original_run_podfile_post_install_hooks) &&
   !Pod::Installer.private_method_defined?(:stripe_spm_original_run_podfile_post_install_hooks)
  Pod::Installer.class_eval do
    alias_method :stripe_spm_original_run_podfile_post_install_hooks, :run_podfile_post_install_hooks

    def run_podfile_post_install_hooks
      result = stripe_spm_original_run_podfile_post_install_hooks
      StripeSPM.apply(self)
      result
    end
  end
end
