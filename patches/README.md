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