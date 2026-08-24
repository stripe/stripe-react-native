# Checkout Elements Bridge Architecture

## Purpose

This document defines the lifecycle and event contracts between JavaScript and the native Checkout Elements implementations. It covers the bridge foundation only. Configuration mapping and Checkout operations are implemented in later pull requests.

## Controller identity and ownership

Each native Checkout controller is registered under an opaque UUID. JavaScript treats this value as a branded `CheckoutControllerId` and must not inspect or construct it.

The bridge supports multiple controllers at the same time. Every method call, view property, callback, and event must include the controller ID. Native code must look up the controller for each operation instead of storing a single active Checkout instance.

Ownership follows the JavaScript entry point:

- A controller returned by `createCheckout` is owned by its caller. The caller must invoke `destroy()`.
- A controller created by `useCheckout` is owned by the hook. The hook destroys it during reload, disable, and unmount.
- The native module owns registered instances until JavaScript destroys them or the React Native module is invalidated.

## Native instance contract

A registered `CheckoutControllerInstance` owns all resources for one controller:

- The native Checkout object.
- One stable Payment Element.
- One stable sheet presenter.
- Session observation tokens or jobs.
- Pending operations and callbacks.

The instance creates these resources before it is added to the registry. A partially initialized instance must not receive a controller ID.

`destroy()` must be idempotent. It cancels observation, completes pending work with a cancellation error, releases presentation resources, and prevents further callbacks. Removing an instance from the registry invokes `destroy()` exactly once. Native module invalidation removes and destroys every remaining instance.

## Event contract

Native code emits one atomic `checkoutControllerDidUpdate` snapshot instead of separate status and session events:

```ts
interface CheckoutControllerUpdate {
  controllerId: CheckoutControllerId;
  sequence: number;
  status: 'ready' | 'updating' | 'confirming' | 'destroyed';
  session: Checkout.Session;
}
```

Each registry assigns sequence numbers independently for each controller. The first event has sequence number `1`, and each later event increments it by one. Native code obtains the number immediately before emitting the snapshot.

JavaScript listeners enforce these rules:

- Ignore events for a different controller ID.
- Ignore an event whose sequence number is invalid.
- Ignore an event whose sequence number is less than or equal to the most recently applied number.
- Apply the status and session from an accepted event together.

These rules prevent delayed native callbacks, duplicate delivery, and events from replaced controllers from rolling JavaScript state backward.

## State ordering

Controller operations run serially on the platform UI thread. An operation emits its transitional state before starting work and emits its final state after the native Checkout session has updated.

The required transition shapes are:

```text
ready -> updating -> ready
ready -> confirming -> ready
ready -> destroyed
```

Only one mutation, server update, or confirmation can own a controller transition at a time. A destroyed controller cannot return to another state or issue a new sequence number.

## Android activity and presenter lifecycle

Checkout sheet presentation requires a `ComponentActivity`. Controller creation must fail without registering an instance when no compatible activity is available.

The Payment Element presenter is created once during controller initialization, before the activity reaches `STARTED`, and is retained by the controller instance. `present()` reuses this presenter. It must not create a new presenter for each call because presenter creation can register activity-result launchers.

A presenter is tied to the activity used to create it. If React Native moves to another activity, JavaScript must reload the Checkout controller. Destroying the old controller releases its presenter and pending presentation callback.

## Cleanup sequence

Explicit destruction follows this order:

1. Stop accepting new operations.
2. Emit the final `destroyed` snapshot with the next sequence number.
3. Remove the instance from the registry.
4. Cancel observers and pending operations.
5. Release the Payment Element and presenter.

Module invalidation skips JavaScript event delivery because the bridge is already shutting down. It clears the registry and destroys all instances directly.
