## The problem

You're likely running into the same problem from https://github.com/stripe/stripe-react-native/issues/355 where a Chrome custom tab (web browser) is launched from your app's Stripe flow, like to perform 3DSecure confirmation, and if the app is backgrounded, that web browser gets killed.

## The solution

If your Android `launchMode` is set to `singleTask` (check your `AndroidManifest.xml`), that's why this is occurring. Unfortunately, this is not addressable by the Stripe React Native library.

Luckily, [@stianjensen shared a fix in the above Github issue](https://github.com/stripe/stripe-react-native/issues/355#issuecomment-1701323254). It is summarized here:

1. Modify your `MainApplication`:

```diff
public class MainApplication extends Application {
+   private ArrayList<Class> runningActivities = new ArrayList<>();

+   public void addActivityToStack (Class cls) {
+       if (!runningActivities.contains(cls)) runningActivities.add(cls);
+   }

+   public void removeActivityFromStack (Class cls) {
+       if (runningActivities.contains(cls)) runningActivities.remove(cls);
+   }

+   public boolean isActivityInBackStack (Class cls) {
+       return runningActivities.contains(cls);
+   }
}
```

2. create `LaunchActivity`

```diff
+ public class LaunchActivity extends Activity {
+    @Override
+    protected void onCreate(Bundle savedInstanceState) {
+        super.onCreate(savedInstanceState);
+        BaseApplication application = (BaseApplication) getApplication();
+        // check that MainActivity is not started yet
+        if (!application.isActivityInBackStack(MainActivity.class)) {
+            Intent intent = new Intent(this, MainActivity.class);
+            startActivity(intent);
+        }
+        finish();
+    }
+ }
```

3. Modify `AndroidManifest.xml` and move `android.intent.action.MAIN` and `android.intent.category.LAUNCHER` from your `.MainActivity` to `.LaunchActivity`

```diff
+        <activity android:name=".LaunchActivity">
+            <intent-filter>
+                <action android:name="android.intent.action.MAIN" />
+                <category android:name="android.intent.category.LAUNCHER" />
+            </intent-filter>
+        </activity>

...
-            <intent-filter>
-                <action android:name="android.intent.action.MAIN"/>
-                <category android:name="android.intent.category.LAUNCHER"/>
-            </intent-filter>
...
```

4. Modify `MainActivity` to look _something_ like the following (you likely already have an `onCreate` method that you need to modify):

```
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(null);
    ((BaseApplication) getApplication()).addActivityToStack(this.getClass());
  }

  @Override
  protected void onDestroy() {
    super.onDestroy();
    ((BaseApplication) getApplication()).removeActivityFromStack(this.getClass());
  }
```
