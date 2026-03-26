import {
  type ConfigPlugin,
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
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
    const mainActivityTheme =
      mainActivity.$['android:theme'] || '@style/AppTheme';

    removeIntentFilter(mainActivity, 'android.intent.category.LAUNCHER');
    ensureLaunchActivity(mainApplication, mainActivityTheme);

    return config;
  });

  resultConfig = withMainApplication(resultConfig, (config) => {
    const { modResults } = config;

    if (
      modResults.contents.includes(
        '@generated begin @appchoose/react-native-app/launch-activity-callbacks'
      )
    )
      return config;

    const withImports = AndroidConfig.CodeMod.addImports(
      modResults.contents,
      ['android.app.Activity', 'android.os.Bundle'],
      true
    );

    const withMembers = CodeGenerator.mergeContents({
      src: withImports,
      comment: '  //',
      tag: '@appchoose/react-native-app/launch-activity-members',
      offset: 0,
      anchor: / {2}override val reactHost:/,
      newSrc: `  private val runningActivities = ArrayList<Class<*>>()

  private val lifecycleCallbacks = object : ActivityLifecycleCallbacks {
    override fun onActivityCreated(activity: Activity, p1: Bundle?) {
      if (!runningActivities.contains(activity::class.java)) {
        runningActivities.add(activity::class.java)
      }
    }

    override fun onActivityStarted(p0: Activity) = Unit
    override fun onActivityResumed(p0: Activity) = Unit
    override fun onActivityPaused(p0: Activity) = Unit
    override fun onActivityStopped(p0: Activity) = Unit
    override fun onActivitySaveInstanceState(p0: Activity, p1: Bundle) = Unit

    override fun onActivityDestroyed(activity: Activity) {
      runningActivities.remove(activity::class.java)
    }
  }

  fun isActivityInBackStack(cls: Class<*>): Boolean {
    return runningActivities.contains(cls)
  }`,
    });

    const withOnCreate = CodeGenerator.mergeContents({
      src: withMembers.contents,
      comment: '    //',
      tag: '@appchoose/react-native-app/launch-activity-callbacks',
      offset: 1,
      anchor: /super\.onCreate\(\)/,
      newSrc: `    registerActivityLifecycleCallbacks(lifecycleCallbacks)`,
    });

    config.modResults.contents = withOnCreate.contents;

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
  application: AndroidConfig.Manifest.ManifestApplication,
  theme: string
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
      'android:theme': theme,
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
