# Resolving the Stripe iOS SDK through Swift Package Manager: how it works

This document explains, from first principles, a change to how `@stripe/stripe-react-native` acquires its Stripe iOS SDK dependency: instead of CocoaPods pods, it now resolves stripe-ios through Swift Package Manager — while itself remaining a CocoaPods pod. The goal is that by the end you understand the problem, every moving part of the solution, and *why* each part exists, well enough to explain it to someone else.

It's written for an iOS engineer who has used CocoaPods and SPM as tools but hasn't needed to know how they work internally, and who hasn't worked with React Native. React Native and build-system concepts are introduced as they're needed. For the investigation history, the alternatives we rejected, and the decision record, see the companion doc `SPM_FINDINGS.md`; this doc focuses on teaching the mechanism we shipped.

---

## Part 1: The problem

### 1.1 Background: how native code reaches a React Native app

React Native (RN) apps are JavaScript/TypeScript apps that run inside a native iOS (or Android) shell. Libraries like ours ship both halves: JS code that app developers import, and native code (Swift/Objective-C on iOS) that the JS calls into. The whole thing is distributed as a single **npm package** — npm is JavaScript's package registry, and installing a package places its full contents (including the native sources) in the app's `node_modules` directory.

The native half still has to get into the Xcode build somehow, and in today's React Native ecosystem that vehicle is **CocoaPods**. Every RN app has a `Podfile`, and a mechanism called **autolinking** scans `node_modules`, finds each installed library's `.podspec` file, and adds it to the Podfile's dependency set as what CocoaPods calls a **development pod**: a pod whose podspec and source files are read directly from a path on disk (here, `node_modules/@stripe/stripe-react-native`) rather than downloaded from a registry. This detail turns out to matter a lot — hold onto it.

When the developer runs `pod install`, CocoaPods:

1. Reads the Podfile and every podspec, and resolves the full dependency graph.
2. Generates **Pods.xcodeproj** — a synthesized Xcode project containing one build target per pod. Your library isn't just "some files added to the app"; it's a real Xcode target with its own build settings, compiled independently.
3. Integrates with the developer's own app project: it creates an `.xcworkspace` containing both projects, and wires the app target to link the pod targets' outputs (via generated `.xcconfig` files and a couple of injected build phases).

So the pipeline is: **npm delivers the files → autolinking finds the podspec → CocoaPods turns it into an Xcode target and links it into the app.**

### 1.2 Where stripe-ios enters the picture

Our podspec, `stripe-react-native.podspec`, historically declared its native dependency like this:

```ruby
s.dependency 'Stripe', stripe_version
s.dependency 'StripePaymentSheet', stripe_version
s.dependency 'StripePayments', stripe_version
# ... and three more Stripe* pods (plus StripeCryptoOnramp for one optional feature)
```

Unlike our own pod (loaded from `node_modules`), these `Stripe*` pods are resolved from the **CocoaPods trunk registry** — the central public index where stripe-ios has published every release. During `pod install`, CocoaPods downloads those pods' sources and builds each one as its own target in Pods.xcodeproj, exactly like ours.

### 1.3 What's changing

Two clocks are ticking on that registry link:

1. **stripe-ios is deprecating CocoaPods support.** At some point (exact date being confirmed with the stripe-ios team) new stripe-ios releases will stop being published as pods.
2. **The CocoaPods trunk registry itself becomes permanently read-only on December 2, 2026.** After that, *nobody* can publish new pod versions. Already-published versions remain downloadable indefinitely — the registry freezes, it doesn't disappear.

This isn't a Stripe-specific storm: the whole iOS ecosystem is exiting CocoaPods. Firebase stops publishing pods in October 2026, and Apple's investment is entirely in SPM.

### 1.4 The precise scope of the problem (this is the key insight)

A naive reading of "CocoaPods is dying" suggests we must stop being a CocoaPods pod. We can't — autolinking, the only mechanism by which React Native apps consume native libraries today, *is* CocoaPods. React Native itself has a long-term project to move off CocoaPods, but no released RN version supports an SPM-only library.

But look again at section 1.1: our own podspec is **never fetched from the registry**. Autolinking always loads it from `node_modules` as a development pod. The registry freeze cannot affect it. The only registry-dependent lines in our entire iOS story are the `s.dependency 'Stripe*'` declarations.

So the real task is narrow and precise:

> **Make the stripe-react-native pod acquire stripe-ios by some means other than the CocoaPods registry — while remaining a CocoaPods pod itself.**

