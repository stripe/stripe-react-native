# Contributing

We want this community to be friendly and respectful to each other. Please follow it in all your interactions with the project.

## Development workflow

### Running the example app

- Install the dependencies
  - `yarn bootstrap`
- Start the example
  - Terminal 1: `yarn example start`
  - Terminal 2: depending on what platform you want to build for run either
    - `yarn example ios`
    - or
    - `yarn example android`

The example app uses a pre-configured demo backend, so no server setup is required.

To edit the Objective-C files, open `example/ios/StripeSdkExample.xcworkspace` in XCode and find the source files at `Pods > Development Pods > stripe-react-native`.

To edit the Kotlin files, open `example/android` in Android studio and find the source files at `reactnativestripesdk` under `Android`.

Use your editor of choice for editing the Typescript files in `src/` and `example/`.

Make sure your code passes TypeScript and ESLint. Run the following to verify:

```sh
yarn typescript
yarn lint
```

To fix formatting errors, run the following:

```sh
yarn lint --fix
```

Remember to add tests for your change if possible. End to end tests are done with [Maestro](https://maestro.mobile.dev/), and can be found in `e2e-tests/`. Read the [test section below](#tests) for more details on setup.

## Testing inside of the Expo Go app

> This section only needs to be done during an Expo SDK release.

Inside of the Expo Go app, you are limited to using the `react-native` version that comes bundled inside. To test the example app accurately, you must modify `example/package.json` by:

1. Navigate to the example app directory: `cd example/`
2. Install the Expo SDK: `yarn add expo`
3. Set the `sdkVersion` in `example/app.json` to the version you want to test
4. Install the proper versions of `react` and `react-native`: `expo install react react-native`
   - There may be other dependencies to update. If there are, it will be indicated in the logs when running the app.
5. Use `expo client:install:[android|ios]` to install Expo Go on your simulator
6. Run `expo start` to run the app.

### Install library as local repository

To install local/private packages across local environment we recommend use [yalc](https://github.com/wclr/yalc) tool.

- Run `yalc publish` in `@stripe/stripe-react-native` package to publish all the files that should be published in remote NPM registry.
- Run `yalc add @stripe/stripe-react-native` in your dependent project, which will copy the current version from the store to your project's .yalc folder and inject a file:.yalc/@stripe/stripe-react-native into package.json.
- In your dependent project run `yarn install` and `cd ios && pod install`

### Commit message convention

We follow the [conventional commits specification](https://www.conventionalcommits.org/en) for our commit messages:

- `fix`: bug fixes, e.g. fix crash due to deprecated method.
- `feat`: new features, e.g. add new method to the module.
- `refactor`: code refactor, e.g. migrate from class components to hooks.
- `docs`: changes into documentation, e.g. add usage example for the module..
- `test`: adding or updating tests, eg add integration tests using Maestro or native unit tests.
- `chore`: tooling changes, e.g. change CI config.

Our pre-commit hooks verify that your commit message matches this format when committing.

### Linting

[ESLint](https://eslint.org/), [Prettier](https://prettier.io/), [TypeScript](https://www.typescriptlang.org/)

We use [TypeScript](https://www.typescriptlang.org/) for type checking, [ESLint](https://eslint.org/) with [Prettier](https://prettier.io/) for linting and formatting the code, and [Jest](https://jestjs.io/) for testing.

Our pre-commit hooks verify that the linter and tests pass when committing.

### Tests

We use [Maestro](https://maestro.mobile.dev/) for e2e testing.
In order to run tests locally you have to install and configure Maestro following its [documentation](https://maestro.mobile.dev/getting-started/installing-maestro).

1. run `yarn run-example-ios` / `yarn run-example-android` to build and open example app.
2. run `yarn test:e2e:ios` / `yarn test:e2e:android` to run all e2e tests.
3. You can also run a single test with `yarn test-android ./path/to/testFile.yml` | `yarn test-ios ./path/to/testFile.yml`

### Scripts

The `package.json` file contains various scripts for common tasks:

- `yarn bootstrap`: setup project by installing all dependencies and pods.
- `yarn typescript`: type-check files with TypeScript.
- `yarn lint`: lint files with ESLint.
- `yarn test`: run unit tests with Jest.
- `yarn example start`: start the Metro server for the example app.
- `yarn example android`: run the example app on Android.
- `yarn example ios`: run the example app on iOS.

### Sending a pull request

> **Working on your first pull request?** You can learn how from this _free_ series: [How to Contribute to an Open Source Project on GitHub](https://egghead.io/series/how-to-contribute-to-an-open-source-project-on-github).

When you're sending a pull request:

- Prefer small pull requests focused on one change.
- Verify that linters and tests are passing.
- Review the documentation to make sure it looks good.
- Follow the pull request template when opening a pull request.
- For pull requests that change the API or implementation, discuss with maintainers first by opening an issue.

## Code of Conduct

### Our Pledge

We as members, contributors, and leaders pledge to make participation in our community a harassment-free experience for everyone, regardless of age, body size, visible or invisible disability, ethnicity, sex characteristics, gender identity and expression, level of experience, education, socio-economic status, nationality, personal appearance, race, religion, or sexual identity and orientation.

We pledge to act and interact in ways that contribute to an open, welcoming, diverse, inclusive, and healthy community.

### Our Standards

Examples of behavior that contributes to a positive environment for our community include:

- Demonstrating empathy and kindness toward other people
- Being respectful of differing opinions, viewpoints, and experiences
- Giving and gracefully accepting constructive feedback
- Accepting responsibility and apologizing to those affected by our mistakes, and learning from the experience
- Focusing on what is best not just for us as individuals, but for the overall community

Examples of unacceptable behavior include:

- The use of sexualized language or imagery, and sexual attention or
  advances of any kind
- Trolling, insulting or derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information, such as a physical or email
  address, without their explicit permission
- Other conduct which could reasonably be considered inappropriate in a
  professional setting

### Enforcement Responsibilities

Community leaders are responsible for clarifying and enforcing our standards of acceptable behavior and will take appropriate and fair corrective action in response to any behavior that they deem inappropriate, threatening, offensive, or harmful.

Community leaders have the right and responsibility to remove, edit, or reject comments, commits, code, wiki edits, issues, and other contributions that are not aligned to this Code of Conduct, and will communicate reasons for moderation decisions when appropriate.

### Scope

This Code of Conduct applies within all community spaces, and also applies when an individual is officially representing the community in public spaces. Examples of representing our community include using an official e-mail address, posting via an official social media account, or acting as an appointed representative at an online or offline event.

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported to the community leaders responsible for enforcement at [INSERT CONTACT METHOD]. All complaints will be reviewed and investigated promptly and fairly.

All community leaders are obligated to respect the privacy and security of the reporter of any incident.

### Enforcement Guidelines

Community leaders will follow these Community Impact Guidelines in determining the consequences for any action they deem in violation of this Code of Conduct:

#### 1. Correction

**Community Impact**: Use of inappropriate language or other behavior deemed unprofessional or unwelcome in the community.

**Consequence**: A private, written warning from community leaders, providing clarity around the nature of the violation and an explanation of why the behavior was inappropriate. A public apology may be requested.

#### 2. Warning

**Community Impact**: A violation through a single incident or series of actions.

**Consequence**: A warning with consequences for continued behavior. No interaction with the people involved, including unsolicited interaction with those enforcing the Code of Conduct, for a specified period of time. This includes avoiding interactions in community spaces as well as external channels like social media. Violating these terms may lead to a temporary or permanent ban.

#### 3. Temporary Ban

**Community Impact**: A serious violation of community standards, including sustained inappropriate behavior.

**Consequence**: A temporary ban from any sort of interaction or public communication with the community for a specified period of time. No public or private interaction with the people involved, including unsolicited interaction with those enforcing the Code of Conduct, is allowed during this period. Violating these terms may lead to a permanent ban.

#### 4. Permanent Ban

**Community Impact**: Demonstrating a pattern of violation of community standards, including sustained inappropriate behavior, harassment of an individual, or aggression toward or disparagement of classes of individuals.

**Consequence**: A permanent ban from any sort of public interaction within the community.

### Attribution

This Code of Conduct is adapted from the [Contributor Covenant][homepage], version 2.0,
available at https://www.contributor-covenant.org/version/2/0/code_of_conduct.html.

Community Impact Guidelines were inspired by [Mozilla's code of conduct enforcement ladder](https://github.com/mozilla/diversity).

[homepage]: https://www.contributor-covenant.org

For answers to common questions about this code of conduct, see the FAQ at
https://www.contributor-covenant.org/faq. Translations are available at https://www.contributor-covenant.org/translations.

### Maintaining the Stripe old-architecture patch

We ship `patches/old-arch-codegen-fix.patch` so that the library builds on **React-Native ≥ 0.74 in the old architecture** (it converts `EventEmitter` properties into callback functions so code-gen doesn't fail).

#### When to Update the Patch

The patch needs to be updated when:
- You modify `src/specs/NativeStripeSdkModule.ts` and add/remove/change EventEmitter properties
- You upgrade dependencies that might affect the TurboModule interface
- The patch fails to apply during testing or CI

#### How to Update the Patch

1. **Make your changes to the source code** in `src/specs/NativeStripeSdkModule.ts`

2. **Create a backup of the original file**:
   ```bash
   cp src/specs/NativeStripeSdkModule.ts src/specs/NativeStripeSdkModule.ts.orig
   ```

3. **Apply the old-arch compatible changes**:
   - Remove the `EventEmitter` import from the imports section
   - Convert all `EventEmitter` properties to callback function methods
   - For example, change:
     ```typescript
     onConfirmHandlerCallback: EventEmitter<{
       paymentMethod: UnsafeObject<PaymentMethod.Result>;
       shouldSavePaymentMethod: boolean;
     }>;
     ```
     To:
     ```typescript
     onConfirmHandlerCallback(
       callback: (event: {
         paymentMethod: UnsafeObject<PaymentMethod.Result>;
         shouldSavePaymentMethod: boolean;
       }) => void
     ): void;
     ```

4. **Generate the new patch**:
   ```bash
   diff -u src/specs/NativeStripeSdkModule.ts.orig src/specs/NativeStripeSdkModule.ts > patches/old-arch-codegen-fix.patch
   ```

5. **Test the patch**:
   ```bash
   # Test that the patch applies cleanly
   git stash  # stash your changes
   patch -p0 < patches/old-arch-codegen-fix.patch
   # Verify the file looks correct
   git stash pop  # restore your changes
   ```

6. **Commit the updated patch**:
   ```bash
   git add patches/old-arch-codegen-fix.patch
   git commit -m "chore: update old-arch codegen fix patch"
   ```
