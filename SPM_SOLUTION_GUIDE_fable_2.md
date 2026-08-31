# Resolving the Stripe iOS SDK through Swift Package Manager

### A complete, line-by-line treatment of the mechanism

---

## Preface

### Purpose and audience

This document is a full, textbook-style explanation of one change to `@stripe/stripe-react-native`: instead of acquiring its Stripe iOS SDK dependency from the CocoaPods registry, the SDK now resolves stripe-ios through **Swift Package Manager (SPM)** — while itself remaining a CocoaPods pod.

It is written for a junior iOS engineer. We assume you can write Swift, have run `pod install` at least once, and have opened Xcode — and nothing else. Every other concept the solution touches is defined before it is used: how React Native distributes native code, what a linker actually does, how Swift packages live inside an Xcode project, how CocoaPods works internally, and enough Ruby to read the implementation. If you already know some of this material, the chapters are independent enough to skim; each ends with a short summary and review questions so you can check whether skipping was safe.

By the end you should be able to:

1. Explain precisely *why* the change was needed and why its scope is narrower than "CocoaPods is going away" suggests (Chapters 1–2).
2. Read every line of the shipped implementation — the podspec conditional and `stripe_spm.rb` — and say what it does and why it is there (Chapters 7 and 9).
3. Read the React Native code the implementation builds on (Chapter 8).
4. Trace an entire `pod install` and app build end to end, in both the SPM mode and the fallback mode (Chapter 10).
5. Understand the test harness, the failure modes, and the design's boundaries (Chapters 11–13).

### The artifact under study

The production mechanism ships in the npm package; the branch also changes its test, CI, lockfile, and communication surfaces. The complete set studied here is:

| File | Role | Size |
|---|---|---|
| `stripe_spm.rb` (repo root) | The integration helper: mode detection, package declaration, two installer hooks, validation, project-integrity guards, Onramp linking, framework embedding | 683 lines (roughly half comments) |
| `stripe-react-native.podspec` | Chooses per-install between SPM mode and the CocoaPods fallback | ~40 changed lines |
| `package.json` | Adds `stripe_spm.rb` to the published file list; repoints the iOS unit-test script | 3 lines |
| `src/plugin/withStripe.ts` | The Expo config plugin; the branch adds a `disableSPM` option that injects the Podfile opt-out for apps whose Podfile is generated | ~45 changed lines |
| `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md` | User-facing, maintainer-facing, and release-note documentation | prose |
| `example/ios/Podfile` | The test harness configuration (not shipped to users) | ~200 lines |
| `example/ios/Podfile.lock` | Generated evidence that the default CocoaPods graph no longer contains Stripe iOS SDK pods | generated data |
| `bitrise.yml` | CI matrix covering both modes, both React Native architectures, and the Expo prebuild path | config |
| `scripts/test-expo-project`, `scripts/update-expo-plugins.js` | CI validation of the Expo Continuous Native Generation path (not shipped to users) | ~120 changed lines |
| `SPM_FINDINGS.md`, `SPM_SOLUTION_GUIDE.md`, `SPM_SOLUTION_GUIDE_fable.md` | Investigation and companion explanations; not executable build inputs | prose |

One further file matters even though it is not ours: `scripts/cocoapods/spm.rb` inside React Native ≥ 0.75, the official bridge that writes Swift package references into CocoaPods' generated project. Chapter 8 reads it line by line, because the shipped solution is designed around exactly what that file does and does not do.

### Companion documents