We're replacing dependency *acquisition*, not the packaging of the SDK. That reframing is what makes the problem tractable, and it's the same conclusion react-native-firebase (RNFB) reached when Firebase announced its pod deprecation. RNFB shipped exactly this architecture in July 2026, on by default, at enormous scale. We adopted their recipe, simplified where our situation is simpler (one pod instead of ~20, a pure-source Swift package instead of binaries, no ObjC++ imports of the vendor SDK). `SPM_FINDINGS.md` covers the alternatives we evaluated and why they lost.

---

## Part 2: Three build-system primitives you need first

The solution is small — one Ruby file plus a conditional in the podspec — but it sits at the intersection of three pieces of machinery. Understanding each one first makes the solution almost self-evident.

### 2.1 Static vs. dynamic linking, scoped to what matters here

A refresher, because the single biggest constraint in this design comes from linking:

- A **static library** (`.a`) is an archive of object files. It isn't "built" into anything on its own — whoever links the final executable copies the needed object code out of it. Crucially, *a static library cannot carry its own dependencies*: if libA uses symbols from libB, then whatever links libA must also link libB, or the final link fails with undefined symbols.
- A **dynamic framework** (`.framework` containing a dylib) is a real linked product. Its own link step resolves what goes into it, and it can therefore *contain* its dependencies (or carry references to other dylibs). The cost: dynamic frameworks must be **embedded** — physically copied into the app bundle's `Frameworks/` directory and code-signed — because the dynamic loader (`dyld`) loads them from the bundle at app launch. A framework that's linked but not embedded produces the classic launch crash: `dyld: Library not loaded: @rpath/....framework`.

CocoaPods can build pods either way. The default is static libraries; the Podfile directive `use_frameworks! :linkage => :dynamic` switches every pod to dynamic frameworks. React Native apps default to static.

One more concept: SPM library products are usually declared with **"automatic" linkage**, meaning the package doesn't choose — Xcode decides per build how to link the product into each consumer, usually by statically absorbing it. stripe-ios's products are automatic. Remember this; it's the root of the dynamic-frameworks requirement in Part 3.

### 2.2 How SPM actually lives inside an Xcode project

If you've used SPM you've probably either written a `Package.swift` or clicked File → Add Package Dependencies in Xcode. It's worth knowing what that Xcode flow really does, because our solution does the same thing programmatically:

An Xcode project file can natively store two kinds of package objects:

- **`XCRemoteSwiftPackageReference`** — attached to the *project*: a repository URL plus a version requirement ("exactly 26.7.0", "up to next major", a branch, etc.).
- **`XCSwiftPackageProductDependency`** — attached to a *target*: "this target consumes product X from that package."

Given those objects, **Xcode itself does everything else**: it resolves the version, clones the repository into DerivedData, generates build targets for the package's contents, builds them from source, and links the products into the consuming targets. No `Package.swift` exists anywhere in the consuming app, and no separate "SPM tool" runs — package resolution is simply part of Xcode building the workspace.

So "add an SPM dependency to a CocoaPods pod" reduces to: *get those two objects written into Pods.xcodeproj, attached to the pod's target.* Everything in Part 3 is in service of doing that correctly.

### 2.3 CocoaPods is a Ruby program you can extend

Three facts about CocoaPods' execution model carry the whole implementation:

**Podspecs are executable Ruby, evaluated in the same process as the Podfile.** A `.podspec` isn't inert metadata — it's a Ruby script that runs inside the `pod install` process, after the Podfile has run. Anything the Podfile defines (methods, global variables, `require`d files) is visible to podspec code. This gives podspecs two communication channels we'll use: they can detect what the surrounding environment provides (`defined?(some_function)`), and they can read flags the user set in the Podfile (Ruby globals like `$StripeDisableSPM`).

