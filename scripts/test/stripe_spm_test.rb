require 'minitest/autorun'

module Pod
  class Informative < StandardError; end

  class Installer
    attr_accessor :pod_targets, :pods_project, :post_install

    private

    def run_podfile_post_install_hooks
      post_install.call
      :completed
    end
  end
end

require_relative '../../stripe_spm'

class StripeSPMTest < Minitest::Test
  Package = Struct.new(:repositoryURL)
  Root = Struct.new(:package_references)
  Project = Struct.new(:root_object, :targets)
  Installer = Struct.new(:pod_targets, :pods_project)
  Configuration = Struct.new(:name)
  Spec = Struct.new(:name)

  class PodTarget
    attr_reader :pod_name, :label, :specs

    def initialize(linkage)
      @linkage = linkage
      @pod_name = StripeSPM::POD_NAME
      @label = @pod_name
      @specs = [Spec.new("#{@pod_name}/Core")]
    end

    def build_as_dynamic_framework?
      @linkage == :dynamic_framework
    end

    def build_as_static_library?
      @linkage == :static_library
    end

    def build_as_framework?
      [:dynamic_framework, :static_framework].include?(@linkage)
    end

    def build_as_dynamic?
      [:dynamic_framework, :dynamic_library].include?(@linkage)
    end
  end

  class NativeTarget
    attr_reader :name, :build_configurations

    def initialize(build_directories)
      @name = StripeSPM::POD_NAME
      @build_directories = build_directories
      @build_configurations = build_directories.keys.map { |name| Configuration.new(name) }
    end

    def build_settings(configuration)
      { 'CONFIGURATION_BUILD_DIR' => @build_directories.fetch(configuration) }
    end
  end

  def setup
    StripeSPM.activate!('26.14.0')
  end

  def teardown
    StripeSPM.activate!(nil)
  end

  def test_accepts_static_library_after_react_native_configures_shared_products
    native_target = NativeTarget.new(
      'Debug' => '${PODS_CONFIGURATION_BUILD_DIR}',
      'Release' => '${PODS_CONFIGURATION_BUILD_DIR}'
    )
    installer = Installer.new(
      [PodTarget.new(:static_library)],
      Project.new(Root.new([Package.new(StripeSPM.package_url)]), [native_target])
    )

    result = begin
      StripeSPM.apply_pods_project(installer)
    rescue Pod::Informative => error
      error.message
    end

    assert_nil(result)
  end

  def test_post_install_checks_static_linkage_after_the_podfile_configures_shared_products
    build_directories = { 'Debug' => '${PODS_CONFIGURATION_BUILD_DIR}/stripe-react-native' }
    native_target = NativeTarget.new(build_directories)
    installer = Pod::Installer.new
    installer.pod_targets = [PodTarget.new(:static_library)]
    installer.pods_project = Project.new(
      Root.new([Package.new(StripeSPM.package_url)]), [native_target]
    )
    installer.post_install = -> { build_directories['Debug'] = '${PODS_CONFIGURATION_BUILD_DIR}' }

    assert_equal(:completed, installer.send(:run_podfile_post_install_hooks))
  end

  def test_preserves_dynamic_framework_support
    installer = Installer.new(
      [PodTarget.new(:dynamic_framework)],
      Project.new(Root.new([Package.new(StripeSPM.package_url)]), [])
    )

    assert_nil(StripeSPM.apply_pods_project(installer))
  end

  def test_rejects_unsupported_linkage_even_with_a_shared_products_directory
    [:static_framework, :dynamic_library].each do |linkage|
      installer = Installer.new(
        [PodTarget.new(linkage)],
        Project.new(
          Root.new([Package.new(StripeSPM.package_url)]),
          [NativeTarget.new('Debug' => '${PODS_CONFIGURATION_BUILD_DIR}')]
        )
      )

      error = assert_raises(Pod::Informative) { StripeSPM.apply_pods_project(installer) }
      assert_includes(error.message, 'without a supported configuration')
    end
  end

  def test_rejects_static_library_when_any_configuration_uses_the_old_products_directory
    native_target = NativeTarget.new(
      'Debug' => '${PODS_CONFIGURATION_BUILD_DIR}',
      'Release' => '${PODS_CONFIGURATION_BUILD_DIR}/stripe-react-native'
    )
    installer = Installer.new(
      [PodTarget.new(:static_library)],
      Project.new(Root.new([Package.new(StripeSPM.package_url)]), [native_target])
    )

    error = assert_raises(Pod::Informative) { StripeSPM.apply_pods_project(installer) }
    assert_includes(error.message, 'Update React Native')
  end

  def test_rejects_static_library_without_a_configured_native_target
    [[], [NativeTarget.new({})]].each do |native_targets|
      installer = Installer.new(
        [PodTarget.new(:static_library)],
        Project.new(Root.new([Package.new(StripeSPM.package_url)]), native_targets)
      )

      assert_raises(Pod::Informative) { StripeSPM.apply_pods_project(installer) }
    end
  end

  def test_still_requires_react_native_to_add_the_stripe_package
    installer = Installer.new(
      [PodTarget.new(:static_library)],
      Project.new(Root.new([]), [NativeTarget.new('Debug' => '${PODS_CONFIGURATION_BUILD_DIR}')])
    )

    error = assert_raises(Pod::Informative) { StripeSPM.apply_pods_project(installer) }
    assert_includes(error.message, 'Swift package was not added')
  end
end
