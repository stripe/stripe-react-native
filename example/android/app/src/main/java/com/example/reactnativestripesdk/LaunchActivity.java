package com.example.reactnativestripesdk;

import android.os.Bundle;
import android.app.Activity;
import android.content.Intent;

public class LaunchActivity extends Activity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    MainApplication application = (MainApplication) getApplication();
    // check that MainActivity is not started yet
    if (!application.isActivityInBackStack(MainActivity.class)) {
      Intent intent = new Intent(this, MainActivity.class);
      startActivity(intent);
    }
    finish();
  }
}