**The installer has a hook lifecycle.** `pod install` runs as: dependency resolution → generate Pods.xcodeproj in memory → run *post-install hooks* (the user's `post_install do |installer| ... end` block from the Podfile) → write everything to disk. Post-install hooks receive the in-memory installer object and can mutate the not-yet-saved project — this is the standard place for ecosystem tooling to adjust the generated output. React Native's template Podfile ships with a `post_install` block that calls a function named `react_native_post_install`, which applies dozens of RN-specific fixups. And because all of this is plain Ruby, a library can go one step further than registering a hook: it can *wrap the installer's own methods* (Ruby lets you alias a method and redefine it — effectively "method swizzling"), guaranteeing code runs at a precise point in every install even if the user's Podfile never mentions you.

**The two Xcode projects have opposite lifetimes.** Pods.xcodeproj is regenerated from scratch on every `pod install` — anything written into it is naturally cleaned up next install. The *user's* app project is theirs; CocoaPods edits it surgically and it **persists between installs**. Any modification a tool makes to the user's project must therefore be idempotent (safe to apply repeatedly) *and* explicitly reverted when no longer wanted, because nothing else will ever clean it up.

---

## Part 3: The solution, layer by layer

### 3.0 The shape

Three cooperating layers, each doing the part it's best placed to do:

| Layer | Code | Job |
|---|---|---|
| 1. The podspec | `stripe-react-native.podspec` | Decide per-install: SPM mode or CocoaPods fallback. Declare the dependency accordingly. |
| 2. React Native's bridge | `spm_dependency` / `react_native_post_install` (ships inside RN ≥ 0.75) | Write the Swift package reference and product dependencies into Pods.xcodeproj. |
| 3. Our installer hook | `stripe_spm.rb` (ships in our npm package) | Everything RN's bridge doesn't cover: validate the configuration, handle the optional Onramp product, embed the frameworks, clean up on opt-out. |

The user-visible contract: on React Native ≥ 0.75, SPM resolution is **on by default** and requires building with dynamic frameworks. One Podfile line (`$StripeDisableSPM = true`) opts back out to pods for as long as stripe-ios publishes them. React Native < 0.75 stays on pods automatically. A single version constant pins stripe-ios to the same release on both paths.

### 3.1 Layer 1: the podspec decides which mode this install uses

The podspec requires `stripe_spm.rb` (both files sit at the package root, so this also installs the hook from Layer 3 — more on that later) and branches on one predicate:

```ruby
stripe_spm_activate!(s, version: stripe_version) if stripe_spm_enabled?
...
unless stripe_spm_enabled?
  core.dependency 'Stripe', stripe_version
  # ... the classic pod dependency lines, kept as the fallback
end
```

`stripe_spm_enabled?` answers two questions using the "podspecs run inside the Podfile's Ruby process" fact from §2.3:

- **Does this app's React Native version have the bridge?** The check is simply `defined?(spm_dependency)`. Every RN app's Podfile requires RN's `react_native_pods.rb` script; on RN ≥ 0.75 that script defines a top-level function called `spm_dependency`, and on older versions it doesn't. Since the podspec evaluates in the same process, the function's existence *is* the version check — no version-string parsing, and it degrades gracefully in any environment that isn't a standard RN app.
- **Did the user opt out?** If the Podfile set the Ruby global `$StripeDisableSPM = true`, the predicate returns false. (The value is compared against `true` rather than just checked for existence, so tooling that emits `$StripeDisableSPM = false` gets SPM as expected.)

If either check fails, nothing SPM-related happens at all: the `unless` arm declares the traditional `Stripe*` pod dependencies and this install is indistinguishable from the pre-change SDK. That's the entire fallback mechanism — the old path wasn't rewritten, just made conditional.

If both checks pass, `stripe_spm_activate!` does two things: records "SPM mode is active, pin version X" in module state that Layer 3 reads later, and calls RN's `spm_dependency`:

```ruby
spm_dependency(spec,
  url: 'https://github.com/stripe/stripe-ios-spm.git',
  requirement: { kind: 'exactVersion', version: version },
  products: ['Stripe', 'StripePaymentSheet', 'StripePayments',
             'StripePaymentsUI', 'StripeApplePay', 'StripeFinancialConnections'])
```

Three deliberate choices in that call:

- **The URL is `stripe-ios-spm`, not `stripe-ios`.** Xcode clones package repositories in full. The main stripe-ios repo is huge (tests, examples, years of history); `stripe-ios-spm` is a lightweight mirror that receives only tagged release sources, keeping every user's first-build checkout small. (For CI, an environment variable — `OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH` — switches the URL to the full repo and the requirement to a branch, because the mirror has no branches to test unreleased stripe-ios changes against.)
- **The requirement is `exactVersion`, not a range.** The RN SDK is tested against exactly one stripe-ios release per release, and the pod path has always pinned exactly. SPM shouldn't drift where pods didn't. The same `stripe_version` constant feeds both arms, so they can't disagree.
- **The product list is the SPM spelling of the pod dependency list.** Same six modules; the two lists must be kept in sync when either changes (both files say so in comments). One product is conspicuously missing — `StripeCryptoOnramp` — and §3.3 explains why it can't be declared here.

### 3.2 Layer 2: React Native's bridge writes the package into Pods.xcodeproj

This layer is React Native's code, not ours, but understanding it is essential — and it's short.

`spm_dependency(spec, url:, requirement:, products:)` does almost nothing at call time: it records the declaration in a hash **keyed by the spec's name** inside a singleton manager. Remember from §2.3 that podspec evaluation happens *before* the Pods project exists; nothing could be written yet even if it wanted to.

The write happens later, inside `react_native_post_install` — the function every standard RN Podfile already calls from its `post_install` block. Among its many duties, it tells the SPM manager to apply the recorded declarations to the freshly generated Pods project. For each declaration, the manager:

1. Finds the pod's build target in Pods.xcodeproj **by name** — it looks for a target whose name equals the spec name the declaration was recorded under.
2. Creates the `XCRemoteSwiftPackageReference` (URL + requirement) on the project, if not already present.
3. Creates one `XCSwiftPackageProductDependency` per product and attaches them to that target.
4. Adds a Swift include path pointing at the build-products directory to the target's build settings — a workaround so the pod's Swift compilation can find the package's built modules.

That's it. These are exactly the objects from §2.2 — the same ones Xcode's "Add Package Dependencies" dialog would create — so from this point **Xcode takes over**: when the developer builds the workspace, Xcode resolves the package, clones `stripe-ios-spm` at the pinned tag, builds all the Stripe targets from source, and links the products into the `stripe-react-native` pod target. No `Package.swift` was generated; no manifest exists anywhere in the app.

Worth pausing on what this means for the build: the Stripe SDK is now compiled *by Xcode's package machinery inside the app's build*, rather than by a CocoaPods-generated target. Same sources, same compiler — but the surrounding wiring (who links what, where products land on disk, who embeds them) is different, and those differences are precisely the gaps Layer 3 fills.

One caveat RN's own code prints as a warning: this bridge is only reliable with **dynamic frameworks**. RN warns that static linkage "might cause linker errors." Our Layer 3 turns that vague warning into a hard, actionable requirement — the *why* is §3.3, Job 1.

### 3.3 Layer 3: our installer hook — `stripe_spm.rb`

Layers 1 and 2 get us a Pods project that references the Stripe package. Four gaps remain, and all four need code that runs during `pod install`, *after* RN's bridge has done its work, *without requiring users to edit their Podfile*. First, how we get code running there at all.

#### Getting invoked: wrapping `Pod::Installer`

When the podspec `require`s `stripe_spm.rb`, the bottom of the file installs a wrapper around a CocoaPods installer method (the "alias a method and redefine it" move from §2.3):

```ruby
Pod::Installer.class_eval do
  alias_method :stripe_spm_original_run_podfile_post_install_hooks,
               :run_podfile_post_install_hooks

  def run_podfile_post_install_hooks
    result = stripe_spm_original_run_podfile_post_install_hooks
    StripeSPM.apply(self)
    result
  end
end
```

`run_podfile_post_install_hooks` is the installer method that executes the Podfile's `post_install` block. Wrapping it, rather than asking users to call a helper from their Podfile, buys three properties:

- **It always runs.** CocoaPods invokes this method on every install even when the Podfile has *no* `post_install` block, so the integration works with zero Podfile changes — including the cleanup path when the user opts out.
- **The ordering is exactly right.** The original method runs first, which executes the user's `post_install` block, which calls `react_native_post_install`, which writes the package objects (Layer 2). Our `StripeSPM.apply` runs immediately after, so it can *rely on* the package reference existing — and treat its absence as an error worth explaining.
- **It's a stable patch target.** `Pod::Installer` is a public, semantically-versioned CocoaPods class; RN's internal scripts are not. (RNFB hooks the same method for the same reasons — this patch point is production-proven at their scale.)

Details worth noticing: the wrapper is guarded so it installs only once even if the file is loaded twice (checking both public *and private* method visibility, because the original method is private and `alias_method` preserves that); and because hooks run *before* the projects are written to disk, `raise` inside the hook aborts the install cleanly — nothing half-configured is ever saved. The errors raised are `Pod::Informative`, CocoaPods' class for user-facing messages, which prints without a Ruby stack trace.

`StripeSPM.apply` first checks that this install even includes our pod (it no-ops otherwise — e.g. another project in a monorepo sharing the same CocoaPods process), then checks the flag Layer 1 set. If SPM mode is **off**, it performs one cleanup task (explained in Job 4) and returns. If **on**, it runs the four jobs in a deliberate order: validate the configuration first so unsupported setups fail with *our* message before anything fails cryptically; then find the package reference the mutations need; then mutate.

#### Job 1: enforce dynamic frameworks — the load-bearing constraint

This is the deepest "why" in the whole design, so let's walk it end to end.

Recall from §2.1 that stripe-ios's package products use *automatic* linkage — Xcode typically satisfies them by statically absorbing the product's code into whatever links it. And the thing linking them is the `stripe-react-native` **pod target**, because that's where Layer 2 attached the product dependencies.

Now trace what happens under CocoaPods' default configuration, where the pod builds as a **static library**:

1. Xcode builds the Stripe package targets. Fine.
2. The pod target compiles. Its Swift code `import`s Stripe modules, and the modules are findable (that was Layer 2's include-path workaround). Compilation **succeeds**.
3. The pod target "links" — but a static library is just an archive of the pod's own object files. Per §2.1, it *cannot carry* the Stripe code it depends on.
4. The final app link consumes the pod's `.a`… and nothing else in the entire graph links the Stripe products. The app target knows nothing about them — the product dependencies live on the pod target inside Pods.xcodeproj, and linking a static library does not pull in that target's package products.
5. **The app link fails with undefined Stripe symbols** — long after the actual mistake, with an error that names neither Stripe's requirement nor the fix.

With the pod as a **dynamic framework**, step 3 changes everything: a dynamic framework has a real link step, so the Stripe products get linked *into the pod framework itself* (statically absorbed into it, in the typical automatic-linkage case). The app then links one self-contained `stripe_react_native.framework` and everything resolves.

So SPM mode has a hard prerequisite: the app must build pods with `use_frameworks! :linkage => :dynamic`. Job 1 (`verify_dynamic_linkage!`) checks the pod target's build type and, if it's anything else, **fails `pod install` immediately** with a message stating both remedies: add `use_frameworks! :linkage => :dynamic` (for Expo apps — a popular managed RN toolchain that generates the iOS project for you — set `"useFrameworks": "dynamic"` via the expo-build-properties plugin), or set `$StripeDisableSPM = true` to stay on pods. Failing fast at install time with instructions, versus failing at app-link time with raw linker output, is the difference between a five-second fix and a support ticket.

Is requiring dynamic frameworks acceptable? It's the same requirement react-native-firebase shipped, so for a large slice of the ecosystem the flip has already happened or will happen anyway; the ecosystem is converging on it. (An avenue for supporting static apps later exists — see Part 6.)

One implementation footnote that generalizes: the check uses CocoaPods' public `build_as_dynamic_framework?` predicate. The seemingly obvious `pod_target.build_type` is a *private* method — our first CI failure was exactly this, masked locally by a hand-written test stub that guessed the API's visibility wrong. The durable lesson: when you extend a third-party tool, verify every API you touch against its actual source, and if you stub it for tests, stub the real shape.

#### Job 2: verify the package reference exists

Layer 3 runs after the user's `post_install` block on purpose — but what if the Podfile is hand-rolled and never calls `react_native_post_install` at all? Then Layer 2 never ran, no package reference exists, and the build would eventually fail with a baffling `no such module 'Stripe'`. Job 2 (`find_package_reference!`) looks up the `XCRemoteSwiftPackageReference` by repository URL in the generated project and, if it's missing, aborts the install explaining exactly that: make sure `post_install` calls `react_native_post_install` (it's part of the standard RN template), or opt out. The found reference is also *needed* by Job 3, which attaches a product to it.

#### Job 3: link the Onramp product — a subspec corner case

Our pod has an optional feature packaged as a CocoaPods **subspec**: `stripe-react-native/Onramp` (crypto onramp support). Subspecs let one pod offer opt-in slices — an app that wants the feature asks for the subspec explicitly, and only then does its extra code and its extra dependency (`StripeCryptoOnramp`) enter the build. On the pods path this conditionality is free: the subspec declares `dependency 'StripeCryptoOnramp'` and CocoaPods only honors it when the subspec is selected.

The SPM path can't express this in the podspec, due to a collision of two facts:

- CocoaPods subspecs **don't get their own build targets** — a selected subspec's sources and settings merge into the root pod's single target.
- RN's bridge, from §3.2, records declarations keyed by **spec name** and later looks up Pods-project targets **by that name**.

So a `spm_dependency` call made on the Onramp subspec gets recorded under the name `stripe-react-native/Onramp`, the manager finds no target with that name (the only target is `stripe-react-native`), and the declaration is **silently dropped** — no warning, the product just never links. Declaring `StripeCryptoOnramp` at the root spec instead would "work," but then every app would link the crypto-onramp product and its sizable dependency subtree (including StripeIdentity), voiding the entire point of the subspec.

Job 3 (`link_onramp_product`) reproduces the conditionality at the right layer — install time, where it can see what was actually resolved:

1. Check whether the installed specs for our pod include `stripe-react-native/Onramp`. If not, done.
2. Find the pod's native target in the Pods project, and check whether a `StripeCryptoOnramp` product dependency is already attached (idempotency — podspecs can be evaluated multiple times per install, and nothing prevents the hook from seeing an already-configured project).
3. Otherwise create an `XCSwiftPackageProductDependency` for `StripeCryptoOnramp`, point it at the package reference Job 2 found, and attach it to the target — deliberately mirroring the object shapes RN's own bridge creates for the core products, so all seven product entries look identical to Xcode.

#### Job 4: embed the frameworks — preventing the launch crash

Job 1's story said automatic-linkage products are "typically" statically absorbed. In some configurations, though, Xcode instead builds package products as **real dynamic frameworks**, placing them under a `PackageFrameworks/` directory in the build products (and, for Archive builds — the App Store packaging flow — under a different `UninstalledProducts/` location, because Archives never populate `PackageFrameworks`). When that happens, the pod framework *links against* `Stripe*.framework` dylibs at build time, and per §2.1 those dylibs must be **embedded** in the app bundle for `dyld` to load at launch.

Here's the trap: **nobody embeds them.**

- *Xcode* auto-embeds package frameworks only for targets that declare the product dependency **directly**. Our app target doesn't — the pod target does, and app targets are in a different project entirely.
- *CocoaPods'* generated `[CP] Embed Pods Frameworks` phase embeds **pod** frameworks. SPM-built frameworks aren't pods; it doesn't know they exist.

The result is the worst failure mode in this whole design: the app **builds successfully** and then crashes instantly at launch with `dyld: Library not loaded: @rpath/Stripe....framework`. (RNFB hit exactly this; their fix is the template for ours.)

Job 4 (`add_embed_phase`) closes the gap by installing a shell-script build phase — named `[stripe-react-native] Embed SPM Frameworks` — on the **user's app target**. At build time the script:

- Checks both locations Xcode builds package frameworks into (regular builds' `PackageFrameworks/`, plus the Archive location), and exits harmlessly if the target has no frameworks folder at all.
- Considers **only `Stripe*.framework`** — the name filter matters for coexistence: other tools maintain equivalent phases for their own packages (RNFB embeds Firebase frameworks this way), and nobody should touch anybody else's.
- **Skips statically built frameworks**, detected by running `file` on the binary and checking for "dynamically linked." Static ones are already absorbed into their consumers, and embedding a static framework in an app bundle *fails App Store validation* — so blindly copying everything would trade a launch crash for a submission rejection.
- Copies each framework into the app bundle's frameworks folder, stripping `Headers`/`PrivateHeaders`/`Modules` directories (build-time artifacts that don't belong in a shipped app), skipping any framework already present (some other phase may have legitimately embedded it first).
- **Re-signs** each copied framework with the app's code-signing identity — everything inside an app bundle must be signed by the same identity — using `--preserve-metadata=identifier,entitlements` so re-signing doesn't clobber the framework's own identity metadata.

Because this phase lives in the *user's project* — which, per §2.3, persists between installs — its lifecycle needs the care that Pods.xcodeproj mutations don't:

- **Idempotent and self-updating:** on each install, if the phase exists with identical script content, nothing is touched (repeat `pod install` runs stay diff-free in version control); if an SDK upgrade changed the script, the phase is rewritten in place, keyed by its name.
- **Marked "always run":** the phase declares no input/output files (the set of frameworks isn't knowable statically), and explicitly opting into always-run prevents Xcode's build-phase fingerprinting from ever skipping it.
- **Scoped to application targets only** that actually link our pod — unit-test bundles and extensions load frameworks from their host app and shouldn't embed anything.
- **Removed on opt-out:** this is the cleanup mentioned in §3.3's overview. When SPM mode is off, `apply` actively deletes the phase if a previous SPM-mode install left it behind. Without this, "opting out" would silently leave our build phase in the user's project forever — harmless, but exactly the kind of residue that erodes trust in tooling.

### 3.4 The whole flow, end to end

Putting the layers back together — what actually happens when a developer on RN ≥ 0.75 runs `pod install` with our SDK:

1. Autolinking adds `stripe-react-native` from `node_modules` as a development pod.
2. CocoaPods evaluates our podspec → it requires `stripe_spm.rb` (installing the installer wrapper) → `stripe_spm_enabled?` sees `spm_dependency` defined and no opt-out → the Swift package declaration is recorded with RN's manager; no `Stripe*` pod dependencies are declared, so the resolved graph contains no Stripe pods at all.
3. CocoaPods generates Pods.xcodeproj and runs post-install hooks: the user's `post_install` block calls `react_native_post_install`, which writes the package reference and the six core product dependencies onto our pod target.
4. Our wrapper fires next: verifies the pod builds as a dynamic framework (or aborts with instructions), verifies the package reference exists, links `StripeCryptoOnramp` if the Onramp subspec was requested, and installs/refreshes the embed phase on the app target.
5. CocoaPods writes both projects to disk.
6. The developer builds. Xcode resolves and clones `stripe-ios-spm` at the pinned tag (first build only), compiles the Stripe targets from source, links the products into our pod framework, and — if any were built as dynamic frameworks — our embed phase copies and re-signs them into the app bundle.
7. At runtime, everything loads and PaymentSheet renders. (SPM even handles the SDK's bundled resources — images, localizations — via its own resource-bundle mechanism, `Bundle.module`, which the manual smoke test specifically validated.)

And the two off-ramps: on RN < 0.75, step 2's detection fails and the podspec declares pod dependencies exactly as before — nothing else in this document happens. With `$StripeDisableSPM = true`, same, except step 4 still runs its cleanup arm to remove a leftover embed phase.

---

## Part 4: What users experience

**A React Native ≥ 0.75 app upgrading the SDK:** ensure the Podfile has `use_frameworks! :linkage => :dynamic` (many apps — anyone using react-native-firebase v26+ — already do), run `pod install`, done. The first build clones and compiles stripe-ios from source, so it's noticeably longer; subsequent builds are incremental. No code changes; the JS and native API surface is completely untouched by all of this.

**An app that can't build with dynamic frameworks:** add `$StripeDisableSPM = true` at the top of the Podfile and nothing changes from today. This valve stays honest for as long as stripe-ios keeps publishing pods; the pinned versions remain installable from the frozen registry even after the December 2026 lock.

**A React Native < 0.75 app:** no action, no behavior change, automatically on pods.

**Expo apps:** set `"useFrameworks": "dynamic"` via the expo-build-properties config plugin (Expo's default is static). Expo pins a specific stripe-react-native version per Expo SDK release, so this rollout also involves coordination with them.

**The failure modes are designed to be self-explanatory.** The two configurations that can't work — static linkage, and a Podfile that never calls `react_native_post_install` — abort `pod install` with messages that name the problem and both fixes. The goal is that no one ever reaches the cryptic downstream versions of these errors (undefined symbols at app link; `no such module 'Stripe'` mid-build).

---

## Part 5: Proving it works — the harness and what it taught us

The mechanism above is ~460 heavily commented lines of Ruby. Validating it took considerably more effort than writing it, and two of the war stories genuinely deepen the understanding of the system — so they're included here. (The full iteration log is in `SPM_FINDINGS.md`.)

### 5.1 The example app doubles as the test bench

The repo's example app is generated by react-native-test-app (a Microsoft harness that manufactures a complete RN app around a library). Its Podfile now defaults to SPM mode with dynamic frameworks, with `STRIPE_DISABLE_SPM=1` as a developer/CI toggle to exercise the fallback. CI (Bitrise) builds and tests the matrix: native unit tests and end-to-end Release builds with UI tests on **both** RN architectures in SPM mode, plus a build-only job pinned to the fallback path so the pods arm can't silently rot.

("Both architectures": React Native is mid-transition between its legacy native-bridge runtime — the "old architecture" — and a rewritten one — the "new architecture" (bridgeless mode, using Meta's Hermes JS engine). Libraries must support both, and the linkage behavior differs enough between them that both need coverage.)

### 5.2 War story #1: the linkage flip has a blast radius

Switching an app to `use_frameworks! :linkage => :dynamic` doesn't just affect our pod — **every pod in the graph becomes a dynamic framework, and each must now resolve its own symbols at its own link step.** Under static libraries, a pod with an under-declared dependency gets away with it, because all symbols resolve together at the final app link where everything is present. Dynamic frameworks revoke that amnesty, one pod at a time.

Nearly every CI failure in this project was that phenomenon surfacing in *harness* code, not in our mechanism. The most instructive instance: react-native-test-app's dev-support pod failed to link with undefined `facebook::jsi::*` symbols (JSI is RN's C++ JavaScript-engine interface). Root cause: when the Hermes engine is enabled, React Native deliberately **omits the JSI implementation from its React-jsi pod** — the definitions live inside Hermes' prebuilt dylib, to avoid duplicate definitions (the One Definition Rule). Any pod whose own C++ uses JSI must therefore link `hermes.framework` directly — and this pod declared a dependency on React-jsi but not on hermes-engine. Invisible under static linkage for years; instantly fatal under dynamic. The fix was one force-linked `-framework "hermes"` flag in the example Podfile.

This story matters beyond the harness because it defines **the actual risk profile of the rollout**: the Stripe mechanism itself contains nothing architecture- or app-specific, but the dynamic-frameworks prerequisite can surface latent under-declared dependencies anywhere in a *merchant's own* pod graph. Apps already on dynamic frameworks should upgrade seamlessly; static apps making the flip are taking an app-specific gamble — which is exactly what the fail-fast message and the `$StripeDisableSPM` valve are for.

### 5.3 War story #2: test the migration, not just the destination

After CI was green, the first `pod install` on a developer machine *with a previous pods-mode install* crashed deep inside CocoaPods. The chain: a subspec in our podspec declared `private_header_files = '**/*.h'`; CocoaPods globs that pattern against the **entire pod root** — which for a development pod is the whole repo, including (via the `node_modules` symlink) the example app's `Pods/` directory; and switching to SPM removes the Stripe pods from the graph, so the same install run deletes their checkouts, leaving dangling symlinks in the sandbox's header store — which the unscoped glob then swept up and `realpath`'d into an exception. Fresh checkouts (CI) can never hit it; only real machines mid-migration could. The fix was scoping the pattern to the subspec's own directory. Two durable lessons: unscoped podspec globs are latent bugs for development pods, and any change that *removes* pods from a dependency graph gets its first honest test on a dirty sandbox.

### 5.4 Testing the SDK's native unit tests needed rewiring

The SDK's native unit tests previously ran via a podspec `test_spec`, which builds a test-bundle target *inside the Pods project*. Under SPM mode that stops being viable — RN's bridge wires module visibility for pod targets, and a separate test target can't see the SPM-built Stripe modules. The example app now compiles the test sources into its own app-level test target instead, with explicit compiler flags pointing at the module maps Xcode generates for the package targets. Those flags live only in the example's Podfile — shipping them in the podspec was deliberately avoided, because app code never imports Stripe modules directly and regular apps don't need any of it.

---

## Part 6: Boundaries, risks, and what's next

**What this solution is not.** It is not a migration off CocoaPods — that's React Native's own long-term project, and when RN ships real SPM support for libraries, this design carries forward (the package pin and product list transfer directly; users migrate zero times in between). It also deliberately does not support static linkage — though notably, being a *single* pod makes static support plausibly achievable for us (attach the SPM products to the app target itself, so the final link sees them) where it structurally wasn't for Firebase's ~20 pods. That's a deferred investigation, interesting mainly because Expo defaults to static.

**Known open items** (tracked in `SPM_FINDINGS.md`): the stripe-ios pod-publishing end date (sets the fallback's lifetime); an Archive/TestFlight validation pass and an Expo prebuild validation; first-build latency measurement (a binary Swift package from stripe-ios is the lever if source builds prove painful); a platform-floor wrinkle (the Swift package declares iOS 15 while the podspec still says 13 — only theoretically reachable on RN 0.75 exactly); and lifting the same helper into stripe-identity-react-native, which has the identical problem and was kept in mind throughout (`stripe_spm.rb` has no dependencies on anything outside itself and the podspec contract).

**Where to read the code.** Everything ships in the npm package: `stripe_spm.rb` at the package root (the implementation — its comments are a condensed version of Part 3), the conditional in `stripe-react-native.podspec`, and the user-facing story in the README ("Stripe iOS SDK resolution") and CONTRIBUTING ("iOS: how the Stripe iOS SDK is resolved"). The example app's `example/ios/Podfile` documents every harness-only configuration with the same thoroughness. The change is PR [#2587](https://github.com/stripe/stripe-react-native/pull/2587).

**The one-paragraph version, for when someone asks you to explain it:** stripe-ios is leaving CocoaPods, but only our *dependency* on it went through the pod registry — our own pod ships in the npm package and always will. So the podspec now detects React Native ≥ 0.75 and, instead of declaring Stripe pod dependencies, declares the stripe-ios Swift package using RN's official bridge, which writes real Xcode package references into the generated Pods project; Xcode then builds Stripe from source like any SPM dependency. A small Ruby helper we ship hooks the CocoaPods installer to cover the gaps: it requires dynamic frameworks (a static-library pod physically can't carry the Stripe code to the app, so we fail fast with instructions), links the optional Onramp product that subspec declarations can't express, and maintains a build phase that embeds and re-signs SPM-built dynamic frameworks into the app bundle so the app doesn't crash at launch. Old React Native versions and opted-out apps keep resolving pods exactly as before, pinned to the same stripe-ios version.
