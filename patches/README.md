# Old Architecture Codegen Fix

This patch fixes the codegen issue that occurs when using `@stripe/stripe-react-native` with React Native 0.74+ in the old architecture.

## The Problem

When using React Native 0.74+ with the old architecture, you may encounter this error during pod install:

```
UnsupportedModulePropertyParserError: Module NativeStripeSdkModule: TypeScript interfaces extending TurboModule must only contain 'FunctionTypeAnnotation's. Property 'onConfirmHandlerCallback' refers to a 'TSTypeReference'.
```

This occurs because the React Native codegen in the old architecture doesn't support `EventEmitter` properties in TurboModule interfaces.

## The Solution

This patch converts all `EventEmitter` properties to callback function methods, making them compatible with the old architecture codegen.

## How to Apply

### Option 1: Manual patch command

```bash
cd node_modules/@stripe/stripe-react-native
patch -p0 < patches/old-arch-codegen-fix.patch
```

### Option 2: Using patch-package (Recommended)

1. Install patch-package as a dev dependency:
   ```bash
   npm install --save-dev patch-package
   ```

2. Apply the patch manually first:
   ```bash
   cd node_modules/@stripe/stripe-react-native
   patch -p0 < ../../patches/old-arch-codegen-fix.patch
   ```

3. Generate a patch-package patch:
   ```bash
   npx patch-package @stripe/stripe-react-native
   ```

4. Add postinstall script to your `package.json`:
   ```json
   {
     "scripts": {
       "postinstall": "patch-package"
     }
   }
   ```

This ensures the patch is automatically applied whenever you run `npm install`.

## When to Use This Patch

- ✅ React Native 0.74+ with old architecture (`RCT_NEW_ARCH_ENABLED` != 1)
- ✅ Expo SDK 51+ with old architecture
- ❌ React Native with new architecture enabled (patch not needed)

## Verification

After applying the patch, verify it worked by checking that:

1. The file `node_modules/@stripe/stripe-react-native/src/specs/NativeStripeSdkModule.ts` no longer imports `EventEmitter`
2. All event properties (like `onConfirmHandlerCallback`) are now callback function methods instead of `EventEmitter` properties
3. Your pod install completes successfully

## Support

If you encounter issues with this patch, please:
1. Ensure you're using the old architecture (new architecture doesn't need this patch)
2. Check that the patch applied correctly
3. Report issues to the Stripe React Native repository 