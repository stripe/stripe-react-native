# Checkout Elements Implementation Plan

## Goal

Implement the complete Checkout Elements React Native API reviewed for private preview. Assume the reviewed native iOS and Android APIs are available when implementation begins.

Implementation will land as a sequence of small, reviewable pull requests. Each implementation pull request will include its corresponding JavaScript, native, and unit test coverage. The final end-to-end test task is reserved for complete cross-platform workflow coverage.

## Implementation sequence

| PR | Deliverable | Primary outcome |
| --- | --- | --- |
| 1 | Bridge architecture | Establish controller identity, event routing, lifecycle, and cleanup contracts. |
| 2 | Configuration mapping | Support every reviewed Checkout and Payment Element configuration field. |
| 3 | Controller creation and session state | Create, observe, update, and destroy Checkout controllers. |
| 4 | Standard mutations | Implement email, shipping address, promotion code, and payment option mutations. |
| 5 | Server updates | Implement the native-to-JavaScript `runServerUpdate` handshake. |
| 6 | Confirmation | Support consistent cross-platform confirmation results and state. |
| 7 | Payment Element sheet | Present and dismiss the Payment Element sheet safely. |
| 8 | Inline Payment Element | Render the native Payment Element inline on both platforms. |
| 9 | `useCheckout` and hardening | Complete the hook, remove stubs, and prepare the API for private preview. |
| 10 | Test/playground screen | Make every reviewed API available for manual testing. |
| 11 | End-to-end tests | Verify the complete private-preview workflow in cross-platform CI. |

## 1. Define the bridge architecture

### Scope

- Use opaque controller IDs and native controller registries.
- Support multiple concurrent Checkout instances.
- Route events by controller ID.
- Define event ordering, controller ownership, and cleanup behavior.
- Define the Android activity and presenter lifecycle.

### Exit criteria

- The bridge contract is documented.
- Registry and event infrastructure have automated tests.
- Controllers and events cannot cross instance boundaries.

## 2. Implement configuration mapping

### Scope

- Map `Checkout.CreateOptions`, defaults, and addresses.
- Map Payment Element configuration.
- Map Apple Pay, Google Pay, and Link configuration.
- Map appearance, layout, billing collection, and terms.
- Register row-selection callbacks.

### Exit criteria

- Both platforms map every reviewed configuration field.
- Default values and optional fields behave consistently across platforms.
- Configuration mapping has unit and native tests.

## 3. Implement controller creation and session state

### Scope

- Replace the `createCheckout` stub.
- Serialize every `Checkout.Session` field.
- Return a stable JavaScript controller object.
- Implement `ready`, `updating`, `confirming`, and `destroyed` states.
- Emit session and status updates.
- Clean up during explicit destruction and module invalidation.

### Exit criteria

- Controllers can be created, observed, and destroyed reliably.
- State and session events arrive in a deterministic order.
- Destroyed controllers cannot emit events or accept operations.

## 4. Implement standard mutations

### Scope

- Implement `updateEmail`.
- Implement `updateShippingAddress`.
- Implement `applyPromotionCode`.
- Implement `removePromotionCode`.
- Implement `clearPaymentOption`.
- Map native errors and state transitions.

### Exit criteria

- Each mutation behaves consistently on both platforms.
- Successful mutations refresh the session.
- Failures return the reviewed error shape and restore the correct controller state.

## 5. Implement `runServerUpdate`

### Scope

- Add a two-phase native-to-JavaScript callback handshake.
- Correlate callbacks with unique operation IDs.
- Handle completion, rejection, timeout, cancellation, and controller destruction.
- Refresh the session after a successful update.

### Exit criteria

- Server updates cannot hang indefinitely.
- An update cannot complete against the wrong controller or operation.
- All success, failure, timeout, and cancellation paths have automated coverage.

## 6. Implement confirmation

### Scope

- Map iOS confirmation results directly.
- Adapt Android callbacks to JavaScript promises.
- Return `completed`, `canceled`, or `failed`.
- Enforce the `confirming` state.
- Prevent concurrent confirmation attempts.

### Exit criteria

- Confirmation has equivalent behavior and error mapping on both platforms.
- Controller state is correct before, during, and after confirmation.
- Duplicate or concurrent confirmation attempts fail predictably.

## 7. Implement Payment Element sheet presentation

### Scope

- Maintain one stable Payment Element per controller.
- Implement `present(): Promise<void>`.
- Handle the Android presenter and activity lifecycle.
- Handle dismissal and presentation errors.

### Exit criteria

- The sheet can be presented repeatedly.
- Presentation does not leak native resources or use stale controllers.
- Dismissal and failure behavior is consistent across platforms.

## 8. Implement inline Payment Element

### Scope

- Add a codegen native component.
- Add an iOS UIKit wrapper.
- Add an Android Compose wrapper.
- Pass the controller ID through the native view.
- Support dynamic height updates and cleanup.
- Support patch updates and both React Native architectures.

### Exit criteria

- The inline element renders and updates correctly on both platforms.
- Layout changes propagate without feedback loops or stale measurements.
- Mounting, controller replacement, and unmounting clean up native state.

## 9. Implement and harden `useCheckout`

### Scope

- Implement `enabled`, `getConfiguration`, and `reload`.
- Define controller ownership and destruction behavior.
- Handle reload and unmount races.
- Reject stale events from superseded controllers.
- Remove the remaining implementation stubs and `TODO(porter)` comments.
- Complete unit and native tests, API reports, documentation, and analytics validation.
- Keep the full API marked `@CheckoutSessionPrivatePreview`.

### Exit criteria

- The complete reviewed API is implemented on iOS and Android.
- The hook is safe during reloads, unmounts, and rapid configuration changes.
- TypeScript, lint, formatting, Jest, API Extractor, package type checks, and TypeDoc pass.
- No implementation stubs or temporary TODOs remain.

## 10. Create a test/playground screen

### Scope

- Exercise Checkout configuration and controller creation.
- Exercise all standard mutations.
- Exercise server updates and confirmation outcomes.
- Exercise sheet and inline Payment Element presentation.
- Exercise reloads, errors, and controller cleanup.

### Exit criteria

- Every reviewed API can be tested manually on iOS and Android.
- The screen exposes enough state and error information to diagnose failures.
- Manual test instructions cover the principal success and failure paths.

## 11. Add E2E tests

### Scope

- Cover the principal Checkout flow.
- Cover mutations and server updates.
- Cover confirmation success, cancellation, and failure.
- Cover sheet and inline presentation modes.
- Cover reload and cleanup behavior.

### Exit criteria

- Cross-platform CI verifies the complete private-preview workflow.
- Tests detect stale controller events, lifecycle regressions, and presentation failures.
- The supported private-preview flows are stable enough for external testing.

