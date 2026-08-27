# How stripe-react-native Resolves stripe-ios with Swift Package Manager

## Purpose of this document

This document explains the iOS dependency-resolution design implemented on the `gbirch/spm-investigation` branch. It is meant to teach the system from first principles: what was going to break, which part of the dependency chain actually needed to change, how CocoaPods and Swift Package Manager now cooperate, why dynamic frameworks are required, what the Ruby integration changes during `pod install`, and what happens later during an Xcode build and at application launch.

Implementation snapshot: draft PR [#2587](https://github.com/stripe/stripe-react-native/pull/2587), validated as of August 27, 2026. The branch pins stripe-ios 26.7.0; its example uses React Native 0.81.5 and CocoaPods 1.16.2, and CI builds with Xcode 26.4. Version numbers in the walkthrough describe that snapshot, while the architecture is intended to survive routine dependency updates.

The most important fact to establish at the beginning is this:

> `stripe-react-native` has not migrated from CocoaPods to Swift Package Manager. It is still integrated into a React Native application as a CocoaPods pod. Only its dependency on the underlying Stripe iOS SDK has moved from the CocoaPods registry to Swift Package Manager.

That distinction is the organizing idea for the whole solution.

## Executive summary

An application installs `@stripe/stripe-react-native` with npm or Yarn. React Native autolinking finds the package's podspec in `node_modules`, and CocoaPods creates the native `stripe-react-native` target as before. On React Native 0.75 or newer, however, that podspec no longer asks CocoaPods to fetch the `Stripe*` pods. Instead, it calls React Native's `spm_dependency` bridge to register the `stripe-ios-spm` package and the Stripe library products that the native wrapper imports.

During the application's normal `react_native_post_install`, React Native converts that registration into real Xcode objects inside the generated `Pods.xcodeproj`: one exact-version Swift package reference and product dependencies attached to the `stripe-react-native` target. Xcode then resolves, checks out, and builds stripe-ios from source when it builds the workspace.

The small Ruby helper shipped with the npm package completes the integration. It runs automatically near the end of `pod install`, after React Native has written the package reference. It:

- rejects unsupported static linkage with a useful error;
- verifies that the standard React Native post-install integration actually created the package reference;
- adds `StripeCryptoOnramp` only when the Onramp subspec is installed; and
- adds an application build phase that embeds and signs any dynamically built Stripe package frameworks so the process can load them at runtime.

Applications on React Native older than 0.75, and applications that explicitly set `$StripeDisableSPM = true`, retain the old CocoaPods dependency path for as long as stripe-ios continues publishing pods. One `stripe_version` value pins both paths to the same exact stripe-ios release.

At a high level, the new build graph is:

```text
npm / Yarn
    |
    | installs @stripe/stripe-react-native into node_modules
    v
React Native autolinking
    |
    | asks CocoaPods to integrate the local podspec
    v
CocoaPods: stripe-react-native dynamic framework target
    |
    | target has Xcode Swift-package product dependencies
    v
Xcode / Swift Package Manager: stripe-ios-spm at an exact version
    |
    | builds the Stripe products and their resources
    v
Application bundle
    |
    | contains stripe-react-native plus any dynamic Stripe frameworks
    v
dyld loads the complete runtime dependency graph
```

The old and new dependency-acquisition paths can be summarized as follows:

```text
Before
Application -> local stripe-react-native pod -> Stripe* pods from CocoaPods trunk

Now, by default on React Native >= 0.75
Application -> local stripe-react-native pod -> Stripe products from stripe-ios-spm

Fallback
Application -> local stripe-react-native pod -> Stripe* pods from CocoaPods trunk
```

## The pieces involved

The audience for this document is expected to know CocoaPods and Swift Package Manager at the application-development level. A few implementation-level distinctions are worth making explicit because the solution depends on them.

### Where React Native sits in the runtime stack

The public JavaScript/TypeScript API does not implement PaymentSheet, Apple Pay, or Financial Connections itself. It crosses React Native's native-module boundary into the iOS wrapper, whose Swift and Objective-C code calls stripe-ios:

```text
Application JavaScript
        |
        | React Native module call
        v
stripe-react-native native wrapper
        |
        | Swift API calls
        v
stripe-ios
```

React Native's old and new architectures use different machinery for the first boundary, which is why the podspec has architecture-specific sources and dependencies. Both use the same native Stripe modules at the second boundary. The SPM solution changes how those modules enter the Xcode build graph; it does not change the JavaScript API or native-module call flow.

### The npm package and the native pod are different distribution layers

`@stripe/stripe-react-native` is primarily distributed as an npm package. It contains JavaScript and TypeScript, the native iOS implementation, `stripe-react-native.podspec`, and now `stripe_spm.rb`. The `files` list in `package.json` explicitly includes `stripe_spm.rb`, which is essential: the podspec uses `require_relative 'stripe_spm'`, so a published npm tarball without that file would fail while CocoaPods evaluated the podspec.

React Native autolinking finds the podspec inside `node_modules` and makes CocoaPods install it from a local path. CocoaPods calls this a development pod. The native wrapper therefore does not depend on a copy of its own podspec being published to the CocoaPods specs registry.

The Stripe iOS SDK was different. Until this change, the local wrapper podspec declared dependencies such as `Stripe`, `StripePaymentSheet`, and `StripePayments`. CocoaPods resolved those names and versions through the public specs registry and downloaded the corresponding stripe-ios sources.

### The Podfile and the podspec have different owners

The application owns the `Podfile`. It chooses integration-wide policy such as framework linkage, declares application targets, and runs `post_install` hooks.

The library owns `stripe-react-native.podspec`. It describes the native source files, subspecs, React Native dependencies, and the native Stripe dependencies needed by the wrapper. React Native autolinking evaluates this file in the same Ruby process that is running CocoaPods.

This solution intentionally keeps almost all Stripe-specific behavior in the library's podspec and its shipped Ruby helper. A consumer needs the standard React Native Podfile structure and dynamic frameworks, but does not need to add Stripe package products through Xcode or invoke a Stripe-specific post-install function.

### CocoaPods creates more than one kind of target

CocoaPods analyzes the resolved specifications and creates pod targets for libraries such as `stripe-react-native`. It also creates aggregate targets that connect a Podfile target to the corresponding targets in the user's Xcode project. Those aggregate targets let the helper answer two different questions:

1. Which generated native pod target should receive Swift package product dependencies?
2. Which persistent application target consumes that pod and therefore needs the embed phase?

The first target lives in generated `Pods.xcodeproj`. The second lives in the application's own `.xcodeproj`.

### An Xcode workspace joins persistent and generated projects

The application's `.xcodeproj` is persistent. CocoaPods updates its integration, but the project remains from one `pod install` to the next.

`Pods.xcodeproj` is generated again during each install. In the resulting workspace, Xcode can build targets from both projects as one dependency graph. This persistence difference is why package references can simply be regenerated in the Pods project, while the helper has to add, update, and sometimes remove its application build phase carefully.

### A Swift package, product, and target are not synonyms

The repository at `https://github.com/stripe/stripe-ios-spm.git` is the package source. Its `Package.swift` exposes library products including `Stripe`, `StripePaymentSheet`, `StripePayments`, `StripePaymentsUI`, `StripeApplePay`, `StripeFinancialConnections`, and `StripeCryptoOnramp`. Each product is backed by one or more package targets, and those targets have their own transitive dependencies and resources.

For example, `StripePaymentSheet` depends on package targets including `StripePaymentsUI`, `StripeApplePay`, `StripePayments`, `StripeCore`, `StripeUICore`, and `StripeFinancialConnectionsLite`. `StripeCryptoOnramp` additionally reaches the Stripe Identity subtree. The wrapper attaches products, not arbitrary source directories, to its Xcode target; Swift Package Manager is responsible for expanding that product selection into the complete target graph.

The manifest declares these products with `.library(...)` and no explicit `.static` or `.dynamic` type. They therefore use Swift Package Manager's automatic linkage behavior. That fact becomes important when we discuss the dynamic-framework requirement.

### Compile, link, embed, and load are four separate stages

Many confusing failures in mixed CocoaPods/SPM builds come from treating these stages as one operation:

- During compilation, the Swift compiler needs to find modules such as `StripePaymentSheet` and type-check references to them.
- During linking, a target must obtain implementations for the symbols referenced by its object files. Static archives and dynamic frameworks behave differently here.
- During embedding, any dynamic libraries needed on a device must be copied into the application bundle and signed.
- At launch, `dyld` follows the load commands recorded in the executables and must find compatible binaries at their expected runtime paths.

A build can compile successfully and fail to link. It can also compile and link successfully but crash immediately at launch because a linked dynamic framework was never embedded. The implementation addresses both boundaries separately.

## The original dependency path and the precise problem

Before this branch, the Core subspec declared exact-version CocoaPods dependencies on:

- `Stripe`
- `StripePaymentSheet`
- `StripePayments`
- `StripePaymentsUI`
- `StripeApplePay`
- `StripeFinancialConnections`

The optional Onramp subspec declared `StripeCryptoOnramp` at the same version. Those direct dependencies caused CocoaPods to resolve the full transitive stripe-ios pod graph from trunk. `Podfile.lock` recorded all of those pods, their transitive pods, and the `trunk` spec repository as their source.

Two changes make that path unsuitable for future stripe-ios releases:

1. stripe-ios is deprecating CocoaPods support. Its final pod-publishing date is a product and release-coordination question, but new native SDK releases cannot rely indefinitely on podspec publication.
2. CocoaPods trunk becomes permanently read-only on December 2, 2026. Existing specifications remain available, but nobody can publish a new pod version after that point.

The second point is sometimes summarized as "CocoaPods is going away," which is too broad and leads to the wrong architecture. CocoaPods can continue installing existing specifications and can continue integrating local pods. The affected edge is narrower:

```text
local stripe-react-native podspec
            |
            | s.dependency 'StripePaymentSheet', '26.7.0'
            v
CocoaPods trunk specification for a newly published stripe-ios version
```

The left side is safe because it comes from `node_modules`. The right side eventually cannot advance. The task was therefore not to replace CocoaPods throughout React Native. It was to replace the registry-dependent acquisition of stripe-ios while preserving the established CocoaPods integration of the React Native wrapper.

That narrower scope matters operationally. A full migration of `stripe-react-native` to its own `Package.swift` would also need a released React Native mechanism for discovering and integrating native Swift packages from npm dependencies, including the wrapper's Objective-C, Swift, C++, generated-code, and architecture-specific dependencies. That ecosystem transition is not ready today and is unnecessary to solve the registry deadline.

## Design goals

The implementation was designed around the following constraints:

- Keep React Native autolinking and the existing npm installation experience.
- Stop requiring new stripe-ios releases to exist in CocoaPods trunk.
- Use React Native's supported CocoaPods/SPM bridge rather than asking every application to edit its Xcode project manually.
- Preserve the exact native SDK pin used by each React Native SDK release.
- Keep the optional Onramp dependency optional.
- Fail during `pod install` with a useful explanation when the selected linkage cannot work, rather than allowing a later undefined-symbol or launch failure.
- Work without a Stripe-specific line in the consumer's `post_install` block.
- Preserve an explicit CocoaPods fallback for older React Native versions and for applications that cannot yet adopt dynamic frameworks.
- Make repeat installs idempotent, including transitions from SPM mode back to the fallback.
- Exercise both React Native architectures in SPM mode while retaining dedicated CI coverage of the fallback.

## Why the hybrid architecture was chosen

React Native 0.75 introduced an official helper named `spm_dependency`. A podspec can use it to describe a Swift package URL, a version requirement, and the products that its pod target consumes. Later, `react_native_post_install` materializes that declaration in `Pods.xcodeproj` with Xcodeproj.

This is exactly the bridge needed here: CocoaPods still owns the wrapper target, while Xcode and Swift Package Manager own the underlying native SDK. react-native-firebase independently shipped the same broad architecture for Firebase's CocoaPods deprecation, including a shipped Ruby helper, dynamic-framework validation, and an application embed phase. Following that production precedent gives React Native applications that use both SDKs a consistent integration model.

Stripe's case is simpler than Firebase's in several ways:

- One `stripe-react-native` pod target consumes the Stripe products, rather than many wrapper pods consuming overlapping products.
- stripe-ios is a source package and has no binary package targets that require archive-signature workarounds.
- The wrapper's Stripe module imports are in Swift; it does not have Objective-C++ files trying to import Swift package modules.
- The application does not need to call a Stripe package API directly during native startup, so no Stripe product needs to be linked directly into the user's target for initialization.

The selected architecture still needs more than the one `spm_dependency` call. React Native's bridge writes package references and product dependencies, but it does not validate the wrapper's build type, account for subspec-only products, or embed dynamic frameworks that are linked only through a pod target. `stripe_spm.rb` supplies those missing pieces.

The implementation also avoids copying workarounds merely because Firebase needed them. It does not add `-ObjC`, because Stripe has no equivalent reflection-discovered Objective-C registrations. It does not disable Swift explicit modules, because stripe-ios builds successfully under the branch's Xcode 26.4 jobs. It has no binary-target Archive signature workaround because the package is source-only. It also omits Firebase's guard for a rare Xcode-project UUID corruption that has not been reproduced here. Each can be reconsidered if evidence appears, but none belongs in the default integration preemptively.

## Where the implementation lives

The final system is spread across a small number of files, each with a distinct responsibility.

### `stripe-react-native.podspec`

The podspec owns the mode decision and dependency declarations. It:

- loads `stripe_spm.rb`;
- defines the single `stripe_version` value, currently `26.7.0` on this branch;
- activates the SPM declaration when `stripe_spm_enabled?` returns true;
- declares the six Core `Stripe*` pods only in fallback mode;
- declares `StripeCryptoOnramp` only for the Onramp subspec and only in fallback mode; and
- scopes the New Architecture private-header glob to the subspec's own source directory, a migration-safety fix discussed later.

### `stripe_spm.rb`

This is the shipped integration helper. It defines the package URL and product set, chooses an exact-version or CI branch requirement, records whether SPM mode is active, wraps a CocoaPods installer hook, validates the generated configuration, conditionally adds the Onramp product, and maintains the application embed phase.

### React Native's `scripts/cocoapods/spm.rb`

This code comes from the application's installed React Native version, not from Stripe. Its process-wide `SPMManager` records declarations made by podspecs. `react_native_post_install` later asks it to update `Pods.xcodeproj` with `XCRemoteSwiftPackageReference` and `XCSwiftPackageProductDependency` objects.

### `example/ios/Podfile`

The example app is also the native iOS test harness. Its Podfile demonstrates default SPM mode and the fallback toggle, and contains additional workarounds needed by `react-native-test-app` under dynamic frameworks. Those test-harness changes are intentionally separate from the shipped integration; consumer applications should not copy them indiscriminately.

### `package.json`

The npm publication allowlist includes `stripe_spm.rb`, and the iOS unit-test command now runs the tests through the generated application test target used by the SPM configuration.

### `bitrise.yml`

CI runs SPM builds and tests on both React Native architectures. A separate build-only workflow enables the CocoaPods fallback so that the compatibility path remains continuously exercised.

## The complete `pod install` lifecycle

The easiest way to understand the implementation is to follow one default SPM installation in chronological order.

### 1. The Podfile loads React Native's CocoaPods scripts

A normal React Native Podfile loads `react_native_pods.rb` before autolinking evaluates dependency podspecs. On React Native 0.75 and newer, that script defines a top-level Ruby function named `spm_dependency` and creates a process-wide `SPMManager` instance.

The application also configures dynamic frameworks:

```ruby
use_frameworks! :linkage => :dynamic
```

This is an application-wide CocoaPods policy. The Stripe helper will later inspect the actual generated pod target rather than trusting that the Podfile used a particular spelling.

### 2. React Native autolinking discovers the local podspec

Autolinking sees `stripe-react-native.podspec` in the npm dependency and causes CocoaPods to evaluate it as a local development pod. Evaluation happens inside the same Ruby process in which the Podfile loaded React Native's helper.

At the top, the podspec runs:

```ruby
require_relative 'stripe_spm'
```

Loading that file defines the Stripe integration functions and installs the CocoaPods method wrapper, guarded so it happens at most once even if the file is reached through more than one path.

### 3. The podspec selects SPM or fallback mode

The decision is deliberately based on capability rather than parsing a React Native version string. In simplified form:

```ruby
def stripe_spm_enabled?
  return false unless defined?(spm_dependency)
  return false if defined?($StripeDisableSPM) && $StripeDisableSPM == true

  true
end
```

This produces three supported modes:

- React Native 0.75 or newer, no opt-out: `spm_dependency` exists, so SPM mode is active.
- React Native 0.75 or newer with `$StripeDisableSPM = true`: fallback mode is active.
- React Native older than 0.75: the helper function does not exist, so fallback mode is automatic.

Checking specifically for `true` is intentional. A tool may emit `$StripeDisableSPM = false`; that should not disable SPM.

### 4. The root podspec registers the package declaration

In SPM mode, the podspec calls:

```ruby
stripe_spm_activate!(s, version: stripe_version)
```

Activation does two things. First, it stores the selected version in `StripeSPM`, marking this CocoaPods process as active for the later installer hook. CocoaPods can evaluate a podspec multiple times, so this state assignment is deliberately harmless when repeated.

Second, it calls React Native's bridge with the root specification:

```ruby
spm_dependency(
  spec,
  url: 'https://github.com/stripe/stripe-ios-spm.git',
  requirement: { kind: 'exactVersion', version: '26.7.0' },
  products: [
    'Stripe',
    'StripePaymentSheet',
    'StripePayments',
    'StripePaymentsUI',
    'StripeApplePay',
    'StripeFinancialConnections'
  ]
)
```

This call does not resolve a package, edit a project, or invoke Xcode. React Native's manager only stores a Ruby data structure keyed by the podspec name. This separation is necessary because the Pods project and native target do not exist yet.

The declaration is made on the root specification rather than the Core subspec. React Native later looks for an Xcode target whose name matches the recorded specification name. CocoaPods merges a root pod's selected subspecs into one native target, so the stable match is the root `stripe-react-native` name.

### 5. The podspec omits the Stripe pod dependencies

The Core and Onramp CocoaPods dependency lines are wrapped in `unless stripe_spm_enabled?`. In SPM mode, CocoaPods therefore resolves the wrapper and its React Native dependencies but does not resolve any `Stripe*` pods.

This is observable in `Podfile.lock`: the current generated lockfile contains `stripe-react-native` and its selected subspecs, but no Stripe iOS SDK pods and no Stripe entries under `SPEC REPOS: trunk`. That absence is expected. `Podfile.lock` describes CocoaPods' graph; stripe-ios now belongs to Xcode's package graph.

It is important not to declare both forms. Adding Stripe pods while also attaching the equivalent SPM products would build two copies of the native SDK and can produce duplicate symbols, incompatible module definitions, or ambiguous runtime artifacts.

### 6. CocoaPods resolves the pod graph and generates targets

CocoaPods completes dependency analysis, downloads any pod dependencies, determines build types, and generates `Pods.xcodeproj`. Because the Podfile selected dynamic frameworks, the `stripe-react-native` pod target is a dynamic framework target.

At this point the target exists, but the package declaration still lives only in React Native's in-memory manager.

### 7. The Podfile's normal post-install hook calls `react_native_post_install`

CocoaPods calls its private `run_podfile_post_install_hooks` method after generating the in-memory Pods project and before saving that project to disk. The standard React Native Podfile's `post_install` block invokes `react_native_post_install`.

Among many other React Native adjustments, that function calls `SPM.apply_on_post_install(installer)`. React Native's SPM manager then:

1. obtains `installer.pods_project`;
2. creates an `XCRemoteSwiftPackageReference` for the package URL and requirement;
3. finds the `stripe-react-native` native target by the root pod name;
4. creates one `XCSwiftPackageProductDependency` for every declared Core product;
5. attaches those product objects to the target's `packageProductDependencies`; and
6. adds a `SWIFT_INCLUDE_PATHS` workaround that helps the pod target find Swift package modules in Xcode's build products.

The generated project on this branch confirms the resulting structure:

```text
Pods.xcodeproj
  Project
    packageReferences
      stripe-ios-spm
        repositoryURL = https://github.com/stripe/stripe-ios-spm.git
        requirement = exactVersion 26.7.0

  Target: stripe-react-native
    productType = dynamic framework
    packageProductDependencies
      Stripe
      StripeApplePay
      StripeFinancialConnections
      StripePaymentSheet
      StripePayments
      StripePaymentsUI
```

There is no generated `Package.swift` for `stripe-react-native`, and the package is not manually added to the application project. These are native Xcode project objects inside `Pods.xcodeproj`, equivalent to configuring a package dependency for that generated target.

### 8. The Stripe installer wrapper runs after the normal hooks

When `stripe_spm.rb` was loaded, it aliased CocoaPods' original `run_podfile_post_install_hooks` method and replaced it with a small wrapper:

```ruby
def run_podfile_post_install_hooks
  result = stripe_spm_original_run_podfile_post_install_hooks
  StripeSPM.apply(self)
  result
end
```

Calling the original implementation first is the critical ordering guarantee. It lets the user's standard post-install block call `react_native_post_install`, which creates the package reference. Only then does `StripeSPM.apply` inspect and extend the result.

This method is a useful hook point because CocoaPods invokes it on every installation, even if the Podfile defines no user post-install block. Consumers do not need a Stripe-specific callback. A standard React Native post-install call is still required to materialize the package declaration; if it is missing, the Stripe helper produces an explicit error instead of allowing a later `no such module 'Stripe'` failure.

The alias guard checks both public and private method tables because CocoaPods 1.16.2 defines `run_podfile_post_install_hooks` as private, and Ruby preserves visibility when aliasing a method. Without the private-method check, a second load could wrap the method again.

### 9. `StripeSPM.apply` validates, extends, and integrates

The apply method follows a small decision tree:

```text
Is there a stripe-react-native pod target?
  no  -> return; this installation is unrelated
  yes -> Is SPM mode active?
           no  -> remove_embed_phase; then return
           yes -> verify_dynamic_linkage!
                  find_package_reference!
                  link_onramp_product if its subspec was selected
                  add_embed_phase
```

Validation precedes mutation. An unsupported build type fails with actionable configuration choices before the helper starts modifying projects. A missing package reference also fails before Onramp or embed-phase changes are made.

### 10. CocoaPods saves the projects and finishes integration

The regular post-install hooks and the Stripe wrapper both run inside CocoaPods' Pods-project writer, before it saves the generated project. The package and product objects are therefore serialized into `Pods.xcodeproj` as part of the normal install.

The helper also saves a user's project when it actually added, changed, or removed an embed phase. It does not save an unchanged project, so repeat `pod install` runs remain diff-free.

Afterward, CocoaPods completes user-project and workspace integration. The example harness has a separate `post_integrate` block for its generated test target; that is test infrastructure, not part of the shipped Stripe mechanism.

### 11. Xcode resolves and builds the package

When the workspace is built, Xcode sees the remote package reference in `Pods.xcodeproj`. It resolves the exact `26.7.0` tag from the lightweight `stripe-ios-spm` mirror, checks out the sources, evaluates the package manifest, and builds the selected products plus their transitive targets and resources.

The mirror contains tagged release source without the full development history, tests, and examples of the main stripe-ios repository. It reduces checkout cost without changing the package manifest or released source graph.

The wrapper's Swift sources compile against modules from those package products. Because the product dependencies are on the `stripe-react-native` target, Xcode also incorporates or links their implementations when it links that target as a dynamic framework.

### 12. The application embeds and loads the result

If Xcode emitted any Stripe package products as dynamic frameworks, the application build phase installed by `stripe_spm.rb` copies them into the app's Frameworks directory and signs them. At launch, `dyld` can then satisfy the wrapper framework's recorded runtime dependencies.

This last step is not redundant with successful compilation or linking. It closes the final gap between a package product attached to a pod target and a self-contained application bundle.

## Why dynamic frameworks are required

The dynamic-framework requirement is the least obvious part of the user-facing migration. It follows from where React Native attaches the package products and from what a static archive can represent.

### Seeing a module does not mean owning its implementation

Once React Native writes the package product dependencies and Swift include paths, the wrapper's source can compile statements such as:

```swift
import Stripe
import StripeFinancialConnections
import StripePaymentSheet
```

That proves that the compiler found module interfaces. It does not prove that the final application link will contain the corresponding symbol implementations.

### What goes wrong with a static library

React Native applications traditionally build most source pods as static libraries. A static library is an archive of that target's object files. Creating the archive is not a general-purpose linker invocation that recursively absorbs all dependencies of the target.

In a simplified static configuration:

```text
Compile stripe-react-native sources
        |
        v
stripe-react-native object files
        |
        | archive
        v
libstripe-react-native.a

Final application link sees CocoaPods' static archives,
but the app target has no direct Stripe SPM product dependency.
        |
        v
undefined Stripe symbols
```

The package products are attached to the generated wrapper target, not to the application target. If the wrapper target only produces an archive, there is no dynamic link step at that boundary that can consume those package dependencies. When the application later performs its final link, CocoaPods gives it the pod archives it knows about, but the Stripe SPM products are not CocoaPods pods and are not direct application dependencies. The build reaches the final link without a path that supplies the implementations.

A static framework has a framework-shaped bundle around a static archive, so it has the same fundamental issue. That is why checking only `build_as_framework?` would be insufficient.

### What a dynamic framework changes

A dynamic framework target has a real linker step of its own. Xcode can pass the target's Swift package product dependencies to that link step:

```text
stripe-react-native object files + Stripe package products
                         |
                         | dynamic link
                         v
             stripe_react_native.framework
                         |
                         | linked by application
                         v
                    application
```

If Xcode chooses a static representation for an automatic-linkage package component, its code can be incorporated during the wrapper framework's link. If Xcode chooses a dynamic framework representation, the wrapper records a load dependency on that framework. In either case there is now a real link boundary at which the product dependency participates.

The implementation therefore accepts only the actual CocoaPods predicate `pod_target.build_as_dynamic_framework?`. It does not infer support from an environment variable, and it does not use CocoaPods' private `build_type` reader. The public `build_as_*` predicates are the supported API in CocoaPods 1.16.2.

When the check fails, `pod install` identifies whether the target is a static library, static framework, or another unsupported form and presents both available actions:

- enable `use_frameworks! :linkage => :dynamic`; or
- set `$StripeDisableSPM = true` and use the CocoaPods fallback while it remains available.

Failing at install time is materially better than letting developers wait through package compilation and receive undefined Stripe symbols from an application link.

### Why this can expose unrelated dependency bugs

`use_frameworks! :linkage => :dynamic` affects the broader pod graph, not only Stripe. With static libraries, many unresolved references can wait until the final application link, where another archive happens to provide them. With dynamic frameworks, each pod framework generally has to resolve the symbols it uses during its own link.

That stricter boundary exposes pods that compile against transitive headers but fail to declare or link the library that owns the implementations. Several old-architecture example-app failures on this branch were instances of that pattern. They were not failures of the Stripe package bridge, but they are representative of the integration risk for an existing application changing from static pods to dynamic frameworks.

An application that already uses dynamic frameworks is therefore much less likely to encounter migration-specific linkage surprises. An application switching a large, older pod graph from static to dynamic should treat that linkage change as the main compatibility risk and can use the opt-out as a temporary pressure valve.

### What future static support would require

In principle, a single-wrapper SDK may be able to support static CocoaPods linkage by also attaching the Stripe package products to each consuming application target. That would put the products in the application's final link and would let Xcode manage direct application package dependencies.

The branch deliberately does not implement that novel path. Correct support would need to handle multiple app targets, extensions, conditional subspec products, duplication with other package consumers, project persistence, embedding, and transitions between modes. Dynamic frameworks match the already-shipped React Native Firebase model and provide a known-correct link boundary today.

## Why a separate embed phase is required

Dynamic linking solves symbol resolution for the wrapper target, but it creates a runtime packaging obligation.

### Linking records a dependency; it does not guarantee bundle contents

Suppose Xcode builds `StripePaymentSheet.framework` dynamically. The linker can successfully build `stripe_react_native.framework` and record a load command for `@rpath/StripePaymentSheet.framework/StripePaymentSheet`. The application can then link successfully against the wrapper.

At launch, however, `dyld` follows that load command. If `StripePaymentSheet.framework` is absent from the application bundle, the process terminates with an error such as:

```text
dyld: Library not loaded: @rpath/StripePaymentSheet.framework/StripePaymentSheet
```

### Why neither Xcode nor CocoaPods embeds it automatically

Xcode normally embeds dynamic Swift package products when they are linked directly by the application target. Here they are linked by a pod target in another project.

CocoaPods' `[CP] Embed Pods Frameworks` phase knows how to copy CocoaPods-managed frameworks. It does not know that a pod target has nested Xcode Swift package product dependencies. Consequently, each build system has only half of the information:

- Xcode knows the pod target's SPM dependencies but does not see them as direct application products to embed.
- CocoaPods knows the application consumes the wrapper framework but does not manage the Stripe package artifacts.

The custom phase explicitly bridges that ownership gap.

### What the embed script does

For every application target that consumes `stripe-react-native`, the helper creates a shell phase named:

```text
[stripe-react-native] Embed SPM Frameworks
```

On every application build, the phase:

1. Exits successfully if `FRAMEWORKS_FOLDER_PATH` is unset, because the current target has no framework destination.
2. Computes the destination as `${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}` and creates it if necessary.
3. Searches `${BUILT_PRODUCTS_DIR}/PackageFrameworks`, where package frameworks appear in normal builds.
4. Also searches `${OBJROOT}/UninstalledProducts/${PLATFORM_NAME}`, the location used by relevant Archive builds that do not populate `PackageFrameworks`.
5. Considers only directories matching `Stripe*.framework`, so it never takes responsibility for Firebase or another package family's artifacts.
6. Verifies that the expected executable exists inside each framework.
7. Uses `file` to skip static framework binaries. Static frameworks must not be embedded; doing so can fail App Store validation, and their code has already been incorporated at link time.
8. Skips a framework when the destination already contains it, allowing another correct embed phase to remain authoritative.
9. Copies the framework with `rsync`, excluding development-only `Headers`, `PrivateHeaders`, and `Modules` directories.
10. Re-signs the copied framework when code signing is allowed and an expanded signing identity exists, while preserving identifiers and entitlements.

The set of package frameworks is not statically knowable, so the phase has no fixed input/output file lists. When supported by the installed Xcodeproj version, the helper marks it `always_out_of_date = '1'` to make its always-run nature explicit.

The script does not assume every Stripe product becomes dynamic. It discovers actual build outputs and embeds only binaries identified as dynamically linked. That makes it compatible with Swift Package Manager's automatic linkage decisions.

### Which targets receive the phase

The shared `each_user_app_target` helper walks CocoaPods aggregate targets and selects only those whose resolved pod targets include `stripe-react-native`. Within the associated user project, it adds the phase only to targets whose Xcode `symbol_type` is `:application`.

Unit-test targets do not get their own copy because they load the package graph through a host application. Extensions are also not treated as applications by this code. The helper saves a user project only when at least one phase changed.

### Why cleanup matters

`Pods.xcodeproj` is disposable and regenerated. The application project is persistent. If an application performs one install in SPM mode and a later install with `$StripeDisableSPM = true`, the old build phase would otherwise remain in the application project even though there are no SPM Stripe frameworks to embed.

In fallback mode, the helper still runs, finds the selected `stripe-react-native` pod target, and removes the named phase from consuming application targets. This makes opting out a complete transition rather than merely changing dependency declarations.

## How the optional Onramp product is handled

The Core products can be declared together on the root podspec because every installation needs them. `StripeCryptoOnramp` must remain conditional: it brings its own code, resources, and the Stripe Identity dependency subtree, and only applications that select `stripe-react-native/Onramp` should pay that cost.

The obvious implementation would be to call `spm_dependency` from the Onramp subspec. React Native's bridge cannot currently apply that declaration correctly:

1. At podspec-evaluation time, React Native keys a declaration by `pod_spec.name`.
2. For the subspec, that name is `stripe-react-native/Onramp`.
3. During post-install, React Native searches `Pods.xcodeproj` for a target with exactly that name.
4. CocoaPods does not create a separate target for the selected subspec. It merges Core, Onramp, and possibly NewArch into the root `stripe-react-native` pod target.
5. The exact target lookup therefore finds nowhere to attach the product to the actual root target. The subspec declaration cannot produce the required project configuration.

Declaring Onramp unconditionally with the root products would work mechanically but would destroy the feature's optionality.

The Stripe helper reconstructs the intended subspec semantics after CocoaPods has completed resolution. It checks the selected `Pod::Target#specs` for the exact `stripe-react-native/Onramp` specification. If present, it finds the native target using the pod target's label, creates an `XCSwiftPackageProductDependency` named `StripeCryptoOnramp`, points it at the already-created stripe-ios package reference, and appends it to the target.

The method first checks whether that product is already attached, making it idempotent. In the example app's generated project, the final package product list contains the six Core products plus `StripeCryptoOnramp`, confirming both paths converge on the same target.

The native wrapper also guards Onramp imports and implementation sections with `#if canImport(StripeCryptoOnramp)`. Attaching the product to the shared target makes that module available when the subspec is selected; leaving it unattached excludes those guarded sections in Core-only builds. The podspec's selected source files and the package product therefore move together.

In fallback mode, CocoaPods' own subspec semantics handle the same choice: only the Onramp subspec declares the exact-version `StripeCryptoOnramp` pod dependency.

## The supported modes

### Default SPM mode

Conditions:

- React Native defines `spm_dependency`, which means 0.75 or newer in supported standard setups.
- `$StripeDisableSPM` is not exactly `true`.
- `stripe-react-native` actually builds as a dynamic framework.

Behavior:

- CocoaPods integrates the React Native wrapper but no Stripe SDK pods.
- React Native writes the exact-version stripe-ios package reference into `Pods.xcodeproj`.
- The package products are attached to the wrapper target.
- The Stripe helper adds Onramp conditionally and maintains the embed phase.
- Xcode resolves and builds stripe-ios from source.

Required application configuration:

```ruby
use_frameworks! :linkage => :dynamic
```

For Expo prebuild, the corresponding configuration is `"useFrameworks": "dynamic"` through `expo-build-properties`.

### Explicit CocoaPods fallback

Configuration at the top of the application's Podfile:

```ruby
$StripeDisableSPM = true
```

Behavior:

- The podspec does not register a Swift package.
- The Core and optional Onramp subspecs declare their old exact-version Stripe pod dependencies.
- Static CocoaPods integration is allowed.
- The helper removes any stale Stripe SPM embed phase from the application project.

This mode is a compatibility bridge, not a permanent alternative source for future releases. It works only while the `stripe_version` selected by a stripe-react-native release exists in CocoaPods trunk. Existing published pod versions remain installable after trunk becomes read-only, but the fallback cannot acquire a native version that was never published there.

### Automatic legacy fallback

On React Native versions older than 0.75, `spm_dependency` is absent. The same fallback dependency declarations activate automatically. An older application does not have to set a flag merely to remain on its existing path.

### Maintainer branch-override mode

CI sometimes needs to validate stripe-react-native against unreleased stripe-ios changes. Setting:

```text
OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH=<branch>
```

changes two properties of the declaration:

- the URL becomes the full `https://github.com/stripe/stripe-ios.git` repository, because development branches do not exist in the release-only mirror; and
- the exact-version requirement becomes a branch requirement.

The rest of the pipeline is identical. This avoids appending temporary Stripe pod declarations to the Podfile, which would conflict with the active SPM copy. It is a maintainer/CI facility rather than a documented consumer version-selection API.

## Exact versioning and dependency parity

`stripe_version` in the podspec is the single native SDK version source. The SPM path stores it as an `exactVersion` requirement, while the fallback supplies it as the version argument to each `core.dependency` and `onramp.dependency` declaration.

An exact SPM pin deliberately preserves the old release policy. Each stripe-react-native release is tested against one specific stripe-ios release; moving to Swift Package Manager should not silently broaden that to a compatible-version range that can select a newer, untested SDK.

There are now two textual representations of the same logical native dependency set:

- `StripeSPM::CORE_PRODUCTS` in `stripe_spm.rb`; and
- the fallback `Stripe*` dependencies in `stripe-react-native.podspec`.

Maintainers must keep them synchronized. A product added to only the SPM list makes the two modes functionally different. A dependency added only to the fallback can leave the SPM wrapper unable to import or link its module.

`Podfile.lock` no longer records the Stripe SDK graph in SPM mode because CocoaPods does not own that graph. Reproducibility instead begins with the exact requirement serialized in the generated Xcode package reference; Xcode's package-resolution data resolves that requirement to a concrete revision. In fallback mode, the native graph remains entirely in `Podfile.lock` as before.

## Idempotence and project ownership

Podspecs and CocoaPods hooks can run more often than a casual reading of a Podfile suggests. The implementation treats repeat execution as normal.

- `StripeSPM.activate!` only records the version; repeated podspec evaluation assigns the same state.
- The CocoaPods method wrapper is installed once, with guards for both public and private aliases.
- React Native's manager finds or creates a package reference and product dependencies while rebuilding the generated Pods project.
- The Onramp helper checks for an existing product dependency before appending one.
- The embed helper finds its phase by a stable name. It does nothing when the existing shell script is current, updates the existing phase in place when a future SDK changes the script, and creates it only when absent.
- The user project is saved only after a real phase change.
- Fallback mode removes the persistent phase rather than assuming regeneration will remove it.

This behavior also reflects clear ownership boundaries. React Native owns the general translation from podspec SPM declarations into `Pods.xcodeproj`. Stripe adds only the package behavior React Native cannot infer. The user's app project receives only the runtime embed phase, not a duplicate package reference or direct product list.

The helper returns immediately if the current CocoaPods installation has no `stripe-react-native` target. This matters in monorepos or tooling processes that may evaluate the helper while installing a different iOS project.

## What is shipped to consumers versus what is only test infrastructure

The branch contains substantial changes to `example/ios/Podfile` and `bitrise.yml`. They are important evidence that the solution works, but not all of them are requirements for a merchant application. Keeping the boundary clear prevents example-harness workarounds from becoming cargo-cult integration advice.

### Shipped behavior

The behavior a package consumer receives is limited to:

- the conditional declarations in `stripe-react-native.podspec`;
- `stripe_spm.rb`, loaded by that podspec;
- the requirement to select dynamic frameworks in SPM mode;
- the automatic installer validation, Onramp attachment, and app embed phase; and
- the opt-out and automatic old-React-Native fallback.

A consumer does not need the example app's test-target wiring, React Native prebuilt-core matrix, DevSupport linker flags, or embedded CI JavaScript bundle.

### Why the example app needs extra machinery

The repository's example is generated by `react-native-test-app` and doubles as the native unit-test and end-to-end harness. It is not a plain application project checked into the repository. Its Podfile therefore has to configure both the SDK-under-test and a generated host project.

The example defaults to the same SPM mode consumers use. `STRIPE_DISABLE_SPM=1` maps to `$StripeDisableSPM = true` so maintainers and CI can exercise the fallback without editing the file. The Podfile selects dynamic frameworks only when SPM is active; fallback mode retains React Native's usual static-library shape.

### Why the native unit tests moved to the application test target

The podspec still describes a `Tests` test spec, but that target is not suitable for this SPM configuration. React Native attaches the package products to the root `stripe-react-native` native target. A separate CocoaPods test-spec target does not automatically receive equivalent SPM module visibility.

The example now declares `ReactTestAppTests`, and a `post_integrate` hook adds the repository's `ios/Tests` source files to that generated application test target. `post_integrate` is the right lifecycle point because `react-native-test-app` regenerates its user project during `pod install`, and CocoaPods runs this hook after user-project integration.

Some tests import Stripe modules directly, and `@testable import` of the wrapper can expose module references from its Swift interface. Xcode generates Clang module maps for the SPM package targets under `OBJROOT/GeneratedModuleMaps...`, but React Native's package wiring configures the pod target, not this external application test target. The Podfile therefore passes explicit `-fmodule-map-file` options for the Stripe package modules to the test target's Swift compiler.

These flags are intentionally not in the shipped podspec. Normal application code calls the React Native wrapper and does not directly compile the repository's native tests or import every Stripe module.

The generated app and test targets also enable `CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES`. This accommodates existing public wrapper headers that include React headers non-modularly when CocoaPods packages the wrapper as a framework. It is part of this test app's generated-project integration, not part of the SPM package declaration itself.

### React Native's two prebuilt mechanisms

The example enables two independent React Native optimizations differently:

- `RCT_USE_RN_DEP` supplies prebuilt third-party C++ dependencies such as folly, glog, fmt, and boost in `ReactNativeDependencies.xcframework`. It remains enabled on both architectures. Disabling it caused React Native's pinned source version of fmt to fail under Xcode 26's stricter Clang behavior.
- `RCT_USE_PREBUILT_RNCORE` supplies prebuilt React core in `React.xcframework`. It remains enabled for new-architecture builds and for the static fallback, but is disabled for old-architecture dynamic-framework builds. In that unusual combination, the prebuilt core exposes headers to old-architecture pods without propagating the framework linkage they need, producing undefined `RCT*` and Yoga symbols. Building React core from source restores ordinary CocoaPods dependency linkage and better matches real old-architecture applications.

These choices solve limitations of the example's experimental React Native prebuilt configuration. Nothing in `stripe_spm.rb` branches on the React Native architecture.

### The old-architecture DevSupport/Hermes fix

Dynamic frameworks also exposed an under-declared dependency in `react-native-test-app`'s `ReactTestApp-DevSupport` pod.

With Hermes enabled, React Native deliberately excludes `jsi.cpp` from the `React-jsi` pod because Hermes already contains the JSI symbol implementations; compiling both would violate the One Definition Rule. `React-jsi` declares a dependency on `hermes-engine`, but `ReactTestApp-DevSupport` compiles its own C++ that references JSI while declaring `React-jsi` rather than `hermes-engine` directly.

In a static build, those symbols can resolve at the final app link. In a dynamic build, DevSupport must resolve its own C++ references while linking its framework. Its generated search paths already include Hermes transitively, but its linker flags omit `-framework "hermes"`.

The example Podfile amends DevSupport's generated xcconfig files:

- new architecture with prebuilt React core links `React`, `ReactNativeDependencies`, and `hermes` explicitly;
- old architecture with source-built React core links only `hermes`, because the normal pod dependencies already provide the React frameworks; and
- fallback/static mode makes no change because per-pod dynamic linkage does not apply.

This is a precise test-harness correction, not a requirement imposed by Stripe or SPM. It is nevertheless a useful demonstration of what changes when every pod becomes a separate dynamic link unit.

### Why old-architecture unit-test CI builds a JavaScript bundle

CI has no Metro server. In Debug, the old-architecture `react-native-test-app` launch path waits for JavaScript to become available before the XCTest runner can establish its connection. The new-architecture bridgeless path happens to tolerate no bundle, but the old path does not.

The old-architecture unit-test workflow therefore runs the same JavaScript-bundle build step used by end-to-end jobs. After the Metro probe fails, the app can fall back to the embedded `main.ios.jsbundle` and finish launching. This has no relationship to how stripe-ios is resolved; it is required only to make that CI host app ready for XCTest.

## The dirty-install migration bug and why it mattered

The SPM transition uncovered a separate podspec bug that fresh CI sandboxes did not reveal.

The New Architecture subspec originally declared:

```ruby
ss.private_header_files = '**/*.h'
```

It is tempting to read this as "all headers among this subspec's source files." CocoaPods does not implement it that way. `private_header_files` is expanded independently against the pod root, subject to exclusion patterns; it is not intersected with `source_files`.

For a registry pod, the pod root is usually an isolated checkout. For a React Native development pod loaded from `node_modules`, the root can resolve to the whole package repository. The broad glob could therefore enter `example/ios/Pods/Headers/Private` and match CocoaPods header-store symlinks.

The first SPM-mode install after a CocoaPods-mode install removes the `Stripe*` pods from the sandbox. Symlinks left in the old header store can become dangling during that transition. CocoaPods 1.16.2 maps private headers through `realpath` while generating the target; `realpath` raises `Errno::ENOENT` for a dangling link.

The fix scopes the same intended header selection to the subspec's directory:

```ruby
ss.private_header_files = 'ios/NewArch/**/*.h'
```

This issue was not caused by Swift Package Manager, but the dependency-graph migration triggered the latent bug. It teaches two reusable lessons:

1. Podspec file globs are evaluated according to each attribute's CocoaPods semantics, not necessarily as filters over `source_files`.
2. A dependency migration must be tested on an existing sandbox, because a clean install validates only the destination state, not the transition from the old graph.

Deleting `example/ios/Pods` once was a valid local recovery for already-dangling state, but narrowing the glob was the durable repository fix.

## How CI validates the design

The final CI matrix separates the primary path from the compatibility path.

### SPM path

Both new-architecture and old-architecture jobs install the wrapper in SPM mode with dynamic frameworks. On each architecture, CI:

- builds the Release simulator application;
- runs the native unit-test target in a Debug host app; and
- runs the Maestro end-to-end flows against the built application.

The old-architecture work is meaningful because the core SPM mechanism contains no architecture branch. Running it on both architectures verifies that the wrapper's different native bridge sources compile and link against the same package products, while also exercising the stricter dynamic pod graph in both configurations.

### Fallback path

The `build-ios-fallback` workflow sets `STRIPE_DISABLE_SPM=1`, uses the new architecture, retains static CocoaPods libraries, and performs a build. It confirms that the exact-version `Stripe*` pod dependencies still resolve and that the opt-out configuration does not depend on the SPM project mutations.

It is build-only because the SPM workflows already supply behavioral test coverage, while the fallback job's purpose is to keep the alternate acquisition and linkage path honest.

### Toolchain coverage

The successful branch runs use React Native 0.81.5, CocoaPods 1.16.2, and Xcode 26.4. This is especially useful for validating CocoaPods API visibility and Xcode package behavior that local Ruby stubs cannot reproduce faithfully.

Release simulator builds are limited to arm64 in CI. That avoids compiling an unnecessary Intel simulator slice of the source package and reduces the cost of the matrix without changing application linkage semantics.

### Runtime evidence

The example application has also been built and launched on a simulator in default SPM mode. PaymentSheet rendered successfully. That result checks behavior not established by a link-only test:

- the application can load the wrapper and any dynamic Stripe frameworks at launch;
- the package's resource bundles are available through stripe-ios's `Bundle.module` behavior; and
- the native wrapper can execute real Stripe UI code rather than merely satisfy the linker.

An Archive/TestFlight pass and Expo prebuild validation remain separate release-readiness checks.

## What the solution does and does not solve

### It does solve

- Future default-path stripe-ios releases no longer need a corresponding `Stripe*` podspec in CocoaPods trunk.
- The React Native wrapper remains discoverable through existing npm installation and autolinking.
- The underlying native SDK is pinned exactly and built by Xcode from its supported Swift package.
- Core and Onramp installations retain their intended dependency boundaries.
- Incorrect static linkage and missing React Native post-install wiring fail early with tailored explanations.
- Dynamic package frameworks reach the application bundle and are signed for runtime loading.
- Users on older React Native versions or incompatible pod graphs have a temporary fallback.
- Switching back to the fallback cleans persistent application-project state.

### It does not solve

- It does not remove CocoaPods from React Native or from `stripe-react-native`.
- It does not provide static-linkage support for SPM mode.
- It does not make every third-party pod compatible with a switch to dynamic frameworks.
- It does not let the CocoaPods fallback install a stripe-ios version that was never published as pods.
- It does not turn `stripe-react-native` into a Swift package or generate a `Package.swift` for it.
- It does not make `Podfile.lock` the lockfile for the SPM portion of the graph.
- It does not require or encourage users to add stripe-ios manually to their application target.

## Alternatives considered

### Vendored prebuilt xcframeworks

stripe-ios publishes a zip containing prebuilt xcframeworks. The wrapper podspec could theoretically vendor those binaries and avoid both CocoaPods trunk and source package builds.

This would conceal the migration from users and could support older React Native versions, but it introduces substantial distribution problems. CocoaPods does not run a podspec `prepare_command` for a local development pod in the way this approach would need, so the npm install or podspec evaluation would have to download a large binary artifact. That adds network behavior, checksums, cache invalidation, and failure modes to package installation. Shipping many dynamic frameworks wholesale also risks a larger application footprint than source integration with normal dead stripping. Strategically, it would deepen investment in a CocoaPods-specific binary delivery mechanism at the moment the ecosystem is moving native dependencies to SPM.

The prebuilt archive remains a possible emergency distribution tool, not the preferred architecture.

### A complete Swift Package Manager migration for the wrapper

A clean end state would give `stripe-react-native` its own `Package.swift` and remove the podspec. That is not currently shippable to the supported React Native population. React Native still relies on CocoaPods for native module discovery, generated code, architecture-specific dependencies, and integration in released versions. Prototype SPM setup scripts do not constitute a stable consumer platform.

The hybrid solution is compatible with that future. Its package URL, exact native version, and selected product set can carry forward when React Native has a released end-to-end SPM integration for native modules.

### Requiring every application to add stripe-ios through Xcode

Applications could add stripe-ios themselves and attempt to make the local wrapper pod find it. That would push version ownership, target selection, optional Onramp handling, module search paths, multi-target behavior, and runtime embedding onto every consumer. It would also work against React Native autolinking's goal of making npm-native dependencies self-describing.

Using `spm_dependency` lets the wrapper own and version its native dependency, just as it did through its podspec, while producing standard Xcode package objects.

### Implementing static support immediately

Directly attaching products to application targets might eventually make static wrapper targets viable, but nobody had shipped the Stripe-specific multi-target lifecycle required to do this safely. It would also diverge from the React Native Firebase precedent and enlarge the first release's risk surface. The current fail-fast plus fallback gives applications a predictable migration path while leaving static support as an independently testable follow-up.

## Known boundaries and remaining risks

### Dynamic frameworks are an application-wide decision

This is the principal adoption cost. Applications with under-declared native dependencies may uncover unrelated linker failures when switching their whole pod graph. The Stripe helper can diagnose the wrapper's own build type, but it cannot repair arbitrary third-party pods.

### The fallback has a finite useful lifetime

The exact final stripe-ios pod-publishing date still determines how long opted-out applications can follow current native releases. Once a stripe-react-native release pins a stripe-ios version that has no published pods, that release's fallback declarations cannot resolve. Existing older combinations remain installable from the read-only registry.

### The platform floors are not yet expressed identically

At stripe-ios 26.7.0, `stripe-ios-spm` declares iOS 15, while `stripe-react-native.podspec` still declares iOS 13. React Native 0.76 and newer post-install behavior raises relevant targets in the current tested setup, but a React Native 0.75 application explicitly targeting iOS 13 or 14 may encounter an SPM platform-compatibility error. Aligning or clearly documenting the wrapper's effective floor should be considered before release.

### First builds do more source work

Xcode must clone and compile stripe-ios on the first package build. The release-only mirror limits checkout size, and subsequent builds benefit from package and build caches, but the latency should be measured in representative clean CI and developer environments. A first-party binary SPM product would be the natural lever if this becomes unacceptable.

### Archive behavior deserves an end-to-end pass

The embed script explicitly searches the Archive output location as well as normal `PackageFrameworks`, and it signs copied dynamic frameworks. A real Archive/TestFlight validation is still valuable because distribution signing, stripping, and App Store validation exercise a different path from simulator builds.

### Expo requires explicit validation and communication

Expo's default native linkage is commonly static. An Expo application must opt into dynamic frameworks through `expo-build-properties`, and Expo SDK releases may bundle a pinned stripe-react-native version. A clean prebuild and runtime test should confirm that the generated Podfile, project modifications, and config-plugin lifecycle preserve the intended setup.

### Old architecture is CI-proven but has less ecosystem precedent

The branch builds, unit-tests, launches, and runs Maestro flows in old-architecture SPM mode. The SPM mechanism itself is architecture-neutral. Still, React Native Firebase's at-scale precedent is new-architecture-only, and old-architecture applications are more likely to carry older pods that have only ever been exercised under static linkage. A plain React Native template smoke test would add a merchant-shaped data point beyond `react-native-test-app`.

### The embed helper intentionally targets applications

The current traversal adds the phase to application targets, not extensions. A future product requirement to execute the wrapper from an app extension would need an explicit review of package linkage, embedding ownership, extension-safe APIs, and App Store bundle rules rather than assuming the application-target behavior transfers unchanged.

## Troubleshooting by build stage

Mixed build systems are easier to debug when the observed failure is assigned to the stage that owns it.

### `pod install` says dynamic frameworks are required

Meaning: the podspec selected SPM mode, but CocoaPods resolved the actual `stripe-react-native` pod target as something other than a dynamic framework.

Checks:

- Confirm `use_frameworks! :linkage => :dynamic` is active for the Podfile target that integrates `stripe-react-native`.
- In Expo, confirm `expo-build-properties` generated `"useFrameworks": "dynamic"` into the native project.
- If the application cannot adopt dynamic frameworks yet, put `$StripeDisableSPM = true` at the top of the Podfile and reinstall.

### `pod install` says the Stripe Swift package was not added

Meaning: SPM mode was registered during podspec evaluation, but the expected `XCRemoteSwiftPackageReference` was absent after the normal post-install hooks.

Checks:

- Confirm the Podfile has a `post_install` block.
- Confirm that block invokes the installed React Native version's `react_native_post_install` with the standard arguments.
- Confirm no earlier exception or custom control flow skips that call.
- Do not manually add a package reference as a substitute; fix the standard React Native integration or use the fallback.

### Swift reports `no such module 'Stripe...'`

Meaning: compilation cannot see the package module.

Checks:

- Inspect `Pods.xcodeproj` for the stripe-ios remote package reference.
- Inspect the `stripe-react-native` target's `packageProductDependencies` for the module's public product.
- Confirm Xcode successfully resolved the exact package version.
- For repository unit tests specifically, confirm the generated-module-map flags were added to `ReactTestAppTests`; normal consumers should not need those test-only flags.

### The linker reports undefined Stripe symbols

Meaning: source compilation found the interfaces, but a link unit did not receive the implementations.

Checks:

- Verify the wrapper target is actually a dynamic framework.
- Verify the required package product is attached to that target.
- Check that the application has not combined manual stripe-ios SPM integration with fallback Stripe pods or another copy of the SDK.
- If the undefined symbols belong to a different pod or React Native library, audit that pod's declared dependencies under dynamic linkage rather than assuming the Stripe product list is responsible.

### The app builds but crashes with `dyld: Library not loaded`

Meaning: linking succeeded, but a required dynamic framework is missing or cannot be loaded from the application bundle.

Checks:

- Confirm the application target contains `[stripe-react-native] Embed SPM Frameworks`.
- Inspect the built `.app/Frameworks` directory for the named Stripe framework.
- Review the phase log to see which regular or Archive search directory existed and whether `file` classified the binary as dynamic.
- Check signing errors and the framework's runtime load path.
- If the app opted out after a prior SPM install, reinstall pods and confirm the stale phase was removed rather than trying to embed nonexistent package products.

### Onramp code is unavailable

Meaning: either the Onramp subspec was not selected or its conditional product was not attached.

Checks:

- Confirm CocoaPods resolved `stripe-react-native/Onramp`.
- Inspect the root wrapper target for `StripeCryptoOnramp` in `packageProductDependencies`.
- Do not move `StripeCryptoOnramp` into the unconditional Core list; that would make the feature and Stripe Identity subtree part of every app.

### SPM mode still shows `Stripe*` pods in `Podfile.lock`

Meaning: the install is not exclusively using the intended SPM path, or the lockfile is stale.

Checks:

- Confirm `$StripeDisableSPM` is not true.
- Search the Podfile and other podspec overrides for explicit `pod 'Stripe...'` declarations.
- Run the normal pod installation so the lockfile reflects the selected mode.
- Remember that the local `stripe-react-native` pod should remain in the lockfile; only the underlying Stripe iOS SDK pods disappear.

### A transition install fails on a private-header `realpath`

Meaning: a stale Pods sandbox may contain dangling header-store symlinks, historically exposed by the old unscoped New Architecture header glob.

Checks:

- Confirm the podspec uses `ios/NewArch/**/*.h`, not `**/*.h`, for `private_header_files`.
- Remove the stale `Pods` directory once and reinstall to repair already-corrupted local state.
- Audit any other development-pod globs that can escape their intended source subtree.

## Maintainer guide

### Updating stripe-ios

1. Change the one `stripe_version` value in `stripe-react-native.podspec`.
2. Confirm that tag exists in `stripe-ios-spm` and that its `Package.swift` still exposes every product in `StripeSPM::CORE_PRODUCTS` plus `StripeCryptoOnramp`.
3. Review the package's iOS platform requirement and any target or resource-layout changes.
4. Confirm the fallback pods exist at the same version if the fallback is still promised for that release.
5. Regenerate the example integration and inspect both the package reference and `Podfile.lock` behavior.
6. Exercise Core and Onramp separately so conditional product selection remains intentional.

### Changing native module usage

When wrapper source starts directly importing another stripe-ios module, determine which public Swift package product owns it. Add the equivalent dependency to both representations when appropriate:

- the SPM product list or conditional product logic; and
- the CocoaPods fallback dependency list.

Do not infer that a module is safely available merely because another package product currently has a transitive target dependency. Direct product declarations make the wrapper's compile and link requirements explicit and keep parity with the former pod graph.

### Changing the Ruby helper

Preserve these invariants:

- React Native's normal post-install work must run before `StripeSPM.apply`.
- Unsupported linkage and missing package references should fail before project mutations.
- Only public CocoaPods target predicates should be used; method visibility is part of the API contract.
- Package and product creation should remain idempotent.
- The embed phase must remain narrowly namespaced to Stripe, skip static frameworks, support normal and Archive locations, and sign copied dynamic frameworks.
- App-project changes require explicit cleanup because the app project persists.
- `stripe_spm.rb` must remain included in the npm publication allowlist.

### Preserving CI coverage

Keep at least one job for each logically distinct path:

- default SPM resolution and dynamic linkage;
- optional Onramp product attachment;
- a runtime launch that exercises dynamic loading and package resources;
- both React Native bridge architectures while both remain supported; and
- the explicit CocoaPods fallback with static linkage.

When a dynamic-framework job exposes an unrelated pod's missing symbols, identify which target owns the failing link and which binary owns the definitions. Fixing or isolating that edge produces more signal than broadly adding linker flags or disabling prebuilt components.

## A concise teach-back

An engineer should be able to explain the implementation in the following sequence:

1. `stripe-react-native` still arrives from npm and still becomes a local CocoaPods pod through React Native autolinking.
2. Only the underlying stripe-ios acquisition changes. On React Native 0.75 or newer, the podspec registers an exact-version Swift package and omits the `Stripe*` pod dependencies.
3. During the standard React Native post-install, React Native writes the package reference and six Core product dependencies into generated `Pods.xcodeproj`, attached to the wrapper target.
4. The wrapper must be a dynamic framework because that gives Xcode a real link step at the target where the SPM products are attached. A static archive cannot carry that dependency graph into the application's final link.
5. A Stripe installer hook runs after React Native's hook, validates the configuration, conditionally attaches `StripeCryptoOnramp`, and adds an app build phase.
6. The app phase is necessary because linking and embedding are different: dynamic package frameworks linked indirectly through a pod target are not automatically copied by Xcode or CocoaPods.
7. Xcode resolves and builds stripe-ios; the phase embeds and signs dynamic Stripe frameworks; `dyld` can then load the complete graph.
8. Older React Native versions and explicit opt-outs keep the exact-version CocoaPods dependencies, and the helper removes persistent SPM embed state when switching back.

If those eight points are clear, the rest of the code is implementation detail in service of that model.

## Reference map

Repository implementation:

- [`SPM_FINDINGS.md`](SPM_FINDINGS.md) — investigation record, decisions, iteration history, and open items.
- [`stripe_spm.rb`](stripe_spm.rb) — shipped integration helper and embed script.
- [`stripe-react-native.podspec`](stripe-react-native.podspec) — mode selection, version pin, product-equivalent fallback dependencies, and subspec definitions.
- [`example/ios/Podfile`](example/ios/Podfile) — example/test-harness configuration and generated test-target wiring.
- [`bitrise.yml`](bitrise.yml) — SPM architecture matrix and fallback build coverage.
- [`README.md`](README.md) — consumer-facing setup and opt-out instructions.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — maintainer-facing update workflow and development toggles.

Primary external references:

- React Native's bridge: `packages/react-native/scripts/cocoapods/spm.rb` and `spm_dependency` in `react_native_pods.rb`, available in React Native 0.75 and newer.
- stripe-ios Swift package mirror: https://github.com/stripe/stripe-ios-spm
- stripe-ios source and package manifest: https://github.com/stripe/stripe-ios
- React Native Firebase's shipped integration: https://github.com/invertase/react-native-firebase/pull/8933
- React Native Firebase SPM documentation: https://rnfirebase.io/ios-spm
- CocoaPods trunk read-only announcement: https://blog.cocoapods.org/CocoaPods-Specs-Repo/
- Firebase's CocoaPods deprecation guidance: https://firebase.google.com/docs/ios/cocoapods-deprecation
- Callstack's React Native SPM integration overview: https://www.callstack.com/blog/integrating-swift-package-manager-with-react-native-libraries
