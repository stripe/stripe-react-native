import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import type { CollectionOptions } from './connectTypes';
import {
  EmbeddedComponent,
  type CommonComponentProps,
} from './EmbeddedComponent';
import { NavigationBar } from './NavigationBar';
import { useConnectComponents } from './ConnectComponentsProvider';

/** The notification banner's current initial loading state. @experimental */
export type NotificationBannerInitialLoadState =
  | 'loading'
  | 'loaded'
  | 'failed';

/** Notification counts emitted by the banner. @experimental */
export type NotificationBannerChange = {
  /** Total visible notifications. */
  total: number;
  /** Notifications that require user action. */
  actionRequired: number;
};

/** An imperative snapshot of notification banner state. @experimental */
export type ConnectNotificationBannerRef = {
  /** The banner's current initial loading state. */
  readonly initialLoadState: NotificationBannerInitialLoadState;
};

/** Props for {@link ConnectNotificationBanner}. @experimental */
export type ConnectNotificationBannerProps = CommonComponentProps & {
  /** Controls which account requirements are collected by notification tasks. */
  collectionOptions?: CollectionOptions;
  /** Navigation title for full-screen tasks opened from the banner. */
  taskTitle?: string;
  /** Called when total or action-required notification counts change. */
  onNotificationsChange?: (change: NotificationBannerChange) => void;
  /** Called when the banner publishes a new content height. */
  onContentHeightChange?: (height: number) => void;
  /** Called immediately with `loading`, then once with `loaded` or `failed`. */
  onInitialLoadStateChange?: (
    state: NotificationBannerInitialLoadState
  ) => void;
};

/**
 * An inline notification banner that sizes itself to its rendered content.
 *
 * @experimental
 * @category Connect
 */
export const ConnectNotificationBanner = forwardRef<
  ConnectNotificationBannerRef,
  ConnectNotificationBannerProps
>(function ConnectNotificationBanner(
  {
    collectionOptions,
    taskTitle,
    onNotificationsChange,
    onContentHeightChange,
    onInitialLoadStateChange,
    onLoaderStart,
    onLoadError,
    onPageDidLoad,
    style,
  },
  ref
) {
  const { appearance } = useConnectComponents();
  const [initialLoadState, setInitialLoadState] =
    useState<NotificationBannerInitialLoadState>('loading');
  const [publishedHeight, setPublishedHeight] = useState(0);
  const [webViewHeight, setWebViewHeight] = useState(1);
  const [isWebContentVisible, setWebContentVisible] = useState(false);
  const [task, setTask] = useState<Record<string, unknown> | null>(null);
  const [bannerWebViewKey, setBannerWebViewKey] = useState(0);

  const initialLoadStateRef = useRef(initialLoadState);
  const didReceiveInitialNotifications = useRef(false);
  const pendingContentHeight = useRef<number | undefined>(undefined);
  const lastPublishedHeight = useRef<number | undefined>(undefined);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useImperativeHandle(ref, () => ({ initialLoadState }), [initialLoadState]);

  useEffect(() => {
    initialLoadStateRef.current = initialLoadState;
    onInitialLoadStateChange?.(initialLoadState);
  }, [initialLoadState, onInitialLoadStateChange]);

  useEffect(() => {
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, []);

  const publishHeight = useCallback(
    (height: number) => {
      setPublishedHeight(height);
      if (lastPublishedHeight.current !== height) {
        lastPublishedHeight.current = height;
        onContentHeightChange?.(height);
      }
    },
    [onContentHeightChange]
  );

  const finishLoadingWhenSettled = useCallback(() => {
    if (
      initialLoadStateRef.current !== 'loading' ||
      !didReceiveInitialNotifications.current ||
      pendingContentHeight.current === undefined
    ) {
      return;
    }

    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      if (initialLoadStateRef.current !== 'loading') return;
      publishHeight(pendingContentHeight.current ?? 0);
      setWebContentVisible(true);
      setInitialLoadState('loaded');
    }, SETTLE_DELAY_MS);
  }, [publishHeight]);

  const handleContentHeightChange = useCallback(
    (height: number) => {
      const roundedHeight = Math.max(0, Math.ceil(height));
      pendingContentHeight.current = roundedHeight;
      setWebViewHeight(Math.max(1, roundedHeight));

      if (initialLoadStateRef.current === 'loaded') {
        publishHeight(roundedHeight);
      } else {
        finishLoadingWhenSettled();
      }
    },
    [finishLoadingWhenSettled, publishHeight]
  );

  const handleNotificationsChange = useCallback(
    (change: NotificationBannerChange) => {
      if (initialLoadStateRef.current === 'loading') {
        didReceiveInitialNotifications.current = true;
        finishLoadingWhenSettled();
      }
      onNotificationsChange?.(change);
    },
    [finishLoadingWhenSettled, onNotificationsChange]
  );

  const handleLoadError = useCallback(
    (
      error: Parameters<NonNullable<CommonComponentProps['onLoadError']>>[0]
    ) => {
      if (initialLoadStateRef.current === 'loading') {
        if (settleTimer.current) clearTimeout(settleTimer.current);
        setInitialLoadState('failed');
      }
      onLoadError?.(error);
    },
    [onLoadError]
  );

  const dismissTask = useCallback(() => {
    setTask(null);
    didReceiveInitialNotifications.current = false;
    pendingContentHeight.current = undefined;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    initialLoadStateRef.current = 'loading';
    setInitialLoadState('loading');
    setWebContentVisible(false);
    setWebViewHeight(1);
    publishHeight(0);
    setBannerWebViewKey((key) => key + 1);
  }, [publishHeight]);

  const componentProps = useMemo(
    () => ({ setCollectionOptions: collectionOptions }),
    [collectionOptions]
  );
  const callbacks = useMemo(
    () => ({ onNotificationsChange: handleNotificationsChange }),
    [handleNotificationsChange]
  );
  const borderRadius = parsePixels(
    appearance?.variables?.borderRadius,
    DEFAULT_BORDER_RADIUS
  );

  return (
    <>
      <View
        style={[
          style,
          styles.inlineContainer,
          { height: publishedHeight, borderRadius },
        ]}
      >
        <EmbeddedComponent
          key={bannerWebViewKey}
          component="notification-banner"
          componentProps={componentProps}
          callbacks={callbacks}
          onLoaderStart={onLoaderStart}
          onLoadError={handleLoadError}
          onPageDidLoad={onPageDidLoad}
          onContentHeightChange={handleContentHeightChange}
          onOpenNotificationBannerForm={(form) => {
            setTask((currentTask) => currentTask ?? form);
          }}
          presentExternalLinksInApp
          sizeToContent
          style={[
            styles.inlineWebView,
            { height: webViewHeight },
            isWebContentVisible ? styles.visible : styles.hidden,
          ]}
        />
      </View>
      <NotificationTaskModal
        task={task}
        title={taskTitle}
        collectionOptions={collectionOptions}
        backgroundColor={
          appearance?.variables?.colorBackground ?? DEFAULT_BACKGROUND_COLOR
        }
        onDismiss={dismissTask}
        onLoadError={onLoadError}
      />
    </>
  );
});