- `SPM_FINDINGS.md` — the investigation record: alternatives considered and rejected, the decision log, the full CI iteration history, and open items. This document teaches the mechanism that shipped; that one records how we got here.
- `SPM_SOLUTION_GUIDE.md` and `SPM_SOLUTION_GUIDE_fable.md` — earlier, shorter explanations of the same material. This document supersedes neither; it is the long-form teaching edition.
- The change itself is PR [#2587](https://github.com/stripe/stripe-react-native/pull/2587).

### Notation

- Code listings are captioned with their source file and the line numbers in that file as of this branch, e.g. *Listing 9.4 (`stripe_spm.rb`, lines 145–168)*. You are encouraged to keep the real file open beside this document; the line numbers are meant to let you move between the two.
- `§` references sections of this document. "*Definition*" blocks introduce terms used throughout; the Glossary (Appendix A) collects them alphabetically.
- Shell commands and code identifiers appear `like this`.
- "The SDK", unqualified, means `@stripe/stripe-react-native`. "stripe-ios" means the native Stripe iOS SDK it depends on. "The app" means a merchant's React Native application that installs the SDK.

### How to use this book

For a first reading, proceed in order: the later line-by-line chapters intentionally rely on vocabulary proved in Part II. Keep `stripe-react-native.podspec`, `stripe_spm.rb`, and `example/ios/Podfile` open beside the text and use the printed source-line numbers to move between explanation and implementation.

For a review after you already understand iOS build systems, read Chapters 2, 6, 9, 10, and 13. For a specific failure, begin with §13.1's stage table, follow the matching diagnostic section, then return to the cited implementation chapter. Review questions are retrieval checks, not trick trivia; the capstone solutions in Appendix D demonstrate the expected depth of reasoning.

### Contents

- **Part I — Background and problem:** React Native/native distribution (Chapter 1) and the registry migration problem (Chapter 2).
- **Part II — Foundations:** static/dynamic linking (Chapter 3), SPM's Xcode representation (Chapter 4), and CocoaPods/Ruby lifecycle mechanics (Chapter 5).
- **Part III — The solution:** architecture (Chapter 6), the complete podspec (Chapter 7), RN's bridge (Chapter 8), the complete Stripe helper (Chapter 9), the end-to-end lifecycle (Chapter 10), the test harness (Chapter 11), and publication/CI/documentation (Chapter 12).
- **Part IV — Diagnosis, evaluation, and maintenance:** failure stages, investigation lessons, boundaries, alternatives, and maintainer playbooks (Chapter 13).
- **Appendices:** glossary, source coverage index, inspection commands, solved capstone scenarios, and references.

---

# Part I — Background and problem

## Chapter 1. The anatomy of a React Native library

Before we can state the problem, we need a precise picture of how native code travels from a library author's repository into a merchant's running app. This chapter builds that picture from the ground up. None of it is Stripe-specific.

### 1.1 The two halves of a React Native library

**React Native (RN)** is a framework for building mobile apps in JavaScript (or TypeScript). An RN app is, at runtime, a native iOS app — a real `.app` bundle with a real process — that hosts a JavaScript engine. The app's UI and business logic run as JavaScript; when they need something only the platform can provide (a camera, a payment sheet, Apple Pay), they call across a boundary into native code.

A library like `@stripe/stripe-react-native` therefore ships **two halves**:

1. **A JavaScript half** — the API app developers import (`import { useStripe } from '@stripe/stripe-react-native'`).
2. **A native half** — Swift and Objective-C source files that the JavaScript calls into. Our native half is a thin *wrapper*: it adapts the real payments logic, which lives in **stripe-ios** (the native Stripe iOS SDK), to React Native's calling conventions.

Keep the wrapper/wrapped distinction in mind throughout this document. The SDK's own native code is small; the heavyweight dependency is stripe-ios, and *how the wrapper obtains stripe-ios* is the entire subject of this document.

### 1.2 Distribution: npm and `node_modules`

> **Definition.** **npm** is the package registry and package manager of the JavaScript ecosystem. Installing a package copies its published contents into a directory called `node_modules` inside the app's repository.

React Native libraries are distributed **exclusively through npm** — including their native halves. When a developer runs `yarn add @stripe/stripe-react-native`, npm places the package's full contents at:

```
<app>/node_modules/@stripe/stripe-react-native/
├── src/                        ← the JavaScript half
├── ios/                        ← the native half (Swift/ObjC sources)
├── android/
├── stripe-react-native.podspec ← see §1.3
├── stripe_spm.rb               ← the subject of Chapter 9
└── package.json
```

Note what this means: the native sources are already *on disk inside the app repository* after `yarn add`. No native package manager has been involved yet. But files on disk do not compile themselves — something must tell Xcode about them. That something is CocoaPods.

### 1.3 CocoaPods from the ground up

> **Definition.** **CocoaPods** is a dependency manager for Xcode projects. A unit of distribution is a **pod**. Each pod is described by a **podspec** — a file naming the pod, its version, its source files, its build settings, and its dependencies. An app declares which pods it wants in a file called a **Podfile**. The command `pod install` makes it all real.

CocoaPods predates SPM by many years, and the React Native ecosystem standardized on it: every RN app template ships with a Podfile. It is worth understanding what `pod install` actually produces, because the entire solution operates inside this machinery.

When the developer runs `pod install` in the app's `ios/` directory, CocoaPods:

1. **Resolves the dependency graph.** It reads the Podfile, loads every requested pod's podspec, follows each podspec's declared dependencies (which have podspecs of their own), and computes a single consistent set of pod versions. The result is recorded in `Podfile.lock` so subsequent installs are reproducible.

2. **Fetches sources.** For pods that come from the **registry** (§1.4), it downloads the source archives into `ios/Pods/`. This directory — together with CocoaPods' bookkeeping inside it — is called the **sandbox**.

3. **Generates `Pods.xcodeproj`.** This is the step people most often misunderstand. CocoaPods does not "add files to your app project." It synthesizes an entirely separate Xcode project, `Pods/Pods.xcodeproj`, containing **one build target per pod**. Your library is not "some files"; it is a real Xcode target, with its own build settings and its own compile and link steps, built independently of the app.

4. **Integrates with the app project.** CocoaPods creates (or updates) an `.xcworkspace` — an Xcode *workspace* is a container that lets multiple `.xcodeproj` files build together — containing both the app's project and `Pods.xcodeproj`. It then wires the app target to the pods: it generates `.xcconfig` files (text files of build settings) that the app target's build configurations are based on, and injects a couple of script build phases into the app target (one of which, `[CP] Embed Pods Frameworks`, will matter a great deal in §9.10).

So the mental model is:

```
  Podfile + podspecs
        │  pod install
        ▼
  Pods.xcodeproj          ← one target per pod; regenerated every install
        +
  MyApp.xcodeproj         ← the developer's own project; edited surgically
        │
        ▼
  MyApp.xcworkspace       ← builds both together
```

The two projects have **opposite lifetimes**, a fact that drives real design decisions later (§5.5): `Pods.xcodeproj` is thrown away and regenerated from scratch on *every* `pod install`, while the app's own project persists indefinitely and is merely edited.

### 1.4 The registry, and the exception to it: development pods

Where do podspecs come from during resolution? Two places:

> **Definition.** The **CocoaPods trunk registry** ("trunk") is the central public index of published pods. When a podspec says `s.dependency 'StripePayments', '26.7.0'`, CocoaPods looks up `StripePayments` version `26.7.0` in trunk, finds the podspec and the source location it points at, and downloads accordingly.

> **Definition.** A **development pod** (also "local pod" or "path-based pod") is a pod whose podspec and sources are read **directly from a path on disk**, declared in the Podfile as `pod 'name', :path => '...'`. No registry lookup occurs; no download occurs. The pod's "source" is simply the directory.

Development pods exist so that you can work on a pod locally. But they are also — and this is the pivotal fact of this entire document — **how every React Native library is consumed, always**, thanks to autolinking.

### 1.5 Autolinking

> **Definition.** **Autolinking** is the React Native CLI mechanism that connects npm-installed libraries to the native build without manual Podfile edits. During `pod install`, it scans `node_modules`, finds each library's `.podspec` file, and adds it to the Podfile's dependency set as a *development pod* whose path is that library's directory inside `node_modules`.

Read that carefully: when an app installs `@stripe/stripe-react-native`, our podspec is **never fetched from the trunk registry**. npm delivered the podspec (it sits at the package root, per the `files` list in `package.json`); autolinking loads it from `node_modules/@stripe/stripe-react-native/` as a development pod. The registry could vanish tomorrow and this step would not notice.

The full pipeline, then:

```
npm (delivers all files) ──► node_modules/@stripe/stripe-react-native/
                                     │
                                     │  autolinking finds the .podspec
                                     ▼
                     development pod in the app's dependency set
                                     │
                                     │  pod install
                                     ▼
                     a target in Pods.xcodeproj, linked into the app
```

### 1.6 Where stripe-ios historically entered

One link in the pipeline *did* depend on the registry. Our podspec declared, until this branch:

```ruby
core.dependency 'Stripe', stripe_version
core.dependency 'StripePaymentSheet', stripe_version
core.dependency 'StripePayments', stripe_version
core.dependency 'StripePaymentsUI', stripe_version
core.dependency 'StripeApplePay', stripe_version
core.dependency 'StripeFinancialConnections', stripe_version
# plus StripeCryptoOnramp, for one optional feature
```

Unlike our own pod, these `Stripe*` pods were resolved from **trunk**, where stripe-ios has published every release. During `pod install`, CocoaPods downloaded their sources into the sandbox and built each one as its own target in `Pods.xcodeproj` — exactly like ours, just sourced differently.

### Chapter summary

- An RN library ships JS and native halves in one npm package; npm places everything in `node_modules`.
- CocoaPods turns podspecs into real Xcode targets in a generated project (`Pods.xcodeproj`) and wires them into the app via a workspace, xcconfigs, and injected build phases.
- Autolinking consumes every RN library as a *development pod* read from `node_modules` — never from the registry.
- The only registry-dependent part of our iOS story was the set of `Stripe*` dependency lines in our podspec.

### Review questions

1. After `yarn add @stripe/stripe-react-native` but before `pod install`, where on disk are the SDK's Swift sources? Is Xcode aware of them?
2. What is the difference between how CocoaPods obtains *our* podspec and how it obtains the `StripePayments` podspec (before this branch)?
3. `Pods.xcodeproj` and the app's `.xcodeproj` are both Xcode projects. Which one is regenerated on every `pod install`, and why will that distinction matter for any tool that modifies them?

---

## Chapter 2. The problem: a registry reaches end of life

### 2.1 Two clocks

Two independent deadlines threaten the `Stripe*` dependency lines of §1.6:

1. **stripe-ios is deprecating CocoaPods support.** At some point — the exact date is still being confirmed with the stripe-ios team — new stripe-ios releases will stop being published as pods. From that release onward, the pod lines cannot pin new versions because no new versions exist in the registry.

2. **The CocoaPods trunk registry becomes permanently read-only on December 2, 2026.** After that date *nobody* — Stripe or anyone else — can publish new pod versions. Two subtleties: the registry **freezes rather than disappears** (already-published versions remain downloadable indefinitely), and the freeze is ecosystem-wide, which is why this is not a Stripe-specific storm. Firebase stops publishing pods in October 2026. Apple's investment is entirely in SPM. The whole iOS ecosystem is exiting CocoaPods.

### 2.2 Scoping the problem precisely

A naive reading — "CocoaPods is dying, so we must stop being a CocoaPods pod" — leads somewhere impossible. Autolinking, the only mechanism by which React Native apps consume native libraries today, *is* CocoaPods (§1.5). React Native has a long-term project to move off CocoaPods, but no released RN version supports an SPM-only library. An SDK that stopped being a pod would simply stop installing.

But recall the pivotal fact from §1.5: our own podspec is never fetched from the registry. Autolinking always loads it from `node_modules` as a development pod. The registry freeze **cannot affect our own pod**. The only registry-dependent lines in the entire iOS story are the `s.dependency 'Stripe*'` declarations.

That observation shrinks the problem from "migrate off CocoaPods" to something far narrower:

> **Problem statement.** Make the `stripe-react-native` pod acquire stripe-ios by some means other than the CocoaPods registry — while remaining a CocoaPods pod itself.

We are replacing dependency *acquisition*, not the packaging of the SDK. Everything that follows is a consequence of this reframing.

### 2.3 Prior art: react-native-firebase

We were not the first to face this. When Firebase announced its own pod deprecation, **react-native-firebase (RNFB)** — one of the largest React Native libraries in existence — reached the same conclusion and shipped exactly this architecture: their pods stay pods, and the Firebase iOS SDK underneath is resolved through SPM. It has been **on by default since `@react-native-firebase/app` 26.1.0 (July 2026)**, running at enormous scale.

This matters for two reasons. First, it de-risks the design: the failure modes, the workarounds, and the one hard requirement (dynamic frameworks, Chapter 3) are production-proven. Second, it sets ecosystem expectations: a large fraction of RN apps will have made the required configuration change for Firebase before they make it for Stripe.

We adopted RNFB's recipe and simplified where our situation is simpler: we are **one pod** where they are ~20; stripe-ios's Swift package is **pure source** where Firebase ships binaries; and our wrapper's Objective-C++ never imports the vendor SDK, where theirs does. `SPM_FINDINGS.md` records the alternatives we evaluated (vendored frameworks, a private spec repo, asking apps to add the package themselves, and others) and why each lost.

### 2.4 What "success" must preserve

Any acceptable solution had to keep the following invariants, which we will check off as the design unfolds:

- **Zero code changes for app developers.** The JS and native API surface is untouched.
- **Minimal, declarative Podfile configuration.** Autolinking must keep owning dependency integration: apps already using dynamic frameworks need no new package wiring; static apps add one linkage directive for SPM mode or one explicit fallback flag. No app should manually add Stripe package products or call a Stripe install hook.
- **An escape hatch.** Apps that cannot adopt the new mode immediately must be able to opt out, for as long as stripe-ios keeps publishing pods.
- **Old React Native keeps working.** RN < 0.75 (which lacks the bridge we will meet in Chapter 8) must silently keep the old behavior.
- **One version pin.** The SDK is tested against exactly one stripe-ios version per release; both acquisition paths must pin the same version, from the same constant, so they cannot drift apart.

### Chapter summary

- New stripe-ios pods stop existing (stripe-ios deprecation) and eventually cannot exist (trunk freeze, December 2, 2026); existing versions remain downloadable.
- Our own pod is structurally immune to the freeze because autolinking consumes it as a development pod.
- The task is precisely: replace registry acquisition of stripe-ios with SPM acquisition, inside a pod that remains a pod.
- react-native-firebase shipped this exact architecture at scale in July 2026; we adopted and simplified their recipe.

### Review questions

1. Why can't the SDK simply stop being a CocoaPods pod and become a Swift package?
2. After December 2, 2026, can an app still `pod install` stripe-ios `26.7.0` from the registry? Can it install a hypothetical `27.0.0` published in 2027?
3. Which of the five invariants in §2.4 would be violated by asking every app to add stripe-ios to their Xcode project manually?

---

# Part II — Foundations

The solution is small — one Ruby file plus a conditional in the podspec — but it sits at the intersection of three pieces of machinery: the linker, SPM-inside-Xcode, and CocoaPods' execution model. This part builds each one up properly. The payoff is that Part III becomes almost self-evident.

## Chapter 3. Linking: static and dynamic

The single deepest constraint in the design — the requirement that apps build with *dynamic frameworks* — is a linking fact. This chapter derives it from first principles.

### 3.1 From source to executable

When you build a Swift or C-family source file, the compiler produces an **object file** (`.o`): machine code for that file's functions, plus a table of **symbols**. A symbol is just a name with an address — `_$s6Stripe12PaymentSheetC...` is (a mangled form of) "the `PaymentSheet` class from module `Stripe`". Object files contain two kinds of symbol entries:

- **Defined symbols** — "this object file *contains* the code/data for this name."
- **Undefined symbols** — "this object file *uses* this name; someone else must provide it."

The **linker** (`ld`) is the program that takes a pile of object files and libraries and produces a final product, resolving every undefined symbol to some definition. If any undefined symbol has no definition anywhere in the inputs, the link fails with the error every iOS engineer eventually meets:

```
Undefined symbols for architecture arm64:
  "_$s6Stripe...", referenced from: ...
```

Hold onto the shape of that failure: *it happens at the final link, far from wherever the missing definition should have come from, and the error names a mangled symbol, not a fix.*

### 3.2 Static libraries

> **Definition.** A **static library** (`.a` file) is an *archive* — literally a concatenation, made by the `ar` tool — of object files. Nothing more.

Two consequences follow from "nothing more":

1. A static library is **not linked when it is built**. Building `libFoo.a` runs the compiler and the archiver, never the linker. No symbol resolution happens.
2. Whoever links the *final executable* copies the needed object code **out of** the archive into the executable. The library is a bag of parts, consumed at someone else's link step.

And the property that drives our whole design:

> **Proposition (static libraries cannot carry their dependencies).** If `libA.a` uses symbols from library B, then `libA.a` does *not* contain B's code — it contains only A's own object files, with *undefined* references to B's symbols. Whatever links the final executable must link B too, or the link fails.

There is no way around this; it is what "archive of object files" means. A static library can *name* its needs (as undefined symbols) but can never *satisfy* them.

### 3.3 Dynamic libraries, frameworks, dyld, and embedding

> **Definition.** A **dynamic library** ("dylib") is a real *linked product* — the linker runs when it is built. A **framework** is a folder (`Foo.framework`) bundling a library together with its headers and resources; a **dynamic framework** is a framework whose library is a dylib.

Because a dylib has its own link step, it can **contain** its dependencies (statically absorbed into it) or carry resolved references to other dylibs. Either way, unlike a static library, it can hand its consumer a *self-contained* unit.

The cost is at runtime. A dylib is not copied into the executable; the executable merely records "I need `@rpath/Foo.framework/Foo`". At app launch, the operating system's **dynamic loader, `dyld`**, reads those records and loads each dylib from disk. `@rpath` is a placeholder resolved against a list of search paths baked into the app — for iOS apps, effectively "the `Frameworks/` directory inside my own `.app` bundle."

That gives dynamic frameworks two obligations that static libraries never have:

1. **Embedding.** The framework must be physically copied into the app bundle's `Frameworks/` directory. iOS apps are sandboxed; there is no shared `/usr/lib` for third-party code — if it isn't in the bundle, `dyld` cannot find it.
2. **Code signing.** Everything inside an app bundle must be signed consistently with the app; an embedded framework must be (re-)signed with the app's identity.

A framework that is *linked but not embedded* produces the classic failure — the app **builds successfully** and then crashes instantly at launch:

```
dyld: Library not loaded: @rpath/StripePaymentSheet.framework/StripePaymentSheet
  Referenced from: /.../MyApp.app/Frameworks/stripe_react_native.framework/...
  Reason: image not found
```

Note how this failure differs from §3.1's: it is *later* (runtime, not build time), and its cause (a missing copy step) is even further from the error text. Both failure shapes will reappear in Chapter 9 as the things the design must make impossible.

### 3.4 How CocoaPods chooses linkage

CocoaPods can build any pod in four ways — the product of two independent choices, *library vs. framework packaging* and *static vs. dynamic linking*:

| | static | dynamic |
|---|---|---|
| **library** | static library (`.a`) — **the default** | dynamic library (rare; no Podfile shorthand) |
| **framework** | static framework | dynamic framework |

The Podfile directive `use_frameworks!` switches every pod to frameworks; `use_frameworks! :linkage => :dynamic` makes them *dynamic* frameworks, `:linkage => :static` static ones. React Native apps default to **static libraries** — the top-left cell. Keep this table in mind; a function in Chapter 9 (`verify_dynamic_linkage!`) enumerates exactly these four cells.

### 3.5 SPM products and "automatic" linkage

One more linking concept completes the toolkit. A Swift package declares **products** — named units that consumers can depend on. A library product may specify its linkage:

```swift
.library(name: "Stripe", type: .dynamic, targets: [...])   // explicit
.library(name: "Stripe", targets: [...])                   // "automatic"
```

With **automatic** linkage — by far the most common, and what stripe-ios uses for all its products — the package does not choose. **Xcode decides per build** how to link the product into each consumer. Typically it statically absorbs the product's object code into whatever links it; in some configurations it instead builds the product as a real dynamic framework (we will meet exactly where those land on disk in §9.10).

Remember both halves of that sentence. "Typically statically absorbed" is the root of the dynamic-frameworks *requirement* (§9.7); "sometimes a real dynamic framework" is the root of the *embedding* machinery (§9.10).

### Chapter summary

- Object files declare defined and undefined symbols; the linker must resolve every undefined symbol or the build fails at the final link.
- A static library is an archive of its own object files only; it can never carry its dependencies. A dynamic framework is a linked product that can; in exchange it must be embedded in the app bundle and signed, or the app crashes at launch under `dyld`.
- CocoaPods builds pods as static libraries by default; `use_frameworks! :linkage => :dynamic` switches to dynamic frameworks.
- stripe-ios's SPM products use automatic linkage: Xcode decides, usually static absorption into the consumer, occasionally real dynamic frameworks.

### Review questions

1. `libWrapper.a` calls `PaymentSheet.present()` from the Stripe module. Does `libWrapper.a` contain the code of `PaymentSheet.present()`? What does it contain instead?
2. An app links a dynamic framework but nothing copies it into the bundle. At what moment does the failure appear, and what does the message look like?
3. Who chooses how an automatic-linkage SPM product is linked into its consumer — the package author, the app developer, or Xcode?
4. Which Podfile line puts an RN app into the bottom-right cell of the table in §3.4?

---

## Chapter 4. Swift Package Manager inside Xcode

If you have used SPM, you have probably either written a `Package.swift` or clicked *File → Add Package Dependencies…* in Xcode. Our solution performs the second flow *programmatically*, so this chapter explains what that flow actually does under the hood.

### 4.1 What a Swift package is

A **Swift package** is a directory with a `Package.swift` manifest describing:

- **Targets** — buildable units of source code, each with its own dependencies on other targets.
- **Products** — the externally consumable groupings of targets (§3.5). Consumers depend on *products*, and SPM expands each product into the full graph of targets behind it.

The stripe-ios package exposes products including `Stripe`, `StripePaymentSheet`, `StripePayments`, `StripePaymentsUI`, `StripeApplePay`, `StripeFinancialConnections`, and `StripeCryptoOnramp`. Each is backed by one or more targets with their own transitive dependencies and resources. For example, depending on the single product `StripePaymentSheet` pulls in package targets such as `StripePayments`, `StripeCore`, `StripeUICore`, and more — the consumer names the product; SPM computes the rest.

### 4.2 How Xcode consumes a package — without any `Package.swift` on the consumer side

Here is the part that surprises people. When you add a package to an app in Xcode's UI, **no `Package.swift` is created anywhere in your app**. There is no manifest to maintain and no separate "SPM tool" that runs. Instead, Xcode stores two kinds of objects *inside the `.xcodeproj` itself*:

> **Definition.** An **`XCRemoteSwiftPackageReference`** is a project-level object recording a package's repository URL plus a *version requirement* — "exactly 26.7.0", "up to next major version", "branch X", etc.

> **Definition.** An **`XCSwiftPackageProductDependency`** is a target-level object recording "this target consumes product *P* from that package reference."

Given those two objects, **Xcode itself does everything else** as part of building the workspace: it resolves the version requirement against the repository's tags, clones the repository into `DerivedData` (its per-project build directory), reads the *package's* `Package.swift`, generates build targets for the package's contents, compiles them from source, and links the requested products into whichever targets declared the product dependencies. Resolved versions are recorded in a `Package.resolved` file inside the workspace data so that resolution is reproducible.

The reduction that makes our whole project tractable follows immediately:

> **Key reduction.** "Add an SPM dependency to a CocoaPods pod" = "get one `XCRemoteSwiftPackageReference` and some `XCSwiftPackageProductDependency` objects written into `Pods.xcodeproj`, attached to the pod's target."

Everything in Chapters 8 and 9 is in service of writing those objects correctly — and of handling the consequences of where they are attached.

### 4.3 The `.pbxproj` object graph

To read the code that writes those objects, you need to know what an Xcode project file *is*. The file `project.pbxproj` inside every `.xcodeproj` is a serialized **object graph**: a flat dictionary of objects, each with a unique identifier and a type (`isa`), pointing at one another by identifier. The types you will meet in this document:

| Object type | Represents |
|---|---|
| `PBXProject` | The project itself (the **root object**); owns targets, build configurations, and — since Xcode 11 — `packageReferences` |
| `PBXNativeTarget` | A buildable target; owns build phases, build configurations, and `packageProductDependencies` |
| `PBXShellScriptBuildPhase` | A "Run Script" build phase: a name, a shell path, and script text |
| `XCRemoteSwiftPackageReference` | §4.2 |
| `XCSwiftPackageProductDependency` | §4.2 |

In Ruby, the **Xcodeproj** gem (maintained by the CocoaPods project) models this graph one-to-one: `project.root_object` is the `PBXProject`; `project.root_object.package_references` is its list of package references; `target.package_product_dependencies` is a target's list of product dependencies; `project.new(SomeObjectClass)` allocates a new object in the graph; `project.save` serializes the graph back to disk. CocoaPods uses Xcodeproj to generate `Pods.xcodeproj`, and our code uses it (from inside CocoaPods) to make its own additions. When you see, in Chapter 9,

```ruby
installer.pods_project.root_object.package_references
```

you now know exactly what that is: the array of `XCRemoteSwiftPackageReference` objects hanging off the generated project's `PBXProject`.

### 4.4 Modules and module maps

One more piece of compiler machinery pays off twice later (§8.3 and §11.7).

When Swift code says `import Stripe`, the compiler must find the **module** named `Stripe`. For a Swift library, the build produces a `.swiftmodule` — a binary description of the module's public interface — and the compiler locates it by searching the paths in the `SWIFT_INCLUDE_PATHS` build setting. For C-family (and mixed) code, a **module map** (`module.modulemap`) is a small text file declaring which headers constitute a module; Clang reads it to let `import`/`@import` work. Xcode generates module maps for SPM package targets during the build and places them in the intermediates directory.

The point to retain: *module visibility is wiring, not magic*. A target can only import what its search paths let the compiler find, and when a build system stitches products together in an unusual way — as ours does — someone must supply that wiring explicitly.

### Chapter summary

- A package declares targets and products; consumers name products, SPM expands the target graph.
- Xcode consumes packages via two project-file objects — a project-level `XCRemoteSwiftPackageReference` and per-target `XCSwiftPackageProductDependency` entries — and then resolves, clones, builds, and links entirely on its own. No consumer-side manifest exists.
- `project.pbxproj` is an object graph; the Xcodeproj Ruby gem manipulates it directly, and both CocoaPods and our code are built on it.
- Module visibility (Swift modules, Clang module maps) is explicit wiring that our unusual topology sometimes has to supply by hand.

### Review questions

1. You add a package by URL in Xcode's UI. Name the two objects added to the project file, and state which is project-level and which is target-level.
2. Where does Xcode record the concrete version it resolved for a package requirement like "exactly 26.7.0"?
3. In the expression `installer.pods_project.root_object.package_references`, what type of object is `root_object`, and what does the list contain?

---

## Chapter 5. CocoaPods as a programmable system

CocoaPods is not a black box that reads configuration files; it is a **Ruby program that executes your configuration files as Ruby code**, and it exposes well-defined points where other Ruby code can participate in an install. The shipped solution is exactly such a participant. This chapter covers the Ruby you need to read it, then the three facts about CocoaPods' execution model that carry the whole implementation.

### 5.1 A Ruby primer for Swift engineers

Ruby is a dynamic, everything-is-an-object language. You do not need to *write* Ruby to follow this document, but you need to read it. Here is the survival kit, mapped to Swift where a mapping exists.

**Basics.**

```ruby
x = 5                      # variables: no declarations, no types
s = "version #{x}"         # string interpolation — Swift's "\(x)"
t = 'literal #{x}'         # single quotes: NO interpolation; the text is literal
arr = %w[a b c]            # array of strings: ["a", "b", "c"]
h = { kind: 'branch' }     # hash (dictionary); `kind:` is the symbol key :kind
```

- **Symbols** (`:application`, `:path`) are interned identifier values — think of them as lightweight, cheap-to-compare name constants, used where Swift might use an enum case or a string key.
- **`nil`** is Ruby's null. **Only `nil` and `false` are falsy** — unlike C, `0` and `""` are truthy.
- **Truthiness idioms**: `a && b`, `a || b` return operands, not booleans; `x ||= v` assigns `v` only if `x` is `nil`/`false`.

**Control flow.**

```ruby
return false unless condition   # `unless` = `if !`; modifiers can trail a statement
do_thing if enabled             # trailing `if`
x = x.parent until done         # trailing `until`: loop the statement until true
```

**Methods and blocks.** Parentheses are optional. A method defined with `def name` at the top level of a file becomes callable from everywhere in the process (technically a private method on `Object`, the root class — every object inherits it). Methods ending in `?` conventionally return booleans; methods ending in `!` conventionally warn "this mutates something or is otherwise consequential." Neither punctuation mark has semantics; both are naming convention.

**Blocks** are Ruby's closures, attached to method calls either as `{ |args| ... }` (one line) or `do |args| ... end` (multi-line). Enumerable methods you will meet constantly:

```ruby
list.each { |x| use(x) }               # forEach
list.find { |x| x.name == 'a' }        # first(where:) — returns element or nil
list.any? { |x| x.big? }               # contains(where:)
```

Inside a block, `next value` ends *the current block invocation* with that value (like `return` inside a Swift closure — it does not return from the enclosing method). A method that takes a block runs it with `yield(args)`, and the block's value is `yield`'s value.

**Constants and freezing.** Names starting with an uppercase letter are constants; `ALL_CAPS` is the convention for fixed values. `.freeze` makes the object itself immutable (Ruby string literals are otherwise mutable). `SOME_CONST = 'text'.freeze` is the standard "truly constant string" idiom.

**Heredocs.** Multi-line string literals:

```ruby
MESSAGE = <<~TEXT
  line one
  line two
TEXT
```

The `~` ("squiggly heredoc") strips the common leading indentation so the code can stay indented. If the delimiter is *single-quoted* — `<<~'SCRIPT'` — interpolation is disabled, exactly like single-quoted strings: `#{...}` and, importantly for us, shell text like `${TARGET_BUILD_DIR}` pass through byte-for-byte.

**Globals and `defined?`.** `$Name` is a process-global variable — readable and writable from any file. The keyword `defined?(expr)` returns a descriptive string if `expr` is defined in the current context (`"method"`, `"global-variable"`, …) and `nil` otherwise; it is the standard way to probe "does this method/global exist here?" without risking a `NameError`.

**Modules, `class << self`, and instance variables.** A `module` is a namespace (and more). Our code uses one module, `StripeSPM`, as a namespace with *module-level functions and state* — the Swift analogue is an enum used as a namespace with `static` members. The idiom to recognize:

```ruby
module StripeSPM
  class << self          # open the "singleton class" of the StripeSPM object
    def activate!(v)     # methods here are callable as StripeSPM.activate!(...)
      @version = v       # instance variable OF THE MODULE OBJECT — shared,
    end                  # process-wide state, like a Swift static var
    private              # everything below is private to the module's own methods
    def helper; end
  end
end
```

`class << self` sounds exotic but does one job: every `def` inside it defines a method *on the module object itself* (a "module method"), and `private` inside it applies to those. An instance variable `@version` touched inside those methods belongs to the module object — one copy for the whole process.

**Open classes and `alias_method`.** Ruby classes are never closed. Any code can *reopen* a class and add or replace methods (colloquially "monkey patching"):

```ruby
Pod::Installer.class_eval do            # evaluate this block in the class's context
  alias_method :new_name, :old_name     # copy old_name's method under new_name
  def old_name                          # redefine old_name...
    result = new_name                   # ...delegating to the saved copy
    extra_work
    result
  end
end
```

This alias-and-redefine pattern is Ruby's equivalent of method swizzling: after it runs, every caller of `old_name` gets the wrapped behavior. `alias_method` preserves the visibility of the original — a private method's alias is private too, a detail that will matter in §9.12. Class methods used around this pattern: `method_defined?(:m)` asks "does the class have a public/protected instance method `m`?", and `private_method_defined?(:m)` asks the same for private ones.

**Exceptions.** `raise SomeError, "message"` throws. CocoaPods defines `Pod::Informative`, an exception class it treats specially: the message is printed to the user as a clean `[!] ...` error, **without a Ruby stack trace**. It is the class you raise when the *user* did something addressable, as opposed to the tool crashing.

**Miscellany you will encounter:** `ENV['NAME']` reads an environment variable (a hash-like object; `nil` if unset). `require 'json'` loads a library once per process; `require_relative 'file'` loads a file by path relative to the current file, also once (deduplicated by resolved path). `x.respond_to?(:m)` asks whether `x` has a callable method `m` — dynamic typing's replacement for protocols in defensive code. `Array(x)` coerces: `nil` → `[]`, a scalar → `[x]`, an array → itself.

### 5.2 Fact one: podspecs are executable Ruby, evaluated in the Podfile's process

A `.podspec` is not inert metadata; it is a Ruby script. During `pod install`, CocoaPods *executes* it — in the **same Ruby process** that already executed the Podfile, after the Podfile has run.

This gives podspec code two communication channels that inert metadata could never have:

1. **It can probe its environment.** Anything the Podfile (or files the Podfile `require`d) defined — methods, globals — is visible. `defined?(some_function)` inside a podspec answers "does the surrounding app's tooling provide `some_function`?" This becomes our React Native version check (§7.3): no version-string parsing, just feature detection.
2. **It can read user flags.** A Ruby global set at the top of a Podfile (`$StripeDisableSPM = true`) is readable from any podspec evaluated afterward. This becomes our opt-out switch.

One caution that shapes the code: CocoaPods may evaluate a podspec **more than once per install** (analysis, validation, and generation each may trigger evaluation). Podspec-triggered side effects must therefore be *idempotent* — safe to repeat.

### 5.3 Fact two: the installer has a hook lifecycle

`pod install` is orchestrated by an object, `Pod::Installer`, through a fixed sequence:

```
resolve dependencies ─► download sources ─► generate Pods.xcodeproj (IN MEMORY)
      ─► run post-install hooks ─► write projects to disk
      ─► integrate user project (mutate + SAVE the app's .xcodeproj)
      ─► run post-integrate hooks
```

> **Definition.** A **post-install hook** is the block a Podfile registers as `post_install do |installer| ... end`. It runs after the Pods project has been generated *in memory* but **before anything is written to disk**, and it receives the live `installer` object — through which it can inspect and mutate the not-yet-saved project.

> **Definition.** A **post-integrate hook** is the block a Podfile registers as `post_integrate do |installer| ... end` (CocoaPods ≥ 1.10). It runs at the very end of `integrate_user_project` — *after* CocoaPods has added its own `[CP]` phases to the app target and **saved the user's project**. CocoaPods' own documentation says these hooks exist so that code "can alter [the user project] after it is written to the disk"; any mutation made here must therefore save the project itself.

Two properties make the post-install hook the natural home for *Pods-project* tooling:

- Mutations made here land in the same write as CocoaPods' own output — no second pass, no file rewriting. (The converse also holds and matters later: a Pods-project mutation made any *later* — for example from a post-integrate hook — is silently lost, because CocoaPods never saves the Pods project again.)
- **Raising an exception inside a hook aborts the install before anything is saved.** Nothing half-configured ever reaches disk. This is what makes "fail fast with a good message" (Chapter 9) safe.

By the same logic, the post-integrate hook is the natural home for *user-project* tooling: it runs after CocoaPods has finished shaping the app target, so anything added there lands after CocoaPods' own `[CP]` phases even on a brand-new project.

React Native's app template ships with a `post_install` block that calls a function named `react_native_post_install(installer)`, which applies dozens of RN-specific fixups — among them, as Chapter 8 shows, applying recorded Swift package declarations.

Finally, because all of this is plain Ruby (§5.1), a library can go one step beyond *registering* a hook: it can **wrap the installer's own methods** with alias-and-redefine, guaranteeing its code runs at a precise point in *every* install, even if the user's Podfile never mentions the library. Our code does exactly this (§9.12) for both lifecycle methods: `run_podfile_post_install_hooks` (which executes the Podfile's `post_install` block) is wrapped so our Pods-project work runs *immediately after* React Native's and can rely on RN's work being done — and also immediately *before* it, for a guard you will meet in §9.4.3 — and `run_podfile_post_integrate_hooks` is wrapped so our user-project work runs after CocoaPods has integrated and saved the app's project.

### 5.4 The installer's object model

Code running in a hook sees the install through `Pod::Installer`'s objects. The ones Chapter 9 uses:

| Expression | What it is |
|---|---|
| `installer.pods_project` | The in-memory `Pods.xcodeproj` (an Xcodeproj `Project`, §4.3) |
| `installer.pod_targets` | One `Pod::PodTarget` per pod being installed — CocoaPods' *model* of the pod (name via `.pod_name`, selected specs via `.specs`, generated-target name via `.label`, build type via the `build_as_*?` predicates of §3.4) |
| `installer.aggregate_targets` | One `Pod::AggregateTarget` per *user target grouping* — the bridge between the pods world and the user's app. Exposes `.user_project` (the app's own Xcodeproj `Project`) and `.user_targets` (the app-project targets it integrates) |

Distinguish carefully: a *pod target* is CocoaPods' model object; the corresponding *native target* inside `pods_project` is found by name (`pod_target.label`). Both appear in Chapter 9.

### 5.5 Fact three: the two projects have opposite lifetimes

We observed this in §1.3; now we state its consequence as a rule, because it dictates the shape of a third of Chapter 9:

> **Rule.** `Pods.xcodeproj` is regenerated from scratch on every install — anything written into it is naturally cleaned up next install, so mutations there need no undo story. The **user's project persists** between installs — any modification a tool makes to it must be (a) *idempotent*, because it will be applied again onto its own previous output; (b) *change-detecting*, so repeat installs do not gratuitously rewrite the file (which would show up as diff noise in version control); and (c) **explicitly reverted when no longer wanted**, because nothing else will ever clean it up.

When you reach §9.10 and find three functions where one seems enough — add, remove, and a shared iterator with change tracking — this rule is why.

### Chapter summary

- Ruby survival kit: truthiness (`nil`/`false` only), blocks and `next`, symbols, globals, `defined?`, frozen constants, single-quoted heredocs, `class << self` for module-level methods/state, open classes with `alias_method`, and `Pod::Informative` for clean user-facing errors.
- Podspecs execute inside the Podfile's Ruby process: they can feature-detect the environment and read Podfile-set globals; they may run more than once, so side effects must be idempotent.
- Post-install hooks mutate the in-memory Pods project before it is written; raising aborts cleanly. Post-integrate hooks run after CocoaPods has integrated and *saved* the user's project — the sanctioned place to alter it, provided the code saves its own changes. Wrapping the installer methods guarantees participation without a Stripe-specific Podfile callback (the separate dynamic-linkage directive is still required for SPM mode).
- The installer exposes pod targets (models), the pods project (Xcodeproj graph), and aggregate targets (the bridge to the user's project).
- Pods-project mutations are free; user-project mutations demand idempotency, change detection, and an explicit removal path.

### Review questions

1. Why does `defined?(spm_dependency)` evaluated inside our podspec tell us anything about the app's React Native version? What two facts of §5.2 does the trick rely on?
2. A tool raises `Pod::Informative` inside a post-install hook. What has been written to disk at that point? What does the user see?
3. State the three obligations of any modification to the *user's* project, and why the Pods project imposes none of them.
4. In `class << self ... end` inside `module StripeSPM`, what does `@version` belong to, and how many copies of it exist per process?

---

# Part III — The solution

## Chapter 6. Architecture overview

### 6.1 The three layers

The mechanism divides cleanly into three cooperating layers, each doing the part it is best placed to do:

| Layer | Code | Owner | Job |
|---|---|---|---|
| **1. The podspec** | `stripe-react-native.podspec` | us | Decide *per install*: SPM mode or CocoaPods fallback. Declare the dependency accordingly. |
| **2. React Native's bridge** | `spm_dependency` + `react_native_post_install` (`scripts/cocoapods/spm.rb`, ships inside RN ≥ 0.75) | Meta | Write the Swift package reference and core product dependencies into `Pods.xcodeproj`. |
| **3. Our installer hooks** | `stripe_spm.rb` (ships in our npm package) | us | Everything the bridge doesn't cover, split across two lifecycle hooks by which project it touches. At post-install (Pods project): guard the project's UUID counter against a corruption RN's bridge can trigger, validate the configuration, link the optional Onramp product. At post-integrate (user project): embed the frameworks, clean up on opt-out. |

Chapters 7, 8, and 9 take the layers in order, line by line. Chapter 10 reassembles them into a single end-to-end trace.

### 6.2 The user-visible contract

Everything the three layers do folds into a contract small enough to memorize:

| Situation | Behavior |
|---|---|
| React Native ≥ 0.75 (default) | stripe-ios resolved through SPM. **Requires** building with dynamic frameworks (`use_frameworks! :linkage => :dynamic`); `pod install` fails fast with instructions otherwise. |
| React Native ≥ 0.75, Podfile sets `$StripeDisableSPM = true` | stripe-ios resolved from the CocoaPods registry, exactly as before this branch — for as long as stripe-ios publishes pods. |
| React Native ≥ 0.75, Expo app with `"disableSPM": true` on this SDK's config plugin | Same as the row above: the plugin injects `$StripeDisableSPM = true` into the Podfile Expo generates (§12.4.1), because Expo apps do not own their Podfile. |
| React Native < 0.75 | CocoaPods registry, automatically. No detection of, or dependence on, anything in this document. |

A single constant (`stripe_version` in the podspec) pins stripe-ios to the same release on both paths, discharging the "one version pin" invariant of §2.4.

### 6.3 A map of what you are about to read

```
stripe-react-native.podspec          ← Chapter 7
  require_relative 'stripe_spm'  ────────────────┐ (loading the file also
  stripe_spm_activate!(s, ...)                   │  installs the hooks, §9.12)
    if stripe_spm_enabled?         ──► calls ──► │
                                                 │
react-native/scripts/cocoapods/spm.rb ← Chapter 8│
  spm_dependency(...)      ← records declaration │
  react_native_post_install(installer)           │
    └─ SPM.apply_on_post_install    ← writes pkg │
       objects into Pods.xcodeproj               │
                                                 │
stripe_spm.rb                        ← Chapter 9 ◄┘
  post-install hook (Pods project)
    ├─ ensure_uuid_counter_safe      ← §9.4.3 (runs BEFORE the above)
    ├─ verify_pods_project_integrity! ← §9.4.4 (after it)
    ├─ verify_dynamic_linkage!       ← §9.7
    ├─ find_package_reference!       ← §9.8
    └─ link_onramp_product           ← §9.9
  post-integrate hook (user project, after CocoaPods saved it)
    └─ add_embed_phase / remove_embed_phase ← §9.10
```

---

## Chapter 7. Layer 1: the podspec, line by line

This chapter reads `stripe-react-native.podspec` in its entirety — all 95 lines. Most of the file predates this branch; we explain those lines too (a junior engineer reading the file should understand all of it), but flag clearly which parts the branch changed. The podspec DSL below is Ruby (§5.1) throughout: `Pod::Spec.new do |s| ... end` runs a block, and every `s.foo = ...` or `s.dependency ...` is a method call on the spec object being built.

### 7.1 The prologue (lines 1–8)

```ruby
 1  require 'json'
 2  require_relative 'stripe_spm'
 3
 4  package = JSON.parse(File.read(File.join(__dir__, 'package.json')))
 5  # Keep stripe_version in sync with https://github.com/stripe/stripe-identity-react-native/blob/main/stripe-identity-react-native.podspec
 6  stripe_version = '26.7.0'
 7
 8  fabric_enabled = ENV['RCT_NEW_ARCH_ENABLED'] == '1'
```

**Line 1** loads Ruby's standard JSON library (needed by line 4).

**Line 2** — *added by this branch* — loads `stripe_spm.rb` from the same directory as the podspec. Both files sit at the npm package root, so in a real app this resolves to `node_modules/@stripe/stripe-react-native/stripe_spm.rb`. Two things happen the moment this line executes, both covered in Chapter 9: the file defines the functions the podspec calls on lines 27, 56, and 72 (`stripe_spm_enabled?`, `stripe_spm_activate!`), and — as a deliberate side effect — it installs the `Pod::Installer` hooks (§9.12). Because `require_relative` deduplicates by resolved path (§5.1), evaluating the podspec several times (§5.2) loads the file once.

**Line 4** reads the npm package manifest sitting next to the podspec. `__dir__` is the directory containing the current file. This is how the pod's version and metadata stay mechanically identical to the npm release (lines 12–16) instead of being maintained twice.

**Line 6** is the **single version pin** for stripe-ios, `26.7.0`. Every mention of a Stripe dependency in either mode — the SPM requirement (§7.3) and all seven fallback pod pins (§7.5–7.6) — flows from this one local variable, which is what makes drift between the two paths impossible. The comment records a cross-repo obligation: `stripe-identity-react-native` (a sibling SDK with the same architecture) pins the same version and the two are kept in lockstep.

**Line 8** detects React Native's **new architecture**. React Native is mid-transition between its legacy runtime (the "old architecture", built around an asynchronous bridge) and a rewritten one (the "new architecture": Fabric rendering, TurboModules, "bridgeless" mode). RN's tooling exports `RCT_NEW_ARCH_ENABLED=1` into the `pod install` environment when the app builds the new architecture; the podspec uses the flag to add new-architecture-only sources (§7.7). "Fabric" in the variable name is the new architecture's rendering system — the name is used loosely for the whole thing.

### 7.2 Identity and metadata (lines 10–19)

```ruby
10  Pod::Spec.new do |s|
11    s.name         = 'stripe-react-native'
12    s.version      = package['version']
13    s.summary      = package['description']
14    s.homepage     = package['homepage']
15    s.license      = package['license']
16    s.authors      = package['author']
17
18    s.platforms    = { ios: '13.0' }
19    s.source       = { git: 'https://github.com/stripe/stripe-react-native.git', tag: s.version.to_s }
```

**Line 10** opens the spec-building block; `s` is the `Pod::Specification` under construction.

**Line 11**: the pod's name. Autolinking (§1.5) finds this podspec by filename; the name must match.

**Lines 12–16** copy identity fields from `package.json` (line 4), keeping npm and CocoaPods releases in lockstep.

**Line 18** declares the minimum supported iOS version, 13.0. File this away: the stripe-ios *Swift package* declares a floor of iOS 15, and the mismatch is a known compatibility boundary discussed in §13.14.3.

**Line 19** says where a *registry* consumer would fetch source from — the git repo at the version tag. For the way apps actually consume this pod (a development pod from `node_modules`, §1.4), this field is ignored: sources are read straight from disk. It is required boilerplate and harmless.

### 7.3 The activation line (lines 21–27) — the heart of Layer 1

```ruby
21    # On React Native >= 0.75 the Stripe iOS SDK is resolved through Swift
22    # Package Manager (the Stripe iOS SDK is deprecating CocoaPods support);
23    # older React Native versions and apps that set `$StripeDisableSPM = true`
24    # fall back to the CocoaPods registry via the `unless stripe_spm_enabled?`
25    # dependency blocks below. stripe_spm.rb documents the full mechanism.
26    # `stripe_version` pins both paths to the same stripe-ios release.
27    stripe_spm_activate!(s, version: stripe_version) if stripe_spm_enabled?
```

*Added by this branch.* One line of code, two function calls, both defined in `stripe_spm.rb`:

- **`stripe_spm_enabled?`** (§9.11) is the mode decision — "should this install use SPM?" It answers two questions using §5.2's channels: *does the surrounding React Native provide the bridge?* (feature detection: `defined?(spm_dependency)` — RN ≥ 0.75's `react_native_pods.rb`, which every RN Podfile requires, defines that function; older versions don't), and *did the user opt out?* (`$StripeDisableSPM == true`).
- **`stripe_spm_activate!(s, version: stripe_version)`** (§9.11) runs only if the answer is yes. It records "SPM mode is on; pin version 26.7.0" in module state that Layer 3 reads later, and calls React Native's `spm_dependency` to declare the stripe-ios package against the root spec `s` (Chapter 8).

If the predicate is false, this line does nothing at all, and the `unless stripe_spm_enabled?` blocks below (same predicate, same evaluation, so the arms can never disagree) declare the classic pod dependencies. **The fallback is not a rewritten path — it is the original path, made conditional.** On RN < 0.75 the install is bit-for-bit indistinguishable from the pre-branch SDK.

### 7.4 Build settings and inherited machinery (lines 29–46)

```ruby
29    s.header_dir = 'stripe_react_native'
30    s.pod_target_xcconfig = {
31      'USE_HEADERMAP' => 'YES',
32      'DEFINES_MODULE' => 'YES',
33      'CLANG_CXX_LANGUAGE_STANDARD' => 'c++20',
34      'SWIFT_COMPILATION_MODE' => 'wholemodule',
35    }
36
37    s.test_spec 'Tests' do |test_spec|
38      test_spec.platforms    = { ios: '15.1' }
39      test_spec.source_files = 'ios/Tests/**/*.{m,swift}'
40    end
41
42    if fabric_enabled
43      s.default_subspecs = 'Core', 'NewArch'
44    else
45      s.default_subspecs = 'Core'
46    end
```

These lines predate the branch; briefly, so the file holds no mysteries:

**Line 29**: pod headers are namespaced under `stripe_react_native/`, so consumers write `#import <stripe_react_native/Header.h>`.

**Lines 30–35** set build settings on the pod's generated target. `USE_HEADERMAP` lets the compiler find the target's own headers by name; `DEFINES_MODULE` makes CocoaPods generate a Clang module for the pod (§4.4) — required for Swift/Objective-C interop within the pod; `CLANG_CXX_LANGUAGE_STANDARD` selects C++20, which React Native's headers require; `SWIFT_COMPILATION_MODE` `wholemodule` compiles the module as one unit.

**Lines 37–40** declare a **test spec** — a CocoaPods feature that builds the listed test sources as a test bundle target *inside the Pods project*. Note it and move on: §11.5–§11.7 explain why the example app *stopped consuming* this test spec under SPM mode (a separate Pods-project test target cannot see the SPM-built Stripe modules) and compiles the same `ios/Tests` sources into an app-level test target instead. The declaration itself remains, unused by the harness.

**Lines 42–46** choose the default **subspecs**:

> **Definition.** A **subspec** is a named slice of a pod, with its own source files and dependencies. Consumers get `default_subspecs` when they ask for the pod plainly, and may additionally request opt-in slices explicitly (`pod 'stripe-react-native/Onramp'`). Crucially for §9.9: *a selected subspec does not get its own Xcode target* — its sources and settings merge into the root pod's single target.

Everyone gets `Core`; new-architecture builds also get `NewArch` (§7.7).

### 7.5 The Core subspec (lines 48–67)

```ruby
48    s.subspec 'Core' do |core|
49      core.source_files = 'ios/**/*.{h,m,mm,swift}'
50      core.exclude_files = [ 'ios/Tests/', 'ios/NewArch/', 'ios/StripeOnrampSdk.h', 'ios/StripeOnrampSdk.mm', 'ios/OnrampErrors.swift' ]
51      # These headers contain c++ code so make sure they are private to avoid
52      # being exported to the umbrella header, which is used by swift interop.
53      # StripeSwiftInterop.h will cause circular dependency issues.
54      core.private_header_files = [ 'ios/StripeSdk.h', 'ios/StripeSwiftInterop.h' ]
55      core.dependency 'React-Core'
56      unless stripe_spm_enabled?
57        # CocoaPods fallback for React Native < 0.75 and $StripeDisableSPM users.
58        # Keep in sync with StripeSPM::CORE_PRODUCTS in stripe_spm.rb — these are
59        # two spellings of the same dependency set.
60        core.dependency 'Stripe', stripe_version
61        core.dependency 'StripePaymentSheet', stripe_version
62        core.dependency 'StripePayments', stripe_version
63        core.dependency 'StripePaymentsUI', stripe_version
64        core.dependency 'StripeApplePay', stripe_version
65        core.dependency 'StripeFinancialConnections', stripe_version
66      end
67    end
```

**Lines 49–50**: the subspec's sources are everything under `ios/`, minus the tests, the new-architecture sources (only compiled when `NewArch` is selected), and the three Onramp files (only compiled when `Onramp` is selected, §7.6).

**Lines 51–54** (pre-branch): two headers are marked *private* — excluded from the pod's umbrella header (the generated master header defining the pod's public module interface) — because they contain C++, which must not leak into the module Swift sees.

**Line 55**: the dependency on React Native's core pod, unconditional in both modes.

**Lines 56–66** — *the `unless` wrapper is the branch's change; the six dependency lines inside are the original, untouched pod pins.* In SPM mode the block is skipped entirely, so **the resolved CocoaPods graph contains no Stripe pods at all** — observable in `Podfile.lock`, which in SPM mode lists no `Stripe*` entries. In fallback mode, the six exact-version registry dependencies are declared exactly as they have been for years.

The comment on lines 58–59 states a real maintenance obligation. This list has an SPM twin — `StripeSPM::CORE_PRODUCTS` in `stripe_spm.rb` (§9.2) — naming the same six modules as Swift package products. The two lists are *two spellings of the same dependency set*, and a change to either (say, adopting a new Stripe module) must touch both. Both files carry mirror-image comments, so a reader starting at either end finds the other.

### 7.6 The Onramp subspec (lines 69–78)

```ruby
69    s.subspec 'Onramp' do |onramp|
70      onramp.source_files = [ 'ios/StripeOnrampSdk.h', 'ios/StripeOnrampSdk.mm', 'ios/OnrampErrors.swift' ]
71      onramp.dependency 'stripe-react-native/Core'
72      unless stripe_spm_enabled?
73        # CocoaPods fallback. In SPM mode the StripeCryptoOnramp product is
74        # linked at install time by stripe_spm.rb (link_onramp_product), because
75        # spm_dependency declarations on subspecs are silently ignored.
76        onramp.dependency 'StripeCryptoOnramp', stripe_version
77      end
78    end
```

`Onramp` is the opt-in slice for crypto onramp support: exactly the three files excluded from Core on line 50, plus a dependency on Core itself (line 71 — subspecs can depend on sibling subspecs, spelled `pod/Subspec`).

**Lines 72–77** are the branch's change, and they are *asymmetric* with §7.5 in an important way. In fallback mode, line 76 declares the `StripeCryptoOnramp` pod, and CocoaPods' subspec semantics provide the conditionality for free: the dependency exists only when the subspec is selected. In SPM mode, though, there is **no `spm_dependency` call here** — nothing in the podspec declares the Onramp *package product* at all. That is not an oversight. A `spm_dependency` call made on a subspec is recorded under the subspec's name, and React Native's bridge later looks for an Xcode target by that name; subspecs have no targets (§7.4), so the declaration can never attach — it is silently dropped (§8.2 shows the exact lines). Declaring the product on the *root* spec instead would link crypto-onramp code (and its sizable dependency subtree, including StripeIdentity) into **every** app, destroying the point of the subspec. The conditionality therefore has to be reproduced at a layer that can see which subspecs were actually resolved: install time, in `stripe_spm.rb`'s `link_onramp_product` (§9.9). The comment points there.

### 7.7 The new-architecture subspec (lines 80–95)

```ruby
80    if fabric_enabled
81      install_modules_dependencies(s)
82
83      s.subspec "NewArch" do |ss|
84        ss.source_files = "ios/NewArch/**/*.{h,m,mm}"
85        # These headers contain c++ code so make sure they are private to avoid
86        # being exported to the umbrella header, which is used by swift interop.
87        # The pattern must stay scoped to this subspec's own files: CocoaPods
88        # globs private_header_files against the entire pod root (for a
89        # development pod, the whole repo), and an unscoped '**/*.h' can match
90        # dangling header-store symlinks in example/ios/Pods left from a
91        # previous install, crashing `pod install` on realpath.
92        ss.private_header_files = 'ios/NewArch/**/*.h'
93      end
94    end
95  end
```

**Line 81** (pre-branch): `install_modules_dependencies` is a React-Native-provided helper that adds the new architecture's required dependencies and build flags to the spec.

**Line 92** is the branch's subtlest change: the glob was `'**/*.h'` and is now `'ios/NewArch/**/*.h'` — same intended headers, radically different blast radius. This one-line fix earned its long comment, and it teaches enough to deserve its story told properly:

> **Case study: the migration crash.** After CI was fully green, the first `pod install` on a *developer machine that had a previous pods-mode install* crashed deep inside CocoaPods with `Errno::ENOENT ... realpath ... Pods/Headers/Private/StripePayments/...`. The chain: (a) `private_header_files` patterns are globbed against the **entire pod root**, not intersected with the subspec's `source_files` — and for a development pod (§1.4) the pod root is the whole repository, including, via the app's `node_modules` symlink, the example app's `Pods/` sandbox; (b) switching to SPM removes the Stripe pods from the dependency graph, so the very same install run deletes their checkouts, leaving *dangling symlinks* in the sandbox's private-header store; (c) the unscoped `'**/*.h'` glob swept those symlinks up, and CocoaPods `realpath`'d one — an exception. Fresh checkouts (CI) could never hit it; only a real machine mid-migration could, because only it had the stale sandbox. Two durable lessons: *unscoped podspec globs are latent bugs for development pods*, and *any change that removes pods from a dependency graph gets its first honest test on a dirty sandbox, not a fresh one — test the migration, not just the destination.*

### Chapter summary

- One `require_relative` installs Layer 3's hook and imports two functions; one guarded call (`stripe_spm_activate! ... if stripe_spm_enabled?`) switches the install into SPM mode; two `unless stripe_spm_enabled?` blocks preserve the original pod dependencies verbatim as the fallback.
- A single `stripe_version` constant feeds both modes.
- The Onramp subspec deliberately declares *nothing* for SPM; its conditional linking must happen at install time (§9.9) because subspecs have no Xcode targets.
- The NewArch header glob was scoped to the subspec's directory after a migration-only crash — a lesson about development-pod globs and dirty-sandbox testing.

### Review questions

1. In fallback mode, which exact lines of the podspec differ in effect from the pre-branch SDK? (Careful — it's a trick question.)
2. Why is it impossible for the SPM pin and the pod pins to reference different stripe-ios versions?
3. Why would `spm_dependency` called inside the `Onramp` subspec block fail to have any effect, and why is declaring the product at the root spec not an acceptable substitute?
4. Explain to a colleague why `private_header_files = '**/*.h'` is dangerous in a development pod even though it "works" in CI.

---

## Chapter 8. Layer 2: React Native's bridge, line by line

This layer is Meta's code, not ours — it ships inside every React Native ≥ 0.75 at `node_modules/react-native/scripts/cocoapods/spm.rb`, with two entry points in `scripts/react_native_pods.rb`. We read it in full anyway, for three reasons: it is short; our Layer 3 is designed around precisely what it does and does not do; and it is the code that performs the "key reduction" of §4.2 — writing the package objects into `Pods.xcodeproj`. Listings in this chapter are from React Native 0.81 (what the example app pins); line placement can drift between RN versions, but the mechanism described here is stable across 0.75+.

### 8.1 The two entry points and when each runs

In `react_native_pods.rb` — the script every RN app's Podfile requires — sit the two functions that matter:

```ruby
def spm_dependency(spec, url:, requirement:, products:)
  SPM.dependency(spec, url: url, requirement: requirement, products: products)
end
```

and, buried among the many duties of `react_native_post_install(installer)`:

```ruby
SPM.apply_on_post_install(installer)
```

Recall the install timeline (§5.3). Podspecs are evaluated *early* — before the Pods project exists. So when our podspec calls `spm_dependency` (§7.3), there is nothing to write into yet; all the function can do is **record** the declaration. The **write** happens later, inside the user's `post_install` block, when the standard RN template calls `react_native_post_install`. This record-then-apply split is the bridge's fundamental shape, and both halves live in one small class.

The existence of `spm_dependency` as a top-level function is also, remember, exactly what our mode predicate feature-detects (§7.3, §9.11): on RN < 0.75 this function does not exist, `defined?(spm_dependency)` is `nil`, and none of this chapter happens.

### 8.2 The `SPMManager` class

```ruby
class SPMManager
  def initialize()
     @dependencies_by_pod = {}
  end

  def dependency(pod_spec, url:, requirement:,  products:)
    @dependencies_by_pod[pod_spec.name] ||= []
    @dependencies_by_pod[pod_spec.name] << { url: url, requirement: requirement, products: products }
  end
```

`initialize` creates one instance variable: a hash mapping **spec names** to arrays of recorded declarations. The last line of the file —

```ruby
SPM = SPMManager.new
```

— creates the single process-wide instance at load time and binds it to the constant `SPM`. All recording and applying flows through this one object.

`dependency` is the recording half. Note carefully what it keys on: `pod_spec.name`. For our call (§9.11) the spec is the root spec, so the key is `"stripe-react-native"`. Everything is stored; nothing is validated; no Xcode object is touched.

> **Remark (why subspecs can't declare packages).** Had we called `spm_dependency` on the `Onramp` *subspec*, the key would be `"stripe-react-native/Onramp"`. The apply half below looks up a Pods-project **target by that name** — and subspecs do not get targets (§7.4); the only target is `stripe-react-native`. The lookup finds nothing, so the declaration can never attach to the real target. (The shipped comments describe such declarations as "silently ignored"; in the RN version quoted here, the nil lookup would in fact abort the install with an unhelpful `NoMethodError` inside RN's script. Either way — silence or a baffling crash — nothing useful can come of it, which is why §9.9 solves Onramp at a different layer.)

### 8.3 The apply half

```ruby
  def apply_on_post_install(installer)
    project = installer.pods_project

    log 'Cleaning old SPM dependencies from Pods project'
    clean_spm_dependencies_from_target(project, @dependencies_by_pod)
    log 'Adding SPM dependencies to Pods project'
    @dependencies_by_pod.each do |pod_name, dependencies|
      dependencies.each do |spm_spec|
        add_spm_to_target(
          project,
          project.targets.find { |t| t.name == pod_name },
          spm_spec[:url],
          spm_spec[:requirement],
          spm_spec[:products]
        )
```

Line by line:

- `installer.pods_project` — the in-memory generated project (§5.4). Everything below mutates it; nothing is on disk yet.
- `clean_spm_dependencies_from_target` — see below; a defensive sweep.
- The nested loops walk every recorded declaration. `project.targets.find { |t| t.name == pod_name }` is the **lookup by name** the Remark above hinges on: CocoaPods names each pod's generated target after the pod, so the root-spec key `"stripe-react-native"` finds our pod's target.

The cleaning helper:

```ruby
  def clean_spm_dependencies_from_target(project, new_targets)
    project.root_object.package_references.delete_if { |pkg| (pkg.class == Xcodeproj::Project::Object::XCRemoteSwiftPackageReference) }
  end
```

This deletes **every** remote package reference from the project, unconditionally (its second parameter is unused). Since the Pods project was regenerated from scratch moments ago, this is normally a no-op; it exists as a belt-and-braces guard. It carries one lesson for anyone composing tools: any package reference written into the Pods project *before* `react_native_post_install` runs gets wiped. Our Layer 3 runs *after* it (§9.12) — by design, and this line is one of the reasons why.

And the writer — the lines that perform §4.2's reduction:

```ruby
  def add_spm_to_target(project, target, url, requirement, products)
    pkg_class = Xcodeproj::Project::Object::XCRemoteSwiftPackageReference
    ref_class = Xcodeproj::Project::Object::XCSwiftPackageProductDependency
    pkg = project.root_object.package_references.find { |p| p.class == pkg_class && p.repositoryURL == url }
    if !pkg
      pkg = project.new(pkg_class)
      pkg.repositoryURL = url
      pkg.requirement = requirement
      project.root_object.package_references << pkg
    end
    products.each do |product_name|
      ref = target.package_product_dependencies.find do |r|
        r.class == ref_class && r.package == pkg && r.product_name == product_name
      end
      next if ref

      ref = project.new(ref_class)
      ref.package = pkg
      ref.product_name = product_name
      target.package_product_dependencies << ref
    end
  end
```

Read with §4.3's vocabulary, this is transparent:

- **Find-or-create the package reference.** Search the project's `package_references` for an `XCRemoteSwiftPackageReference` with this URL; if absent, allocate one (`project.new`), set its `repositoryURL` and `requirement` (the hash our podspec passed — `{ kind: 'exactVersion', version: '26.7.0' }` — serialized straight into the project file), and append it to the project.
- **Find-or-create each product dependency.** For each requested product name, search the *target's* `package_product_dependencies` for an existing entry pointing at this package with this name; if absent, allocate an `XCSwiftPackageProductDependency`, point it at the package reference, name the product, and attach it to the target. (`next if ref` — skip to the next product if one already exists; block-local early exit, §5.1.)

Both halves are idempotent by construction (find-or-create), which matters because podspecs — and hence recordings — can happen more than once per install (§5.2). Note the shape of this code well: §9.9 mirrors it deliberately, so that the seventh product entry our code adds is indistinguishable from the six this code adds.

### 8.4 The module-visibility workaround

Immediately after writing the objects, the apply half adds a build setting to the pod target:

```ruby
        target = project.targets.find { |t| t.name == pod_name }
        target.build_configurations.each do |config|
          target.build_settings(config.name)['SWIFT_INCLUDE_PATHS'] ||= ['$(inherited)']
          search_path = '${SYMROOT}/${CONFIGURATION}${EFFECTIVE_PLATFORM_NAME}/'
          unless target.build_settings(config.name)['SWIFT_INCLUDE_PATHS'].include?(search_path)
            target.build_settings(config.name)['SWIFT_INCLUDE_PATHS'].push(search_path)
          end
        end
```

Recall §4.4: `import Stripe` in the pod's Swift code only compiles if the compiler can *find* the `Stripe` module, and search paths are explicit wiring. When Xcode builds the package targets it deposits their `.swiftmodule` files in the build-products directory — which is what `${SYMROOT}/${CONFIGURATION}${EFFECTIVE_PLATFORM_NAME}/` expands to (e.g. `.../Build/Products/Debug-iphonesimulator/`). This snippet appends that directory to the pod target's `SWIFT_INCLUDE_PATHS` (guarding both "the setting doesn't exist yet" with `||=` and "the path is already there" with the `unless`), closing the gap between "the modules exist" and "the pod's compiler invocation can see them."

File this pattern away: it fixes module visibility **for the pod target only**. §11.7 meets the identical problem again for a *test* target, which this code knows nothing about — and solves it the same way, by hand.

### 8.5 The warnings, and their limits

The apply half ends by printing warnings when any declaration was recorded: one about old Xcode versions caching stale package state, and — the one that matters to us —

```ruby
      unless ENV["USE_FRAMEWORKS"] == "dynamic"
        @dependencies_by_pod.each do |pod_name, dependencies|
          log_warning "Pod #{pod_name} is using swift package(s) ... with static linking, this might cause linker errors. Consider using USE_FRAMEWORKS=dynamic ..."
        end
      end
```

React Native knows its SPM bridge is only reliable with dynamic frameworks (Chapter 3 explains why; §9.7 spells out the exact failure). But observe *how* it checks: it reads the **environment variable** `USE_FRAMEWORKS`, which the RN CLI's template Podfile happens to consult — it does not inspect the actual build type CocoaPods resolved. An app that enables dynamic frameworks directly in its Podfile (`use_frameworks! :linkage => :dynamic`, as our example app does) still gets the scary warning; an app that sets the env var but whose Podfile overrides it would get silence and then linker errors. And in all cases it is a *warning* — printed and scrolled past — for what is in truth a hard requirement.

This is not a criticism of RN's code so much as a definition of the gap our Layer 3 fills: §9.7 checks the **actual resolved build type**, and turns "might cause linker errors" into a fail-fast install error with the fix spelled out.

### 8.6 What happens after: Xcode takes over

By the time the write half has run, `Pods.xcodeproj` contains exactly the objects Xcode's *File → Add Package Dependencies…* dialog would have created (§4.2), attached to the `stripe-react-native` pod target. CocoaPods then writes the project to disk (§5.3), and from that point **Xcode does everything else** the first time the developer builds the workspace: resolves `exactVersion 26.7.0` against the repository's tags, clones the package into DerivedData, builds all the needed Stripe package targets from source, and links the requested products into the pod target.

Pause on what this means for the build as a whole. The Stripe SDK is now compiled *by Xcode's package machinery, inside the app's own build* — not by a CocoaPods-generated target (fallback mode), and not prebuilt by anyone. Same sources, same compiler; but the surrounding wiring — who links what, where products land on disk, who embeds them into the app bundle — is different. Those differences are precisely the four gaps the next chapter's code exists to fill.

### Chapter summary

- The bridge is a record-then-apply singleton: `spm_dependency` records declarations keyed by **spec name** at podspec-evaluation time; `react_native_post_install` applies them to the freshly generated Pods project, looking up **targets by that name** — which is why only root specs work.
- The apply step is find-or-create (idempotent) for both the package reference and each product dependency, plus a `SWIFT_INCLUDE_PATHS` workaround so the pod's Swift can find the package's built modules.
- RN wipes all remote package references before applying — tools composing with it must run afterwards.
- The dynamic-frameworks requirement surfaces only as a warning keyed off an environment variable; enforcing the real constraint is left to someone else.

### Review questions

1. Why must the bridge split recording from applying, rather than writing the package objects at `spm_dependency` time?
2. Our podspec calls `spm_dependency` once, on the root spec. Trace the key under which the declaration is stored and the exact expression that later consumes that key.
3. A hypothetical tool writes an `XCRemoteSwiftPackageReference` into the Pods project from its own hook, *before* the user's `post_install` block runs. What happens to it, and which line of RN's code is responsible?
4. Give two distinct reasons RN's static-linkage warning is insufficient as an enforcement mechanism.

---

## Chapter 9. Layer 3: `stripe_spm.rb`, line by line

This chapter is the center of the book. React Native's bridge can describe a package dependency, but it does not know Stripe's product boundaries, cannot enforce the linkage that this particular graph needs, does not embed dynamic package frameworks that are linked indirectly through a pod — and, on every React Native release before 0.88, can silently corrupt the generated Pods project while writing its package objects. `stripe_spm.rb` closes those gaps.

The file has 683 physical lines. Many are comments, but those comments are part of the implementation contract: Ruby code loaded from a podspec executes inside another program, at lifecycle points that are not obvious to a future maintainer. Accordingly, we will account for every range, including the prose and blank separators. A line-range table at the end of the chapter makes omissions easy to spot.

### 9.1 The file-level contract (lines 1–110)

The first 110 lines are a miniature design document embedded beside the code. They are worth reading as executable constraints even though Ruby ignores them.

```ruby
1   # Resolves the Stripe iOS SDK through Swift Package Manager instead of the
2   # CocoaPods registry.
3   #
4   # == Why this exists
5   #
6   # The Stripe iOS SDK is deprecating CocoaPods support, and the CocoaPods trunk
7   # registry itself stops accepting new versions when it becomes read-only. That
8   # only affects the `Stripe*` pods this SDK depends on — stripe-react-native's
9   # own podspec is unaffected, because React Native autolinking always loads it
10  # from node_modules rather than from the registry. So the job of this file is
11  # narrow: replace `s.dependency 'Stripe*'` registry lookups with a Swift
12  # Package Manager resolution of https://github.com/stripe/stripe-ios, while
13  # CocoaPods remains the delivery vehicle for stripe-react-native itself.
```

**Lines 1–2** state the behavior in one sentence. "Resolve" means choose and obtain a concrete dependency revision, not merely make the compiler see a module. **Lines 4–13** state the problem boundary derived in Chapter 2. The distinction between the wrapper pod and its native dependency prevents a future maintainer from attempting an unnecessary full migration of the React Native wrapper.

```ruby
15  # This is the same approach react-native-firebase shipped for the Firebase
16  # iOS SDK's CocoaPods deprecation (default-on since @react-native-firebase/app
17  # 26.1.0), so apps using both SDKs get one consistent model.
```

**Lines 15–17** record the production precedent. This is architectural evidence, not a source dependency: no Firebase code is called. The important inherited decisions are capability detection, a Podfile opt-out, dynamic-only linkage, a `Pod::Installer` wrapper, and an application embed phase.

```ruby
19  # == How it works
20  #
21  # There are three cooperating layers:
22  #
23  # 1. The podspec (stripe-react-native.podspec) calls `stripe_spm_enabled?` and
24  #    either declares the Swift package via `stripe_spm_activate!` (SPM mode)
25  #    or falls back to the classic `s.dependency 'Stripe*'` pod lines.
```

**Lines 19–25** summarize Layer 1. Notice that the choice is made while the podspec is evaluated, before targets exist. The same predicate guards both activation and fallback dependencies, so one install cannot intentionally select both representations.

```ruby
27  # 2. React Native >= 0.75 provides the actual CocoaPods/SPM bridge:
28  #    `spm_dependency` (react-native/scripts/cocoapods/spm.rb) records the
29  #    package declaration at podspec-evaluation time, and
30  #    `react_native_post_install` later writes it into Pods.xcodeproj as real
31  #    Xcode objects — an XCRemoteSwiftPackageReference on the project plus
32  #    XCSwiftPackageProductDependency entries on the stripe-react-native pod
33  #    target. No Package.swift is generated anywhere; Xcode itself resolves,
34  #    checks out, and builds the package when it builds the workspace.
```

**Lines 27–34** summarize Layer 2 and encode its time split: record early, materialize late. The exact object types are named so a maintainer can inspect `project.pbxproj` instead of searching for a nonexistent consumer `Package.swift`. Chapter 8 expanded every operation in these lines.

```ruby
36  # 3. This file covers what React Native's bridge doesn't, via hooks installed
37  #    on `Pod::Installer` (see the bottom of the file). CocoaPods invokes the
38  #    hooked methods on every install — even when the Podfile has no
39  #    post_install/post_integrate block — so users need zero Podfile changes.
40  #    The work is split across two hooks by which Xcode project it touches:
41  #
42  #    `run_podfile_post_install_hooks` (the Pods-project stage):
43  #      - guards CocoaPods' UUID counter before the normal hooks run, so React
44  #        Native's SPM apply step can't corrupt Pods.xcodeproj (see
45  #        `ensure_uuid_counter_safe`), and verifies the project's integrity
46  #        after they ran (see `verify_pods_project_integrity!`),
47  #      - fails fast unless the pod builds as a dynamic framework, the only
48  #        linkage React Native's SPM integration supports (see
49  #        `verify_dynamic_linkage!` for the full linking story),
50  #      - links the StripeCryptoOnramp package product when the Onramp subspec
51  #        is installed (`spm_dependency` silently ignores subspec declarations;
52  #        see `link_onramp_product`).
53  #
54  #    `run_podfile_post_integrate_hooks` (the user-project stage):
55  #      - maintains a build phase on the app target that embeds SPM-built
56  #        dynamic frameworks into the app bundle (see EMBED_SCRIPT), or removes
57  #        it again when SPM resolution is turned off.
```

**Lines 36–40** name the seam being wrapped — no longer one method but two, and the split is by *which Xcode project* each piece of work touches. That criterion is not stylistic; §5.3's lifecycle makes it mechanical. The Pods project is written to disk immediately after the post-install hooks, so anything that must land in `Pods.xcodeproj` has exactly one chance, inside `run_podfile_post_install_hooks`. The user's project is mutated and *saved* by CocoaPods' own integration step, which runs later — so code that edits the user's project belongs after that save, inside `run_podfile_post_integrate_hooks`.

**Lines 42–52** are the Pods-project stage's responsibilities, in execution order: protect the project's identity table before anyone writes to it, validate the configuration, then complete the dependency graph. **Lines 54–57** are the user-project stage: runtime packaging (or its cleanup). Keeping these stages mentally separate is a common prerequisite for correct fixes — the five jobs run at three distinct times (before RN's writes, after them, and after user-project integration).

```ruby
59  # == Install lifecycle and ordering
60  #
61  # During `pod install`, CocoaPods evaluates the podspec (possibly more than
62  # once — everything here is idempotent), generates the Pods project, runs
63  # `run_podfile_post_install_hooks` just before writing that project to disk,
64  # then runs `integrate_user_project` (which adds its own `[CP] Embed Pods
65  # Frameworks` phase to the app target and saves the *user's* project), and
66  # finally runs `run_podfile_post_integrate_hooks`.
```

**Lines 59–66** restate §5.3's lifecycle from this file's point of view. "Idempotent" means repeating an operation has the same observable end state as doing it once. It matters because CocoaPods can evaluate a development podspec repeatedly and because developers run `pod install` repeatedly.

```ruby
68  # That ordering dictates where each piece of our work must live:
69  #
70  #   - Everything that touches Pods.xcodeproj has to happen in the
71  #     post_install stage, while the project is still in memory and unwritten
72  #     — a mutation made any later is silently lost (CocoaPods does not save
73  #     the Pods project again after integration).
74  #   - The embed phase touches the user's project, and runs in the
75  #     post_integrate stage — the hook CocoaPods documents as existing
76  #     precisely so that hooks "can alter [the user project] after it is
77  #     written to the disk"; our helpers save the project themselves. Running
78  #     there also means the phase is appended after CocoaPods' own `[CP]`
79  #     phases regardless of whether the app project is fresh (first install,
80  #     Expo prebuild --clean) or already integrated. react-native-firebase's
81  #     helper moved to this hook for the same reasons.
82  #   - On very old CocoaPods versions without post_integrate hooks (< 1.10),
83  #     the user-project stage falls back to the end of the post_install stage.
84  #     That works too — the analyzer, our hook, and the integrator all share
85  #     one in-memory instance of the user project, so mutations made before
86  #     integration survive it — the phase just ends up ordered before the
87  #     `[CP]` phases on a fresh project.
```

**Lines 70–73** state the hard constraint (the Pods project's single write). **Lines 74–81** state the soft-but-important one: post-integrate placement gives the embed phase a stable position after CocoaPods' `[CP]` phases even on a project that has never been integrated before — the situation every `expo prebuild --clean` run creates. The parenthetical about react-native-firebase records history worth knowing: their equivalent helper originally ran everything at post-install, and their target discovery — which, unlike ours, *keyed on the presence of the `[CP] Embed Pods Frameworks` phase* — therefore silently skipped every target on a fresh Expo project's first install, breaking single-pass CI builds in the field. They moved to post-integrate to fix it; we adopted the same placement (§13.13.7 tells that story in full). **Lines 82–87** document the fallback for ancient CocoaPods and, crucially, *why the fallback is still correct*: the user project is one shared in-memory instance across analysis, hooks, and integration — a fact verified against CocoaPods 1.16.2 source, not assumed.

```ruby
89  # Within the post_install stage, the user's post_install block runs first —
90  # React Native's `react_native_post_install` writes the Swift package
91  # references at that point — and our code runs after it, so it can rely on
92  # the package reference existing (and raise a clear error when it doesn't).
93  # Raising there aborts the install before anything is saved.
```

**Lines 89–93** establish the temporal contract within the post-install stage. The last sentence explains why validation belongs here: an exception can stop generation before CocoaPods serializes a misleading half-configuration.

```ruby
95  # Note the asymmetry in what persists between installs: Pods.xcodeproj is
96  # regenerated from scratch on every install, but the *user's* .xcodeproj is
97  # not — which is why the embed phase must be added idempotently and removed
98  # again when SPM resolution is turned off.
```

**Lines 95–98** state the persistence invariant from §5.5. Generated project objects naturally disappear on the next install. An app build phase does not. Any code that adds persistent state must therefore also define update and cleanup behavior.

```ruby
100 # == Supported modes
101 #
102 #   React Native >= 0.75 (default)        -> Stripe via Swift Package Manager
103 #   React Native >= 0.75, opt-out below   -> Stripe via CocoaPods registry
104 #   React Native <  0.75                  -> Stripe via CocoaPods registry
105 #                                            (no `spm_dependency` available)
106 #
107 # To opt out and resolve Stripe through CocoaPods instead (available while
108 # Stripe continues to publish pods), add this at the top of your Podfile:
109 #
110 #   $StripeDisableSPM = true
```

**Lines 100–110** are the complete mode matrix and public escape hatch. The opt-out is a Ruby global because a Podfile and every podspec execute in one process (§5.2). Placement "at the top" matters: the value must exist before autolinking causes the podspec to evaluate. Expo apps set the same global through the config plugin's `disableSPM` option (§12.4.1), since their Podfile is generated. **Line 111** (blank) separates the file contract from implementation.

The header's remaining standalone comment lines—**14, 18, 26, 35, 41, 53, 58, 60, 67, 69, 88, 94, and 99**—are visual paragraph separators within the embedded documentation. They emit no comment text and have no runtime effect, but they keep the `Why`, three-layer architecture, two-stage hook description, lifecycle, persistence, and mode discussions distinct.

### 9.2 Namespace and dependency constants (lines 112–142)

```ruby
112 module StripeSPM
113   # The lightweight SPM mirror of stripe-ios. It carries only tagged source
114   # releases (no tests/examples/history), which keeps Xcode's package checkout
115   # small.
116   PACKAGE_URL = 'https://github.com/stripe/stripe-ios-spm.git'.freeze
```

**Line 112** opens the `StripeSPM` namespace. The module prevents generic names such as `PACKAGE_URL` from colliding with Ruby loaded by CocoaPods, React Native, or another pod. **Lines 113–116** select the release-only mirror. The mirror is still source distribution; "lightweight" refers to repository history and nonrelease content, not to a precompiled binary. `.freeze` prevents accidental in-place mutation of the string.

```ruby
118   # Used when OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH is set (CI testing
119   # against unreleased stripe-ios changes). Branches only exist on the full
120   # stripe-ios repo — the stripe-ios-spm mirror only receives release tags.
121   BRANCH_OVERRIDE_PACKAGE_URL = 'https://github.com/stripe/stripe-ios.git'.freeze
122
123   POD_NAME = 'stripe-react-native'.freeze
```

**Lines 118–121** define a second repository for maintainer-only branch testing. A branch requirement against the tag-only mirror could never resolve, so URL and requirement must switch together. **Line 123** centralizes the name used to locate both CocoaPods model targets and native Xcode targets. This avoids spelling drift across searches.

```ruby
125   # The Swift package products the Core subspec needs. Keep this list in sync
126   # with the CocoaPods fallback dependencies in stripe-react-native.podspec —
127   # they are two spellings of the same dependency set.
128   CORE_PRODUCTS = %w[
129     Stripe
130     StripePaymentSheet
131     StripePayments
132     StripePaymentsUI
133     StripeApplePay
134     StripeFinancialConnections
135   ].freeze
```

**Lines 125–127** declare a parity invariant. An SPM *product* and a CocoaPods *pod* are different package-manager concepts, but here each name describes the same native capability in alternate dependency graphs. **Line 128** begins Ruby's whitespace-delimited string-array literal `%w[...]`; **lines 129–134** name the six unconditional products; **line 135** freezes the array so later code cannot append accidentally. Ordering is not semantically important, but stable ordering makes generated project diffs predictable.

```ruby
137   # The extra product required by the opt-in Onramp subspec. Deliberately not
138   # part of CORE_PRODUCTS: linking it unconditionally would pull crypto-onramp
139   # code (and its StripeIdentity dependency subtree) into every app.
140   ONRAMP_PRODUCT = 'StripeCryptoOnramp'.freeze
141   ONRAMP_SUBSPEC = "#{POD_NAME}/Onramp".freeze
142
```

**Lines 137–140** preserve feature conditionality. SPM resolves transitive targets behind a selected product, so adding `StripeCryptoOnramp` to Core would bring in its identity/camera subtree even when an application never requested Onramp. **Line 141** uses Ruby interpolation to produce `stripe-react-native/Onramp`, the exact name CocoaPods gives the resolved subspec object. **Line 142** is a visual boundary.

Lines 143–201 define the embedding phase's name and script. We intentionally defer them to §9.10, where the literal can be read together with the Ruby methods that install and remove it. This is the only nonsequential reading in the chapter.

### 9.3 Process-wide activation state and package requirements (lines 203–233)

```ruby
203   class << self
204
205     # Records that SPM mode is on for this install and which stripe-ios
206     # version to pin. Called from the podspec (via stripe_spm_activate!), so
207     # it may run more than once per install — CocoaPods can evaluate a podspec
208     # repeatedly — which is fine because it only sets state.
209     def activate!(version)
210       @version = version
211     end
```

**Line 203** opens the module object's singleton class; methods defined inside are called as `StripeSPM.method`. **Line 204** is spacing. **Lines 205–208** describe the idempotency argument. **Line 209** accepts one positional argument. **Line 210** stores it as an instance variable on the module object, giving the current Ruby process shared activation state. Reassigning the same version is harmless. **Line 211** closes the method.

```ruby
213     # True when the podspec declared the Swift package this install. When
214     # false (RN < 0.75 or $StripeDisableSPM), apply() only performs cleanup.
215     def active?
216       !@version.nil?
217     end
```

**Lines 213–214** define what activation means: not merely "SPM exists," but "this podspec invocation selected SPM and recorded a version." **Line 215** follows Ruby's predicate naming convention. **Line 216** returns true exactly when `@version` is non-`nil`; an unset instance variable reads as `nil` in Ruby. **Line 217** closes the predicate.

```ruby
219     def package_url
220       override_branch ? BRANCH_OVERRIDE_PACKAGE_URL : PACKAGE_URL
221     end
```

**Lines 219–221** choose the repository through a ternary expression. The private `override_branch` method is explained in §9.6. Because that method converts an empty environment value to `nil`, only a meaningful branch name selects the full repository.

```ruby
223     # The version requirement Xcode stores in the package reference. Pinned to
224     # the exact release to mirror the exact-version pin the podspec uses for
225     # the CocoaPods fallback: the RN SDK is tested against one specific
226     # stripe-ios version per release.
227     def requirement
228       if override_branch
229         { kind: 'branch', branch: override_branch }
230       else
231         { kind: 'exactVersion', version: @version }
232       end
233     end
```

**Lines 223–226** explain why the normal requirement is exact rather than a semver range: the wrapper release certifies one native SDK version. **Line 227** begins the method. **Lines 228–229** produce the object shape Xcodeproj expects for a branch requirement. **Lines 230–231** otherwise produce an exact-version requirement from the podspec's shared pin. **Lines 232–233** close the conditional and method.

There is a minor, deliberate repetition here: `override_branch` is called to choose the branch and again to fill the hash. Environment variables are stable during `pod install`, so both calls return the same string. The code favors directness over another state variable.

### 9.4 The orchestration methods and integrity guards (lines 235–392)

The module's public surface is no longer one `apply` entry point but four methods, and the split tells you the design. Two are *stage orchestrators* — `apply_pods_project` for the post-install stage and `apply_user_project` for the post-integrate stage, one per Xcode project the helper touches. Two are *integrity guards* for a CocoaPods defect the stage orchestrators cannot see: `ensure_uuid_counter_safe` (a prevention, run before anyone writes package objects) and `verify_pods_project_integrity!` (a detection, run after). The installer wrappers in §9.12 call all four at their precise lifecycle points.

#### 9.4.1 The Pods-project stage (lines 235–256)

```ruby
235     # Pods-project stage. Called by the post_install hook at the bottom of
236     # this file after all regular post_install hooks have run — while
237     # Pods.xcodeproj is still in memory and unwritten, which everything here
238     # depends on. The order of the steps matters:
239     #   1. verify_dynamic_linkage! first, so an unsupported configuration
240     #      fails with our actionable message before anything else can fail
241     #      more cryptically;
242     #   2. find_package_reference! next, because the remaining steps need the
243     #      package reference React Native's SPM integration should have
244     #      created by now;
245     #   3. mutations last, once the configuration is known-good.
246     def apply_pods_project(installer)
```

**Lines 235–245** document a small transaction discipline: validate preconditions, obtain required objects, then mutate — and make the timing constraint explicit ("still in memory and unwritten," the hard rule from §5.3). **Line 246** begins the post-install-stage entry point. `installer` is the live `Pod::Installer` instance, which provides both the resolved dependency model and the generated project.

```ruby
247       # No-op for installs that don't include this SDK (e.g. another project
248       # in a monorepo sharing the same CocoaPods process).
249       pod_target = installer.pod_targets.find { |target| target.pod_name == POD_NAME }
250       return if pod_target.nil?
251       return unless active?
```

**Lines 247–248** explain defensive scoping. Because the helper patches a process-wide class, every installer in that process receives the wrapper. **Line 249** searches CocoaPods' resolved `Pod::PodTarget` models—not Xcode targets—for the one whose root pod name matches. `find` returns the object or `nil`. **Line 250** exits cleanly for an unrelated installation. **Line 251** exits when SPM mode is off — in fallback mode there is nothing to do to the Pods project; the opt-out's *cleanup* obligation belongs to the user-project stage below, because the state needing cleanup lives in the user's project.

```ruby
253       verify_dynamic_linkage!(pod_target)
254       package = find_package_reference!(installer)
255       link_onramp_product(installer, pod_target, package)
256     end
```

**Line 253** checks the actual resolved build representation. **Line 254** proves RN's earlier hook did its job and retains the resulting package object. **Line 255** conditionally completes the product graph. **Line 256** closes the method. The first two methods end in `!` because failure raises an exception; the third is an idempotent mutation. Note what is *not* here anymore: the embed phase. It touches the user's project, so it moved to the other stage.

#### 9.4.2 The user-project stage (lines 258–275)

```ruby
258     # User-project stage. Called by the post_integrate hook at the bottom of
259     # this file (or, on CocoaPods too old for post_integrate hooks, at the
260     # end of the post_install stage — see the lifecycle notes at the top).
261     # The helpers save the user's project themselves, because CocoaPods has
262     # already saved it by post_integrate time.
263     def apply_user_project(installer)
264       pod_target = installer.pod_targets.find { |target| target.pod_name == POD_NAME }
265       return if pod_target.nil?
```

**Lines 258–262** restate the placement contract from §9.1: this runs after CocoaPods' integration step has already saved the user's project, so any change made here must be saved by our own code (which `each_user_app_target`, §9.10.5, does). **Line 263** begins the method; **lines 264–265** repeat the same monorepo scoping guard as the other stage — each stage must be independently safe, because they are invoked by two different hooks that cannot assume the other ran.

```ruby
267       if active?
268         add_embed_phase(installer)
269       else
270         # SPM mode is off, but a previous install may have left the embed
271         # phase in the user's project (which, unlike Pods.xcodeproj, is not
272         # regenerated on each install). Clean it up so opting out is complete.
273         remove_embed_phase(installer)
274       end
275     end
```

**Line 267** branches on the recorded mode. **Line 268** installs or refreshes persistent runtime packaging in SPM mode. **Lines 270–272** restate why the `else` branch cannot simply do nothing: current generated state is clean, but persistent app-project state may be stale from an earlier SPM-mode install. **Line 273** performs the inverse integration. **Lines 274–275** close the conditional and the method. This method embodies §5.5's rule in miniature: one entry point owns both directions of the persistent mutation, so no mode transition can orphan state.

#### 9.4.3 Preventing UUID-collision corruption (lines 277–352)

The next two methods defend against a failure the rest of the file cannot cause but *can trigger*: writing new objects into the Pods project can silently destroy it. Understanding why requires one more CocoaPods internal, verified against the 1.16.2 source.

Every object in a `.pbxproj` is identified by a UUID (§4.3). Plain Xcodeproj generates random UUIDs and checks for collisions. CocoaPods' `Pod::Project` subclass overrides the generator with a *deterministic counter scheme* — each new UUID is a 6-character project prefix, a 7-hex-digit counter value, and a trailing `'0'` — and, per the override's own comment, skips collision checking entirely, "as the Pods project is regenerated each time, and thus all UUIDs will have come from this method." That is a performance optimization resting on an assumption: the in-memory counter (`@generated_uuids.size`) always exceeds the index of every counter-format UUID already in the object table. Whenever the assumption breaks — a project loaded from CocoaPods' incremental-installation cache rather than freshly generated, or postprocessing that sweeps the counters — the counter restarts near zero while the table is full, and the next `project.new` mints a UUID that *already names an existing object*. Registration silently overwrites that object's entry in `objects_by_uuid`. In the observed field failure the clobbered entry was the root `PBXProject` itself, and the saved file's `rootObject` then pointed at a Swift package reference — Xcode refuses to open such a project ("The project 'Pods' is damaged and cannot be opened", `-[XCRemoteSwiftPackageReference _setSavedArchiveVersion:]`).

Who does `project.new` during post-install hooks? React Native's SPM manager, for every `spm_dependency` package reference and product (§8.3) — and our own `link_onramp_product`, once. React Native fixed its side upstream in [facebook/react-native#57576](https://github.com/facebook/react-native/pull/57576), but that fix ships only in RN ≥ 0.88; every earlier `spm_dependency`-capable release (0.75–0.87) carries the latent bug, and react-native-firebase reproduced it in the field on RN 0.85.3. This guard is the same defense they ship. It is not hypothetical for us either: on the very first CI run of the Expo prebuild job (§12.3.7), a stock Expo SDK 54 install arrived at this hook with 10,524 counter-format objects and a stale counter, and the guard's log line shows it padding past index 10523 — without it, React Native's package reference would have overwritten an existing object.

```ruby
315     def ensure_uuid_counter_safe(installer)
316       project = installer.pods_project
317       return unless project
318
319       prefix = project.instance_variable_get(:@uuid_prefix)
320       return unless prefix.is_a?(String) && prefix.length >= 6
```

(The comment block at **lines 277–314** narrates the background above, cites the upstream fix, and records two operational properties: the guard runs even when SPM mode is off — it is cheap and protects *any* library using `spm_dependency` in the same install — and it is idempotent, so it composes with react-native-firebase's equivalent guard when both SDKs are installed.) **Line 315** begins the method. **Lines 316–317** fetch the generated project and bail if none exists (possible for exotic installer configurations). **Line 319** reads the project's UUID prefix through `instance_variable_get` — this is reaching into private state, the reason the caller wraps this whole method in a rescue (§9.12). **Line 320** validates the prefix's shape before using it; if CocoaPods someday changes the scheme, the guard silently stands down rather than guessing.

```ruby
322       counter_prefix = prefix[0, 6]
323       max_index = -1
324       project.objects_by_uuid.each_key do |uuid|
325         # Only counter-format UUIDs participate: prefix + 7 hex digits + '0'.
326         next unless uuid.is_a?(String) && uuid.length == 14 &&
327                     uuid.start_with?(counter_prefix) && uuid.end_with?('0')
328
329         index = uuid[6, 7].to_i(16)
330         max_index = index if index > max_index
331       end
332       return if max_index < 0
```

**Line 322** truncates the prefix to the 6 characters the format string actually uses. **Line 323** initializes a high-water mark. **Lines 324–331** scan every object UUID in the project, but count only those matching the deterministic format exactly — 14 characters, correct prefix, trailing `'0'` — extracting the 7-hex-digit counter value with `to_i(16)` and keeping the maximum. Foreign-format UUIDs (Xcode-made, random) are irrelevant: the counter can never collide with them by construction. **Line 332** exits when no counter-format objects exist — nothing to defend.

```ruby
334       generated = project.instance_variable_get(:@generated_uuids)
335       generated = [] unless generated.is_a?(Array)
336       already_safe = generated.size > max_index
337       while generated.size <= max_index
338         generated << format('%.6s%07X0', prefix, generated.size)
339       end
340       project.instance_variable_set(:@generated_uuids, generated)
341       # Discard pre-minted UUIDs too — they may date from before the raise.
342       project.instance_variable_set(:@available_uuids, [])
```

**Lines 334–335** read the counter array defensively. **Line 336** records whether the invariant already held — the healthy, common case. **Lines 337–339** are the defense itself: pad `@generated_uuids` until its size exceeds every observed index, using the *same format string* CocoaPods' own generator uses (`'%.6s%07X0'`, read from `Pod::Project#generate_available_uuid_list`). Because the next minted UUID's counter value is `generated.size`, raising the array's size past `max_index` guarantees fresh UUIDs land beyond every existing object. **Lines 340–342** write both arrays back; `@available_uuids` — UUIDs minted earlier but not yet handed out — is emptied because its entries may predate the raise and still collide.

```ruby
348       if !already_safe && active? && defined?(Pod::UI)
349         Pod::UI.puts "[stripe-react-native] Raised the Pods project's UUID counter past " \
350                      "index #{max_index} before Swift Package references are written."
351       end
352     end
```

**Lines 348–351** log exactly one line, and only when three things are true: padding actually happened (the assumption was really broken on this install — the load-bearing case worth a diagnostic trail), SPM mode is on (no noise on installs we are not part of), and `Pod::UI` exists (the method must survive being loaded outside a full CocoaPods process). **Line 352** closes the method. Note the method name has no `!`: it never raises by design.

#### 9.4.4 Detecting corruption that slipped through (lines 354–392)

```ruby
364     def verify_pods_project_integrity!(installer)
365       return unless active?
366
367       project = installer.pods_project
368       return unless project
369       return unless project.respond_to?(:root_object) && project.respond_to?(:objects_by_uuid)
```

(The comment block at **lines 354–363** frames this as the post-condition check paired with §9.4.3's precaution: prevention can be defeated by an internals change it doesn't recognize, so after all regular post-install hooks have run — React Native's SPM writes included — the project must still be self-consistent.) **Line 364** begins the method; the `!` announces it raises on failure. **Line 365** scopes it to SPM mode. **Lines 367–369** are shape guards mirroring the soft guard's: absent or unfamiliar projects pass rather than crash.

```ruby
371       root = project.root_object
372       resolved = root && project.objects_by_uuid[root.uuid]
373       return if root &&
374                 resolved.equal?(root) &&
375                 resolved.respond_to?(:isa) &&
376                 resolved.isa == 'PBXProject'
```

**Line 371** takes the in-memory root object — the `PBXProject` the project was created with. **Line 372** asks the object table what currently lives at that root object's UUID. In a healthy project these are *the same Ruby object*. **Lines 373–376** encode exactly that: the entry must be `equal?` (object identity, not value equality) to the root and still describe itself as a `PBXProject`. If a later `project.new` reused the root's UUID, the table now holds the newcomer while `@root_object` still points at the original — and *saving* would serialize a `rootObject` field naming a non-project object.

```ruby
378       raise Pod::Informative, <<~MESSAGE
379         [stripe-react-native] The Pods project failed an integrity check after
380         post_install hooks ran: its rootObject no longer resolves to the
...
389         React Native and CocoaPods versions); `$StripeDisableSPM = true` at
390         the top of your Podfile is the interim workaround.
391       MESSAGE
392     end
```

**Lines 378–392** abort the install with `Pod::Informative` — the same user-facing error class as every other validation in this file — *before* the corrupt project reaches disk, which is the entire point of running at this lifecycle position. The message explains what happened in project terms, gives the immediate remediation (delete `ios/Pods`, reinstall), asks for a report with version details, and names the opt-out as the interim workaround. Contrast the two guards' failure philosophies: the preventive guard is wrapped in a rescue and degrades to a warning (its failure mode is "CocoaPods internals changed"), while this check raises hard (its failure mode is "your project is about to be destroyed" — there is no safe way to continue). §13.12 is the diagnostic section for the raised error.

### 9.5 Making implementation helpers private (line 394)

```ruby
394     private
```

**Line 394** changes visibility for subsequent singleton methods. Callers may use `StripeSPM.activate!`, `.active?`, `.package_url`, `.requirement`, the two stage orchestrators `.apply_pods_project`/`.apply_user_project`, and the two guards `.ensure_uuid_counter_safe`/`.verify_pods_project_integrity!`; details below are internal. Ruby's `private` is enforced at call time and also communicates the intended maintenance surface.

### 9.6 Reading the CI branch override (lines 396–399)

```ruby
396     def override_branch
397       branch = ENV['OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH']
398       branch && !branch.empty? ? branch : nil
399     end
```

**Line 396** begins the helper. **Line 397** reads the process environment; `ENV` behaves like a string-keyed hash and returns `nil` when the variable is absent. **Line 398** returns the string only if it exists and is nonempty. This normalization matters because Ruby treats `""` as truthy: returning it directly would generate an invalid branch requirement and select the wrong URL. **Line 399** closes the method.

This variable is maintainer-facing, not a consumer version escape hatch. CI uses it to test the wrapper against unreleased changes in the full stripe-ios repository. Normal releases remain exactly pinned.

### 9.7 Proving and enforcing dynamic linkage (lines 401–438)

The comments first derive the requirement in the same terms as Chapter 3:

```ruby
401     # SPM resolution only works when stripe-react-native builds as a dynamic
402     # framework, so fail `pod install` with instructions otherwise.
403     #
404     # Background: stripe-ios's package products use "automatic" linkage, which
405     # Xcode resolves by statically absorbing the product into each consumer.
406     # When the pod is a static library (React Native's default) the Stripe
407     # code never makes it into anything the app links — Xcode builds the
408     # package targets, the pod compiles against their Swift modules, and the
409     # final app link then fails with undefined Stripe symbols, because a
410     # static library can't carry its dependencies and nothing else links them.
411     # Dynamic frameworks don't have that problem: the pod framework links the
412     # Stripe products into itself. This mirrors react-native-firebase, which
413     # enforces the same requirement for the same reason.
414     #
415     # Note: Pod::Target#build_type is a *private* reader in CocoaPods; only
416     # the build_as_* predicates are public API.
```

**Lines 401–402** turn a late linker failure into an early configuration error. **Lines 404–410** trace the unsupported static topology: module interfaces make compilation possible, but the archive never consumes the product implementations and the application does not know to link them. **Lines 411–413** identify the dynamic framework's own link step as the missing boundary. **Lines 415–416** memorialize a real CI lesson: method existence is not enough; visibility is part of an API. Calling the private `build_type` reader with an explicit receiver raised `NoMethodError` under CocoaPods 1.16.2.

```ruby
417     def verify_dynamic_linkage!(pod_target)
418       return if pod_target.build_as_dynamic_framework?
```

**Line 417** accepts the resolved CocoaPods target model found in `apply`. **Line 418** is the sole supported success condition, using CocoaPods' public predicate. It deliberately does not accept a static framework merely because that product is framework-shaped; a static framework still contains a static archive (§3.2).

```ruby
420       current = if pod_target.build_as_framework?
421                   'a static framework'
422                 elsif pod_target.build_as_dynamic?
423                   'a dynamic library'
424                 else
425                   'a static library'
426                 end
```

**Lines 420–426** classify the remaining three cells from §3.4 for the diagnostic. Since line 418 already removed dynamic frameworks, `build_as_framework?` means static framework. Otherwise, a dynamic build is a bare dynamic library; the remaining ordinary case is a static library. This text classification changes only the message, not policy.

```ruby
427       raise Pod::Informative, <<~MESSAGE
428         [stripe-react-native] Resolving the Stripe iOS SDK through Swift Package
429         Manager requires dynamic frameworks, but #{POD_NAME} is building as
430         #{current}. Either:
431           * add `use_frameworks! :linkage => :dynamic` to your Podfile (for Expo,
432             set `"useFrameworks": "dynamic"` via the expo-build-properties
433             plugin), or
434           * add `$StripeDisableSPM = true` at the top of your Podfile to resolve
435             Stripe through CocoaPods instead (available while Stripe continues
436             to publish pods).
437       MESSAGE
438     end
```

**Line 427** raises `Pod::Informative`, CocoaPods' user-facing error class, with a squiggly heredoc. This aborts `pod install` without presenting the failure as an internal Ruby bug. **Lines 428–430** name the component, requirement, and observed build type. **Lines 431–433** give the native and Expo forms of the durable fix. **Lines 434–436** give the temporary fallback. **Lines 437–438** terminate the literal and method.

Why not test `ENV['USE_FRAMEWORKS']`? Environment text is only an input convention; Podfiles can call `use_frameworks!` directly or override it by target. The `Pod::PodTarget` predicate reports what CocoaPods actually resolved, which is the condition the linker cares about.

### 9.8 Verifying React Native created the package (lines 440–463)

```ruby
440     # Locates the XCRemoteSwiftPackageReference that React Native's
441     # `react_native_post_install` should have written into Pods.xcodeproj
442     # (triggered by the `spm_dependency` call in our podspec). Its absence
443     # means the Podfile's post_install never called react_native_post_install
444     # — possible in hand-rolled Podfiles — and the build would otherwise fail
445     # later with baffling "no such module 'Stripe'" errors, so surface it here
446     # with the fix spelled out.
```

**Lines 440–446** define the postcondition being tested and translate a missing project object back to its likely lifecycle cause. This check does not create the package itself: doing so would duplicate RN's ownership and omit RN's associated module-search-path wiring.

```ruby
447     def find_package_reference!(installer)
448       url = package_url
449       package = installer.pods_project.root_object.package_references.find do |ref|
450         # Local package references respond to :path instead of :repositoryURL;
451         # guard so a mixed project can't crash the lookup.
452         ref.respond_to?(:repositoryURL) && ref.repositoryURL == url
453       end
454       return package if package
```

**Line 447** begins the raising lookup. **Line 448** computes the expected URL once, including branch-override behavior. **Line 449** traverses from the installer to generated `Pods.xcodeproj`, then its `PBXProject` root object, then its package-reference collection. **Lines 450–452** use duck typing safely: remote references expose `repositoryURL`; local filesystem package references expose `path`. `respond_to?` prevents sending the wrong message to a mixed object type, and the second half runs only when the first is true because `&&` short-circuits. **Line 453** closes the block. **Line 454** returns the exact Xcodeproj object for later Onramp attachment.

```ruby
456       raise Pod::Informative, <<~MESSAGE
457         [stripe-react-native] The Stripe iOS Swift package was not added to the
458         Pods project. Make sure your Podfile's post_install block calls
459         `react_native_post_install` (this is part of the standard React Native
460         template), or opt out of Swift Package Manager resolution by adding
461         `$StripeDisableSPM = true` at the top of your Podfile.
462       MESSAGE
463     end
```

**Lines 456–462** abort with the two legitimate resolutions: restore the standard RN post-install call or select fallback mode. **Line 463** closes the method. Validation occurs before mutations, so this path cannot leave a newly added Onramp product or embed phase behind.

### 9.9 Restoring Onramp's subspec conditionality (lines 465–495)

```ruby
465     # Adds the StripeCryptoOnramp product dependency to the pod's native
466     # target when (and only when) the app installs the Onramp subspec.
467     #
468     # Why this can't live in the podspec: React Native's SPM manager keys
469     # `spm_dependency` registrations by spec name and later looks up Pods
470     # project targets by that same name. Subspecs don't get their own targets
471     # — they merge into the root pod target — so a registration made against
472     # "stripe-react-native/Onramp" never matches a target and is silently
473     # dropped. Declaring the product at the root instead would link Onramp
474     # into every app. The Onramp-only fallback pod dependency in the podspec
475     # has the same conditionality via subspec selection; this reproduces it
476     # for SPM by inspecting which subspecs the installer actually resolved.
477     #
478     # This mirrors what react-native/scripts/cocoapods/spm.rb does when it
479     # links products (find-or-create the reference, then attach), so the
480     # object shapes stay consistent with the core-product entries.
```

**Lines 465–476** restate the modeling mismatch: CocoaPods has subspec objects but one combined native target, whereas RN's bridge assumes a spec name maps directly to a target name. The helper waits until resolution so it can ask the `Pod::PodTarget` which specs it actually contains. **Lines 478–480** require the seventh dependency to look exactly like RN's six dependencies in the Xcode object graph.

```ruby
481     def link_onramp_product(installer, pod_target, package)
482       return unless pod_target.specs.any? { |spec| spec.name == ONRAMP_SUBSPEC }
```

**Line 481** receives three already validated objects: the installer, the resolved pod model, and the remote package reference. **Line 482** inspects every selected specification and exits unless one has the exact full name `stripe-react-native/Onramp`. `any?` returns a Boolean and stops at the first match.

```ruby
484       native_target = installer.pods_project.targets.find { |target| target.name == pod_target.label }
485       return if native_target.nil?
```

**Line 484** crosses model layers. `pod_target` is CocoaPods' resolved model; `native_target` is the `PBXNativeTarget` in `Pods.xcodeproj` that will actually build. `pod_target.label` is used because it is CocoaPods' generated target label. **Line 485** is defensive: an unusual generator configuration that omitted the native target should not cause a nil dereference here. Core compilation would expose the deeper inconsistency later.

```ruby
486       # Idempotency: podspecs can be evaluated multiple times per install, and
487       # nothing prevents this hook from running against a project that already
488       # has the product attached.
489       return if native_target.package_product_dependencies.any? { |dep| dep.product_name == ONRAMP_PRODUCT }
```

**Lines 486–488** explain repeatability. **Line 489** prevents duplicate `XCSwiftPackageProductDependency` objects by scanning product names already attached to this native target. In this integration there is one relevant Stripe package; if multiple packages exported the same product name, a stricter check would also compare `dep.package`.

```ruby
491       product = installer.pods_project.new(Xcodeproj::Project::Object::XCSwiftPackageProductDependency)
492       product.package = package
493       product.product_name = ONRAMP_PRODUCT
494       native_target.package_product_dependencies << product
495     end
```

**Line 491** allocates and registers a new object in the Pods project's object graph. Instantiating the Ruby class directly would not enroll it correctly in that graph; `project.new` is the Xcodeproj factory. **Line 492** points it to RN's existing remote package reference. **Line 493** selects `StripeCryptoOnramp`. **Line 494** attaches it to the native target. **Line 495** closes the method. Xcode will serialize the reference beside the Core products and expand its transitive target graph during build.

### 9.10 Embedding dynamic package frameworks (lines 143–201 and 497–558)

This section joins code declared in two places: the shell script constant near the top of the module, and the Ruby project-editing methods later in the module. Together they implement create, update, no-op, and remove semantics for persistent app-project state.

#### 9.10.1 Phase identity and the runtime problem (lines 143–178)

```ruby
143   # Shown in Xcode's build-phases UI; also the key used to find/replace/remove
144   # the phase on later installs.
145   EMBED_PHASE_NAME = '[stripe-react-native] Embed SPM Frameworks'.freeze
```

**Lines 143–145** give the phase a stable, namespaced identity. It is human-readable in Xcode and machine-readable on later installs. Renaming this constant without migration logic would orphan phases created by older SDK versions.

```ruby
147   # Embeds SPM-built dynamic frameworks into the app bundle.
148   #
149   # Why this is needed: stripe-ios's package products are "automatic" linkage
150   # libraries, and in some configurations Xcode chooses to build them as real
151   # dynamic frameworks (under BUILT_PRODUCTS_DIR/PackageFrameworks for regular
152   # builds, and under OBJROOT/UninstalledProducts/<platform> for Archive
153   # builds, which never populate PackageFrameworks). Xcode only auto-embeds
154   # package frameworks for targets that link them *directly*; frameworks
155   # linked by a CocoaPods pod target are invisible to both Xcode's embedding
156   # and CocoaPods' "[CP] Embed Pods Frameworks" phase. Without this script the
157   # app builds fine and then crashes at launch with
158   # "dyld: Library not loaded: @rpath/Stripe....framework".
```

**Lines 147–158** separate link success from runtime completeness. The application does not directly own the SPM product dependencies; the generated wrapper target does. Xcode's normal SPM embed logic therefore does not run for the app, while CocoaPods' phase only knows frameworks in CocoaPods' own graph. Two search locations are required because ordinary builds and Archive builds lay out package frameworks differently.

**Line 159** is a standalone comment separator before the implementation-detail list.

```ruby
160   # Script details:
161   #   - Filters to Stripe*.framework so we never touch frameworks that other
162   #     packages/tools manage themselves (e.g. react-native-firebase runs an
163   #     equivalent phase for Firebase frameworks).
164   #   - Uses file(1) to skip statically linked frameworks: those are already
165   #     linked into their consumers, and embedding a static framework in the
166   #     bundle fails App Store validation.
167   #   - Strips Headers/PrivateHeaders/Modules, which don't belong in a shipped
168   #     app bundle.
169   #   - Re-signs with --preserve-metadata so the frameworks pick up the app's
170   #     signing identity without losing their bundle identifiers/entitlements.
171   #   - Skips frameworks already present in the destination (e.g. embedded by
172   #     another phase) rather than overwriting them.
173   #   - FRAMEWORKS_FOLDER_PATH is unset for build types with no frameworks
174   #     folder (some non-app targets); treat that as "nothing to do".
175   #
176   # The heredoc is single-quoted (<<~'SCRIPT') so ${...} reaches the shell
177   # untouched by Ruby interpolation.
178   EMBED_SCRIPT = <<~'SCRIPT'.freeze
```

**Lines 160–174** list the script's safety boundaries. The most important is dynamic-binary detection: `.framework` describes packaging, not linkage. Copying a static framework into an app is not merely wasteful; it can trigger App Store validation errors. **Lines 176–178** explain the two-language boundary. Ruby must store shell variables literally for Xcode's shell to expand at build time. The quoted heredoc delimiter suppresses Ruby interpolation, while `.freeze` protects the resulting string.

#### 9.10.2 The shell program, instruction by instruction (lines 179–201)

```sh
179   set -e
180   if [ -z "${FRAMEWORKS_FOLDER_PATH:-}" ]; then
181     exit 0
182   fi
```

**Line 179** asks POSIX `sh` to exit when an unguarded command fails. A copy or signing error must fail the build; silently producing an incomplete app would defer failure to launch. **Line 180** uses `[ -z STRING ]` to test for an empty value. `${FRAMEWORKS_FOLDER_PATH:-}` expands to an empty string when the variable is unset, avoiding an unset-variable ambiguity. **Line 181** succeeds early for targets without a framework destination; **line 182** closes the conditional.

```sh
183   DEST="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"
184   mkdir -p "$DEST"
```

**Line 183** forms the destination inside the current target's built bundle—for an app, something like `.../ReactTestApp.app/Frameworks`. Both variables come from Xcode build settings. Quoting preserves paths containing spaces. **Line 184** creates the directory and any missing parents; `-p` also makes an already-existing directory a success, which contributes to idempotence.

```sh
185   for SEARCH_DIR in "${BUILT_PRODUCTS_DIR}/PackageFrameworks" "${OBJROOT}/UninstalledProducts/${PLATFORM_NAME}"; do
186     [ -d "$SEARCH_DIR" ] || continue
```

**Line 185** loops over the ordinary-build and Archive-build locations. `BUILT_PRODUCTS_DIR` is the configuration's product directory; `OBJROOT` is the intermediates root; `PLATFORM_NAME` distinguishes values such as `iphonesimulator` and `iphoneos`. **Line 186** skips a candidate that is not a directory. This is expected, not an error, because only one layout may exist for a build action.

```sh
187     for FRAMEWORK in "$SEARCH_DIR"/Stripe*.framework; do
188       [ -d "$FRAMEWORK" ] || continue
189       NAME="$(basename "$FRAMEWORK" .framework)"
190       BINARY="$FRAMEWORK/$NAME"
191       [ -f "$BINARY" ] || continue
192       file -b "$BINARY" | grep -q "dynamically linked" || continue
```

**Line 187** expands only `Stripe*.framework` entries. The wildcard is intentionally outside the quoted directory prefix so the shell can expand it. When nothing matches, many shells leave the pattern literal; **line 188** safely skips that non-directory. **Line 189** runs `basename`, removing the `.framework` suffix to obtain a framework name. **Line 190** derives the conventional executable path `Foo.framework/Foo`. **Line 191** ignores malformed/resource-only directories without such a file. **Line 192** asks the system `file` utility to classify the Mach-O binary; `-b` omits the filename and `grep -q` quietly tests for the phrase `dynamically linked`. Static frameworks fall through `continue` and are never embedded.

```sh
193       if [ ! -d "$DEST/$NAME.framework" ]; then
194         rsync -a --exclude Headers --exclude PrivateHeaders --exclude Modules "$FRAMEWORK" "$DEST/"
```

**Line 193** chooses first-writer-wins behavior: if another phase already embedded a same-named framework, Stripe does not overwrite it. This prevents two integration tools from repeatedly replacing each other's signed output. **Line 194** copies the whole framework directory with archive semantics while excluding development-only headers and module metadata. `rsync` propagates errors to `set -e`.

```sh
195         if [ -n "${EXPANDED_CODE_SIGN_IDENTITY:-}" ] && [ "${CODE_SIGNING_ALLOWED:-NO}" = "YES" ]; then
196           codesign --force --sign "$EXPANDED_CODE_SIGN_IDENTITY" --preserve-metadata=identifier,entitlements "$DEST/$NAME.framework"
197         fi
```

**Line 195** signs only when Xcode supplied a nonempty expanded identity *and* permits signing for the current action. The `:-NO` default makes an unset permission safely false. Simulator builds often skip this branch; device and Archive builds usually take it. **Line 196** replaces any prior signature with the app build's identity while retaining the framework's identifier and entitlements metadata. Quoting protects the identity and path. **Line 197** closes the signing conditional.

```sh
198       fi
199     done
200   done
201 SCRIPT
```

**Line 198** closes the destination-existence test. **Line 199** closes the framework loop. **Line 200** closes the search-directory loop. **Line 201** terminates the Ruby heredoc; it is not sent to the shell.

The script has no explicit final `exit 0`; successful completion of the last command yields status zero naturally. Under `set -e`, any real copy or signing failure yields nonzero and makes Xcode fail the build phase.

#### 9.10.3 Create or refresh the phase (lines 497–518)

```ruby
497     # Installs (or refreshes) the embed phase on every app target that links
498     # this pod. Comparing shell_script means an SDK upgrade that changes
499     # EMBED_SCRIPT rewrites the phase in place, while an unchanged script
500     # leaves the user's project untouched (keeping repeat `pod install` runs
501     # diff-free).
502     def add_embed_phase(installer)
503       each_user_app_target(installer) do |user_target|
504         phase = user_target.shell_script_build_phases.find { |p| p.name == EMBED_PHASE_NAME }
505         next false if phase && phase.shell_script == EMBED_SCRIPT
```

**Lines 497–501** define three cases: create when absent, update when stale, no-op when identical. **Line 502** begins the method. **Line 503** delegates target discovery and project saving to the shared iterator in §9.10.5. **Line 504** finds a shell phase by stable name. **Line 505** returns `false` from this block invocation when both the phase and exact script already match; the iterator interprets false as "this target caused no project change."

```ruby
507         phase ||= user_target.new_shell_script_build_phase(EMBED_PHASE_NAME)
508         phase.shell_path = '/bin/sh'
509         phase.shell_script = EMBED_SCRIPT
```

**Line 507** reuses the stale phase or creates a new `PBXShellScriptBuildPhase` when `phase` is nil. `||=` is what prevents duplicate named phases. **Line 508** fixes the interpreter to the portable system shell used by the script syntax. **Line 509** installs the current immutable script text, updating older versions in place.

```ruby
510         # The phase has no input/output file lists (the set of frameworks
511         # isn't knowable statically), so mark it always-run to avoid Xcode's
512         # "will be run during every build" warning turning into a skipped
513         # phase under build-phase fingerprinting. Guarded because older
514         # Xcodeproj gems don't model the attribute.
515         phase.always_out_of_date = '1' if phase.respond_to?(:always_out_of_date=)
516         true
517       end
518     end
```

**Lines 510–514** explain why dependency analysis cannot infer outputs: Xcode itself decides which automatic-linkage products become dynamic frameworks, so the set is configuration-dependent. **Line 515** sets the project-file attribute when this Xcodeproj version exposes a setter. The string `'1'` matches `.pbxproj` serialization conventions. The `respond_to?` guard preserves compatibility with older gems. **Line 516** reports a mutation to the iterator. **Lines 517–518** close the block and method.

#### 9.10.4 Remove stale state in fallback mode (lines 520–532)

```ruby
520     # Inverse of add_embed_phase, used when SPM mode is off. Needed because
521     # the embed phase lives in the user's project, which survives between
522     # installs — without this, opting out would leave a stale (harmless but
523     # confusing) build phase behind.
524     def remove_embed_phase(installer)
525       each_user_app_target(installer) do |user_target|
526         phase = user_target.shell_script_build_phases.find { |p| p.name == EMBED_PHASE_NAME }
527         next false if phase.nil?
```

**Lines 520–523** establish the inverse obligation. **Line 524** begins cleanup and **line 525** reuses exactly the same target-selection logic as creation, preventing asymmetric scope. **Line 526** finds the phase by identity. **Line 527** reports no change when it is already absent.

```ruby
529         phase.remove_from_project
530         true
531       end
532     end
```

**Line 529** removes the phase object and all owning references through Xcodeproj's graph-aware API. Deleting it only from a Ruby array could leave an orphan serialized object. **Line 530** reports a mutation; **lines 369–370** close the block and method.

#### 9.10.5 Find the correct application targets and save only changes (lines 534–558)

```ruby
534     # Yields every application target that links the stripe-react-native pod;
535     # saves the containing project when the block returns true for any target.
536     #
537     # Only :application targets are considered: unit-test and extension
538     # targets don't embed these frameworks (tests load them from the host
539     # app). Saving only on change keeps no-op installs from rewriting the
540     # user's project file.
541     def each_user_app_target(installer)
```

**Lines 534–540** specify ownership. An XCTest bundle normally executes inside a host app and uses its frameworks; an extension has separate packaging and API-safety questions and is intentionally out of scope. **Line 541** begins an internal iterator whose caller supplies add/remove behavior as a block.

```ruby
542       installer.aggregate_targets.each do |aggregate_target|
543         next unless aggregate_target.pod_targets.any? { |target| target.pod_name == POD_NAME }
```

**Line 542** loops over CocoaPods aggregate targets. Each aggregate represents one Podfile integration context, commonly `Pods-MyApp`, and connects a set of pod targets to one or more user targets. **Line 543** skips aggregates that do not contain the Stripe wrapper. This is essential in workspaces with several app targets or abstract-target inheritance: only consumers receive the phase.

```ruby
545         # user_project is nil for non-integrating installs (e.g.
546         # `integrate_targets: false` setups); nothing to embed into there.
547         project = aggregate_target.user_project
548         next if project.nil?
```

**Lines 545–546** name a supported CocoaPods edge case. **Line 547** obtains the persistent app project from the aggregate; **line 548** skips integrations that intentionally provide no user project. The helper cannot install a phase where no project integration exists.

```ruby
550         changed = false
551         aggregate_target.user_targets.each do |user_target|
552           next unless user_target.respond_to?(:symbol_type) && user_target.symbol_type == :application
391
554           changed = true if yield(user_target)
555         end
556         project.save if changed
557       end
558     end
```

**Line 550** initializes change tracking per project/aggregate. **Line 551** enumerates the actual targets from the user's project. **Line 552** first guards compatibility with an object that lacks `symbol_type`, then keeps only application products. `&&` again short-circuits safely. **Line 553** separates selection from action. **Line 554** invokes the caller's block and latches `changed` true when it reports a mutation; once true it remains true. **Line 555** closes the target loop. **Line 556** serializes the persistent project only if necessary. **Lines 557–558** close the aggregate loop and method.

Avoiding unnecessary `project.save` calls is more than tidiness. Xcode project serialization can reorder fields or update compatibility metadata, causing noisy diffs in an application's source-controlled `.pbxproj`. A repeated `pod install` should be boring.

### 9.11 Closing the namespace and exposing podspec functions (lines 559–592)

```ruby
559   end
560 end
```

**Line 559** closes `class << self`; **line 560** closes `module StripeSPM`. The remaining functions are deliberately top-level because a podspec calls them without a receiver, matching React Native's own `spm_dependency` DSL style.

```ruby
562 # True when the Stripe iOS SDK should be resolved through Swift Package
563 # Manager for this install. Evaluated by the podspec, which requires this
564 # file.
565 #
566 # `defined?(spm_dependency)` is the React Native >= 0.75 detection: the user's
567 # Podfile requires react_native_pods.rb, which defines `spm_dependency` as a
568 # top-level function, and CocoaPods evaluates podspecs in the same Ruby
569 # process, so the function is visible here exactly when the app's React
570 # Native version supports it.
571 #
572 # `$StripeDisableSPM` is the user-facing opt-out. The value is compared to
573 # `true` (not just "defined") so tooling that emits `$StripeDisableSPM =
574 # false` gets SPM resolution as expected.
```

**Lines 562–570** explain capability detection. Parsing a React Native version string would be brittle around prereleases, forks, and backports; asking whether the required function exists tests the capability itself. **Lines 572–574** distinguish "the global exists" from "the user enabled the opt-out." A config plugin may emit an explicit false value, which must leave SPM enabled.

```ruby
575 def stripe_spm_enabled?
576   return false unless defined?(spm_dependency)
577   return false if defined?($StripeDisableSPM) && $StripeDisableSPM == true
416
579   true
580 end
```

**Line 575** declares the predicate in the top-level DSL. **Line 576** selects automatic legacy fallback when RN's bridge is unavailable. `defined?` probes without invoking the function. **Line 577** selects explicit fallback only for the Boolean `true`, guarding the variable's existence before reading it. **Line 578** improves readability. **Line 579** is reached only when both prerequisites pass. **Line 580** closes the method.

The truth table is:

| `spm_dependency` exists | `$StripeDisableSPM == true` | Result |
|---|---:|---|
| no | either | fallback |
| yes | yes | fallback |
| yes | no, false, or undefined | SPM |

```ruby
582 # Declares the stripe-ios Swift package on the given (root) spec and switches
583 # this file's installer hook into active mode. Called from the podspec.
584 def stripe_spm_activate!(spec, version:)
585   StripeSPM.activate!(version)
586   spm_dependency(
587     spec,
588     url: StripeSPM.package_url,
589     requirement: StripeSPM.requirement,
590     products: StripeSPM::CORE_PRODUCTS
591   )
592 end
```

**Lines 582–583** state the two effects. **Line 584** accepts a positional root spec and a required keyword argument `version:`. The trailing colon without a default means omission is an error. **Line 585** records active state *before* declaration. **Line 586** invokes RN's record-half function. **Line 587** passes the root `Pod::Spec`; this is what makes the later name-to-target lookup succeed. **Lines 588–590** pass the selected repository, requirement hash, and immutable six-product array. **Line 591** closes the call; **line 592** closes activation.

No Xcode operation occurs here. The package declaration is merely in RN's process-wide `SPMManager` until `react_native_post_install` runs.

### 9.12 Installing the CocoaPods wrappers exactly once (lines 594–683)

The file ends by wiring everything above into CocoaPods' lifecycle: two wrappers, one per hooked method, installed the moment the podspec `require`s the file.

```ruby
594 # Install the Pod::Installer hooks (once) as soon as the podspec requires
595 # this file.
596 #
597 # Why hook `run_podfile_post_install_hooks`/`run_podfile_post_integrate_hooks`
598 # instead of asking users to call a helper from their Podfile: CocoaPods
599 # invokes both methods on every install even when the Podfile defines no
600 # corresponding block, so the integration works with zero Podfile changes —
601 # including the cleanup path when the user has opted out. Pod::Installer is a
602 # stable, semantically versioned public class, making it a safer patch target
603 # than React Native's private cocoapods scripts. (react-native-firebase hooks
604 # the same two methods for the same reasons.)
```

**Lines 594–604** explain both timing and API choice. Asking users to call the stage methods themselves would be easy to forget and could not reliably clean up old state. The code modifies a public CocoaPods class at load time, but wraps two lifecycle methods rather than editing RN's private scripts.

```ruby
606 # The re-hook guards check both public and private visibility: the original
607 # methods are private in CocoaPods, and `alias_method` preserves visibility,
608 # so a plain `method_defined?` check would miss the alias and re-hook on a
609 # second load. (`require` normally dedupes by path; this protects against the
610 # same file being loaded from two paths.) The wrappers are defined with
611 # `define_method` so they can capture `post_integrate_supported`, and are
612 # made private again afterwards to leave the class shaped as CocoaPods
613 # defined it.
```

**Lines 606–613** define the double-wrap hazard and preview two Ruby techniques this version needs. If a wrapper were installed twice, the second alias could point at the first wrapper; the stage methods might run repeatedly or recursion could emerge after further loads. `require_relative` usually protects against this, but different resolved paths can defeat require's cache. The `define_method` remark matters below: a method defined with the `def` keyword opens a fresh scope and cannot see local variables around it, whereas `define_method` takes a *block*, and blocks are closures — they capture surrounding locals. The wrapper needs to remember, at call time, a fact computed at load time.

```ruby
614 if defined?(Pod::Installer)
615   installer_class = Pod::Installer
616
617   # CocoaPods has invoked post_integrate hooks (at the end of
618   # integrate_user_project) since 1.10. When the method is missing — or when
619   # a Podfile sets `integrate_targets: false`, in which case CocoaPods never
620   # calls it — the user-project stage has to run from post_install instead.
621   # The integrate_targets case needs no special handling: without
622   # integration there is no user project to embed into, and
623   # apply_user_project no-ops.
624   post_integrate_supported =
625     installer_class.method_defined?(:run_podfile_post_integrate_hooks) ||
626     installer_class.private_method_defined?(:run_podfile_post_integrate_hooks)
```

**Line 614** checks that CocoaPods has loaded `Pod::Installer` before referencing it; the whole block is a no-op outside a real install process. **Line 615** binds the class to a local so the closures below read one name. **Lines 617–623** address the two ways the post-integrate stage might not run: an ancient CocoaPods (< 1.10) that has no such method, and an unusual Podfile that disables user-project integration entirely — the first gets an explicit fallback, the second needs none because there is no user project to mutate. **Lines 624–626** perform the capability detection with the same both-visibilities discipline as the re-hook guards, and store the answer in the local variable both wrappers will capture.

```ruby
628   unless installer_class.method_defined?(:stripe_spm_original_run_podfile_post_install_hooks) ||
629          installer_class.private_method_defined?(:stripe_spm_original_run_podfile_post_install_hooks)
630     post_install_was_private = installer_class.private_method_defined?(:run_podfile_post_install_hooks)
631     installer_class.class_eval do
632       alias_method :stripe_spm_original_run_podfile_post_install_hooks, :run_podfile_post_install_hooks
```

**Lines 628–629** are the double-wrap guard for the post-install hook, checking both visibilities for the namespaced alias. **Line 630** records whether the original method was private *before* patching, so the patch can restore that shape afterwards. **Line 631** evaluates the block in the class-definition context; **line 632** gives the original implementation its namespaced alias (`new_name, existing_name`).

```ruby
634       define_method(:run_podfile_post_install_hooks) do
635         # The UUID guard must run before the regular hooks: it is defending
636         # against object creation *inside* react_native_post_install. Soft
637         # failure only — it pokes CocoaPods internals, and a CocoaPods
638         # release changing those must not break `pod install`.
639         begin
640           StripeSPM.ensure_uuid_counter_safe(self)
641         rescue StandardError => e
642           if defined?(Pod::UI)
643             Pod::UI.warn "[stripe-react-native] Couldn't guard the Pods project's UUID counter " \
644                          "(#{e.class}: #{e.message}). If this install leaves Pods.xcodeproj " \
645                          'unopenable by Xcode, delete ios/Pods and report the error at ' \
646                          'https://github.com/stripe/stripe-react-native/issues.'
647           end
648         end
```

**Line 634** redefines the lifecycle method — with `define_method` this time, so the body can read `post_integrate_supported` (**line 659** below). **Lines 635–638** state the placement argument for the guard: it defends against collisions caused by object creation *inside* the regular hooks, so it must run first. **Lines 639–648** wrap it in a rescue that degrades to a warning: the guard reads private CocoaPods internals (§9.4.3), and a future CocoaPods restructuring those internals must cost us the guard, not the user their install. The warning tells the user what symptom to watch for and where to report it. This is the file's one deliberate exception to the no-rescue philosophy of the previous revision, and it is scoped to exactly the code whose failure mode is "our defensive extra broke," never "your configuration is wrong."

```ruby
649         # Run the regular hooks next: react_native_post_install (called from
650         # the user's post_install block) writes the Swift package references
651         # that the integrity check and the Pods-project stage build on.
652         result = stripe_spm_original_run_podfile_post_install_hooks
653         # Deliberately not rescued: continuing past a corrupted project would
654         # only trade this message for an inscrutable Xcode failure later.
655         StripeSPM.verify_pods_project_integrity!(self)
656         StripeSPM.apply_pods_project(self)
657         # Old CocoaPods without post_integrate hooks: run the user-project
658         # stage here instead (see the lifecycle notes at the top).
659         StripeSPM.apply_user_project(self) unless post_integrate_supported
660         result
661       end
662     end
663     installer_class.send(:private, :run_podfile_post_install_hooks) if post_install_was_private
```

**Line 652** calls the aliased CocoaPods implementation with an implicit receiver and captures its return value; because the alias is private, an explicit `self.` receiver would be invalid in relevant Ruby versions. This call executes the user's `post_install`, including `react_native_post_install`. **Line 655** runs the hard integrity check the moment RN's writes are complete — and, per **lines 653–654**, it is *not* rescued: `Pod::Informative` raised by it (or by the validations inside `apply_pods_project` on **line 656**) should propagate and abort installation before a broken project reaches disk. **Line 659** is the closure at work: `post_integrate_supported` was computed once at load time on line 624, and every future call of this method consults the captured value to decide whether the user-project stage runs here (old CocoaPods) or later (everywhere else). **Line 660** preserves CocoaPods' original return contract. **Line 663** restores the method's original private visibility — `define_method` creates public methods, and `send(:private, ...)` is required because `private` is itself a private method of `Module`. Leaving the method public would work (CocoaPods calls it with an implicit receiver), but the class should not change shape as a side effect of installing Stripe.

```ruby
666   if post_integrate_supported &&
667      !installer_class.method_defined?(:stripe_spm_original_run_podfile_post_integrate_hooks) &&
668      !installer_class.private_method_defined?(:stripe_spm_original_run_podfile_post_integrate_hooks)
669     post_integrate_was_private = installer_class.private_method_defined?(:run_podfile_post_integrate_hooks)
670     installer_class.class_eval do
671       alias_method :stripe_spm_original_run_podfile_post_integrate_hooks, :run_podfile_post_integrate_hooks
672
673       define_method(:run_podfile_post_integrate_hooks) do
674         # The user's own post_integrate block (if any) runs first, ours after.
675         result = stripe_spm_original_run_podfile_post_integrate_hooks
676         StripeSPM.apply_user_project(self)
677         result
678       end
679     end
680     installer_class.send(:private, :run_podfile_post_integrate_hooks) if post_integrate_was_private
681   end
682 end
```

**Lines 666–668** guard the second wrapper the same way — plus the capability check itself: on CocoaPods without the method there is nothing to alias, and the fallback on line 659 has already taken responsibility. **Lines 669–671** repeat the visibility-capture and alias pattern. **Lines 673–678** are the whole wrapper: run CocoaPods' original implementation (which executes the Podfile's `post_integrate` block, if any — the example harness has one for test wiring, and it must run before ours), then run the user-project stage. **Line 680** restores visibility; **lines 681–682** close the guard and the `defined?` conditional. **Line 683** is the file's final newline.

Two structural asymmetries between the wrappers are worth pausing on. First, only the post-install wrapper carries validation and guards; the post-integrate wrapper is deliberately thin, because everything it calls is idempotent mutation with its own error behavior. Second, the two double-wrap guards are independent rather than one combined check: a hypothetical earlier load that hooked only post-install (say, an older helper revision in the same process) still gets the post-integrate wrapper from this load.

### 9.13 Complete source-line accounting

| Lines | Meaning | Explained in |
|---:|---|---|
| 1–110 | Purpose, two-stage architecture, lifecycle, modes | §9.1 |
| 111 | Separator | before the module |
| 112–142 | Namespace, URLs, pod/product/subspec constants | §9.2 |
| 143–201 | Phase identity and shell embed program | §9.10.1–§9.10.2 |
| 202 | Separator | between §9.10 source blocks and §9.3 |
| 203–233 | Module methods, activation state, requirement selection | §9.3 |
| 234 | Separator | before §9.4 |
| 235–275 | Stage orchestrators (`apply_pods_project`, `apply_user_project`) | §9.4.1–§9.4.2 |
| 276–352 | Separator and UUID-counter guard | §9.4.3 |
| 353–392 | Separator and rootObject integrity check | §9.4.4 |
| 393–394 | Separator and private visibility | §9.5 |
| 395–399 | Separator and branch override | §9.6 |
| 400–438 | Separator and linkage validation | §9.7 |
| 439–463 | Separator and package lookup | §9.8 |
| 464–495 | Separator and Onramp linking | §9.9 |
| 496–558 | Separator, embed-phase add/remove/traversal | §9.10.3–§9.10.5 |
| 559–592 | Namespace closure and podspec-facing functions | §9.11 |
| 593–683 | Separator and the two installer wrappers | §9.12 |

### Chapter summary

- The file is both a library and a load-time plugin: it exposes a small podspec DSL, stores per-install activation state, and wraps two CocoaPods lifecycle methods exactly once each.
- Work is split by project and time: Pods-project mutations run at post-install (the project's single chance before its write); user-project mutations run at post-integrate, after CocoaPods has integrated and saved the app's project, with a post-install fallback for CocoaPods < 1.10.
- The Pods project's deterministic UUID counter is raised past every existing counter-format object before any hook can create package objects, and the rootObject mapping is hard-verified afterwards — preventing, then detecting, the RN ≤ 0.87 `spm_dependency` corruption.
- Validation is based on CocoaPods' actual target model and occurs before mutation. Guards that poke CocoaPods internals degrade to warnings; guards that protect the user's project from destruction raise.
- Onramp conditionality is reconstructed from resolved subspecs and represented as a normal Xcode package-product object.
- Runtime embedding is narrowly scoped, linkage-aware, archive-aware, signing-aware, idempotent, updateable, and removable.
- Persistent user projects are saved only when their contents actually change — and are saved by our own code, because CocoaPods has already performed its save by post-integrate time.

### Review questions

1. Why does the Pods-project stage locate both a `Pod::PodTarget` and a `PBXNativeTarget`? What distinct information comes from each?
2. Why does `find_package_reference!` validate RN's output instead of simply creating a missing reference?
3. Walk through the embed script when Xcode produced only static Stripe frameworks. Which exact line prevents them entering the app bundle?
4. A user runs once in SPM mode, sets `$StripeDisableSPM = true`, and runs `pod install` again. Which generated state disappears automatically, which persistent state does the helper actively remove, and *at which lifecycle hook* does that removal now run?
5. Why must the post-install wrapper call the aliased CocoaPods method before `verify_pods_project_integrity!` and `apply_pods_project`, and why does it return the captured `result`?
6. State why `ensure_uuid_counter_safe` must run *before* the regular post-install hooks while `verify_pods_project_integrity!` runs *after* them, and why the first is rescued while the second raises.
7. The wrappers are defined with `define_method` instead of `def`. What specific value could the wrapper bodies not otherwise read, and when is it computed versus consulted?
8. Suppose an app's `.xcodeproj` is fresh from `expo prebuild --clean`. Explain why the embed phase still ends up ordered after `[CP] Embed Pods Frameworks`, and what would instead happen under the old CocoaPods (< 1.10) fallback.

---

## Chapter 10. The complete lifecycle, end to end

Chapters 7–9 examined each layer in isolation. This chapter recomposes them in time order. The distinction matters: most objects used late in the process do not exist early, and several values that look like configuration are really messages passed between lifecycle stages.

### 10.1 Two graphs, two lock mechanisms, one application

In SPM mode the workspace contains two dependency graphs managed by different systems:

```text
CocoaPods graph                                  Xcode/SPM graph
---------------                                  ---------------
ReactTestApp                                     stripe-ios-spm @ 26.7.0
    └── stripe-react-native                          ├── Stripe
          ├── React-Core                             ├── StripePaymentSheet
          └── other RN pods                          ├── StripePayments
                                                    ├── StripePaymentsUI
Podfile.lock records this side.                     ├── StripeApplePay
                                                    ├── StripeFinancialConnections
                                                    └── StripeCryptoOnramp (only if selected)

                                                 Package.resolved records this side.
```

The graph boundary is the `stripe-react-native` Xcode target. CocoaPods creates and configures that target; Xcode attaches SPM products to it. The absence of `Stripe*` entries from `Podfile.lock` is therefore evidence of correct SPM mode, not evidence that Stripe disappeared. Conversely, a `Package.resolved` entry does not replace the local wrapper pod's entry in `Podfile.lock`.

### 10.2 Default SPM install: Podfile evaluation

An ordinary React Native Podfile first loads React Native's CocoaPods helpers. In RN 0.75 and newer this has three consequences relevant here:

1. `Pod::Installer` and the CocoaPods DSL exist.
2. The top-level `spm_dependency` function exists.
3. The process-wide RN `SPMManager` exists and is empty.

The application must also request dynamic frameworks, usually with:

```ruby
use_frameworks! :linkage => :dynamic
```

This line sets CocoaPods policy; it does not itself enable Stripe's SPM mode. Likewise, SPM mode does not secretly call `use_frameworks!` on the application's behalf. The application owns an app-wide linkage decision because changing it can affect every pod (§13.14.1).

React Native's autolinker scans npm dependencies and adds `stripe-react-native` as a path-based development pod. At this instant CocoaPods knows where the podspec is, but has not generated `Pods.xcodeproj`.

### 10.3 Default SPM install: podspec evaluation

CocoaPods executes `stripe-react-native.podspec` in that same Ruby process:

1. `require_relative 'stripe_spm'` loads Chapter 9's file. The module and top-level helpers are defined. Because `Pod::Installer` already exists and the alias guard passes, the lifecycle wrapper is installed.
2. `stripe_spm_enabled?` sees that `spm_dependency` exists and that `$StripeDisableSPM` is not true, so it returns true.
3. `stripe_spm_activate!(s, version: '26.7.0')` stores `@version` and asks RN's `SPMManager` to record the package declaration under the root spec name `stripe-react-native`.
4. The Core `unless stripe_spm_enabled?` block is skipped, so none of the six `Stripe*` pod dependencies enter CocoaPods' graph.
5. If Onramp is selected, its fallback block is also skipped. Selection is still visible through `pod_target.specs` later.

At the end of podspec evaluation there is still no package reference in any `.xcodeproj`. The state is only:

```text
StripeSPM module:        @version = "26.7.0"
RN SPMManager:           "stripe-react-native" -> one package declaration
CocoaPods dependency set: wrapper + React Native dependencies; no Stripe iOS pods
```

This intermediate state explains why activation and application are separate functions.

### 10.4 Default SPM install: dependency analysis and target generation

CocoaPods resolves its graph, chooses versions for pods, downloads what is not local, and constructs target models. Since the Podfile requested dynamic frameworks:

```ruby
pod_target.build_as_dynamic_framework? # => true
```

It then creates an in-memory `Pods.xcodeproj`. Among its targets is a dynamic framework target labeled `stripe-react-native`. At first this target contains the wrapper's sources and CocoaPods dependencies but no package objects; those arrive during post-install.

This is the earliest time at which code can sensibly attach `XCSwiftPackageProductDependency` objects: the target now exists. It is also the earliest time the helper can validate actual linkage rather than infer intent from Podfile text.

### 10.5 Default SPM install: nested hook ordering

CocoaPods calls the method named `run_podfile_post_install_hooks`. Because Chapter 9 wrapped it, the call stack is:

```text
Stripe's replacement run_podfile_post_install_hooks
│
├─ StripeSPM.ensure_uuid_counter_safe(installer)   [rescued → warning]
│    └─ raise the Pods project's UUID counter past every
│       existing counter-format object, BEFORE anyone mints UUIDs
│
├─ call aliased original CocoaPods method
│    │
│    └─ execute the application's post_install block
│         │
│         └─ react_native_post_install(installer)
│              │
│              └─ RN SPMManager.apply_on_post_install
│                   ├─ remove old remote package references
│                   ├─ add XCRemoteSwiftPackageReference      (project.new!)
│                   ├─ attach six Core product dependencies   (project.new!)
│                   └─ add SWIFT_INCLUDE_PATHS to wrapper target
│
├─ StripeSPM.verify_pods_project_integrity!(installer)  [raises on corruption]
│
└─ StripeSPM.apply_pods_project(installer)
     ├─ locate CocoaPods pod target
     ├─ validate dynamic framework
     ├─ locate RN-created package reference
     └─ attach StripeCryptoOnramp if selected     (project.new — post-guard)
```

Note what is *absent*: the embed phase. CocoaPods next writes `Pods.xcodeproj` to disk, runs `integrate_user_project` (adding its own `[CP]` phases to the app target and saving the app's project), and only then calls the second wrapped method:

```text
Stripe's replacement run_podfile_post_integrate_hooks
│
├─ call aliased original CocoaPods method
│    └─ execute the application's post_integrate block (if any)
│
└─ StripeSPM.apply_user_project(installer)
     └─ create/update the app embed phase, saving the app project itself
```

This ordering satisfies six dependencies:

- The Pods project's UUID counter is safe before RN (or Stripe) creates any project object — the `project.new!` markers above are exactly the calls the guard protects.
- The Pods native target exists before RN attaches products.
- RN's recorded declaration exists because the podspec already ran.
- RN's package reference exists before Stripe searches for it.
- Stripe runs after RN's broad cleanup of package references, so Stripe's addition is not immediately removed.
- The app target's `[CP]` phases exist — and the app project has been saved by CocoaPods — before Stripe appends its embed phase, so the phase lands in a stable position even on a project that has never been integrated before (an `expo prebuild --clean` output).

If the application's `post_install` block omits `react_native_post_install`, the fourth condition fails. `find_package_reference!` converts that structural absence into a specific install error.

### 10.6 What is serialized at the end of `pod install`

After successful hooks, CocoaPods writes generated project state. Conceptually, the relevant portion of `Pods.xcodeproj/project.pbxproj` is:

```text
PBXProject
└── packageReferences
    └── XCRemoteSwiftPackageReference
        ├── repositoryURL = https://github.com/stripe/stripe-ios-spm.git
        └── requirement = exactVersion 26.7.0

PBXNativeTarget "stripe-react-native"
└── packageProductDependencies
    ├── Stripe
    ├── StripePaymentSheet
    ├── StripePayments
    ├── StripePaymentsUI
    ├── StripeApplePay
    ├── StripeFinancialConnections
    └── StripeCryptoOnramp       (only when Onramp was resolved)
```

Separately, the user's persistent application target has a `PBXShellScriptBuildPhase` named `[stripe-react-native] Embed SPM Frameworks` — added during the post-integrate stage, *after* CocoaPods wrote the Pods project and saved the app project, which is why the helper saves the user project itself when it changed. Repeating the same install finds matching objects/phase and produces the same end state.

There is no consumer `Package.swift`, no generated Stripe pod target, and no manual package dependency on the application target.

### 10.7 The first Xcode build: resolution

Opening or building the workspace makes Xcode observe the remote package reference. Xcode then:

1. Contacts `stripe-ios-spm` and resolves the requirement to tag `26.7.0`.
2. Checks out package sources into its package/DerivedData caches.
3. Reads *stripe-ios's* `Package.swift` to discover package targets, products, resources, platform requirements, and transitive dependencies.
4. Records the resolution in the workspace's `Package.resolved` representation.

An exact requirement and a resolved lock entry serve related but different purposes. The requirement says the only acceptable semantic version. The lock entry records the concrete source identity/revision Xcode selected. If the tag moves—which well-behaved release tags must not—source-control identity still matters.

### 10.8 The Xcode build: compile, link, embed, load

It helps to follow the four stages separately:

**Compile.** Xcode builds the needed stripe-ios package targets. RN's `SWIFT_INCLUDE_PATHS` adjustment lets the wrapper compiler find the resulting Swift modules, so imports such as `import StripePaymentSheet` type-check.

**Link the wrapper.** CocoaPods configured `stripe-react-native` as a dynamic framework. Its link invocation receives the attached package products. Xcode can statically absorb some automatic-linkage product code into the wrapper and/or record dependencies on dynamic Stripe frameworks.

**Link the app.** The application links the wrapper dynamic framework through normal CocoaPods integration. A successful link proves that symbol definitions were available at each link boundary; it does not prove that every runtime dylib is inside the bundle.

**Embed.** The custom app build phase scans Xcode's package output locations. It copies only dynamic `Stripe*.framework` bundles that are not already present, strips development metadata from the copies, and signs when required.

**Load.** At launch, `dyld` loads the app, the wrapper, and any recorded Stripe dylibs from the app's `Frameworks` directory. stripe-ios also locates its SPM-generated resource bundles through package resource logic such as `Bundle.module`. A runtime smoke test therefore establishes more than a successful compile: it exercises loading and resources.

### 10.9 Explicit fallback on RN 0.75 or newer

Now put the following before dependency evaluation in the Podfile:

```ruby
$StripeDisableSPM = true
```

The lifecycle changes at the podspec branch:

1. `stripe_spm.rb` still loads and its installer wrapper still exists.
2. `stripe_spm_enabled?` returns false because the global is exactly true.
3. `stripe_spm_activate!` does not run, so `StripeSPM.active?` remains false and RN records no Stripe package declaration.
4. The six Core pods enter CocoaPods' dependency graph. `StripeCryptoOnramp` enters only if Onramp is selected.
5. CocoaPods resolves version `26.7.0` of those pods from trunk and generates targets for their full transitive pod graph.
6. During the post-install stage the wrapper finds the pod target, sees inactive mode, and returns without touching the Pods project (the UUID guard still ran — it is cheap insurance for any other `spm_dependency` library in the same install). Later, during the post-integrate stage, `apply_user_project` removes any old named embed phase from application targets.

The result is the pre-migration dependency topology. CocoaPods' normal xcconfigs and embed phases own compilation, linking, and packaging. SPM contributes nothing. The application may keep dynamic frameworks for unrelated reasons, but the example harness deliberately returns to RN's static default in fallback mode so CI covers the most common legacy configuration.

### 10.10 Automatic fallback on RN below 0.75

Old React Native does not define `spm_dependency`. The first guard in `stripe_spm_enabled?` therefore returns false without requiring a parsed version number. Otherwise the fallback sequence is identical to §10.9.

This is an example of **progressive enhancement**: newer hosts that expose a capability get the new path; older hosts continue using a complete preexisting path. There is no attempt to backport RN's Xcode-project bridge into this library.

The fallback's temporal limit is important. It can resolve only stripe-ios releases that exist in CocoaPods trunk. The registry becoming read-only does not delete 26.7.0, but a future version never published there cannot be invented by these dependency lines.

### 10.11 Maintainer branch-override mode

Suppose CI sets:

```sh
OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH=my-feature-branch
```

SPM is still active, but two declaration fields change atomically:

```text
normal:    stripe-ios-spm.git + { kind: exactVersion, version: 26.7.0 }
override:  stripe-ios.git     + { kind: branch, branch: my-feature-branch }
```

All product, linkage, Onramp, and embedding behavior stays identical. This makes the test representative of the future package graph while allowing unpublished native work. The full repository is necessary because the release mirror carries tags, not development branches.

The variable does nothing useful in fallback mode: the podspec still asks CocoaPods for the exact `stripe_version`. CI therefore uses it only with SPM enabled.

### 10.12 Transition behavior across repeated installs

Consider an application's history rather than a clean snapshot:

| Install | Selected mode | Generated `Pods.xcodeproj` | Persistent app project |
|---:|---|---|---|
| 1 | fallback | Stripe pod targets | no Stripe SPM phase |
| 2 | SPM | package reference + product dependencies | phase created |
| 3 | SPM, newer helper script | regenerated package objects | same phase updated in place |
| 4 | fallback | Stripe pod targets again | phase removed |
| 5 | fallback | regenerated pod targets | already absent; project not saved |

This table explains why different idempotence mechanisms exist:

- Generated package objects are recreated during every install; RN's find-or-create logic prevents duplicates within one generated graph.
- The Onramp product is find-or-created because Stripe extends that same generated graph.
- The app phase is found by name and compared by content because it survives across installs and SDK upgrades.
- Cleanup is explicit because regeneration cannot touch the app's project.

The NewArch header-glob fix in §7.7 addresses another transition effect: old sandbox symlinks can outlive removal of pod dependencies long enough to be observed during the same migration install. A clean CI checkout tests a destination; an upgrade test exercises history.

### 10.13 Observable invariants for a correct installation

An engineer inspecting a built workspace can test the design without trusting its prose.

In **SPM mode**, all of the following should be true:

- `stripe-react-native` remains a development pod in `Podfile.lock`.
- Underlying `Stripe*` native SDK pods are absent from `PODS`, `DEPENDENCIES`, and `SPEC REPOS` in that lockfile.
- `Pods.xcodeproj` has one remote reference to the selected Stripe repository and requirement.
- The wrapper native target has all six Core products, plus `StripeCryptoOnramp` exactly when the Onramp subspec is selected.
- CocoaPods reports the wrapper as a dynamic framework.
- Each consuming application target has exactly one current embed phase.
- A built application contains every dynamic Stripe framework that `dyld` requires, but contains no statically linked Stripe framework bundle.

In **fallback mode**:

- `Podfile.lock` contains the exact-version Stripe pod graph.
- No Stripe remote package reference/product dependency is required in `Pods.xcodeproj`.
- No named Stripe SPM embed phase remains in the application project.
- The app can use CocoaPods' usual static-library configuration.

### Chapter summary

- SPM mode deliberately splits ownership: CocoaPods owns the wrapper target; Xcode owns stripe-ios's package graph; the dynamic wrapper target is their link boundary.
- `pod install` is a staged transformation from Ruby declarations, to resolved pod models, to Xcode project objects, to persistent user-project integration.
- A later Xcode build performs package resolution, compilation, linkage, embedding, and runtime loading as separate stages.
- Fallback mode is a complete alternate graph, not SPM mode with one feature disabled.
- Repeated and transitional installs are part of the correctness model, not an afterthought.

### Review questions

1. At the moment `stripe_spm_activate!` returns, which state exists in memory and which Xcode objects do not yet exist?
2. Why is `Podfile.lock` unable to lock the stripe-ios source in SPM mode? What artifact owns that responsibility?
3. Put these operations in order: attach Onramp, evaluate the podspec, create the wrapper native target, run RN's SPM apply step, resolve the remote Git tag.
4. What additional property does a successful app launch prove beyond a successful application link?
5. Why does switching from SPM to fallback require active cleanup even though `Pods.xcodeproj` is regenerated?

---

## Chapter 11. The example application and test harness, line by line

The shipped integration ends with `stripe_spm.rb` and the podspec. The repository must still prove that integration works, so `example/ios/Podfile` configures a deliberately demanding test environment: two RN architectures, two native-dependency modes, prebuilt and source-built RN components, an optional Stripe subspec, native unit tests, and runtime end-to-end tests.

> **Scope warning.** This chapter explains repository test infrastructure. A consumer should take only the documented `use_frameworks! :linkage => :dynamic` requirement (or the fallback global) from it. The DevSupport linker flags, generated-project edits, and test module maps repair properties of `react-native-test-app`; they are not normal Stripe installation steps.

### 11.1 Locate and load `react-native-test-app` (lines 1–17)

```ruby
1   # Podfile for the example app, which doubles as the SDK's iOS test harness.
2   # The app itself is generated by react-native-test-app (see
3   # https://github.com/microsoft/react-native-test-app); this file mostly
4   # configures how the stripe-react-native pod and its Stripe iOS SDK
5   # dependency are resolved, and wires the SDK's native unit tests into the
6   # generated project.
7
```

**Lines 1–6** establish ownership. `react-native-test-app` (RNTA) generates a host application around a library so maintainers do not need to keep a full native example project by hand. This means `ReactTestApp.xcodeproj` is disposable generated state, even though it is technically a user project from CocoaPods' perspective. **Line 7** separates the file introduction from bootstrapping.

```ruby
8   # Locate react-native-test-app's Podfile helper by walking up from this
9   # directory until we find a node_modules that contains it (handles hoisted
10  # and non-hoisted installs).
11  ws_dir = Pathname.new(__dir__)
12  ws_dir = ws_dir.parent until
13    File.exist?("#{ws_dir}/node_modules/react-native-test-app/test_app.rb") ||
14    ws_dir.expand_path.to_s == '/'
15  require "#{ws_dir}/node_modules/react-native-test-app/test_app.rb"
16
17  workspace 'example.xcworkspace'
```

**Lines 8–10** describe a package-manager layout problem. Yarn may put RNTA in `example/node_modules` or hoist it to the repository's root `node_modules`; hard-coding either location would make the other fail.

**Line 11** starts with the directory containing this Podfile (`example/ios`) as a `Pathname`, which provides path-aware operations such as `.parent` and `.expand_path`. **Lines 12–14** repeatedly replace it with its parent until either the desired Ruby helper exists or traversal has reached filesystem root. The `||` prevents an infinite walk when dependencies are missing. **Line 15** executes the discovered helper, importing RNTA's Podfile DSL including `use_test_app!`. If no helper was found, it fails clearly at the constructed root path rather than looping forever. **Line 16** separates setup. **Line 17** asks CocoaPods to integrate projects into the named workspace.

### 11.2 Select dependency mode and architecture (lines 19–33)

```ruby
19  # By default the Stripe iOS SDK is resolved through Swift Package Manager
20  # (see stripe_spm.rb at the repo root). Set STRIPE_DISABLE_SPM=1 to exercise
21  # the CocoaPods fallback path instead — useful for verifying that apps which
22  # opt out (or that run React Native < 0.75) still build.
23  disable_spm = ENV['STRIPE_DISABLE_SPM'] == '1'
24  $StripeDisableSPM = true if disable_spm
```

**Lines 19–22** distinguish the repository convenience variable from the public API. Maintainers launch a fallback install with `STRIPE_DISABLE_SPM=1`; consumers write the Ruby global. **Line 23** parses only the exact string `1` as enabled, producing a Boolean local. **Line 24** translates it into the global that the shipped podspec reads. It is set before `use_test_app!` declares and evaluates the local pod.

```ruby
26  # SPM resolution requires dynamic frameworks: the Stripe Swift package
27  # products use automatic linkage, which only reaches the final app correctly
28  # when the pod that consumes them is a dynamic framework (stripe_spm.rb
29  # enforces this with an actionable error). The CocoaPods fallback keeps
30  # React Native's default static libraries.
31  use_frameworks! :linkage => :dynamic unless disable_spm
```

**Lines 26–30** connect the harness switch to Chapter 3's link model. **Line 31** selects dynamic frameworks only for SPM runs. In fallback runs it makes no `use_frameworks!` call, so CocoaPods retains static libraries. This creates meaningful coverage of both topologies instead of testing two acquisition modes under the same linkage.

```ruby
33  new_arch_enabled = ENV['NEW_ARCH_ENABLED'].nil? ? true : ENV['NEW_ARCH_ENABLED'] == 'true'
```

**Line 33** parses the architecture switch. Absence defaults to new architecture. Otherwise, only the exact lowercase string `true` enables it. The resulting local controls RNTA options, prebuilt selection, and a conditional Swift compilation flag later. This architecture choice is independent of SPM mode: CI intentionally tests both architectures in SPM mode.

The four logical combinations are:

| `new_arch_enabled` | `disable_spm` | Stripe acquisition | Pod linkage |
|---:|---:|---|---|
| true | false | SPM | dynamic frameworks |
| false | false | SPM | dynamic frameworks |
| true | true | CocoaPods | static libraries |
| false | true | CocoaPods | static libraries |

CI continuously exercises the first three relevant paths; the fourth follows the same fallback mechanism but is not a separate job.

### 11.3 Choose React Native's prebuilt components (lines 35–62)

React Native 0.81 offers two independent prebuilt mechanisms. Their similarly named environment variables make it easy to treat them as one feature; the CI failures on this branch proved they are not.

```ruby
35  # React Native ships two independent prebuilt mechanisms, and this example
36  # uses them selectively:
37  #
38  # - RCT_USE_RN_DEP (prebuilt third-party dependencies: folly, glog, fmt,
39  #   boost, ... delivered as ReactNativeDependencies.xcframework) is used on
40  #   BOTH architectures. Building these from source is not viable under newer
41  #   Xcodes — e.g. the pinned fmt fails to compile with Xcode 26's Clang
42  #   (consteval errors) — and as a vendored framework its linkage propagates
43  #   to dependent pods through standard CocoaPods behavior.
```

**Lines 35–43** describe `RCT_USE_RN_DEP`. Folly, glog, fmt, and Boost are C/C++ infrastructure used by RN. The prebuilt `ReactNativeDependencies.xcframework` avoids recompiling their pinned sources with a newer compiler that may reject them. An **XCFramework** is a bundle containing compatible library slices for several Apple platforms/architectures. Because CocoaPods models this as a vendored framework, normal pod dependency settings propagate its linkage.

```ruby
45  # - RCT_USE_PREBUILT_RNCORE (prebuilt React core, React.xcframework via the
46  #   React-Core-prebuilt pod) is used everywhere EXCEPT old-arch dynamic-
47  #   frameworks builds. The prebuilt core only wires framework linkage through
48  #   the new-architecture dependency path, so with dynamic frameworks old-arch
49  #   pods (e.g. react-native-safe-area-context) compile against prebuilt React
50  #   headers but never link the framework, failing with undefined RCT*
51  #   symbols. Static builds (the fallback mode) don't per-pod link, so the
52  #   prebuilt core is fine there on either architecture.
```

**Lines 45–52** describe `RCT_USE_PREBUILT_RNCORE`, which substitutes `React.xcframework` for source-built React core. In old architecture under dynamic linkage, some pod targets receive headers but not a link edge to this framework. Compilation succeeds, then those pod frameworks fail their own link on `RCT*` symbols. Static fallback delays all symbol resolution to the app link, where the missing per-pod edge is masked. Thus only the old-architecture/dynamic combination must source-build RN core.

Standalone comment lines **44 and 53** separate the two prebuilt mechanisms and the following old-architecture/Hermes discussion. They are documentation spacing, not empty Ruby statements.

```ruby
54  # Old-arch + dynamic frameworks (i.e. old arch + SPM mode) additionally needs
55  # react-native-test-app's DevSupport pod force-linked against hermes — see
56  # the :post_install lambda below for the full story. With that fix in place,
57  # CI runs the old-arch iOS jobs in SPM mode like the new-arch ones; the
58  # CocoaPods fallback path is covered by a dedicated build-only job instead
59  # (build-ios-fallback in bitrise.yml).
60  use_prebuilt_rncore = new_arch_enabled || disable_spm
61  ENV['RCT_USE_RN_DEP'] = '1'
62  ENV['RCT_USE_PREBUILT_RNCORE'] = '1' if use_prebuilt_rncore
```

**Lines 54–59** preview the one remaining harness link repair and the CI division of labor. **Line 60** encodes the matrix compactly: the expression is false only when both operands are false—that is, old architecture plus SPM/dynamic mode. **Line 61** always enables prebuilt third-party dependencies. **Line 62** enables prebuilt RN core for new architecture or static fallback and leaves it unset for old-architecture SPM.

This separation is a useful debugging lesson. Disabling all prebuilts fixed one missing-link edge but exposed unrelated source-compatibility errors. Change the narrowest independent mechanism supported by evidence.

### 11.4 Configure RNTA and repair DevSupport linkage (lines 64–117)

#### 11.4.1 The options hash and the root cause (lines 64–97)

```ruby
64  options = {
65    :bridgeless_enabled => new_arch_enabled,
66    :fabric_enabled =>  new_arch_enabled,
67    :hermes_enabled => true,
68    # react-native-test-app runs this lambda from its own post_install hook.
69    :post_install => lambda do |installer|
```

**Line 64** begins a Ruby hash passed into RNTA. **Lines 65–66** tie the bridgeless runtime and Fabric renderer to the same architecture Boolean. The double space after `=>` on line 66 is cosmetic. **Line 67** always selects Hermes as the JavaScript engine. **Line 68** names callback ownership. **Line 69** stores a lambda that RNTA will invoke from its own normal `post_install` path with the active CocoaPods installer.

```ruby
70    # Dynamic-frameworks builds (SPM mode) make every pod framework resolve
71    # its own symbols at link time, and react-native-test-app's DevSupport
72    # pod under-declares its dependencies for that. Which `-framework` flags
73    # it is missing depends on the configuration:
74    #
75    # - Fallback/static mode (disable_spm): skipped entirely. Static
76    #   libraries don't link per-pod — all symbols resolve at the final app
77    #   link — and force-linking framework names that aren't built in this
78    #   mode would itself break the build.
```

**Lines 70–78** identify the failing target before prescribing flags. `ReactTestApp-DevSupport` owns C++ references but does not declare every binary that defines them. Dynamic frameworks expose the omission at that target's link. Adding `-framework` flags in fallback would be wrong because those named framework products may not exist when pods are static libraries.

```ruby
80    # - New-arch prebuilt-core mode (use_prebuilt_rncore): the prebuilt React
81    #   core only wires framework linkage through the new-architecture
82    #   dependency path, which DevSupport isn't on, so it needs the whole
83    #   prebuilt set: React, ReactNativeDependencies, and hermes.
```

**Lines 80–83** define the new-architecture repair. DevSupport is not on the dependency path that propagates all three prebuilt frameworks, so its own link command must name `React`, `ReactNativeDependencies`, and `hermes`.

Standalone comment lines **79 and 84** visually divide the fallback, new-architecture, and old-architecture cases in this three-way explanation.

```ruby
85    # - Old-arch SPM mode (dynamic frameworks + source-built React core):
86    #   CocoaPods links the React frameworks into DevSupport through normal
87    #   pod dependencies, but hermes is still missing. DevSupport's own C++
88    #   references JSI, and with Hermes enabled React Native excludes jsi.cpp
89    #   from React-jsi — the facebook::jsi::* symbol definitions live inside
90    #   hermes-engine's prebuilt dylib, per the One Definition Rule comment
91    #   in React-jsi.podspec — yet DevSupport declares React-jsi, not
92    #   hermes-engine, so nothing links that dylib. Only the `-framework`
93    #   flag is missing; the framework search path already arrives
94    #   transitively (DevSupport -> React-jsi -> hermes-engine).
```

**Lines 85–94** explain the old-architecture failure at symbol-owner level. JSI (JavaScript Interface) is RN's C++ abstraction over JavaScript engines. With Hermes selected, RN excludes one normal source definition to obey the **One Definition Rule**—a C++ program must not contain competing definitions of the same entity—because Hermes supplies those `facebook::jsi` definitions. DevSupport declares enough dependency to find headers and framework search paths, but its link command does not name Hermes. The missing item is exactly one `-framework hermes` pair.

```ruby
95    next if disable_spm
96
97    frameworks = use_prebuilt_rncore ? ['React', 'ReactNativeDependencies', 'hermes'] : ['hermes']
```

**Line 95** returns early from the lambda in static fallback. In a lambda, `next` ends this invocation rather than exiting the surrounding Podfile evaluation. **Line 96** separates policy from implementation. **Line 97** selects three framework names for new/prebuilt core or only Hermes for old/source-built core.

#### 11.4.2 Rewrite generated xcconfigs idempotently (lines 99–117)

An **xcconfig** is a text file of Xcode build-setting assignments. CocoaPods generates one or more for each target/configuration. `OTHER_LDFLAGS` contains extra arguments given to the linker; `-framework "Foo"` instructs it to link `Foo.framework` found on existing framework search paths.

```ruby
99    # Append the missing `-framework` flags to DevSupport's generated
100   # xcconfigs.
101   Dir.glob("#{installer.sandbox.root}/Target Support Files/ReactTestApp-DevSupport/*.xcconfig").each do |path|
```

**Lines 99–100** state the narrow mutation. **Line 101** obtains CocoaPods' sandbox root (normally `Pods`), expands every DevSupport xcconfig path (for Debug, Release, and any additional configurations), sorts in filesystem/glob order, and processes each path.

```ruby
102     lines = File.readlines(path, chomp: true)
103     index = lines.index { |line| line.start_with?('OTHER_LDFLAGS =') }
104     values = index ? lines[index].split(' = ', 2).last.split(' ') : ['$(inherited)']
```

**Line 102** reads the file as an array with newline terminators removed. **Line 103** locates the first canonical assignment and keeps its zero-based index or `nil`. In Ruby, index `0` is truthy, unlike in C. **Line 104** either parses the right-hand side—split once around ` = `, then into whitespace-delimited tokens—or initializes a new setting with `$(inherited)`. That token preserves flags supplied by parent xcconfigs.

```ruby
105     frameworks.each do |framework|
106       quoted_framework = "\"#{framework}\""
107       next if values.include?(quoted_framework)
108
109       values << '-framework'
110       values << quoted_framework
111     end
```

**Line 105** loops over the selected names. **Line 106** creates a token that includes literal double quotes, such as `"hermes"`, matching CocoaPods' generated xcconfig style. **Line 107** makes the edit idempotent by skipping a framework name already present. **Lines 109–110** append the linker option and its argument as adjacent tokens. **Line 111** closes the loop.

```ruby
112     line = "OTHER_LDFLAGS = #{values.join(' ')}"
113     index ? lines[index] = line : lines << line
114     File.write(path, "#{lines.join("\n")}\n")
115   end
116 end,
117 }
```

**Line 112** reconstructs one normalized assignment. **Line 113** replaces the existing indexed line or appends a new one. The ternary is safe because `0` is truthy in Ruby. **Line 114** rewrites the generated file and restores a final newline. **Line 115** closes the file loop. **Line 116** closes the lambda and includes a comma because it is a hash value. **Line 117** closes `options`.

Directly editing generated xcconfigs would be poor application architecture, but it is appropriate for a regenerated test harness with a precisely diagnosed upstream dependency omission. Every pod install reapplies it.

### 11.5 Declare the app, wrapper, Onramp, and test target (lines 119–129)

```ruby
119 use_test_app! options do |_target|
120   pod 'stripe-react-native', path: '../node_modules/@stripe/stripe-react-native'
121   pod 'stripe-react-native/Onramp', path: '../node_modules/@stripe/stripe-react-native'
```

**Line 119** invokes RNTA's main Podfile helper with the completed options and yields a target DSL object. The underscore prefix convention says the name is local/implementation-oriented; it is still used below. **Line 120** declares the root development pod from the example's installed npm package. **Line 121** explicitly selects the optional Onramp subspec from the same path. This guarantees CI exercises Chapter 9's conditional product attachment, not merely Core.

```ruby
123   # Declares the ReactTestAppTests target so CocoaPods integrates it (search
124   # paths etc.); its test sources are added in post_integrate below. The
125   # SDK's podspec test_spec isn't used here because test specs build inside
126   # the Pods project, where the SPM-resolved Stripe modules aren't visible to
127   # a separate test target the way they are to an app-level one.
128   _target.tests
129 end
```

**Lines 123–127** explain why the old podspec test-spec route is no longer the harness's execution route. The podspec may still define `Tests` for metadata/compatibility, but a separate generated test target inside `Pods.xcodeproj` does not automatically inherit the wrapper target's package-product/module wiring. An app-level XCTest target can be wired explicitly. **Line 128** asks RNTA to generate and integrate `ReactTestAppTests`; **line 129** closes the app declaration.

### 11.6 Reopen the generated application project (lines 131–148)

The remaining code runs in CocoaPods' `post_integrate` hook, after project generation and workspace integration. This is later than `post_install`: it is the appropriate point to reopen RNTA's fully written project and add test sources.

```ruby
131 # post_integrate runs after CocoaPods has written its projects and hooked
132 # them into the workspace. react-native-test-app regenerates
133 # ReactTestApp.xcodeproj under node_modules/.generated on every pod install,
134 # so every adjustment here must be (re)applied on each run.
135 post_integrate do |_installer|
```

**Lines 131–134** define timing and lifetime. Although this code saves an `.xcodeproj`, that project is RNTA-generated and intentionally recreated. **Line 135** registers the hook; its installer parameter is unused and prefixed `_` accordingly.

```ruby
136   project_path = "#{ws_dir}/node_modules/.generated/ios/ReactTestApp.xcodeproj"
137   project = Xcodeproj::Project.open(project_path)
138   test_target = project.targets.find { |target| target.name == 'ReactTestAppTests' }
139   app_target = project.targets.find { |target| target.name == 'ReactTestApp' }
```

**Line 136** builds the generated project's path relative to the workspace root discovered in §11.1. **Line 137** parses its `.pbxproj` into Xcodeproj's object graph. **Lines 138–139** obtain the native XCTest and app targets by exact name. The harness assumes RNTA generated them; a missing test target would fail on later dereference and correctly reveal a broken harness contract.

```ruby
141   # The SDK's public headers import React headers non-modularly; when the
142   # workspace builds with dynamic frameworks those imports land inside
143   # framework modules and Xcode rejects them without this setting.
144   [app_target, test_target].compact.each do |target|
145     target.build_configurations.each do |config|
146       config.build_settings['CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES'] = 'YES'
147     end
148   end
```

**Lines 141–143** describe a Clang modules rule. A framework module normally may not expose textual includes of headers outside a proper module; legacy React headers do so. Dynamic-framework packaging makes this rule visible. **Line 144** builds a two-target array, removes any `nil` value defensively with `compact`, and iterates. **Line 145** visits every configuration. **Line 146** relaxes the rule for this harness. **Lines 147–148** close the loops.

### 11.7 Put repository tests in the app test target and expose SPM modules (lines 150–203)

This is the second module-visibility problem promised in §8.4. RN repaired visibility for the wrapper target. The app-level test target imports Stripe modules directly and sees the wrapper's generated Swift interface, so it needs its own wiring.

#### 11.7.1 Add source references idempotently (lines 150–167)

```ruby
150   # The SDK's native unit tests live in the repo (ios/Tests), not in the
151   # generated test app; add them to the ReactTestAppTests target by reference
152   # so `xcodebuild test -scheme ReactTestApp` runs them.
153   # (Note: app.json's `"singleApp"` mode — launching directly into the example
154   # component, no picker navigation — is preserved; an earlier prototype
155   # stripped -DENABLE_SINGLE_APP_MODE here, which put a spurious back button
156   # on the home screen.)
```

**Lines 150–152** state the relocation: files remain in `ios/Tests`; only project references and Compile Sources membership change. **Lines 153–156** preserve an unrelated product invariant learned during manual testing. The final solution does not modify `ENABLE_SINGLE_APP_MODE`; documentation of a rejected mutation prevents it from returning accidentally.

```ruby
157   tests_group = project.main_group.find_subpath('StripeReactNativeTests', true)
158   tests_group.path = '../../../../ios/Tests'
159   tests_group.source_tree = 'SOURCE_ROOT'
```

**Line 157** finds or creates (`true`) a logical group under the project's root group. **Line 158** points that group to the repository's physical test directory using a relative path from the generated project. **Line 159** says the path is relative to Xcode's `SOURCE_ROOT`, not to another group. The group organizes references; it does not by itself compile files.

```ruby
161   Dir.glob("#{ws_dir.parent}/ios/Tests/*.{m,swift}").sort.each do |path|
162     name = File.basename(path)
163     file_ref = tests_group.files.find { |file| file.path == name } || tests_group.new_file(name)
164     next if test_target.source_build_phase.files_references.include?(file_ref)
165
166     test_target.add_file_references([file_ref])
167   end
```

**Line 161** expands Objective-C `.m` and Swift test files, sorts them for deterministic project order, and loops. The path uses the discovered workspace root's parent according to this repository layout. **Line 162** keeps the leaf filename because the group's path already points at the containing directory. **Line 163** reuses an existing `PBXFileReference` or creates one, avoiding duplicate navigator entries. **Line 164** separately checks Compile Sources membership and skips an existing `PBXBuildFile`. **Line 165** separates the guard. **Line 166** adds the reference to the target's relevant build phase. **Line 167** closes the loop.

#### 11.7.2 Normalize test compiler flags (lines 169–175)

```ruby
169   test_target.build_configurations.each do |config|
170     flags = Array(config.build_settings['OTHER_SWIFT_FLAGS'] || '$(inherited)')
171     flags = flags.flat_map { |flag| flag.to_s.split(' ') }
172     flags << '$(inherited)' unless flags.include?('$(inherited)')
173     # The tests conditionally compile new-architecture code paths.
174     flags << '-DRCT_NEW_ARCH_ENABLED' if new_arch_enabled && !flags.include?('-DRCT_NEW_ARCH_ENABLED')
```

**Line 169** handles each configuration independently. Xcodeproj build-setting values can be a string or an array. **Line 170** supplies `$(inherited)` when absent and normalizes the result into an array. **Line 171** stringifies and whitespace-splits each member, then flattens them into tokens. **Line 172** guarantees inherited parent flags survive. **Lines 173–174** add the Swift conditional-compilation definition exactly once when testing new architecture.

#### 11.7.3 Pass generated module maps through Swift to Clang (lines 175–200)

```ruby
175     unless disable_spm
176       # The tests import Stripe modules directly (@testable-importing the SDK
177       # framework also requires resolving the modules its Swift interface
178       # references). When Stripe is built by SPM inside the Pods project,
179       # Xcode generates clang module maps for the package targets under
180       # OBJROOT/GeneratedModuleMaps, but nothing puts them on the *test*
181       # target's search paths — pod targets get that wiring from React
182       # Native's SPM integration, external targets don't. Point the compiler
183       # at each generated module map explicitly. (This is also why these
184       # flags live here and not in the shipped podspec: app code doesn't
185       # import Stripe modules, so regular apps don't need them.)
```

**Line 175** confines all module-map flags to SPM mode. In fallback mode CocoaPods supplies normal pod module wiring, and SPM-generated map paths may not exist. **Lines 176–185** explain both direct and indirect need: tests import modules, and `@testable import stripe_react_native` asks Swift to load a wrapper interface that itself references Stripe types. An **external target** here means outside `Pods.xcodeproj`; RN's bridge only configured its matched pod target.

```ruby
186       %w[
187         Stripe Stripe3DS2 StripeApplePay StripeCameraCore StripeCore
188         StripeCryptoOnramp StripeFinancialConnections StripeIdentity
189         StripeIssuing StripePaymentSheet StripePayments StripePaymentsUI
190         StripeUICore
191       ].each do |module_name|
```

**Lines 186–191** enumerate package modules that the wrapper/test interfaces may require, including transitive/internal modules and the selected Onramp subtree. This list is intentionally broader than the seven public package products: a product can expose interfaces compiled from several package targets, each with a generated Clang module map.

```ruby
192         map_flag = "-fmodule-map-file=$(OBJROOT)/GeneratedModuleMaps$(EFFECTIVE_PLATFORM_NAME)/#{module_name}.modulemap"
193         next if flags.include?(map_flag)
194
195         flags << '-Xcc'
196         flags << map_flag
197       end
198     end
199     config.build_settings['OTHER_SWIFT_FLAGS'] = flags
200   end
```

**Line 192** constructs a Clang option for one generated module map. Ruby interpolates only `#{module_name}`; the Xcode expressions `$(OBJROOT)` and `$(EFFECTIVE_PLATFORM_NAME)` remain literal until build-setting expansion. The platform suffix distinguishes simulator/device intermediates. **Line 193** avoids adding the same path twice. **Line 194** separates the guard. **Line 195** appends Swift's `-Xcc`, meaning "pass the following argument to the embedded Clang importer." **Line 196** appends that following argument. **Lines 197–198** close the module and mode blocks. **Line 199** assigns the normalized token array back to the build setting. **Line 200** closes the configuration loop.

```ruby
202   project.save
203 end
```

**Line 202** serializes all target settings, groups, references, and build-phase membership back to RNTA's generated project. Unlike Chapter 9's persistent merchant project, this project is regenerated on each install, so an unconditional save is expected. **Line 203** closes `post_integrate`.

### 11.8 Complete source-line accounting

| Lines | Meaning | Explained in |
|---:|---|---|
| 1–17 | Harness identity, dependency-helper discovery, workspace | §11.1 |
| 18–33 | Separators, SPM/fallback choice, linkage, architecture | §11.2 |
| 34–62 | Separators and RN prebuilt matrix | §11.3 |
| 63–117 | Options and DevSupport linker repair | §11.4 |
| 118–129 | App/pod/Onramp/test declarations | §11.5 |
| 130–148 | `post_integrate`, generated project, nonmodular headers | §11.6 |
| 149–203 | Test references and compiler/module-map flags | §11.7 |

### Chapter summary

- The example app is generated by RNTA and doubles as a four-variable integration harness; its Podfile is not a consumer template.
- SPM mode uses dynamic frameworks; fallback mode deliberately covers static libraries.
- React Native's dependency prebuilts and core prebuilt are independent. Old-architecture/dynamic mode keeps the former and source-builds the latter.
- A narrowly scoped xcconfig edit repairs RNTA DevSupport's under-declared framework links.
- Native tests moved from a pod test spec into the generated application's XCTest target, whose source references and module-map flags are recreated after integration.

### Review questions

1. Why is `use_prebuilt_rncore` false for only one cell of the mode/architecture matrix?
2. In old-architecture SPM mode, why does DevSupport need Hermes but not an added React framework flag?
3. What is the distinction between creating a `PBXFileReference` and adding that reference to a target's source build phase?
4. Why is every module-map argument paired with `-Xcc`?
5. Which lines in this Podfile are appropriate for a normal consumer to reproduce, and which major blocks are harness-only?

---

## Chapter 12. Publication, lockfiles, CI, and documentation

A dependency mechanism is incomplete if its helper is not published, its alternate paths are not tested, or its migration requirements are invisible to users. This chapter covers the branch's supporting surfaces. They do not invent the architecture, but they make it distributable, observable, and maintainable.

### 12.1 `package.json`: ship the helper and point tests at the new host

Only two executable entries changed.

#### 12.1.1 The native unit-test command (line 30)

```json
"test:unit:ios": "xcodebuild test -workspace example/ios/example.xcworkspace -destination 'platform=iOS Simulator,name=iPhone 16 Pro Max' -scheme ReactTestApp -only-testing:ReactTestAppTests"
```

Read the command from left to right:

- `xcodebuild test` selects the XCTest build-and-run action.
- `-workspace example/ios/example.xcworkspace` builds the integrated workspace rather than either `.xcodeproj` alone. That is necessary because app, pods, and package targets participate together.
- `-destination 'platform=iOS Simulator,name=iPhone 16 Pro Max'` chooses a simulator rather than requiring a signing-capable device.
- `-scheme ReactTestApp` replaces the old generated `stripe-react-native-Unit-Tests` pod-test-spec scheme. Chapter 11 moved the source files into RNTA's app-level test target.
- `-only-testing:ReactTestAppTests` narrows execution to that XCTest bundle even though the app scheme may expose other test actions.

This one line is the command-line counterpart of Podfile lines 123–203. Changing the project without changing the command would leave local `yarn test:unit:ios` invoking an obsolete scheme.

#### 12.1.2 The npm publication allowlist (lines 44–52)

```json
"files": [
  "src",
  "lib",
  "android",
  "ios",
  "jest",
  "stripe-react-native.podspec",
  "stripe_spm.rb",
  "app.plugin.js",
```

The `files` array is a positive npm-package allowlist. **The new `"stripe_spm.rb"` line is operationally essential**: the podspec executes `require_relative 'stripe_spm'` from the installed npm package. A repository build can pass while an npm tarball fails if the helper is absent. Including the podspec without its relative dependency would produce `LoadError` during every consumer `pod install`.

The placement beside the podspec documents that these are a coupled native-install unit. A release check should inspect `npm pack --dry-run` (or the project's equivalent) and confirm both names appear.

### 12.2 `Podfile.lock`: evidence about CocoaPods' graph

`example/ios/Podfile.lock` is generated data, not hand-authored solution code. Its large diff is nevertheless an important experiment result. Four semantic changes matter:

1. The `PODS:` section no longer contains `Stripe`, `StripeCore`, `StripePaymentSheet`, `StripePayments`, `StripePaymentsUI`, `StripeApplePay`, `StripeFinancialConnections`, `StripeCryptoOnramp`, or their pod-only transitive entries.
2. The local `stripe-react-native`, `/Core`, `/NewArch`, and `/Onramp` entries remain. This proves the wrapper is still a CocoaPods development pod.
3. `stripe-react-native/Tests` disappears because Chapter 11 no longer selects the podspec test spec; tests live in `ReactTestAppTests` instead.
4. The `SPEC REPOS: trunk:` block for Stripe pods disappears. CocoaPods no longer queries trunk for the native Stripe SDK in this default harness install.

The surviving core entry is illustrative:

```yaml
- stripe-react-native/Core (0.75.0):
  - hermes-engine
  - React-Core
  # ...React Native dependencies...
```

There is intentionally no SPM product list here. `Podfile.lock` serializes CocoaPods' resolver result only. Xcode package references live in `.pbxproj`, and concrete SPM resolution lives in `Package.resolved`.

Many React pod checksum values also changed when the lockfile was regenerated under the new harness/prebuilt configuration. A checksum is an opaque digest of a resolved podspec, not implementation logic to interpret line by line. Its proper reading is "the generated specification input changed." The final `PODFILE CHECKSUM` similarly fingerprints Podfile text; after any subsequent Podfile edit it must be regenerated on macOS with CocoaPods. The findings document notes that the branch's current checksum may need a one-line refresh after the last harness edit.

### 12.3 A short Bitrise/YAML primer

`bitrise.yml` declares CI as YAML. Indentation creates mappings and lists. A workflow has environment variables, reusable workflows in `before_run`, and concrete `steps`. In the top-level pipeline, `{}` means "schedule this workflow with no additional pipeline-specific configuration." A workflow name in `before_run` is composition, not a shell command.

The solution changes seven logical CI regions.

#### 12.3.1 Add the missing paths to the main pipeline (lines 21–37)

The relevant additions are:

```yaml
pipelines:
  main-trigger-pipeline:
    workflows:
      unit-test-ios: {}
      unit-test-ios-old-arch: {}
      # ...
      e2e-build-ios-new-arch: {}
      # ...
      build-ios-fallback: {}
      expo-prebuild-ios: {}
```

`unit-test-ios-old-arch: {}` schedules an XCTest run for the legacy RN bridge/runtime while keeping SPM as the native dependency path. `build-ios-fallback: {}` schedules the alternate CocoaPods-acquisition path. `expo-prebuild-ios: {}` schedules the Expo Continuous Native Generation validation (§12.3.7). Merely defining workflows below would not execute them; these pipeline entries make them required on pushes and pull requests covered by the trigger map.

Together with existing e2e workflows, the intended matrix is:

| Workflow class | RN architecture | Stripe acquisition | What it establishes |
|---|---|---|---|
| `unit-test-ios` | new | SPM | native unit behavior, debug compile/link |
| `unit-test-ios-old-arch` | old | SPM | same behavior through old runtime/bridge mode |
| `e2e-build/tests-ios-new-arch` | new | SPM | release build, launch, UI flows, resources |
| `e2e-build/tests-ios-old-arch` | old | SPM | old-arch release/runtime parity |
| `build-ios-fallback` | new | CocoaPods | exact pod graph and static-link compatibility |
| `expo-prebuild-ios` | new | SPM, then CocoaPods | a fresh Expo-generated project integrates fully in ONE `pod install`; plugin opt-out works |

#### 12.3.2 Point the existing unit job at `ReactTestAppTests` (lines 102–113)

```yaml
- xcode-test@4:
    title: Xcode Test for iOS
    inputs:
      - project_path: example/ios/example.xcworkspace
      - destination: platform=iOS Simulator,name=iPhone 16 Pro Max
      # ...why the pod test spec is not used...
      - scheme: ReactTestApp
      - xcodebuild_options: -only-testing:ReactTestAppTests
      - log_formatter: xcbeautify
```

The Bitrise `xcode-test` step expresses the same selection as `package.json`: workspace, simulator, app scheme, and one test bundle. `xcbeautify` turns raw `xcodebuild` output into readable CI logs without changing build semantics. The nearby comment is important because the scheme change otherwise looks arbitrary and might be "simplified" back to the nonworking pod test-spec scheme.

#### 12.3.3 Add old-architecture native-unit coverage (lines 125–172)

```yaml
unit-test-ios-old-arch:
  envs:
    - NEW_ARCH_ENABLED: false
    - RCT_NEW_ARCH_ENABLED: 0
  before_run:
    - _prepare_ios
    - _build_js_bundle
    - _install_pods
```

The two environment variables feed different consumers: the Podfile parses `NEW_ARCH_ENABLED` as the word `false`, while RN scripts commonly read `RCT_NEW_ARCH_ENABLED` as numeric `0`. Setting both removes ambiguity. `_prepare_ios` checks out/bootstraps dependencies, `_build_js_bundle` creates an embedded JavaScript bundle, and `_install_pods` materializes the native graph.

The bundle step is not a performance optimization. CI runs no Metro development server. RNTA's debug old-architecture launch probes Metro and then falls back to `main.ios.jsbundle`; without either, the host never becomes ready for XCTest and the test runner reports that it hung before establishing a connection. The new bridgeless path happens to tolerate the absent bundle, but the old path does not.

```yaml
steps:
  - xcode-test@4:
      title: Xcode Test for iOS
      inputs:
        - project_path: example/ios/example.xcworkspace
        - destination: platform=iOS Simulator,name=iPhone 16 Pro Max
        - scheme: ReactTestApp
        - xcodebuild_options: -only-testing:ReactTestAppTests
        - log_formatter: xcbeautify
```

These lines mirror the new-architecture job so architecture is the independent variable. The remainder saves the `Pods` cache with a key containing `NEW_ARCH_ENABLED` and the lockfile checksum, then uploads logs/artifacts without notifying broad user groups. Including architecture in the cache key prevents incompatible generated pod state from crossing matrix cells.

#### 12.3.4 Keep a dedicated fallback build (lines 262–275)

```yaml
build-ios-fallback:
  envs:
    - NEW_ARCH_ENABLED: true
    - RCT_NEW_ARCH_ENABLED: 1
    - STRIPE_DISABLE_SPM: '1'
  before_run:
    - _e2e_build_ios
```

`NEW_ARCH_ENABLED` and `RCT_NEW_ARCH_ENABLED` select the closest modern default application architecture. Quoting `'1'` forces YAML to preserve the fallback toggle as a string environment value, which Podfile line 23 compares exactly. `_e2e_build_ios` reuses preparation, JS bundling, pod installation, and a release simulator build.

The job is build-only: no downstream Maestro workflow consumes its artifact. Its purpose is dependency-resolution and compile/link coverage for the pressure valve, while richer behavior runs through the future default SPM path. This avoids duplicating a costly end-to-end suite without leaving fallback completely untested.

#### 12.3.5 Simplify unreleased stripe-ios testing (lines 457–469)

```yaml
_install_pods:
  steps:
    - script@1:
        title: Install Pods
        inputs:
          - content: |
              if [ -n "$OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH" ]; then
                # stripe_spm.rb reads this env var and resolves the Swift
                # package from that stripe-ios branch instead of the pinned
                # release.
                echo "Overriding Stripe iOS SDK to use branch: $OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH"
              fi
              yarn pods
```

`_install_pods` is shared, so every iOS workflow gets the same install behavior. The shell conditional tests for a nonempty override and logs it for diagnosability. It no longer edits the Podfile or synthesizes one `pod ..., :git => ..., :branch => ...` declaration per Stripe pod. Chapter 9 consumes the environment variable natively and switches the single SPM package reference instead.

That removal is a correctness fix, not merely simplification. Appending Git pod declarations while the wrapper also registers equivalent SPM products could place two copies of the SDK in one link, inviting duplicate symbols and module conflicts. The unconditional final `yarn pods` now handles normal, branch override, and fallback modes through the same entry point.

#### 12.3.6 Restrict release simulator builds to arm64 (lines 587–600)

```yaml
DERIVED_DATA_PATH="$BITRISE_SOURCE_DIR/DerivedData"
build_ios() {
  # ...build only the arm64 simulator slice...
  xcodebuild -workspace example.xcworkspace \
    -scheme example \
    -configuration Release \
    -sdk iphonesimulator \
    -derivedDataPath "$DERIVED_DATA_PATH" \
    ARCHS=arm64 \
    ONLY_ACTIVE_ARCH=YES \
    build | xcbeautify
}
```

`DERIVED_DATA_PATH` gives CI a deterministic output/cache location. The shell function allows the surrounding workflow to retry the exact build. `-workspace`, `-scheme`, `-configuration`, and `-sdk` select the release simulator product. `ARCHS=arm64` removes the unnecessary Intel simulator slice on Apple Silicon runners, and `ONLY_ACTIVE_ARCH=YES` reinforces single-architecture compilation. Since stripe-ios is built from source, avoiding a second package slice materially reduces matrix time without changing dependency semantics.

The following existing line calls the function and retries once after 30 seconds. The build then zips `ReactTestApp.app` for the downstream Maestro jobs. Those surrounding operations did not define the SPM mechanism, but they provide its runtime evidence.

#### 12.3.7 Validate the Expo prebuild path (`expo-prebuild-ios`)

Every other iOS job builds the *committed* react-native-test-app project — a project whose `.xcodeproj` has been integrated by CocoaPods many times. That leaves an entire class of consumer unrepresented: an Expo app under **Continuous Native Generation**, where `expo prebuild --clean` regenerates the `ios/` directory from a template and runs `pod install` exactly once. A fresh project plus a single install is precisely the configuration where react-native-firebase's SPM rollout broke in the field (§13.13.7), so this workflow makes it a per-PR invariant:

```yaml
expo-prebuild-ios:
  envs:
    - EXPO_SDK_VERSION: '54'
  before_run:
    - _prepare_js
  steps:
    - script@1:
        title: Expo prebuild + build (SPM mode)
        inputs:
          - content: ./scripts/test-expo-project --sdk-version "$EXPO_SDK_VERSION" --platforms ios
    - script@1:
        title: Expo prebuild, CocoaPods fallback (plugin disableSPM)
        inputs:
          - content: ./scripts/test-expo-project --sdk-version "$EXPO_SDK_VERSION" --platforms ios --disable-spm --skip-build
```

`scripts/test-expo-project` does the heavy lifting. It packs the repository into a real npm tarball (`npm pack` — so the test exercises the published `files` allowlist of §12.1.2, not the repository layout), creates a throwaway Expo app from the official SDK 54 template, installs the tarball, configures the app's plugins, and runs `expo prebuild --clean` — which on macOS runs the single `pod install`. `scripts/update-expo-plugins.js` writes the plugin configuration into `app.json`: in SPM mode it adds `expo-build-properties` with `"useFrameworks": "dynamic"` (Expo's default is static, which our own fail-fast would reject — the same setting real Expo apps must adopt); in `--disable-spm` mode it instead sets the Stripe plugin's `disableSPM` option (§12.4.1) and deliberately keeps Expo's static default, because that is the configuration opted-out apps actually build with.

After the prebuild, the script asserts what that one install pass left behind — the **single-pass property**. In SPM mode: no Stripe pods anywhere in `ios/Podfile.lock`, the `stripe-ios-spm` package reference present in `Pods.xcodeproj`, and the embed phase present in the app's `.pbxproj`. In fallback mode: `$StripeDisableSPM = true` present in the generated Podfile (proving the plugin option landed), Stripe pods present in the lockfile, and *no* embed phase. Only after the assertions does the SPM pass run a full Release simulator `xcodebuild`; the fallback pass stops at the assertions (`--skip-build`) because fallback *builds* are already covered by §12.3.4's job.

The workflow's first run also produced this book's best empirical footnote: the install log shows §9.4.3's UUID guard raising the counter past index 10523 — a stock Expo SDK 54 install genuinely arrives at the post-install hook with a desynced counter, and without the guard React Native's package reference would have collided with an existing object (§13.12).

### 12.4 Consumer communication and the Expo opt-out: `README.md`, `CHANGELOG.md`, and the config plugin

The README's "Stripe iOS SDK resolution" section is the public migration contract. In order, it tells an application developer:

1. **Who changes:** RN 0.75 and newer.
2. **What changes:** the underlying Stripe iOS SDK is acquired through SPM; the React Native SDK still uses `pod install`.
3. **What action is required:** enable dynamic frameworks with the exact Podfile directive.
4. **How Expo expresses the same setting:** `expo-build-properties` with `"useFrameworks": "dynamic"`.
5. **How to defer:** put `$StripeDisableSPM = true` at the top of the Podfile — or, for Expo apps, set `"disableSPM": true` on this SDK's config plugin (the plugin option also appears in the README's Expo installation section, beside `merchantIdentifier` and `enableGooglePay`).
6. **What the limit is:** fallback lasts only while compatible Stripe pods continue to be published; RN below 0.75 uses it automatically.

The changelog repeats this in the Unreleased `Changes` section rather than `Features`. That classification signals an installation/build behavior change with migration impact, not a new JavaScript API. Release notes are often the only document an upgrader reads, so the dynamic requirement and both escape hatches appear inline rather than behind a link.

#### 12.4.1 The config plugin's `disableSPM` option, line by line

Item 5's Expo half is not documentation — it is shipped TypeScript in `src/plugin/withStripe.ts`, and it exists because of a structural fact about Expo. Under Continuous Native Generation an app has *no committed Podfile*: `expo prebuild` generates one from a template, and anything a user hand-edits into it is destroyed by the next `--clean` prebuild. A migration contract whose escape hatch says "add a line to your Podfile" is therefore unusable by exactly the population most likely to need it (Expo's default linkage is static, and §13.15.4's static support does not exist yet). **Config plugins** are Expo's sanctioned answer: npm packages export functions that transform the app's configuration and generated native projects during prebuild, and users pass them options in `app.json`. The Stripe plugin already existed for Apple Pay entitlements and Google Pay metadata; the branch adds one option to it. (react-native-firebase shipped the identical option, `ios.disableSPM`, after discovering post-launch that their docs promised it before their plugin implemented it — their issue #9165.)

```ts
11  import {
12    mergeContents,
13    removeGeneratedContents,
14  } from '@expo/config-plugins/build/utils/generateCode';
```

**Lines 11–14** import Expo's *generated-code block* utilities. `mergeContents` inserts text into a file wrapped in `# @generated begin <tag> ... # @generated end <tag>` marker comments, keyed by a tag, idempotently; `removeGeneratedContents` deletes a previously generated block by the same tag and returns `null` if none exists. Using these rather than raw string surgery is what makes the option safely *reversible* — the plugin can find and remove exactly what it added, and nothing else.

```ts
48    disableSPM?: boolean;
```

**Line 48** (with its doc comment at lines 37–47) adds the optional prop to `StripePluginProps`. The comment states the contract in consumer terms: iOS only, defaults to `false`, resolves Stripe through CocoaPods instead of SPM, and names the reason a user would want it — keeping static frameworks.

```ts
60    { merchantIdentifier, includeOnramp = false, disableSPM = false }
```

**Line 60** destructures the prop in `withStripeIos` with an explicit `false` default, so an absent option means SPM mode.

```ts
70    // Always run the Podfile mod (not just when disableSPM is true): when the
71    // option is turned back off, the previously generated block must be removed
72    // again, because `expo prebuild` without --clean reuses the existing
73    // Podfile.
74    resultConfig = withPodfile(resultConfig, (config) => {
75      config.modResults.contents = setPodfileDisableSPM(
76        config.modResults.contents,
77        disableSPM
78      );
79      return config;
80    });
```

**Lines 70–73** record the same persistence lesson as §5.5, transposed to Expo: a plain (non-`--clean`) prebuild *reuses* the existing Podfile, so a block added when the option was on would survive turning it off unless the plugin actively removes it. That is why the mod runs unconditionally. **Lines 74–80** register a `withPodfile` modification — Expo's mod system hands the generated Podfile's contents to the callback during prebuild — delegating the actual text transformation to a pure function, which is what the jest tests exercise.

```ts
116 const DISABLE_SPM_TAG = '@stripe/stripe-react-native-disableSPM';
```

**Line 116** is the generated-block tag: namespaced by package name so it can never collide with another plugin's blocks (react-native-firebase tags its equivalent block with its own package name).

```ts
131 export function setPodfileDisableSPM(
132   contents: string,
133   disableSPM: boolean
134 ): string {
135   if (!disableSPM) {
136     return removeGeneratedContents(contents, DISABLE_SPM_TAG) ?? contents;
137   }
138
139   return mergeContents({
140     src: contents,
141     newSrc: '$StripeDisableSPM = true',
142     tag: DISABLE_SPM_TAG,
143     anchor: /prepare_react_native_project!/,
144     offset: 1,
145     comment: '#',
146   }).contents;
147 }
```

**Lines 131–134** declare the pure function (exported for tests). **Lines 135–137** are the removal direction: when the option is off, delete any previously generated block; the `?? contents` handles `removeGeneratedContents` returning `null` when there was nothing to remove, making "off and never on" a no-op. **Lines 139–146** are the insertion direction. `newSrc` is the exact Ruby global from §9.11's predicate. The `anchor` deserves the most attention: the flag must be assigned *before CocoaPods evaluates the podspec* — in practice, before any `target` block — and `prepare_react_native_project!` is a top-level call every Expo (and bare-RN) Podfile template contains near the top, which makes it a stable insertion point; `offset: 1` places the block on the line after it. `comment: '#'` selects Ruby comment syntax for the marker lines. The function's four behaviors — insert, idempotent re-run, remove, no-op — each have a dedicated jest test, and §12.3.7's fallback CI pass proves the end-to-end result: a generated Podfile containing the flag, a lockfile containing Stripe pods, and no embed phase.

One connection worth making explicit: this option and `stripe_spm_enabled?` (§9.11) are two ends of one wire. The plugin writes `$StripeDisableSPM = true` into the Podfile; CocoaPods evaluates the Podfile and the podspec in one Ruby process (§5.2); the predicate reads the global and takes the fallback branch. Nothing else passes between Expo's world and CocoaPods' world.

### 12.5 Maintainer communication: `CONTRIBUTING.md`

The native SDK update instruction now says to change the one `stripe_version` pin and run `yarn pods`. `yarn update-pods` remains relevant only when explicitly testing fallback because the default graph no longer contains Stripe pods for CocoaPods to update.

The new maintainer section then compresses the implementation into three bullets matching Chapters 7–9 (including the two-stage hook split and the UUID guard), documents both development toggles and the Expo plugin opt-out, points at the `expo-prebuild-ios` workflow with the exact local commands that reproduce it on a Mac, and records two invariants:

- `StripeSPM::CORE_PRODUCTS` and the fallback pod dependencies must change together.
- Harness-specific dynamic/prebuilt/test-target wiring belongs in the example Podfile, not in consumer instructions or the shipped podspec.

This division of documentation by audience is deliberate. README answers "what must I do?" CONTRIBUTING answers "how do I modify and verify it?" `stripe_spm.rb` answers "why does each mechanism exist?" This book connects all three.

### 12.6 Documentation and investigation artifacts in the branch

The branch also adds `SPM_FINDINGS.md`, `SPM_SOLUTION_GUIDE.md`, and the original `SPM_SOLUTION_GUIDE_fable.md`. They do not execute, ship through the package allowlist, or alter an application's build. Their roles are:

- **Findings:** research sources, alternatives, decisions, CI iteration history, current risks, and open release-readiness work.
- **Solution guide:** a detailed mechanism/reference narrative.
- **Fable guide:** the shorter story-oriented predecessor retained unchanged at the user's request.
- **This `_2` guide:** the textbook treatment with explicit source-line accounting.

Because prose documents are not program inputs, "line-by-line solution code" in this guide means the podspec, helper, RN bridge, example Podfile, and changed executable CI/package declarations. Documentation paragraphs and generated opaque checksums are explained by semantic block rather than paraphrased word by word.

### 12.7 What each validation layer can and cannot prove

| Evidence | Proves | Does not prove alone |
|---|---|---|
| Podspec-mode evaluation | correct branch, URL, requirement, product/pod declarations | real CocoaPods API visibility or Xcode behavior |
| `pod install` | resolution, target type, hook order, serialized objects | successful compilation or runtime loading |
| wrapper compile | module visibility and type correctness | symbol availability at final links |
| application link | symbol graph is complete for that configuration | dylibs are embedded or signed |
| simulator launch | `dyld` can load frameworks; basic resources work | device/archive signing and App Store validation |
| PaymentSheet/Onramp flow | real native functionality and package resources execute | all consumer pod graphs are dynamic-compatible |
| fallback build | registry path and static topology remain buildable | existence of future unpublished pod versions |
| Expo prebuild pass | a fresh CNG project fully integrates in one `pod install` from the real npm tarball; the plugin opt-out round-trips; the Expo app builds | Expo runtime behavior (launch, PaymentSheet) on a device/simulator |

The CI design deliberately stacks these forms of evidence. A green compile cannot substitute for a launch, and a green SPM path cannot keep an unexecuted fallback honest.

### Chapter summary

- The helper must be present in the npm tarball because the published podspec requires it by relative path — and the Expo CI job installs from a real `npm pack` tarball, making that claim continuously tested rather than checklist-only.
- Native unit commands and CI now target RNTA's app-level XCTest bundle.
- The lockfile's missing Stripe pod graph is positive evidence that acquisition moved to SPM; SPM state belongs elsewhere.
- CI exercises SPM on both RN architectures, separately builds the CocoaPods fallback, and validates the Expo CNG path — including the single-pass property and the plugin's `disableSPM` opt-out — on every PR.
- The Expo opt-out is shipped plugin code, not documentation: a tagged, reversible, anchored Podfile injection whose output feeds §9.11's predicate.
- Consumer, release-note, maintainer, investigation, and generated artifacts have distinct audiences and truth claims.

### Review questions

1. Why might all repository tests pass even if `stripe_spm.rb` were accidentally absent from `package.json`'s `files` list — and which CI job would now catch exactly that mistake?
2. Is the absence of `StripePaymentSheet` from `Podfile.lock` sufficient proof that the app can launch PaymentSheet? Why or why not?
3. Why does the old-architecture unit-test job build a JS bundle before installing pods?
4. What duplicate-integration risk was removed when `_install_pods` stopped appending Git-based Stripe pod declarations?
5. Which CI job protects users who set `$StripeDisableSPM = true`, and why is it intentionally build-only?
6. Why must the `expo-prebuild-ios` job assert its invariants after exactly one `pod install`, and what class of bug would a committed `ios/` folder with a prior install have hidden?
7. Why does `setPodfileDisableSPM` run on every prebuild rather than only when `disableSPM` is true, and what Expo behavior makes that necessary?

---

# Part IV — Diagnosis, evaluation, and maintenance

## Chapter 13. Failure modes, boundaries, and stewardship

Mixed build systems become tractable when a failure is assigned to the stage that owns it. "SPM is broken" is not a diagnosis; "the wrapper compiled but its dynamic link omitted the binary that defines `facebook::jsi`" is. This chapter develops that habit and then turns the branch's investigation history into maintenance rules.

### 13.1 A stage taxonomy for failures

| Stage | Representative symptom | Missing fact or artifact |
|---|---|---|
| Podfile/podspec evaluation | Ruby `LoadError` or undefined helper | published file, loaded capability, or valid Ruby |
| CocoaPods resolution | version conflict / pod not found | compatible pod graph in fallback |
| Post-install project mutation | tailored `Pod::Informative` error | dynamic build type or RN-created package reference |
| Xcode package resolution | cannot clone/resolve package | repository access, tag/branch, or platform compatibility |
| Swift/Clang compilation | `no such module` / nonmodular include | module interface/map or search-path wiring |
| Wrapper/pod link | undefined native symbols | dependency attached at that dynamic link boundary |
| Application link | undefined symbols / duplicate symbols | final link edge, or mutually exclusive graphs violated |
| Embed/sign | build-phase copy or codesign failure | expected output path, permissions, or signing identity |
| Launch | `dyld: Library not loaded` | required dylib absent from bundle or invalidly signed |
| Feature runtime | UI/resource failure | resource bundle, conditional product, or behavior defect |

A later-stage success implies some earlier properties but never all later ones. For example, compilation proves module visibility but says nothing about embedding. Start with the observed stage; do not add broad linker flags to repair a package-resolution error.

### 13.2 `pod install` says dynamic frameworks are required

**Meaning.** The podspec selected SPM mode, but CocoaPods' resolved `stripe-react-native` target is not a dynamic framework. Chapter 9's verifier has prevented a predictable undefined-symbol failure.

**Checks.**

1. Find the Podfile target/abstract-target that integrates `stripe-react-native` and confirm `use_frameworks! :linkage => :dynamic` applies to it.
2. If the Podfile derives linkage from `ENV['USE_FRAMEWORKS']`, confirm the environment reaches the `pod install` process. Remember that Stripe checks the result, not this spelling.
3. For Expo, inspect the generated native configuration and ensure `expo-build-properties` set `"useFrameworks": "dynamic"`.
4. If another pod cannot tolerate dynamic linkage, use `$StripeDisableSPM = true` temporarily and treat that other dependency as the migration blocker.

Do not work around this by weakening `verify_dynamic_linkage!`. The check reflects the location of product dependencies in the target graph, not an arbitrary support policy.

### 13.3 `pod install` says the Stripe package was not added

**Meaning.** SPM activation happened during podspec evaluation, but after normal post-install hooks the expected `XCRemoteSwiftPackageReference` is absent.

**Most likely cause.** A hand-written Podfile either lacks `post_install` or does not call `react_native_post_install(installer, ...)` on the path that ran.

**Checks.**

- Confirm the call exists inside the target's active Podfile evaluation path and is not skipped by an early `next`, conditional, or exception.
- Confirm the installed RN version really provides its SPM bridge and no customization replaced the relevant post-install behavior.
- Inspect `Pods.xcodeproj/project.pbxproj` for the expected repository URL after a successful install attempt.
- Choose fallback if restoring standard RN integration is not currently possible.

Do not manually create only the remote reference. RN's apply step also attaches products and adds wrapper module-search paths; a partial imitation moves the error to compilation.

### 13.4 Xcode cannot resolve the Swift package

**Meaning.** The project objects exist, but Xcode cannot turn the repository/requirement into source.

**Checks.**

- For normal mode, confirm tag `26.7.0` (or the current `stripe_version`) exists in `stripe-ios-spm`.
- For override mode, confirm the branch exists in the full `stripe-ios` repository and the environment value is nonempty and correctly spelled.
- Check network/proxy/credential failures separately from "version not found." Both surface during resolution but have different owners.
- Clear or reset Xcode's package caches only after inspecting the actual resolver error; cache deletion should not be a reflex.
- Compare the package's declared iOS platform floor with the application's deployment target (§13.14.3).

The exact-version pin is intentionally strict. Changing it to an open range to make resolution succeed could silently introduce an untested native API.

### 13.5 Swift reports `no such module 'Stripe...'`

**Meaning.** A compilation target cannot locate a module interface even if package targets exist.

For the wrapper target, inspect:

- the remote package reference;
- the required `XCSwiftPackageProductDependency` on `stripe-react-native`;
- RN's `${SYMROOT}/${CONFIGURATION}${EFFECTIVE_PLATFORM_NAME}/` entry in `SWIFT_INCLUDE_PATHS`; and
- whether Xcode successfully built/resolved the package target.

For `ReactTestAppTests`, inspect the `-Xcc -fmodule-map-file=...` pairs from §11.7. These are harness-only. A normal consumer app does not directly compile the repository's Stripe-importing native tests and should not need to copy the flags.

Distinguish **module name** from **product name**. A missing internal module such as `StripeCore` may be reached through the interface of a public product; adding a second public product blindly is not necessarily the right repair. Inspect the package manifest and emitted interface.

### 13.6 A linker reports undefined Stripe symbols

**Meaning.** The compiler found declarations, but the link invocation for the failing target did not receive definitions.

First identify the line `Ld ...` or target named immediately before the error. Then ask:

1. Is the failing unit the wrapper framework, another pod framework, or the final application?
2. Which binary/package target defines the named symbol?
3. Is that dependency attached to *this* link boundary?
4. Is SPM mode accidentally mixed with manually declared `Stripe*` pods or a second manual package integration?

If the wrapper is static in SPM mode, Chapter 3 already predicts the failure; enable dynamic frameworks or fallback. If symbols belong to another library after the global linkage flip, audit that library's declared dependencies. Dynamic linkage often reveals a bug that static app-level linking had masked.

### 13.7 The application link reports duplicate symbols

**Meaning.** More than one link input provides the same definitions. In this migration, the first suspicion should be a violated exclusivity invariant:

- SPM products plus fallback Stripe pods;
- the wrapper-managed package plus a package manually added to the app;
- repeated custom CI Podfile declarations left from the older branch-override scheme.

Inspect both `Podfile.lock` and all project `packageReferences`/`packageProductDependencies`. Removing random `-ObjC` or dead-strip flags treats symptoms. Restore exactly one owner for the Stripe native SDK.

### 13.8 The build succeeds but launch fails with `dyld: Library not loaded`

**Meaning.** Compilation and linking succeeded. A recorded dynamic dependency is missing from the bundle, located at an incompatible install name, or rejected during loading/signature validation.

**Checks.**

1. Confirm the application target has exactly one `[stripe-react-native] Embed SPM Frameworks` phase.
2. Inspect the phase log: did either `PackageFrameworks` or `UninstalledProducts/<platform>` exist?
3. Run `file` against the package framework binary and confirm it is actually dynamically linked.
4. Inspect `MyApp.app/Frameworks` for the framework named in the `dyld` message.
5. For device/archive output, inspect codesign diagnostics and verify the embedded item shares the expected signing chain.
6. Confirm another phase did not pre-create an incomplete same-named directory, causing first-writer-wins logic to skip it.

If the app just opted into fallback, rerun `pod install` so the stale phase is removed. In fallback there should be no package framework for the script to find.

### 13.9 Onramp compiles incorrectly or is absent

**Meaning.** Conditionality may have failed at one of two package managers.

In SPM mode:

- Confirm `stripe-react-native/Onramp` is selected in CocoaPods' resolved specs.
- Confirm `StripeCryptoOnramp` appears once on the root wrapper native target's package product dependencies.
- Confirm the dependency points to the same Stripe package reference as Core products.

In fallback:

- Confirm the Onramp subspec entry in `Podfile.lock` depends on `StripeCryptoOnramp` at the shared exact version.

Do not "fix" absence by placing Onramp in `CORE_PRODUCTS`; that would make every installation pay for an optional feature and its identity/camera subtree.

### 13.10 `Podfile.lock` still lists Stripe native pods in intended SPM mode

**Meaning.** The dependency graph is mixed, fallback is active, or the lockfile is stale.

- Search for `$StripeDisableSPM`, `STRIPE_DISABLE_SPM`, and explicit `pod 'Stripe...'` declarations.
- Confirm the podspec being evaluated is the branch/npm version you expect rather than a cached older copy.
- Regenerate the lockfile with the normal installation command.
- Remember that `stripe-react-native` itself should remain. Only underlying Stripe iOS SDK pod names leave the CocoaPods graph.

A lockfile is an output to inspect, not a source to hand-edit until it looks correct.

### 13.11 A migration install crashes on `realpath` under `Pods/Headers`

This branch encountered a particularly educational transition-only defect:

1. The NewArch subspec used `private_header_files = '**/*.h'`.
2. CocoaPods expanded that glob against the full development-pod root, which is the repository—not only NewArch source files.
3. Through the local/npm layout, the glob could enter `example/ios/Pods/Headers/Private`.
4. Switching from pods to SPM removed Stripe pod checkouts during installation, leaving old header-store symlinks dangling.
5. CocoaPods attempted `realpath` on a matched dangling symlink and raised `Errno::ENOENT`.

The permanent fix is podspec line 92: scope the pattern to `ios/NewArch/**/*.h`. If an already dirty sandbox still fails once, remove that specific example `Pods` directory and reinstall. The general lesson is broader: **when a change removes dependencies, test an upgrade over old generated state, not only a clean checkout.**

### 13.12 `pod install` aborts with a Pods-project integrity error (or warns about the UUID counter)

**Meaning.** After the regular post-install hooks ran, `verify_pods_project_integrity!` (§9.4.4) found that the Pods project's `rootObject` UUID no longer resolves to the `PBXProject` — a newly created object (typically a Swift package reference) was assigned a UUID that collided with an existing one, and saving the project would have left `Pods.xcodeproj` unopenable by Xcode ("The project 'Pods' is damaged and cannot be opened"). The install was aborted *before* that file was written, which is the check's whole purpose.

**Background.** This is the CocoaPods deterministic-UUID defect described in §9.4.3: `Pod::Project` mints counter-based UUIDs with no collision check, on the assumption that the project is always freshly generated. React Native's `spm_dependency` machinery creates project objects from a post-install hook and can trigger the collision whenever that assumption breaks; RN fixed its own side only in RN ≥ 0.88 ([#57576](https://github.com/facebook/react-native/pull/57576)). The counter desync is not exotic — a stock Expo SDK 54 × RN 0.81 install exhibits it (§12.3.7), which is why the preventive guard exists.

**Checks.**

1. If the error appeared, the *preventive* guard was defeated or skipped — look earlier in the install output for the warning "`Couldn't guard the Pods project's UUID counter`", which means a CocoaPods release changed the internals the guard reads. Note the CocoaPods version.
2. Delete `ios/Pods` and run `pod install` again. A fresh generation restores the counter assumption, so a clean install normally succeeds.
3. If it recurs, report it (with React Native and CocoaPods versions) at the repository's issue tracker; `$StripeDisableSPM = true` is the interim workaround, since fallback mode writes no package objects.
4. Conversely, the *informational* line "`Raised the Pods project's UUID counter past index N`" is not an error at all: it means the guard found a desynced counter and repaired it before anything was written. An install that prints it and completes is healthy — the line exists precisely to leave a diagnostic trail.

Do not "fix" this by disabling the integrity check: it converts an install-time abort with a clear message into a corrupted project and an inscrutable Xcode failure later.

### 13.13 What the CI failures taught

The branch's failure history is part of the solution's evidence because each failure refined a boundary.

#### 13.13.1 A stub can lie about API visibility

A local Ruby harness originally modeled `Pod::Target#build_type` as public. Real CocoaPods 1.16.2 makes the reader private, so CI failed with `NoMethodError`. Replacing it with public `build_as_*` predicates repaired both code and abstraction.

**Lesson:** a test double must reproduce method visibility and object ownership, not merely return plausible values. Read the dependency's source/API contract when wrapping it.

#### 13.13.2 Dynamic frameworks expose under-declared edges

Old-architecture e2e first failed while linking `react-native-safe-area-context` against prebuilt React core. Static builds had allowed symbols to resolve later at the app link. Dynamic pod frameworks required that target's own link to be complete.

**Lesson:** the app-wide linkage change has a blast radius beyond Stripe. Diagnose the target owning the link before attributing every failure to the new SPM package.

#### 13.13.3 React Native prebuilts are separable

Disabling both prebuilt systems avoided one React link problem but made pinned `fmt` sources hit Xcode 26 Clang `consteval` errors. Keeping `RCT_USE_RN_DEP` everywhere while disabling only `RCT_USE_PREBUILT_RNCORE` for old-architecture dynamic mode produced the right matrix.

**Lesson:** similar feature flags may control orthogonal artifacts. Preserve the supported prebuilt dependency bundle while changing only the incompatible core representation.

#### 13.13.4 Trace undefined C++ symbols to their binary owner

DevSupport's `facebook::jsi` errors were eventually traced to Hermes. React Native intentionally excludes `jsi.cpp` when Hermes provides the definitions, but the DevSupport pod did not directly link `hermes.framework` under dynamic linkage. One precise framework flag fixed old architecture.

**Lesson:** symbol prefix, declaration header, and defining binary can belong to different logical modules. Use the actual link command and source ownership, not naming intuition.

#### 13.13.5 A test runner hang may be an app-launch problem

The old-architecture XCTest job had neither Metro nor an embedded JS bundle. RNTA never brought its host app to the ready state, so XCTest reported a connection hang. Adding `_build_js_bundle` fixed it.

**Lesson:** XCTest infrastructure errors can originate before any test method, in the host application's runtime bootstrap.

#### 13.13.6 A runtime pass checks resources and loading

The branch's recorded manual simulator pass launched the example and rendered PaymentSheet. This tested the embed phase, `dyld`, SPM resource bundles, and real native UI execution. It also caught an unrelated prototype mutation of RNTA's single-app flag, which was removed.

**Lesson:** link-green is not launch-green, and launch-green is not feature-green. Test at the highest behavior level justified by risk.

#### 13.13.7 Prior art keeps moving after you copy it

A month after react-native-firebase's SPM implementation shipped — and after this branch had ported its architecture — an audit of every RNFB change since their original PR surfaced a field failure with direct lessons for this code. Their user-project helpers discovered app targets by looking for the `[CP] Embed Pods Frameworks` build phase. CocoaPods only adds that phase during `integrate_user_project`, *after* post-install hooks run — so on a fresh `expo prebuild --clean` project, the first `pod install` silently skipped every target, and single-pass CI/EAS builds shipped apps that failed at link or launch (their #9219/#9158). A committed bare-RN `ios/` folder, already integrated by an earlier install, masked the bug in their own review. RNFB fixed it by moving every user-project mutation to `run_podfile_post_integrate_hooks`.

This helper's target discovery (`aggregate_target.user_targets` filtered by `symbol_type`) never depended on the `[CP]` phase, so the specific bug did not transfer — a conclusion verified against CocoaPods 1.16.2 source rather than assumed. The post-integrate split was adopted anyway (§9.4.2, §9.12): it is where CocoaPods documents user-project mutation belongs, it normalizes phase ordering on fresh projects, and it keeps this implementation aligned with its reference. The same audit motivated porting the UUID guard (which fired on its first CI run — §12.3.7), adding the plugin's `disableSPM` option (RNFB had to add theirs post-launch too), and building the Expo prebuild CI job with `--clean` so no committed `ios/` folder can hide a single-pass regression here.

**Lesson:** a design copied from prior art inherits that prior art's *future* bug reports. Schedule audits of the upstream after adopting it, verify which of its failures structurally apply to your variant instead of assuming either way, and copy the fix's *placement* even when your code dodged the bug — the placement encodes the lifecycle rule, and the next mutation you write there will obey it for free.

### 13.14 Supported scope and remaining risks

#### 13.14.1 Dynamic frameworks are application-wide

This is the largest adoption cost. `use_frameworks!` changes how the entire pod graph links. Old or under-specified pods may fail even though Stripe's own graph is correct. The helper can identify Stripe's unsupported target type but cannot safely patch arbitrary third-party dependencies.

Apps already using dynamic frameworks have much less migration risk. Apps changing a large legacy graph should use a branch build, audit each failed target, and keep fallback as a temporary release valve.

#### 13.14.2 Fallback has a finite horizon

Read-only trunk preserves versions already published; it cannot accept new ones. Once a wrapper release pins a stripe-ios version never published as pods, that wrapper version's fallback cannot resolve. Older compatible wrapper/native pairs remain installable. Product policy must eventually decide when to remove or constrain the fallback promise.

#### 13.14.3 Platform floors are not expressed identically

On this branch the wrapper podspec declares iOS 13, while stripe-ios-spm 26.7.0 declares iOS 15. Tested RN versions may raise deployment targets during post-install, but an RN 0.75 app deliberately targeting iOS 13 or 14 could reach an SPM platform-compatibility error. Before release, maintainers should align the public requirement or validate/document the effective floor explicitly.

#### 13.14.4 Clean SPM builds perform more source work

The first build must clone and compile stripe-ios. The tag-only mirror reduces checkout volume and caches help later builds, but clean CI/developer latency differs from consuming an already cached pod graph or binary. Measure it rather than assuming it is negligible. If it becomes unacceptable, a first-party binary SPM product is a future design question.

#### 13.14.5 Archive/device distribution needs its own pass

The script searches the Archive-specific `UninstalledProducts` path and signs copied frameworks, but simulator success does not validate distribution signing, stripping, device slices, export, or App Store checks. A real Archive/TestFlight pass remains a distinct release-readiness test.

#### 13.14.6 Expo is a separate generation path

Expo commonly defaults to static native linkage and generates its Podfile through plugins. Documentation specifies `expo-build-properties`, and since the `expo-prebuild-ios` workflow landed (§12.3.7), clean prebuild, single-pass integration, the plugin's `disableSPM` opt-out, and a Release build are all validated per PR against a fresh Expo SDK 54 app installed from the real npm tarball. What remains manual is Expo *runtime* validation (launch and a PaymentSheet flow), plus release coordination: Expo bundles a pinned stripe-react-native per SDK release, so the migration's arrival in Expo apps follows Expo's own release cadence.

#### 13.14.7 Old architecture is tested but has less field precedent

The repository's old-architecture SPM jobs compile, run native tests, launch, and execute Maestro flows. The mechanism itself has no architecture branch. Still, RN Firebase's large-scale precedent is new-architecture-only, and old apps often carry older pods historically tested only as static libraries. A plain RN-template smoke app would complement RNTA's more specialized harness.

#### 13.14.8 Application extensions are intentionally outside target traversal

The helper adds its phase only to `:application` targets. Tests obtain frameworks through their host. Extensions have separate bundles, restricted APIs, size concerns, and embedding rules. Supporting Stripe from an extension would require an explicit product and packaging design, not removal of one predicate.

### 13.15 Alternatives considered and why they lost

#### 13.15.1 Vendor prebuilt XCFrameworks inside the pod path

stripe-ios publishes prebuilt artifacts, which could avoid source-package builds and support older RN. But local development pods do not offer a clean CocoaPods `prepare_command` download lifecycle for this use. The npm/podspec path would need network downloads, checksum management, cache invalidation, and large binary handling. Shipping many dynamic frameworks wholesale may also increase app size, and the strategy deepens CocoaPods-specific infrastructure during ecosystem migration.

This remains an emergency distribution option, not the preferred default.

#### 13.15.2 Convert `stripe-react-native` itself into a Swift package

That is a plausible long-term end state, but released React Native versions still use CocoaPods for native-module discovery, code generation, architecture dependencies, and autolinking. Prototype RN SPM setup scripts are not a stable consumer contract. Removing the podspec now would make the wrapper undiscoverable to ordinary RN apps.

The chosen hybrid carries useful pieces forward: package URL, exact version, and product selection can survive a later full migration.

#### 13.15.3 Require every application to add stripe-ios manually

This would move version pinning, product selection, Onramp conditionality, target attachment, module paths, multi-target behavior, and embedding onto every consumer. It also permits the application and wrapper to choose conflicting versions. A self-describing npm native dependency is a core benefit of autolinking; manual Xcode instructions would abandon it.

#### 13.15.4 Implement static SPM support immediately

Attaching Stripe package products directly to every consuming application target could, in principle, put definitions into the final static link. A correct design must handle multiple apps, tests, extensions, conditional Onramp, duplicate package owners, transitions, and dynamic-product embedding. It would be novel relative to the production RN Firebase path. Dynamic-only plus an honest fallback is smaller and proven enough for the first migration.

### 13.16 What was — and was no longer — copied from React Native Firebase

Prior art is a starting point, not a list of mandatory patches. Each omission reduces mutation surface; each later adoption should come with a reproduced failure or a root cause. The list has one instructive migration between those categories:

- **The UUID/counter corruption guard — originally omitted, adopted 2026-08-31.** The original decision was "wait until the corruption is reproduced." It was then reproduced and root-caused *upstream*: React Native fixed its own SPM manager in [#57576](https://github.com/facebook/react-native/pull/57576), shipping only in RN ≥ 0.88, with RNFB reproducing the corruption on RN 0.85.3 — meaning every supported RN release from 0.75 to 0.87 carries the latent bug, and `link_onramp_product` creates project objects through the same defective generator. The guard (§9.4.3–§9.4.4) fired on its very first CI run, on a stock Expo install (§12.3.7). The evidence rule worked exactly as intended — in both directions.
- `SWIFT_ENABLE_EXPLICIT_MODULES = NO` remains unported; stripe-ios builds under the branch's Xcode 26.4 jobs without that workaround. The exposure assessment sharpened, however: Firebase needs the setting because their pods import package modules that are *not exported as products* (`FirebaseCoreInternal`, `FirebaseSharedSwift`), and this repository's Swift imports `StripeCore` — a stripe-ios *target* that is likewise not a product of its `Package.swift`. If merchant reports ever match Firebase's symptom ("compilation search paths unable to resolve module dependency"), this is the first suspect; the clean long-term fix is upstream (export `StripeCore` as a product, or re-export the needed SPI through a product already linked).
- A global `-ObjC`; Stripe has no equivalent reflection-discovered Objective-C registration requiring it in observed builds.
- Binary-target Archive `.signature` repairs; stripe-ios-spm is source-only.
- FirebaseCore app-target linkage; the React Native app does not call an analogous Stripe native bootstrap API directly. (Their fix history is still worth knowing if §13.15.4's static investigation ever attaches products to the app target: declaring an `XCSwiftPackageProductDependency` alone does not *link* — a matching `PBXBuildFile` in the frameworks build phase is required.)

### 13.17 Maintainer playbook: update stripe-ios

1. Change only `stripe_version` in `stripe-react-native.podspec`.
2. Confirm that exact tag exists in `stripe-ios-spm`.
3. Read the new package manifest: confirm all six `CORE_PRODUCTS` and `StripeCryptoOnramp` still exist, inspect their transitive targets/resources, and note the iOS platform floor.
4. While fallback is promised, confirm equivalent pods at that exact version exist in trunk.
5. Run a default SPM install and inspect `Pods.xcodeproj`, package resolution, product dependencies, and absence of Stripe native pods in `Podfile.lock`.
6. Exercise Core without Onramp and Onramp with the extra product. The example always selects Onramp, so a Core-only fixture/check is valuable.
7. Run both architecture jobs, a release runtime flow, and fallback build.
8. Perform an upgrade over a previous pods-mode sandbox, not only a clean install.
9. Perform Archive/device/Expo checks required by the release bar.

Do not run `yarn update-pods` expecting it to update the default SPM graph. The version source of truth is the podspec constant; Xcode resolves its exact package requirement during the next normal build/install cycle.

### 13.18 Maintainer playbook: add or remove a Stripe module

When wrapper source starts importing a new stripe-ios module:

1. Identify the *public package product* that owns the supported consumer surface; do not confuse it with an internal target/module.
2. Decide whether it is unconditional Core behavior or belongs to a selected subspec.
3. Update the SPM representation (`CORE_PRODUCTS` or conditional linking logic).
4. Update the equivalent fallback pod dependency in the same change.
5. If repository tests expose a new transitive Clang module, update the harness-only module-map list based on an observed compile requirement.
6. Verify the framework embed wildcard remains appropriate; a Stripe-prefixed dynamic product is discovered automatically, but a differently named runtime framework would require deliberate handling.
7. Inspect app size and optional-feature isolation.

The parity rule is semantic, not purely name-based: a CocoaPods pod and SPM product can have different names while representing the same supported module set.

### 13.19 Maintainer playbook: change `stripe_spm.rb`

Preserve these invariants:

- **Stage placement:** Pods-project mutations run only in the post-install stage, while `Pods.xcodeproj` is in memory and unwritten; user-project mutations run only in the post-integrate stage (with the automatic post-install fallback for CocoaPods < 1.10) and save the user's project themselves. Never discover user targets by looking for CocoaPods' `[CP]` phases — §13.13.7 is what that costs.
- **Ordering:** the UUID guard runs before all normal post-install hooks; the integrity check and Stripe's Pods-project logic run after them.
- **Failure taxonomy:** guards that read CocoaPods *internals* degrade to warnings; checks that protect the user from a destroyed project or a broken configuration raise `Pod::Informative`.
- **Validation before mutation:** linkage and package presence fail before Onramp/app-project edits.
- **Public APIs:** use CocoaPods' public predicate/model surface and verify visibility against the real supported gem; where internals are unavoidable (the UUID guard), verify their shapes against the gem source and guard every read.
- **Mode exclusivity:** never declare SPM products and fallback Stripe pods in one intended path.
- **Idempotence:** repeated loads, podspec evaluation, hooks, and installs converge on one object/phase — and the UUID guard must stay idempotent so it composes with react-native-firebase's equivalent when both SDKs are installed.
- **Conditionality:** Onramp remains selected only by its subspec.
- **Narrow embedding:** inspect only Stripe framework names, copy only dynamic binaries, cover normal and Archive output, omit development metadata, sign when allowed, and do not overwrite an existing destination.
- **Persistence symmetry:** any new app-project mutation needs update and fallback cleanup behavior.
- **Target scope:** alter only application targets that actually consume the pod.
- **Distribution:** keep the helper in npm's `files` allowlist.
- **Diagnostics:** fail at the earliest owned stage with both a durable fix and the documented fallback where applicable.

Test against real CocoaPods/Xcode in addition to Ruby doubles. The hardest defects in this branch lived in lifecycle, method visibility, link boundaries, and generated output layouts—precisely the details a simplified unit stub tends to erase.

### 13.20 Release-readiness checklist

Before declaring the migration production-ready, establish each claim explicitly:

- [ ] npm tarball contains both the podspec and `stripe_spm.rb`.
- [ ] RN 0.75 capability boundary behaves as documented; at least one oldest-supported fixture is tested.
- [ ] Default SPM mode creates one exact package reference and correct Core products.
- [ ] Core-only and Core+Onramp product graphs differ only by intended optional products/transitives.
- [ ] Actual wrapper build type is a dynamic framework.
- [ ] Repeated `pod install` leaves application projects diff-free.
- [ ] SPM → fallback removes the phase; fallback → SPM recreates it.
- [ ] A dirty pods-mode sandbox migrates successfully.
- [ ] New and old RN architectures compile and run native tests.
- [ ] Release simulator/device launch exercises real Stripe UI and resources.
- [ ] Archive/export/TestFlight path embeds and signs required frameworks and passes validation.
- [ ] Expo clean prebuild/build succeeds with documented configuration and the plugin opt-out round-trips (continuously established by `expo-prebuild-ios`); an Expo runtime launch has been observed manually.
- [ ] Fallback resolves the exact pinned pods while those pods are promised.
- [ ] Public iOS platform requirement agrees with the effective package floor.
- [ ] README, changelog, and release communication state the action and fallback horizon.

### 13.21 Final synthesis

The solution is best understood as a carefully placed adapter between two build systems:

```text
npm/autolinking
      │ delivers wrapper podspec + helper
      ▼
CocoaPods
      │ creates a dynamic wrapper target and invokes lifecycle hooks
      ▼
React Native's SPM bridge
      │ writes the package and six Core product objects
      │ (inside Stripe's UUID guard / integrity check)
      ▼
Stripe's helper
      │ validates, adds conditional Onramp; then, after CocoaPods
      │ integrates and saves the app project, maintains runtime embedding
      ▼
Xcode/SPM
      │ resolves source, compiles, links; app phase embeds/signs
      ▼
dyld + running app
```

No layer is asked to replace another. npm still distributes the RN library. CocoaPods still autolinks and builds its wrapper. React Native supplies a standard project-object bridge. Xcode's native package machinery acquires stripe-ios. The Stripe helper handles only the gaps created by attaching an automatic-linkage package to a generated pod target.

That narrowness is the design's strength. It migrates the registry-dependent edge before the registry freezes while preserving existing React Native distribution, an exact native pin, optional-product boundaries, old-host compatibility, and a reversible transition.

### Chapter summary

- Diagnose by lifecycle stage and by the target that owns the failed compile/link/load operation.
- Most migration risk comes from the app-wide static-to-dynamic linkage change, not from architecture-specific Stripe code.
- The fallback, platform floor, Archive, Expo, build latency, and extension scope are real boundaries—not footnotes to hide.
- Alternatives either move complexity to every user, depend on unreleased RN machinery, deepen CocoaPods-specific distribution, or enlarge the first release with novel static integration.
- Maintenance depends on parity, ordering, idempotence, persistence cleanup, exact versioning, and layered real-tool validation.

### Review questions

1. An app compiles the wrapper but fails linking `react-native-safe-area-context` after enabling SPM. Why is adding a Stripe product unlikely to be the correct fix?
2. What does a `dyld` launch error prove already succeeded, and which stage should you inspect next?
3. Why can the fallback continue installing old versions after trunk is read-only but not follow an unpublished new stripe-ios release?
4. Name three Firebase workarounds intentionally omitted and the evidence rule for adding one.
5. What two dimensions must a native dependency change keep in parity, and what transition tests protect persistent state?

---

# Appendices

## Appendix A. Glossary

**Aggregate target.** CocoaPods model object connecting a group of pod targets to one or more targets in a user's Xcode project. It is the bridge used by `each_user_app_target` to answer "which applications actually consume this pod?"

**App bundle.** The `MyApp.app` directory installed on a device or simulator. It contains the executable, resources, metadata, and an embedded `Frameworks` directory for third-party dynamic libraries.

**Application target.** An Xcode target whose product is an app (`symbol_type == :application`). It owns the final bundle and therefore owns embedding of runtime frameworks.

**Archive.** Xcode's distribution-oriented build action/product. Archive output paths and signing behavior differ from ordinary Build output; package frameworks can appear under `OBJROOT/UninstalledProducts/<platform>`.

**Automatic linkage.** An SPM library-product declaration that omits explicit `.static` or `.dynamic` type. Xcode chooses a representation in the context of each build. stripe-ios uses automatic-linkage products.

**Autolinking.** React Native tooling that discovers native npm dependencies and adds their local podspecs to an iOS Podfile dependency set. It is why the wrapper podspec comes from `node_modules`, not trunk.

**Build configuration.** A named set of Xcode settings, commonly Debug or Release. Project mutations generally iterate all configurations because module paths and flags must work in each one.

**Build phase.** One ordered operation on an Xcode target, such as Compile Sources, Link Binary With Libraries, Copy Bundle Resources, or Run Script. This solution adds a Run Script phase to application targets.

**Build setting.** A key/value input to an Xcode build, such as `SWIFT_INCLUDE_PATHS`, `OTHER_LDFLAGS`, `OBJROOT`, or `FRAMEWORKS_FOLDER_PATH`. Values can reference other settings with `$(NAME)` or `${NAME}` syntax.

**Capability detection.** Selecting behavior by testing whether the required API exists—in this case `defined?(spm_dependency)`—rather than comparing a host's version string.

**Clang importer.** The Swift compiler component that exposes C and Objective-C declarations as Swift modules. `-Xcc` forwards a following option from Swift's driver to Clang.

**Code signing.** Cryptographic sealing of an app and its executable code so Apple platforms can verify origin/integrity. Dynamically embedded frameworks must be signed compatibly with their containing application.

**CocoaPods.** Ruby-based dependency manager and Xcode integrator used by React Native iOS projects. It resolves podspec graphs, builds a generated Pods project, and connects that project to app projects through a workspace.

**CocoaPods trunk.** The public registry/index of published podspec versions. It becomes read-only on December 2, 2026; old entries remain fetchable, but new versions cannot be published.

**Config plugin (Expo).** A function an npm package exports that transforms an Expo app's configuration and generated native projects during prebuild, driven by options in the app's `app.json`. This SDK's plugin gained a `disableSPM` option that injects the Podfile opt-out (§12.4.1).

**Continuous Native Generation (CNG).** Expo's model in which the `ios/` and `android/` directories are not committed: `expo prebuild` regenerates them from templates and config plugins. Consequences used in this book: the app has no hand-editable Podfile, and a `--clean` prebuild produces a fresh, never-integrated Xcode project that receives exactly one `pod install`.

**Dependency graph.** Directed relation in which build units depend on other units. This design has a CocoaPods graph and an SPM graph joined at one Xcode target.

**DerivedData.** Xcode's per-workspace/project area for package checkouts, intermediates, indexes, and built products. It is generated/cache state, not source.

**Deterministic UUID counter (CocoaPods).** `Pod::Project`'s replacement for Xcodeproj's random UUID generation: new object UUIDs are a 6-character project prefix, a 7-hex-digit counter, and a trailing `0`, minted with no collision check on the assumption that the project is always freshly generated. When the assumption breaks, `project.new` from a hook can overwrite an existing object — the corruption §9.4.3 guards against.

**Development pod.** A pod read from a local `:path` rather than fetched through a registry. React Native autolinking consumes npm native modules this way.

**Dynamic framework.** A `.framework` bundle whose executable is a dynamically linked Mach-O library. It has its own link step and must be present/signed in the app bundle at runtime.

**Dynamic library (dylib).** A linked binary loaded at runtime rather than copied into the application executable. `dyld` resolves its load commands when the process launches.

**Dynamic loader (`dyld`).** Apple's runtime component that loads Mach-O dynamic libraries and resolves their dependencies. A missing embedded framework yields `Library not loaded` even after a successful build.

**Embedding.** Copying a runtime framework into the correct containing bundle, normally `MyApp.app/Frameworks`, and signing it as needed. Linking names a dependency; embedding supplies its file.

**Exact-version requirement.** An SPM constraint accepting one semantic version only. `{ kind: 'exactVersion', version: '26.7.0' }` preserves the wrapper's tested native pin.

**Fallback mode.** The alternate path in which the podspec declares exact `Stripe*` CocoaPods dependencies. It is selected automatically without RN's bridge or explicitly with `$StripeDisableSPM = true`.

**Fabric.** React Native's newer rendering system. The example toggles it with the new architecture, but Stripe's package-acquisition mechanism itself is architecture-neutral.

**Framework.** An Apple bundle packaging a library with metadata and possibly headers/resources/modules. A framework can be static or dynamic; the directory suffix alone does not determine linkage.

**Header map.** Xcode mapping that lets compiler include paths resolve headers without mirroring their physical directory layout. The wrapper podspec enables `USE_HEADERMAP`.

**Heredoc.** Ruby syntax for a multiline string. `<<~'SCRIPT'` strips common indentation and suppresses Ruby interpolation, preserving Xcode shell variables for build time.

**Hermes.** React Native's JavaScript engine. Its prebuilt library also owns JSI symbol definitions in the tested configuration, which explains the RNTA DevSupport link repair.

**Hook.** A documented or wrapped lifecycle point where custom code runs. CocoaPods' `post_install`/`post_integrate` are DSL hooks; this solution also wraps the installer's `run_podfile_post_install_hooks` and `run_podfile_post_integrate_hooks` methods.

**Idempotence.** Property that one execution and repeated executions converge to the same state. Find-or-create product references, named phase updates, and no-op project saves implement it here.

**JSI.** React Native's C++ JavaScript Interface abstraction. Header ownership and definition ownership differ when Hermes is enabled, which is why undefined `facebook::jsi` symbols traced to `hermes.framework`.

**Linker.** Tool (`ld`) that combines object code/libraries and resolves undefined symbols into a linked binary. A static archive is not itself linked when created.

**Linkage.** Whether/how compiled code is incorporated into a consumer: statically copied at link time or dynamically loaded at runtime. Packaging as a framework is a separate dimension.

**Mach-O.** Apple's executable/object binary format. The `file` command inspects a framework's inner Mach-O binary to distinguish static archives from dynamically linked files.

**Module.** A named compiler-visible interface imported by Swift/Clang, such as `StripePayments`. Module visibility is distinct from whether implementations reach a link.

**Module map.** Clang text description mapping module names to C/Objective-C headers. Xcode generates maps for relevant package targets under its intermediates tree.

**npm.** JavaScript package manager/registry through which `@stripe/stripe-react-native` is distributed, including its native iOS sources, podspec, and Ruby helper.

**Object file.** Compiler output containing machine code plus defined/undefined symbols, commonly `.o`. Linkers combine object files into final linked products.

**Onramp subspec.** Optional `stripe-react-native/Onramp` slice. Its selection adds wrapper sources and, depending on mode, the `StripeCryptoOnramp` SPM product or CocoaPods pod.

**One Definition Rule (ODR).** C++ requirement that relevant entities not have conflicting multiple definitions in one program. RN omits `jsi.cpp` when Hermes supplies those definitions.

**Package (SPM).** Repository/directory described by `Package.swift`, containing targets and exposing products. Consumers resolve a package but attach product dependencies to targets.

**`Package.resolved`.** Xcode/SPM record of concrete package identities and revisions chosen for requirements. It is distinct from CocoaPods' `Podfile.lock`.

**`Package.swift`.** Swift manifest owned by the package author. The consumer project does not generate one when adding a remote package through Xcode project objects.

**PBX object graph.** Serialized object model inside `project.pbxproj`. Objects such as `PBXProject`, `PBXNativeTarget`, and `PBXShellScriptBuildPhase` reference one another by identifiers.

**Pod.** CocoaPods' unit of dependency distribution/integration, described by a podspec. `stripe-react-native` remains a pod in both modes.

**Podfile.** Application-owned executable Ruby configuration declaring pods, target structure, linkage, and lifecycle hooks.

**Podfile.lock.** Generated record of the resolved CocoaPods graph. It does not list SPM products or lock their revisions.

**Podspec.** Executable Ruby specification declaring a pod's metadata, source files, settings, subspecs, tests, and pod dependencies. Autolinking evaluates this repository's podspec from `node_modules`.

**Pods project (`Pods.xcodeproj`).** Generated Xcode project containing native targets for CocoaPods dependencies. It is replaced on install and is where RN writes package references/products for the wrapper target.

**Pod target model (`Pod::PodTarget`).** CocoaPods' resolved in-memory model, used here to inspect selected specs and public build-type predicates. It is not the same object as the Xcode native target.

**Post-install hook.** CocoaPods lifecycle point (`post_install` block; installer method `run_podfile_post_install_hooks`) that runs after the Pods project is generated in memory and before it is written to disk — the single window in which Pods-project mutations persist.

**Post-integrate hook.** CocoaPods lifecycle point (`post_integrate` block; installer method `run_podfile_post_integrate_hooks`, ≥ 1.10) that runs after `integrate_user_project` has mutated and saved the user's project. The sanctioned place for user-project mutations; code running here must save the project itself.

**Product (SPM).** Public package output a consumer requests. A product can aggregate multiple package targets and transitive resources/dependencies.

**React Native old/new architecture.** Two generations of RN native rendering/module/runtime integration. The test matrix covers both; the Stripe SPM helper does not branch on architecture.

**React Native Test App (RNTA).** Tool that generates a host native app and test target around a React Native library. Its specialized harness workarounds are not consumer setup.

**Registry resolution.** Looking up a named/versioned dependency in a central index. Fallback resolves Stripe podspecs through trunk; SPM mode resolves a Git package through Xcode.

**Ruby global.** Variable beginning `$`, visible process-wide. `$StripeDisableSPM` communicates an app-owned Podfile choice to a later-evaluated podspec.

**Sandbox (CocoaPods).** The `Pods` working directory and CocoaPods abstraction over downloaded sources, target support files, header stores, and related generated artifacts.

**Semantic version.** Numeric release identifier convention such as `26.7.0`. An exact SPM requirement uses the tag corresponding to that release rather than accepting a range.

**Source package.** Package compiled from source in the consumer's Xcode build, as stripe-ios-spm is here. It contrasts with an SPM `binaryTarget` or vendored XCFramework.

**Static framework.** Framework-shaped bundle containing a static archive. It does not gain a dynamic link boundary merely from its packaging and must not be embedded as runtime code.

**Static library/archive.** `.a` collection of object files. Creation uses an archiver, not a link that recursively absorbs dependencies; the final consumer must separately link definitions.

**Subspec.** Named optional/default slice of a CocoaPods pod. Selected subspecs merge into the root pod's native target rather than getting one target each.

**Swift module/interface.** Compiler metadata describing a Swift module's declarations. Finding it lets compilation proceed but does not place implementation code into a linker input.

**Target (Xcode).** Buildable unit with settings and phases producing an app, framework, test bundle, or other artifact. Do not confuse it with an SPM target or CocoaPods target model.

**Target (SPM).** Source/build unit declared inside a package manifest. SPM products expose one or more targets to consumers.

**Trunk freeze.** Transition of CocoaPods' public registry to permanent read-only state. It freezes available versions rather than deleting existing packages.

**User project.** Application-owned `.xcodeproj`, persistent across `pod install`. The helper edits it narrowly to install/remove the embed phase.

**Workspace.** `.xcworkspace` container that lets the application project, Pods project, and their schemes/build dependencies participate in one Xcode build.

**XCFramework.** Apple bundle containing library/framework variants for several platforms and architectures. RN's prebuilt core/dependencies use XCFrameworks; stripe-ios-spm in this solution builds source instead.

**xcconfig.** Text build-configuration file of `KEY = VALUE` assignments. CocoaPods generates xcconfigs and RNTA's harness patch amends DevSupport's `OTHER_LDFLAGS`.

**Xcodeproj.** Ruby library modeling and serializing Xcode's PBX object graph. CocoaPods, RN's SPM bridge, Stripe's helper, and the test harness all use it.

**`XCRemoteSwiftPackageReference`.** Project-level Xcode object containing a remote package repository URL and version requirement.

**`XCSwiftPackageProductDependency`.** Target-level Xcode object stating that a target consumes a named product from a package reference.

## Appendix B. Source coverage index

This index makes the guide's line-by-line scope auditable against the branch.

| Source | Relevant extent/change | Coverage |
|---|---:|---|
| `stripe-react-native.podspec` | full lines 1–95 | Chapter 7, including every unchanged context line and each branch change |
| RN `react_native_pods.rb` SPM entry points | two calls used by the design | §8.1 |
| RN `scripts/cocoapods/spm.rb` | full bridge behavior used by the design | §8.2–§8.5 |
| `stripe_spm.rb` | full lines 1–683 | Chapter 9; detailed range table in §9.13 |
| `example/ios/Podfile` | full lines 1–203 | Chapter 11; detailed range table in §11.8 |
| `package.json` | changed iOS test script and `files` entry | §12.1 |
| `example/ios/Podfile.lock` | generated semantic delta | §12.2 |
| `bitrise.yml` | all changed pipeline/workflow/install/build blocks | §12.3 |
| `scripts/test-expo-project`, `scripts/update-expo-plugins.js` | Expo CI validation flow and assertions | §12.3.7 |
| `README.md` | added iOS resolution section + plugin option | §12.4 |
| `CHANGELOG.md` | added Unreleased migration entry | §12.4 |
| `src/plugin/withStripe.ts` | the `disableSPM` option's changed lines | §12.4.1 |
| `CONTRIBUTING.md` | changed update instruction + added maintainer section | §12.5 |
| `SPM_FINDINGS.md` | non-executable research/decision record | §12.6 and §13.13–§13.16 |
| `SPM_SOLUTION_GUIDE.md` | non-executable companion explanation | Preface and §12.6 |
| `SPM_SOLUTION_GUIDE_fable.md` | original retained companion explanation | Preface and §12.6 |

The solution does not modify Swift/Objective-C wrapper APIs. Its production behavior comes from dependency declaration and build-project integration, so there is no omitted application source file whose runtime method body needs explanation.

## Appendix C. Practical inspection recipes

These commands are diagnostic examples. Run them from the appropriate app/repository path after generating the iOS workspace; generated paths vary by project.

### C.1 Confirm mutually exclusive CocoaPods state

```sh
rg -n 'Stripe|stripe-react-native' example/ios/Podfile.lock
```

In default SPM mode, expect local `stripe-react-native` entries but no underlying versioned Stripe native pods. In fallback, expect both wrapper and native pod graph.

### C.2 Inspect serialized package objects

```sh
rg -n 'stripe-ios|XCRemoteSwiftPackageReference|XCSwiftPackageProductDependency|StripeCryptoOnramp' \
  example/ios/Pods/Pods.xcodeproj/project.pbxproj
```

Expect one selected repository reference, Core products on the wrapper target, and Onramp only when its subspec was selected.

### C.3 Ask Xcode for the actual target settings

```sh
xcodebuild -workspace example/ios/example.xcworkspace \
  -scheme ReactTestApp \
  -showBuildSettings
```

Search the output for configuration/platform-expanded framework destinations and module paths. Do not infer final settings solely from one xcconfig; Xcode composes project, target, configuration, command-line, and inherited values.

### C.4 Inspect linked dynamic dependencies

```sh
otool -L path/to/stripe_react_native.framework/stripe_react_native
```

Each non-system `@rpath/...framework/...` line is a runtime load obligation. The corresponding dynamic framework must reach the containing app bundle.

### C.5 Classify and verify embedded artifacts

```sh
file path/to/ReactTestApp.app/Frameworks/StripePaymentSheet.framework/StripePaymentSheet
codesign -dvv path/to/ReactTestApp.app/Frameworks/StripePaymentSheet.framework
```

`file` distinguishes dynamic Mach-O from a static archive. `codesign -dvv` prints signature metadata (mostly on stderr). Use the exact framework named by the build or `dyld` failure.

### C.6 Verify publication contents

```sh
npm pack --dry-run
```

Inspect the list for both `stripe-react-native.podspec` and `stripe_spm.rb`. Repository presence alone is insufficient.

### C.7 Compare repeat-install persistence

Before and after a second unchanged `pod install`, inspect source-control changes to the application `.pbxproj`. A correctly idempotent phase should not multiply or rewrite the project. Then test both transitions—SPM to fallback and fallback to SPM—and inspect the named phase.

## Appendix D. Capstone scenarios with solutions

### D.1 The missing implementation puzzle

**Scenario.** `import StripePaymentSheet` compiles in `stripe-react-native`, but a static-library app link reports undefined `PaymentSheet` symbols.

**Solution.** Module visibility proves only that declarations were found. RN attached the SPM product to the wrapper target. A static wrapper archive has no link step that consumes the package implementation, and the application has no direct product dependency. Build the wrapper as a dynamic framework or select the pod fallback.

### D.2 The successful-build launch crash

**Scenario.** All link steps pass. Launch says `@rpath/StripePayments.framework/StripePayments` is missing.

**Solution.** Xcode chose a dynamic representation for an automatic-linkage product. Because the product was attached indirectly to a pod target, neither Xcode's app-target SPM embed logic nor CocoaPods' pod-framework embed phase copied it. Inspect the Stripe embed phase, source search locations, destination, and signing.

### D.3 The optional product puzzle

**Scenario.** A maintainer moves `StripeCryptoOnramp` into `CORE_PRODUCTS` to avoid special code.

**Solution.** Builds may pass, but dependency semantics regress: every consumer now pulls the Onramp product and identity/camera subtree. The special installer-time attachment exists because RN cannot map a subspec declaration to a separate target. Restore selection based on `pod_target.specs`.

### D.4 The old-RN puzzle

**Scenario.** RN 0.74 evaluates the new podspec. What happens before any Xcode build?

**Solution.** The helper loads, but `defined?(spm_dependency)` is nil. Activation does not run; fallback pod declarations do. During the wrapped lifecycle, `active?` is false, so only stale-phase cleanup can occur. No RN SPM bridge is required.

### D.5 The repeated-install puzzle

**Scenario.** `pod install` runs twice after no input change.

**Solution.** Pods project regeneration starts clean; RN recreates/finds the package and Core products, Stripe find-or-creates Onramp, and the app-project helper finds an identical phase/script. The block reports false, so the user project is not saved. End state is unchanged.

### D.6 The branch-test puzzle

**Scenario.** CI sets `OVERRIDE_STRIPE_IOS_VERSION_GIT_BRANCH=feature/foo`, but Xcode tries the lightweight mirror and cannot find it.

**Solution.** URL/requirement selection is inconsistent or stale helper code is being evaluated. A nonempty override must choose the full `stripe-ios.git` URL and a branch requirement together. Confirm the published/local helper and serialized package reference.

### D.7 The fresh-Expo-project puzzle

**Scenario.** An Expo app runs `expo prebuild --clean`. During its single `pod install`, the log prints `[stripe-react-native] Raised the Pods project's UUID counter past index 10523 before Swift Package references are written`, and the install completes. A teammate asks whether something went wrong, and whether the app project got the embed phase given that this project had never been integrated before.

**Solution.** Nothing went wrong — twice over. The log line is §9.4.3's guard reporting that it found (and repaired) a desynced deterministic UUID counter before React Native minted its package objects; on RN ≤ 0.87, without the repair, the first minted UUID could have overwritten an existing object and corrupted `Pods.xcodeproj` (§13.12). An install that prints the line and completes is healthy. The embed phase is also present after this single pass: target discovery uses `aggregate_target.user_targets` filtered to application targets — computed during analysis, independent of whether any `[CP]` phase exists yet — and the phase is added during the post-integrate stage, after CocoaPods appended its own phases and saved the project, so it even lands in the same position it would occupy on a long-integrated project. Both properties are asserted per PR by the `expo-prebuild-ios` workflow (§12.3.7).

## Appendix E. References and further reading

Repository sources, which are authoritative for this branch:

- [`stripe_spm.rb`](stripe_spm.rb) — shipped integration helper.
- [`stripe-react-native.podspec`](stripe-react-native.podspec) — mode selection and pod metadata.
- [`example/ios/Podfile`](example/ios/Podfile) — repository harness.
- [`bitrise.yml`](bitrise.yml) — CI coverage.
- [`SPM_FINDINGS.md`](SPM_FINDINGS.md) — research, decisions, failure history, and open work.
- [`SPM_SOLUTION_GUIDE.md`](SPM_SOLUTION_GUIDE.md) — companion reference narrative.
- [`SPM_SOLUTION_GUIDE_fable.md`](SPM_SOLUTION_GUIDE_fable.md) — original shorter narrative, intentionally unchanged.

Primary external material used by the branch investigation:

- React Native's CocoaPods/SPM bridge: `packages/react-native/scripts/cocoapods/spm.rb` and `spm_dependency` in `react_native_pods.rb` (RN 0.75+).
- React Native's upstream fix for the `spm_dependency` UUID-collision corruption (RN ≥ 0.88 only; §9.4.3's guard covers earlier releases): <https://github.com/facebook/react-native/pull/57576>
- stripe-ios package mirror: <https://github.com/stripe/stripe-ios-spm>
- stripe-ios source and manifest: <https://github.com/stripe/stripe-ios>
- React Native Firebase's SPM migration: <https://github.com/invertase/react-native-firebase/pull/8933> — and its post-launch fix history audited in §13.13.7, notably the post-integrate move (their issues #9219/#9158) and the Expo plugin opt-out (#9165).
- React Native Firebase SPM guidance: <https://rnfirebase.io/ios-spm>
- CocoaPods trunk read-only announcement: <https://blog.cocoapods.org/CocoaPods-Specs-Repo/>
- Firebase CocoaPods deprecation guidance: <https://firebase.google.com/docs/ios/cocoapods-deprecation>
- Callstack's RN/SPM integration overview: <https://www.callstack.com/blog/integrating-swift-package-manager-with-react-native-libraries>

---

If you can explain the two graphs, the dynamic link boundary, the record-then-apply lifecycle, the Onramp target mismatch, and the difference between linking and embedding without consulting the text, you understand the core solution. If you can also predict the fallback transition, locate a failure by stage, and state which changes are harness-only, you are ready to maintain it.
