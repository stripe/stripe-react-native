# stripe-react-native × Swift Package Manager: findings and implementation

**Status:** Implemented on draft PR [#2587](https://github.com/stripe/stripe-react-native/pull/2587) (branch `gbirch/spm-investigation`); **CI fully green** as of 2026-08-26 (new-arch jobs validating SPM mode, old-arch jobs validating the CocoaPods fallback). Remaining work is Mac-side validation and coordination items — see Current status and Open items.

## Summary

stripe-ios is deprecating CocoaPods support, and stripe-react-native currently acquires stripe-ios exclusively through CocoaPods pod dependencies. After evaluating the approaches used across the React Native ecosystem, we adopted the same architecture react-native-firebase shipped for the identical problem: **stripe-react-native remains a CocoaPods pod, but resolves the Stripe iOS SDK through Swift Package Manager**, using React Native core's official `spm_dependency` bridge (RN ≥ 0.75) plus a small Ruby helper shipped in our npm package. SPM resolution is on by default for RN ≥ 0.75; apps can opt out back to pods (while they still publish) with one Podfile line; RN < 0.75 keeps CocoaPods resolution automatically. The main user-facing requirement is building with dynamic frameworks (`use_frameworks! :linkage => :dynamic`), which react-native-firebase also requires — so the ecosystem is already converging on that configuration.

## The problem

### How the dependency works today

Users install `@stripe/stripe-react-native` from npm. React Native autolinking finds `stripe-react-native.podspec` in `node_modules` and installs it as a local "development pod". That podspec declares exact-pinned dependencies on the Stripe pods (`Stripe`, `StripePaymentSheet`, `StripePayments`, `StripePaymentsUI`, `StripeApplePay`, `StripeFinancialConnections`, plus `StripeCryptoOnramp` for the Onramp subspec), which CocoaPods resolves from the **CocoaPods trunk registry**, where stripe-ios publishes every release.

### What's changing, and when

Two clocks are ticking on that registry link:

1. **stripe-ios is deprecating CocoaPods support** (exact end date for pod publishing TBD — being confirmed with the stripe-ios team).
2. **CocoaPods trunk itself becomes permanently read-only on December 2, 2026.** After that date no one — including stripe-ios — can publish new pod versions. Existing versions remain installable indefinitely, but are frozen. (For calibration: Firebase stops publishing pods in October 2026 for this reason, with a buffer before the registry lock.)

### The precise scope of the problem

An important nuance narrows the problem considerably: **the trunk shutdown does not affect stripe-react-native's own podspec**, because autolinking always loads it from `node_modules`, never from the registry. Only the `dependency 'Stripe*'` lines are at risk. So the task is not "leave CocoaPods" — it is *"make the stripe-react-native pod acquire stripe-ios by some means other than the pod registry."* CocoaPods remains the delivery vehicle for the RN library itself until React Native core moves off CocoaPods entirely (a separate, longer-term ecosystem effort).

## Methodology

The investigation proceeded in phases:

1. **Problem-space research.** Studied four starting resources in depth: the react-native-firebase SPM PR ([invertase/react-native-firebase#8933](https://github.com/invertase/react-native-firebase/pull/8933)), Firebase's public [CocoaPods deprecation docs](https://firebase.google.com/docs/ios/cocoapods-deprecation), Callstack's [Integrating Swift Package Manager with React Native libraries](https://www.callstack.com/blog/integrating-swift-package-manager-with-react-native-libraries), and the in-house prototype branches (`davidestes/spm-dependency-helper`, `davidestes/spm-migration`). A third branch (`porter-spm-embedded`) turned out to be unrelated ("SPM" there meant "single payment method").
2. **Primary-source verification.** Read React Native core's actual bridge implementation (`packages/react-native/scripts/cocoapods/spm.rb` and `react_native_pods.rb` on the 0.81-stable branch), stripe-ios's `Package.swift` (product types, targets, resources), the `stripe-ios-spm` mirror's structure, and stripe-ios's `export_builds.rb` (to assess a binary-distribution alternative).
3. **Constraint mapping against our codebase.** Checked which of Firebase's pain points apply to us (ObjC++ imports, multi-pod duplicate symbols, binary package targets — none do; see below).
4. **Decision checkpoint.** Presented the option space and took explicit decisions on linkage policy and rollout before implementing.
5. **Implementation with local verification.** The devbox is Linux (no Xcode, and CocoaPods isn't on the internal gem mirror), so logic was validated with stub harnesses replicating the CocoaPods/Xcodeproj API surface — with method visibility verified against the real gem source after the first CI failure proved an invented stub API wrong.
6. **CI iteration.** Draft PR against the real Bitrise matrix (new-arch/old-arch unit tests and e2e Release builds on Xcode 26.4), diagnosing each failure from logs down to root cause before changing anything.

## How the ecosystem is handling this

### React Native core's `spm_dependency` (the enabling primitive)

React Native ≥ 0.75 ships an official CocoaPods↔SPM bridge. A library's podspec calls:

```ruby
spm_dependency(s,
  url: 'https://github.com/…/some-package.git',
  requirement: { kind: 'upToNextMajorVersion', minimumVersion: '1.0.0' },
  products: ['SomeProduct'])
```

The call records the declaration; later, `react_native_post_install` (invoked from every RN app's Podfile `post_install` block) uses the Xcodeproj gem to write real Xcode objects into **Pods.xcodeproj**: an `XCRemoteSwiftPackageReference` (URL + version requirement) on the project, and one `XCSwiftPackageProductDependency` per product on the pod's target. No `Package.swift` is generated anywhere; Xcode itself resolves, checks out, and builds the package from source when it builds the workspace. RN core's own code warns that static linkage "might cause linker errors" and suggests dynamic frameworks.

### react-native-firebase's shipped solution (the proven recipe)

RNFB faced our exact problem (Firebase pods ending) and merged their solution in July 2026; it shipped **default-on** in `@react-native-firebase/app` 26.1.0. Their architecture, which we largely adopted:

- Podspecs call `spm_dependency` when available, falling back to pod dependencies otherwise, with a `$RNFirebaseDisableSPM = true` Podfile opt-out.
- A Ruby helper (`firebase_spm.rb`) ships inside the npm package and hooks **`Pod::Installer#run_podfile_post_install_hooks`** — chosen because CocoaPods always invokes it (even with no `post_install` block in the Podfile), so consumers need zero Podfile changes, and because `Pod::Installer` is a stable public class (safer to patch than RN's private scripts).
- The hook fails fast on static linkage, injects an **embed-frameworks build phase** on the app target (Xcode builds some SPM products as dynamic frameworks under `PackageFrameworks`; neither Xcode nor CocoaPods embeds frameworks linked by pod targets, so without the phase apps crash at launch with `dyld: Library not loaded`), links `FirebaseCore` into the app target, and applies assorted build-setting workarounds (Xcode 26 explicit modules, `-ObjC`, an Archive `.signature` bug for binary xcframeworks).
- **Dynamic frameworks are required.** Firebase's SPM products use "automatic" linkage — each consumer statically absorbs its own copy — so RNFB's ~20 pods under static linkage produce duplicate symbols. `pod install` hard-fails with instructions; Expo users set `"useFrameworks": "dynamic"` via expo-build-properties.
- Migration story for users: upgrade the package, be on RN ≥ 0.75, use dynamic frameworks. Done.

Firebase's own docs, notably, say nothing about React Native — the wrapper layer owns the whole migration, with a "no action needed beyond upgrading" promise. That's the posture we want too.

## The solution space we evaluated

### Option A — `spm_dependency` + shipped Ruby helper (chosen)

Keep the podspec as the distribution unit; declare the Swift package when the RN version supports it; ship our own helper for the pieces RN's bridge doesn't cover. Chosen because it is the ecosystem-sanctioned bridge, production-proven at RNFB's scale, gives users one consistent mental model across SDKs, and is forward-compatible with RN's own eventual SPM migration.

### Option B — vendored prebuilt xcframeworks (rejected)

stripe-ios already publishes `Stripe.xcframework.zip` with every release (all modules, dynamic frameworks, library-evolution enabled), so the podspec could vendor binaries and drop the registry dependency invisibly — zero user migration, any RN version. Rejected because: CocoaPods doesn't run `prepare_command` for local development pods, so binaries would need a download step at npm-install or podspec-eval time (janky, network-dependent, checksum management); embedding ~10 dynamic frameworks wholesale is a real app-size regression versus today's dead-code-stripped static source builds; and strategically it doubles down on CocoaPods exactly as the ecosystem exits. Kept in the back pocket as a documented escape hatch only.

### Option C — full SPM migration, no podspec (deferred; likely end state)

The `davidestes/spm-migration` branch prototypes this: a real `Package.swift` for stripe-react-native itself, podspec deleted. It's clean — but it depends on `react-native/scripts/setup-ios-spm.js`, an RN *prototype* flow that exists in no released RN version. Not shippable to users today. Option A is designed so we can move here later without another user migration (the SPM package pin and product list carry over).

### Prior art within Stripe

`davidestes/spm-dependency-helper` prototyped Option A's core (podspec `spm_dependency` call, example app on dynamic frameworks, unit tests rewired onto the ReactTestApp scheme, CI wiring, a branch-override env var). It validated feasibility but lacked roughly the back two-thirds of the RNFB recipe: no fail-fast diagnostics, no embed phase, no opt-out/fallback UX, no Onramp product handling, no Expo/docs story. The final implementation is a fresh build on current master that ports its example/CI wiring and adds the rest.

## Why our version is simpler than Firebase's

These differences eliminated most of RNFB's hardest work, and were verified against our codebase and stripe-ios's `Package.swift` before implementation:

| Firebase's pain | Our situation |
|---|---|
| ~20 pods consume Firebase → duplicate-symbol surface, per-pod private copies of FirebaseCore | One pod target consumes Stripe |
| Binary `binaryTarget`s in the package → Xcode Archive `.signature` bug workarounds | stripe-ios-spm is 100% source, zero binary targets |
| ObjC++ TurboModules can't `@import` Swift SPM modules → 43 files restructured into `.m` helpers | No `.m`/`.mm` file in our repo imports Stripe SDK modules; all Stripe usage is Swift |
| App must call `FirebaseApp.configure()` natively → helper mutates the *user's* xcodeproj to link FirebaseCore | The app never calls Stripe natively; no user-project product linking needed |

What we inherit regardless: stripe-ios's products are also automatic-linkage libraries, so the **dynamic-frameworks requirement applies to us too**. Because we're a single pod, supporting static linkage may actually be achievable for us (attach the SPM products to the app target so the final link sees them) where it wasn't for Firebase — nobody has shipped that, and it's deliberately deferred (see Decisions).

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Linkage policy | **Dynamic-only now; revisit static later.** SPM mode requires `use_frameworks! :linkage => :dynamic` and fails `pod install` with actionable instructions otherwise. | Matches RNFB (proven, ecosystem converging); static support is novel plumbing worth a separate investigation, especially for Expo (whose default is static). |
| Rollout | **Default-on for RN ≥ 0.75, `$StripeDisableSPM = true` opt-out.** RN < 0.75 falls back to pods automatically. | Fastest migration of the user base; matches RNFB exactly. Fallback stays honest while stripe-ios publishes pods. |
| Version pinning | **Exact-version SPM pin**, same `stripe_version` value as the pod pin. | The RN SDK is tested against one specific stripe-ios release per release; SPM shouldn't drift where pods didn't. |
| stripe-ios timeline | **Open** — being confirmed with the stripe-ios team. Design assumes the Dec 2, 2026 trunk lock as the outer bound. | Determines how long the CocoaPods fallback remains viable and the messaging when it ends. |

## Implementation

All on branch `gbirch/spm-investigation`, PR [#2587](https://github.com/stripe/stripe-react-native/pull/2587). Net shipped-code footprint is one new Ruby file plus a conditional in the podspec.

### Architecture

Three cooperating layers (extensively documented in `stripe_spm.rb` itself):

1. **The podspec** requires `stripe_spm.rb` and branches: `stripe_spm_activate!(s, version: stripe_version)` when `stripe_spm_enabled?` (RN ≥ 0.75 detected via `defined?(spm_dependency)`, and not opted out), otherwise the classic pod dependency lines. One `stripe_version` value pins both paths.
2. **React Native's bridge** writes the `stripe-ios-spm` package reference and core product dependencies into Pods.xcodeproj during `react_native_post_install`.
3. **Our installer hook** (on `Pod::Installer#run_podfile_post_install_hooks`, RNFB's patch point, so users change nothing) runs after the regular hooks and:
   - **Fails fast** unless the pod builds as a dynamic framework, with the two fixes spelled out (`use_frameworks!`/expo-build-properties, or `$StripeDisableSPM`). Also fails clearly if the package reference is missing (Podfile never called `react_native_post_install`).
   - **Links the `StripeCryptoOnramp` product** iff the Onramp subspec is installed. This can't live in the podspec: RN's manager keys registrations by spec name and looks up Pods-project targets by that name — subspecs share the root pod's target, so a subspec declaration never matches and is silently dropped; declaring at the root would link Onramp (and its StripeIdentity subtree) into every app.
   - **Maintains an embed-frameworks phase** on app targets: copies SPM-built *dynamic* `Stripe*.framework`s from `PackageFrameworks` (and the Archive-build location) into the bundle and re-signs them — preventing RNFB's dyld launch crash. Filtered to `Stripe*` so it never touches other packages' frameworks (e.g. Firebase's own embed phase); filters out statically built frameworks (embedding those fails App Store validation); idempotent; removed again if the user opts out (the user's project, unlike Pods.xcodeproj, persists between installs).
   - Supports `OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH` for CI: switches the requirement to a branch of the full `stripe/stripe-ios` repo (branches don't exist on the release-tag-only `stripe-ios-spm` mirror).

### What we deliberately did *not* port from RNFB (yet)

- The UUID-counter guard against a rare Pods.xcodeproj corruption (observed by RNFB on RN 0.85 × prebuilt core). We verify nothing structurally and would rather add the guard when reproduced; the opt-out is the interim workaround.
- The Xcode 26 explicit-modules opt-out (`SWIFT_ENABLE_EXPLICIT_MODULES = NO`). Firebase needed it for their internal-only SPM targets; stripe-ios also has internal targets (StripeCore, StripeUICore, Stripe3DS2), so this was flagged as a watch item for CI — which runs Xcode 26.4 — and so far has not been needed.
- `-ObjC` (Firebase needs it for reflection-discovered ObjC registrations; stripe-ios has no equivalent).

### Example app and CI changes

- Example Podfile moves to `use_frameworks! :linkage => :dynamic`, with `STRIPE_DISABLE_SPM=1` as a developer toggle for the fallback path.
- The SDK's native unit tests (`ios/Tests`) are compiled into the generated `ReactTestAppTests` target via `post_integrate` (the podspec `test_spec` builds inside the Pods project, where the SPM-resolved Stripe modules aren't visible to a separate test target). The test target gets explicit `-fmodule-map-file` flags pointing at Xcode's generated module maps for the package targets — kept out of the shipped podspec deliberately, since app code doesn't import Stripe modules.
- Bitrise: unit tests run via the `ReactTestApp` scheme with `-only-testing:ReactTestAppTests`; the `_install_pods` branch-override step no longer appends `pod 'Stripe', :git =>` lines (under SPM that would link Stripe twice — the env var now flows through the helper instead); Release e2e builds are arm64-only.
- README, CHANGELOG, and a maintainer-facing CONTRIBUTING section document the modes, migration, and toggles.

## Validation methodology and CI iteration log

**Local (Linux devbox, no Xcode/CocoaPods available):** stub harnesses exercise the podspec evaluation in all four modes (SPM / no-helper fallback / opt-out / branch override — asserting exactly which dependencies and products get declared) and the full post-install flow (fail-fast messages, Onramp linking, embed-phase idempotency, opt-out cleanup). Shell script shellchecked; YAML validated.

**CI iterations** — each failure was root-caused before changing anything, and each produced a durable lesson:

1. **`NoMethodError: private method 'build_type'`** at pod install. `Pod::Target#build_type` is a *private* reader in CocoaPods; the public API is the `build_as_*` predicate family. The local stub had invented `build_type` as public — exactly why the tests passed and reality didn't. Fix: use the public predicates; verify every other CocoaPods API touched against the real 1.16.2 source; make the stub mirror real visibility (private `build_type` that raises if touched). *Lesson: when stubbing a third-party API, take its shape from the source, not from memory.*
2. **Old-arch e2e: undefined `RCT*`/Yoga symbols linking react-native-safe-area-context.** A side effect of dynamic frameworks meeting the example app's experimental prebuilt React core (`RCT_USE_PREBUILT_RNCORE`): the prebuilt core only wires framework linkage through the new-architecture dependency path, so old-arch pods compile against prebuilt React headers but never link the framework. Static builds mask this (all symbols resolve at the final app link — why master is green). Fix: build React core from source on old arch, matching what real old-arch apps do.
3. **Old-arch e2e: `fmt` consteval compile errors.** The previous fix was too broad — it also disabled `RCT_USE_RN_DEP` (prebuilt folly/glog/fmt/boost), reintroducing source builds of third-party C++ that doesn't compile under Xcode 26's Clang (stricter consteval enforcement; largely why RN prebuilds these now). The two prebuilt mechanisms are separable: prebuilt *dependencies* are a vendored xcframework whose linkage propagates to pods normally on both architectures and stay on everywhere; only prebuilt *React core* is gated away from old-arch dynamic builds. *Lesson: the example app's prebuilt matrix is now documented in the Podfile so the next person doesn't rediscover it.*
4. **Old-arch e2e: undefined `facebook::jsi::*` symbols linking `ReactTestApp-DevSupport`** — react-native-test-app's own dev-support pod, i.e. pure test-harness code, under-declaring its React dependencies for per-pod linking. Three consecutive failures in the same theme (harness/third-party pods that don't support old-arch dynamic-framework builds) with zero signal about our SDK prompted a strategy change instead of a fourth patch: **the old-arch CI jobs now run the CocoaPods fallback path** (`STRIPE_DISABLE_SPM=1`, static libraries — master's known-green configuration), which the fallback needed continuous coverage for anyway. The SPM resolution mechanism is architecture-independent (nothing in it branches on the architecture) and remains covered by the new-arch jobs; old-arch × SPM × dynamic frameworks is a documented, deliberate coverage gap (see Open items). *Lesson: when consecutive failures are all in harness code, stop fixing the harness and reconsider what the job should validate.*

Positive signals so far: podspec evaluation, `spm_dependency` registration, our hook ordering, and the SPM build of the Stripe package itself (its resource-bundle steps appear in build logs) all work under real CocoaPods 1.16.2 / RN 0.81 / Xcode 26.4 — and no explicit-modules workaround has been needed.

The resulting CI coverage split: **new-arch jobs validate SPM mode** (the default path new users get); **old-arch jobs validate the CocoaPods fallback** (the path RN < 0.75 and opted-out users get).

## Current status

- Draft PR [#2587](https://github.com/stripe/stripe-react-native/pull/2587) open with **CI fully green**: unit tests (new arch, SPM mode) and e2e Release builds (new arch on SPM mode, old arch on the CocoaPods fallback) all pass on Xcode 26.4 / CocoaPods 1.16.2 / RN 0.81.
- `example/ios/Podfile.lock` still needs regenerating on a Mac (`yarn pods`) and committing — CI regenerates it transiently, but the checked-in file is stale and drives cache keys.
- Runtime validation (PaymentSheet resources, embed phase, Archive) has not yet been performed on a device/simulator by a human — CI proves build+link+unit tests.

## Open items and risks

| Item | Notes |
|---|---|
| stripe-ios pod-publishing end date | Being confirmed; sets the fallback's lifetime and the eventual messaging when the fallback path should start erroring helpfully. |
| Runtime validation | CI proves build+link; PaymentSheet resource loading (`Bundle.module`) and the embed phase deserve a manual run of the example app and an Archive/TestFlight pass. |
| Expo | Needs a prebuild validation with `expo-build-properties` `"useFrameworks": "dynamic"`; Expo bundles a pinned stripe-react-native per SDK release, so coordination/comms matter. |
| iOS platform floor | `stripe-ios-spm` declares iOS 15; the podspec still says 13.0. Fine on RN ≥ 0.76 (post-install bumps deployment targets); an RN 0.75 app targeting iOS 13/14 could hit an SPM platform error. Consider bumping the podspec floor. |
| First-build latency | Xcode clones and builds stripe-ios from source on first build (the `-spm` mirror keeps the clone small). Worth measuring; a binary SPM package from stripe-ios would be the lever if it's painful. |
| Static-linkage support | Deferred investigation: attaching the SPM products to the app target could make static apps (Expo default) work unchanged — feasible for a single-pod SDK where it wasn't for Firebase. |
| stripe-identity-react-native | Has the same problem and pins the same stripe-ios version; the helper was written to be liftable. |
| Old arch × SPM coverage gap | CI can't exercise old-arch + dynamic frameworks because the react-native-test-app harness doesn't support that combination (its DevSupport pod under-declares React dependencies). The SPM mechanism is architecture-independent and users have the `$StripeDisableSPM` opt-out, but a real-world old-arch dynamic-frameworks app has not been validated. Candidate for a one-off manual validation with a plain RN template app. |

## References

- Draft PR: https://github.com/stripe/stripe-react-native/pull/2587
- Implementation core: `stripe_spm.rb` (repo root; heavily documented), `stripe-react-native.podspec`, `example/ios/Podfile`, CONTRIBUTING.md ("iOS: how the Stripe iOS SDK is resolved")
- react-native-firebase SPM PR (merged, shipped in 26.1.0): https://github.com/invertase/react-native-firebase/pull/8933 — and their user docs: https://rnfirebase.io/ios-spm
- Firebase CocoaPods deprecation: https://firebase.google.com/docs/ios/cocoapods-deprecation
- CocoaPods trunk read-only announcement: https://blog.cocoapods.org/CocoaPods-Specs-Repo/
- Callstack, "Integrating Swift Package Manager with React Native libraries": https://www.callstack.com/blog/integrating-swift-package-manager-with-react-native-libraries
- React Native's bridge: `packages/react-native/scripts/cocoapods/spm.rb` (0.75+)
- stripe-ios SPM mirror: https://github.com/stripe/stripe-ios-spm
- In-house prototypes: branches `davidestes/spm-dependency-helper`, `davidestes/spm-migration`