function NotificationTaskModal({
  task,
  title,
  collectionOptions,
  backgroundColor,
  onDismiss,
  onLoadError,
}: {
  task: Record<string, unknown> | null;
  title?: string;
  collectionOptions?: CollectionOptions;
  backgroundColor: string;
  onDismiss: () => void;
  onLoadError?: CommonComponentProps['onLoadError'];
}) {
  const componentProps = useMemo(
    () => ({
      setCollectionOptions: collectionOptions,
      setMobileNotificationBannerForm: task,
    }),
    [collectionOptions, task]
  );
  const callbacks = useMemo(() => ({ onCloseWebView: onDismiss }), [onDismiss]);

  return (
    <Modal
      visible={task !== null}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onDismiss}
    >
      <SafeAreaView style={[styles.taskContainer, { backgroundColor }]}>
        <View
          style={
            Platform.OS === 'android'
              ? { paddingTop: StatusBar.currentHeight ?? 0 }
              : undefined
          }
        >
          <NavigationBar
            title={title}
            onCloseButtonPress={onDismiss}
            style={styles.navigationBar}
          />
        </View>
        {task ? (
          <EmbeddedComponent
            component="notification-banner"
            componentProps={componentProps}
            callbacks={callbacks}
            onLoadError={onLoadError}
            presentExternalLinksInApp
            style={styles.taskWebView}
          />
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

function parsePixels(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const SETTLE_DELAY_MS = 200;
const DEFAULT_BORDER_RADIUS = 8;
const DEFAULT_BACKGROUND_COLOR = '#FFFFFF';

const styles = StyleSheet.create({
  inlineContainer: {
    flexGrow: 0,
    flexShrink: 0,
    overflow: 'hidden',
  },
  inlineWebView: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  visible: {
    opacity: 1,
  },
  hidden: {
    opacity: 0,
  },
  taskContainer: {
    flex: 1,
  },
  navigationBar: {
    height: 56,
  },
  taskWebView: {
    flex: 1,
  },
});
