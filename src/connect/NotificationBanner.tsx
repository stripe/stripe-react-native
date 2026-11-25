import React, { useCallback, useMemo } from 'react';
import type { CollectionOptions } from './connectTypes';
import { CommonComponentProps, EmbeddedComponent } from './EmbeddedComponent';

/**
 * Shows the connected account's open tasks, like onboarding requirements and risk interventions,
 * that can affect capabilities such as accepting payments and receiving payouts.
 *
 * @param props.collectionOptions - Optional options for which requirements the banner shows
 * @param props.onNotificationsChange - Callback when the total number of notifications, or the number that require action, changes
 * @param props.onContentHeightChange - Callback when the banner's content height changes, before the next layout pass, in dp. Reports 0 when there's nothing to show
 * @param props.onLoaderStart - Callback when component begins loading
 * @param props.onLoadError - Callback when component fails to load
 * @param props.onPageDidLoad - Callback when component finishes loading
 * @param props.style - Optional styling for the component container
 *
 * @category Connect
 */
export function ConnectNotificationBanner({
  collectionOptions,
  onNotificationsChange,
  onContentHeightChange,
  onLoaderStart,
  onLoadError,
  onPageDidLoad,
  style,
}: {
  collectionOptions?: CollectionOptions;
  onNotificationsChange?: ({
    total,
    actionRequired,
  }: {
    total: number;
    actionRequired: number;
  }) => void;
  onContentHeightChange?: ({ height }: { height: number }) => void;
} & CommonComponentProps) {
  const componentProps = useMemo(() => {
    return {
      setCollectionOptions: collectionOptions,
    };
  }, [collectionOptions]);

  const callbacks = useMemo(() => {
    return {
      onNotificationsChange,
    };
  }, [onNotificationsChange]);

  const handleContentHeightChange = useCallback(
    (height: number) => onContentHeightChange?.({ height }),
    [onContentHeightChange]
  );

  return (
    <EmbeddedComponent
      component="notification-banner"
      inline
      componentProps={componentProps}
      callbacks={callbacks}
      onContentHeightChange={handleContentHeightChange}
      onLoaderStart={onLoaderStart}
      onLoadError={onLoadError}
      onPageDidLoad={onPageDidLoad}
      style={style}
    />
  );
}
