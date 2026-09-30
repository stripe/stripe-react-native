# frozen_string_literal: true

require 'minitest/autorun'
require 'cocoapods'
require 'xcodeproj'
require 'tmpdir'
require_relative '../../stripe_spm'

# Evaluate the real podspec without loading React Native's installer or
# generating projects. These are the two React Native podspec entry points.
def install_modules_dependencies(_spec); end

def spm_dependency(spec, **declaration)
  $stripe_spm_test_declarations << declaration.merge(spec_name: spec.name)
end

class StripeSPMIdentityTest < Minitest::Test
  TEST_VERSION = '1.2.3'.freeze
  Spec = Struct.new(:name)
  Installer = Struct.new(:pod_targets, :pods_project)
  PodTarget = Struct.new(:pod_name, :label, :specs, :dynamic) do
    def build_as_dynamic_framework?
      dynamic
    end

    def build_as_framework?
      true
    end

    def build_as_dynamic?
      dynamic
    end
  end

  def setup
    @previous_version = StripeSPM.instance_variable_get(:@version)
    @previous_disable_spm = $StripeDisableSPM
    @previous_branch = ENV.delete('OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH')
    @previous_new_arch = ENV.delete('RCT_NEW_ARCH_ENABLED')
    $stripe_spm_test_declarations = []
    StripeSPM.instance_variable_set(:@version, nil)
    @project = Xcodeproj::Project.new(File.join(Dir.tmpdir, 'stripe-spm-identity-tests.xcodeproj'))
    @package = add_package(StripeSPM::PACKAGE_URL)
  end

  def teardown
    StripeSPM.instance_variable_set(:@version, @previous_version)
    $StripeDisableSPM = @previous_disable_spm
    ENV['OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH'] = @previous_branch
    ENV['RCT_NEW_ARCH_ENABLED'] = @previous_new_arch
  end

  def test_default_podspec_keeps_identity_out_of_payments_dependencies
    spec = load_podspec(spm: false)
    assert_equal %w[Core NewArch], spec.default_subspecs
    assert_equal StripeSPM::CORE_PRODUCTS.sort, native_dependencies(subspec(spec, 'Core')).map(&:name).sort
    refute_includes native_dependencies(subspec(spec, 'Core')).map(&:name), 'StripeIdentity'
    refute_includes native_dependencies(subspec(spec, 'Core')).map(&:name), 'StripeCryptoOnramp'
    refute_includes compilation_conditions(spec), 'STRIPE_IDENTITY'
    refute_includes compilation_conditions(subspec(spec, 'Core')), 'STRIPE_IDENTITY'
  end

  def test_identity_subspec_enables_implementation_and_uses_the_shared_native_pin
    spec = load_podspec(spm: false)
    identity = subspec(spec, 'Identity')
    assert_includes identity.dependencies.map(&:name), 'stripe-react-native/Core'
    assert_equal ['StripeIdentity'], native_dependencies(identity).map(&:name)
    assert_includes compilation_conditions(identity), '$(inherited)'
    assert_includes compilation_conditions(identity), 'STRIPE_IDENTITY'
    assert_equal native_dependencies(subspec(spec, 'Core')).first.requirement,
                 native_dependencies(identity).first.requirement
  end

  def test_onramp_subspec_resolves_identity_and_uses_the_same_native_pin
    spec = load_podspec(spm: false)
    onramp = subspec(spec, 'Onramp')
    assert_includes onramp.dependencies.map(&:name), 'stripe-react-native/Identity'
    assert_equal ['StripeCryptoOnramp'], native_dependencies(onramp).map(&:name)
    assert_equal native_dependencies(subspec(spec, 'Identity')).first.requirement,
                 native_dependencies(onramp).first.requirement
  end

  def test_spm_podspec_declares_only_core_products_and_shares_the_fallback_version
    fallback = load_podspec(spm: false)
    requirements = fallback.subspecs.flat_map { |spec| native_dependencies(spec) }.map(&:requirement)
    assert_equal 1, requirements.map(&:to_s).uniq.length
    assert_equal '=', requirements.first.requirements.first.first
    version = requirements.first.requirements.first.last.to_s

    spm = load_podspec(spm: true)
    assert_empty spm.subspecs.flat_map { |spec| native_dependencies(spec) }
    assert_equal 1, $stripe_spm_test_declarations.length
    declaration = $stripe_spm_test_declarations.first
    assert_equal 'stripe-react-native', declaration[:spec_name]
    assert_equal StripeSPM::CORE_PRODUCTS, declaration[:products]
    refute_includes declaration[:products], 'StripeIdentity'
    refute_includes declaration[:products], 'StripeCryptoOnramp'
    assert_equal({ kind: 'exactVersion', version: version }, declaration[:requirement])
    assert_includes compilation_conditions(subspec(spm, 'Identity')), 'STRIPE_IDENTITY'
    assert_includes subspec(spm, 'Onramp').dependencies.map(&:name), 'stripe-react-native/Identity'
  end

  def test_each_optional_product_combination_follows_resolved_subspecs
    [[], ['Identity'], ['Onramp'], %w[Identity Onramp]].each_with_index do |names, index|
      target, native = add_target("stripe-react-native-#{index}", names)
      StripeSPM.activate!(TEST_VERSION)
      StripeSPM.apply_pods_project(Installer.new([target], @project))
      expected = names.map { |name| StripeSPM::OPTIONAL_PRODUCTS.fetch("stripe-react-native/#{name}") }
      assert_equal expected.sort, product_names(native).sort
    end
  end

  def test_repeated_hooks_keep_one_reference_without_rewriting_it
    target, native = add_target('stripe-react-native', %w[Identity Onramp])
    installer = Installer.new([target], @project)
    StripeSPM.activate!(TEST_VERSION)
    StripeSPM.apply_pods_project(installer)
    references = native.package_product_dependencies.to_a
    serialized = @project.to_ascii_plist

    StripeSPM.apply_pods_project(installer)

    assert_equal references, native.package_product_dependencies.to_a
    assert_equal serialized, @project.to_ascii_plist
  end

  def test_opt_out_removes_only_the_matching_optional_reference
    target, native = add_target('stripe-react-native', %w[Identity Onramp])
    core = add_product(native, 'StripePaymentSheet')
    foreign = add_product(native, 'StripeIdentity', add_package('https://example.com/unrelated.git'))
    installer = Installer.new([target], @project)
    StripeSPM.activate!(TEST_VERSION)
    StripeSPM.apply_pods_project(installer)
    managed_identity = native.package_product_dependencies.find { |dep| dep.product_name == 'StripeIdentity' && dep.package == @package }
    target.specs = [Spec.new('stripe-react-native/Core')]

    StripeSPM.apply_pods_project(installer)

    assert_equal [core, foreign], native.package_product_dependencies.to_a
    refute @project.objects_by_uuid.key?(managed_identity.uuid)

    target.specs << Spec.new('stripe-react-native/Identity')
    StripeSPM.apply_pods_project(installer)
    restored = native.package_product_dependencies.select { |dep| dep.product_name == 'StripeIdentity' && dep.package == @package }
    assert_equal 1, restored.length
    assert_includes native.package_product_dependencies, core
    assert_includes native.package_product_dependencies, foreign
  end

  def test_upgrade_reuses_one_reference_and_updates_its_package
    target, native = add_target('stripe-react-native', ['Identity'])
    previous_package = add_package(StripeSPM::BRANCH_OVERRIDE_PACKAGE_URL)
    first = add_product(native, 'StripeIdentity', previous_package)
    duplicate = add_product(native, 'StripeIdentity', previous_package)
    orphan = add_product(native, 'StripeIdentity', nil)
    StripeSPM.activate!(TEST_VERSION)

    StripeSPM.apply_pods_project(Installer.new([target], @project))

    assert_equal [first], native.package_product_dependencies.to_a
    assert_equal @package, first.package
    refute @project.objects_by_uuid.key?(duplicate.uuid)
    refute @project.objects_by_uuid.key?(orphan.uuid)
  end

  def test_opt_out_does_not_remove_a_reference_shared_with_another_target
    target, native = add_target('stripe-react-native', [])
    _, other = add_target('unrelated', [])
    shared = add_product(native, 'StripeIdentity')
    other.package_product_dependencies << shared
    StripeSPM.activate!(TEST_VERSION)

    StripeSPM.apply_pods_project(Installer.new([target], @project))

    assert_empty native.package_product_dependencies
    assert_equal [shared], other.package_product_dependencies.to_a
    assert @project.objects_by_uuid.key?(shared.uuid)
  end

  def test_package_upgrade_does_not_modify_a_reference_shared_with_another_target
    target, native = add_target('stripe-react-native', ['Identity'])
    _, other = add_target('unrelated', [])
    previous_package = add_package(StripeSPM::BRANCH_OVERRIDE_PACKAGE_URL)
    shared = add_product(native, 'StripeIdentity', previous_package)
    other.package_product_dependencies << shared
    StripeSPM.activate!(TEST_VERSION)

    StripeSPM.apply_pods_project(Installer.new([target], @project))

    assert_equal ['StripeIdentity'], product_names(native)
    assert_equal @package, native.package_product_dependencies.first.package
    refute_equal shared, native.package_product_dependencies.first
    assert_equal [shared], other.package_product_dependencies.to_a
    assert_equal previous_package, shared.package
  end

  def test_all_pod_target_variants_receive_their_own_optional_products
    payments, payments_native = add_target('stripe-react-native-payments', [])
    identity, identity_native = add_target('stripe-react-native-identity', ['Identity'])
    onramp, onramp_native = add_target('stripe-react-native-onramp', %w[Identity Onramp])
    unrelated, unrelated_native = add_target('unrelated', ['Identity'])
    unrelated.pod_name = 'unrelated'
    StripeSPM.activate!(TEST_VERSION)

    StripeSPM.apply_pods_project(Installer.new([payments, identity, unrelated, onramp], @project))

    assert_empty product_names(payments_native)
    assert_equal ['StripeIdentity'], product_names(identity_native)
    assert_equal %w[StripeCryptoOnramp StripeIdentity], product_names(onramp_native).sort
    assert_empty product_names(unrelated_native)
  end

  def test_fallback_does_not_add_spm_products
    target, native = add_target('stripe-react-native', %w[Identity Onramp])

    StripeSPM.apply_pods_project(Installer.new([target], @project))

    assert_empty product_names(native)
  end

  def test_all_variants_are_validated_before_any_product_mutation
    identity, identity_native = add_target('stripe-react-native-identity', ['Identity'])
    unsupported, = add_target('stripe-react-native-static', ['Identity'])
    unsupported.dynamic = false
    StripeSPM.activate!(TEST_VERSION)

    assert_raises(Pod::Informative) do
      StripeSPM.apply_pods_project(Installer.new([identity, unsupported], @project))
    end
    assert_empty product_names(identity_native)
  end

  private

  def load_podspec(spm:)
    $StripeDisableSPM = !spm
    Pod::Specification.from_file(File.expand_path('../../stripe-react-native.podspec', __dir__))
  end

  def subspec(spec, name)
    spec.subspec_by_name("stripe-react-native/#{name}")
  end

  def native_dependencies(spec)
    spec.dependencies.select { |dependency| dependency.name.start_with?('Stripe') }
  end

  def compilation_conditions(spec)
    spec.attributes_hash.fetch('pod_target_xcconfig', {}).fetch('SWIFT_ACTIVE_COMPILATION_CONDITIONS', '').split
  end

  def add_target(label, optional_subspecs)
    native = @project.new_target(:framework, label, :ios, '15.1')
    specs = [Spec.new('stripe-react-native/Core')] + optional_subspecs.map { |name| Spec.new("stripe-react-native/#{name}") }
    [PodTarget.new('stripe-react-native', label, specs, true), native]
  end

  def add_package(url)
    package = @project.new(Xcodeproj::Project::Object::XCRemoteSwiftPackageReference)
    package.repositoryURL = url
    package.requirement = { 'kind' => 'exactVersion', 'version' => TEST_VERSION }
    @project.root_object.package_references << package
    package
  end

  def add_product(native, name, package = @package)
    product = @project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
    product.product_name = name
    product.package = package
    native.package_product_dependencies << product
    product
  end

  def product_names(native)
    native.package_product_dependencies.map(&:product_name)
  end
end
