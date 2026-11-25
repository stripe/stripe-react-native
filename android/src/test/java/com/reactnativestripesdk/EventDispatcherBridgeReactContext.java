package com.reactnativestripesdk;

import static org.mockito.Mockito.mock;

import android.content.Context;
import com.facebook.react.bridge.BridgeReactContext;
import com.facebook.react.uimanager.events.EventDispatcher;
import com.facebook.react.uimanager.events.EventDispatcherProvider;

/**
 * React Native 0.87's UIManagerHelper.getEventDispatcher requires the context to be an
 * EventDispatcherProvider, which is internal to React Native and so can only be implemented from
 * Java.
 */
public class EventDispatcherBridgeReactContext extends BridgeReactContext
    implements EventDispatcherProvider {
  private final EventDispatcher eventDispatcher = mock(EventDispatcher.class);

  public EventDispatcherBridgeReactContext(Context context) {
    super(context);
  }

  @Override
  public EventDispatcher getEventDispatcher() {
    return eventDispatcher;
  }
}
