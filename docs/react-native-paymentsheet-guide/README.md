# Understanding React Native and Android PaymentSheet

A short course for someone who knows basic JavaScript but is new to Android and React Native internals.

The central lesson is that the visible screen, the JavaScript runtime, and the native payment objects are different things. They can have different lifetimes. A screen disappearing does not necessarily destroy the JavaScript runtime, and JavaScript can do useful work while that screen is paused.

## How to use this guide

Read the modules in order the first time. Each module introduces a small set of ideas, applies them to checkout, and links to the next module.

| Module                                                          | What you will learn                                                                       |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| [1. Android foundations](01-android-foundations.md)             | Distinguish a process, an Application, an Activity, and a view.                           |
| [2. React Native architecture](02-react-native-architecture.md) | Locate the JavaScript runtime, `ReactHost`, React context, and native modules.            |
| [3. Stripe's layers](03-stripe-layers.md)                       | Separate the JS wrapper, Kotlin module, manager, native SDK object, and payment Activity. |
| [4. A deferred checkout](04-deferred-checkout.md)               | Trace initialization, presentation, the server request, and the final result.             |
| [5. Lifecycle and ownership](05-lifecycle-and-ownership.md)     | Understand pause, host replacement, disposal, and callback cancellation.                  |
| [6. The two PRs and their evidence](06-pr-analysis.md)          | Compare Activity ownership with request ownership without overstating the evidence.       |

Use the [glossary](glossary.md) when a term becomes confusing.

## Names used throughout

- **A** is the Android Activity displaying your React Native app.
- **S** is Stripe's native PaymentSheet Activity.
- **R** is the React Native instance, including its JavaScript runtime and associated native infrastructure.
- **B**, introduced later, is a different Android Activity that hosts React Native.

These letters identify particular objects. If Android destroys A and creates another instance of the same Activity class, that new instance is a different object.

## Scope

The main example is Android's ordinary PaymentSheet flow with `customFlow: false` and deferred intent creation. Custom-flow and embedded integrations are introduced where relevant, but their complete UI lifecycles are outside this guide.

The React Native lifecycle explanations were checked against React Native **0.81.5**. The repository source snapshot is **`21feb807`**, using Stripe Android **23.21.0**. Integrations and other versions can behave differently.

The PR discussion uses these snapshots:

- Original Activity-ownership PR: [#2691](https://github.com/stripe/stripe-react-native/pull/2691), reviewed implementation `1f77e3c9`.
- Request-correlation draft: [#2701](https://github.com/stripe/stripe-react-native/pull/2701), implementation `50c52703`.

The first five modules explain the architecture. The final module explicitly separates implementation facts, recorded reproduction results, and a lifecycle scenario that has not been reproduced in a real checkout.

Diagrams use Mermaid, which GitHub renders directly. In editors without Mermaid support, the diagram source remains visible in the Markdown files.

**Start with [Module 1: Android foundations](01-android-foundations.md).**
