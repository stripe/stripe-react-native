import {
  AndroidConfig,
  ConfigPlugin,
  withAndroidManifest,
  withDangerousMod,
  withMainActivity,
  withMainApplication,
  CodeGenerator,
} from '@expo/config-plugins';
import fs from 'node:fs';
import path from 'node:path';

const LAUNCH_ACTIVITY_TEMPLATE = fs.readFileSync(
  path.join(__dirname, 'LaunchActivity.kt.template'),
  'utf-8'
);

export const withAndroidLaunchActivity: ConfigPlugin<{
  addLaunchActivity?: boolean;
}> = (expoConfig, { addLaunchActivity = false }) => {
  if (!addLaunchActivity) return expoConfig;
  const androidPackage = expoConfig.android?.package;
  if (!androidPackage) return expoConfig;

  let resultConfig = withDangerousMod(expoConfig, [
    'android',
    async (config) => {
      const appSrcDir = path.join(
        config.modRequest.platformProjectRoot,
        'app/src/main/java/',
        ...config.android!.package!.split('.')
      );
      const filePath = path.join(appSrcDir, 'LaunchActivity.kt');
      fs.mkdirSync(appSrcDir, { recursive: true });
      const fileContent = LAUNCH_ACTIVITY_TEMPLATE.replace(
        /{{package}}/g,
        config.android!.package!
      );
      fs.writeFileSync(filePath, fileContent);
      return config;
    },
  ]);

  resultConfig = withAndroidManifest(resultConfig, (config) => {
    const mainApplication = config?.modResults?.manifest?.application?.[0];

    if (!mainApplication) throw new Error('MainApplication missing!');
    if (!mainApplication.activity)
      throw new Error('MainApplication has no activities!');

    const mainActivityIndex = mainApplication.activity?.findIndex(
      (activity) => activity.$['android:name'] === '.MainActivity'
    );
    if (mainActivityIndex === -1) throw new Error('Missing MainActivity!');

    const mainActivity = mainApplication.activity[mainActivityIndex];
    removeIntentFilter(mainActivity, 'android.intent.category.LAUNCHER');
    ensureLaunchActivity(mainApplication);

    return config;
  });

  resultConfig = withMainApplication(resultConfig, (config) => {
    const { modResults } = config;

    if (
      config.modResults.contents.includes(
        '@generated begin @stripe/stripe-react-native'
      )
    )
      return config;

    const merged = CodeGenerator.mergeContents({
      src: modResults.contents,
      comment: '  //',
      tag: '@stripe/stripe-react-native',
      offset: 0,
      anchor: / {2}override val reactNativeHost:/,
      newSrc: `  private val runningActivities = ArrayList<Class<*>>()

  fun addActivityToStack(cls: Class<*>) {
      if (!runningActivities.contains(cls)) {
          runningActivities.add(cls)
      }
  }

  fun removeActivityFromStack(cls: Class<*>) {
      runningActivities.remove(cls)
  }

  fun isActivityInBackStack(cls: Class<*>): Boolean {
      return runningActivities.contains(cls)
  }`,
    });
    config.modResults.contents = merged.contents;

    return config;
  });

  resultConfig = withMainActivity(resultConfig, (config) => {
    if (
      config.modResults.contents.includes(
        '@generated begin @stripe/stripe-react-native'
      )
    )
      return config;
    const { modResults } = config;
    const { language } = modResults;

    if (
      config.modResults.contents.includes(
        '@generated begin @stripe/stripe-react-native'
      )
    )
      return config;

    const withImports = AndroidConfig.CodeMod.addImports(
      modResults.contents,
      [`${androidPackage}.MainApplication`],
      language === 'java'
    );

    const merged = CodeGenerator.mergeContents({
      src: withImports,
      comment: '    //',
      tag: '@stripe/stripe-react-native',
      offset: 1,
      anchor: /super\.onCreate\(null\)/,
      newSrc: `\
    val app = application as MainApplication
    app.addActivityToStack(this::class.java)
  }

  override fun onDestroy() {
    super.onDestroy()
    val app = application as MainApplication
    app.removeActivityFromStack(this::class.java)
`,
    });

    config.modResults.contents = merged.contents;
    return config;
  });

  return resultConfig;
};

/** Removes all intent-filters with an action matching the specified name */
function removeIntentFilter(
  activity: AndroidConfig.Manifest.ManifestActivity,
  intentFilterCategoryName: string
) {
  if (!activity['intent-filter']) return;
  activity['intent-filter'] = activity['intent-filter'].filter(
    (filter) =>
      !filter.category?.find(
        (category) => category.$['android:name'] === intentFilterCategoryName
      )
  );
}

function ensureLaunchActivity(
  application: AndroidConfig.Manifest.ManifestApplication
) {
  application.activity ??= [];
  const activities = application.activity;
  const hasLaunchActivity = activities.some(
    (activity) => activity.$['android:name'] === '.LaunchActivity'
  );
  if (hasLaunchActivity) return;

  activities.push({
    '$': {
      'android:exported': 'true',
      'android:name': '.LaunchActivity',
    },
    'intent-filter': [
      {
        action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
        category: [
          { $: { 'android:name': 'android.intent.category.LAUNCHER' } },
        ],
      },
    ],
  });
}
