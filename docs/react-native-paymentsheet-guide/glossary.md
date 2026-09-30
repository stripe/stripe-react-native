# Glossary

[Course index](README.md)

| Term                             | Meaning in this guide                                                                                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Activity**                     | Android component responsible for a window and its lifecycle. It is not the same as a React navigation screen.                                                        |
| **Activity identity**            | The particular Activity object, not merely its class name. A recreated `MainActivity` is a new object.                                                                |
| **Activity Result registration** | Android machinery that connects launching another Activity with receiving its result. Its owner and lifetime matter.                                                  |
| **Application**                  | Android application-level object. Distinct from both an Activity and `ReactApplicationContext`.                                                                       |
| **Android process**              | Operating-system container holding app memory and threads. It can contain multiple Activities.                                                                        |
| **Bridge / JS-native boundary**  | Communication between JavaScript and native code. The term here does not require the legacy serialized RN bridge.                                                     |
| **Callback**                     | A function invoked to report an event or answer. Always identify which callback: merchant handler, intent response, or final checkout result.                         |
| **Client secret**                | The value supplied to the client SDK so it can continue work with a particular intent. It is not proof that checkout has finished.                                    |
| **`CompletableDeferred`**        | Kotlin coroutine result holder. Code can suspend awaiting it, and another piece of code can complete or cancel it.                                                    |
| **Confirmation token**           | Native SDK confirmation data passed to the confirmation-token handler variant. The handler still supplies an intent result back to native code.                       |
| **Deferred intent flow**         | Integration in which the intent client secret is supplied during confirmation instead of at initial PaymentSheet setup.                                               |
| **Disposal**                     | Explicit cleanup of an object and its owned work. A manager is not automatically disposed merely because a view is hidden.                                            |
| **Embedded Payment Element**     | Native payment UI rendered within a React Native view, with a lifecycle different from the ordinary PaymentSheet Activity flow.                                       |
| **Event listener**               | JS registration that receives a named native event and invokes application code. It belongs to its JavaScript environment.                                            |
| **FlowController**               | Native SDK controller used for custom-flow PaymentSheet integration. It separates payment-option selection from confirmation.                                         |
| **Hermes**                       | A JavaScript engine commonly used to execute React Native application code.                                                                                           |
| **Host Activity**                | Activity displaying the React Native view hierarchy. A descriptive term, not the `ReactHost` class.                                                                   |
| **Initialization ID**            | An identifier for a configuration/handler registration. Different from an identifier for one request. Per-initialization JS handler selection is separate from #2701. |
| **`KeepJsAwakeTask`**            | Wrapper helper that prevents React Native timer pausing while Stripe UI is presented. It does not resume the host Activity.                                           |
| **Native module**                | Native code exposed through React Native's module system, such as `StripeSdkModule`.                                                                                  |
| **Paused**                       | An Activity has received `onPause`. It can still exist and may still be visible. This does not mean the JS engine was destroyed.                                      |
| **`PaymentSheet` object**        | Stripe Android SDK controller object used to configure and launch a payment flow. It is not an Activity.                                                              |
| **`PaymentSheetActivity`**       | Native Android Activity displaying ordinary Stripe PaymentSheet UI. S in the diagrams.                                                                                |
| **`PaymentSheetManager`**        | Kotlin adapter/state holder in the React Native SDK. It holds native payment objects and is not itself an Activity.                                                   |
| **Pending request**              | An operation that has asked for a response and has not yet completed or been canceled.                                                                                |
| **Promise**                      | JavaScript representation of an eventual result. The intent-creation exchange and the final presentation result are separate asynchronous operations.                 |
| **`ReactApplicationContext`**    | Native-side React context wrapping application context and connecting modules to their React Native instance.                                                         |
| **`ReactHost`**                  | New-architecture React Native infrastructure object managing a React Native instance. Not a screen or Activity.                                                       |
| **React Native instance**        | The JS runtime plus its associated native infrastructure. R in the diagrams.                                                                                          |
| **React screen**                 | A set of components in a navigation flow. Multiple React screens commonly share one Android Activity.                                                                 |
| **Request ID**                   | Identifier for one asynchronous exchange. #2701 uses it to match a response to its pending native request.                                                            |
| **Resumed**                      | Activity lifecycle position associated with interactive UI in the normal single-window flow. Not a general prerequisite for JS/native response completion.            |
| **`StripeSdkModule`**            | Kotlin React Native module that receives Stripe JS API calls and sends native events back to that RN instance.                                                        |
| **Surface / root view**          | The React Native UI root attached to native views. A surface's lifetime should not be equated automatically with the runtime's lifetime.                              |
| **`currentActivity`**            | Activity attached to the React context, or null. It is not a general pointer to the topmost Activity in the Android process.                                          |
