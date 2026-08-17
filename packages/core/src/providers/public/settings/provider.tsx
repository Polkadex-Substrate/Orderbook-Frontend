import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import { Provider } from "./context";
import { settingReducer, initialState } from "./reducer";
import * as A from "./actions";
import * as T from "./types";

export const SettingProvider: T.SettingComponent = ({
  defaultToast,
  children,
}) => {
  const [state, dispatch] = useReducer(settingReducer, initialState);
  const [fundWallet, setFundWallet] = useState(false);

  // Global Setting Actions
  const onToogleConnectExtension = useCallback(
    (payload?: boolean) => dispatch(A.toogleConnectExtension(payload)),
    []
  );

  // Was not memoised, and that mattered. A new identity on every render made
  // any effect depending on it re-run - and this provider re-renders on every
  // notification, theme change and panel toggle.
  const onToogleConnectTrading = useCallback(
    (payload?: boolean) => dispatch(A.toogleConnectTrading(payload)),
    []
  );

  const onToogleFundWallet = useCallback(
    (payload?: boolean) => setFundWallet((e) => !e || !!payload),
    []
  );

  const onToggleChartRebuild = useCallback(() => {
    dispatch(A.toggleChartRebuild());
  }, []);

  const onToggleMarketSelector = useCallback(() => {
    dispatch(A.toggleMarketSelector());
  }, []);

  const onToggleOpenOrdersPairsSwitcher = useCallback((payload: boolean) => {
    dispatch(A.toggleOpenOrdersPairsSwitcher(payload));
  }, []);

  const onChangeTheme = useCallback(
    (value: A.ChangeThemeSettings["payload"]) => {
      dispatch(A.onChangeThemeSettings(value));
    },
    []
  );

  const onChangeLanguage = useCallback(
    (value: A.ChangeLanguageSettings["payload"]) =>
      dispatch(A.onChangeLanguageSettings(value)),
    []
  );

  const onChangeCurrency = useCallback(
    (value: A.ChangeCurrencySettings["payload"]) =>
      dispatch(A.onChangeCurrencySettings(value)),
    []
  );

  const onChangeMarketCarousel = useCallback(
    (value: T.MarketCarousel) => dispatch(A.setMarketCarousel(value)),
    []
  );

  // Notifications Actions
  const onPushNotification = useCallback(
    (payload: T.NotificationPayload) => dispatch(A.notificationPush(payload)),
    []
  );

  const onRemoveNotification = useCallback(
    (value: T.Notification["id"]) => dispatch(A.notificationDeleteById(value)),
    []
  );

  const onReadNotification = useCallback(
    (value: T.Notification["id"]) => dispatch(A.notificationMarkAsRead(value)),
    []
  );
  const onReadAllNotifications = useCallback(
    () => dispatch(A.allNotificationMarkAsRead()),
    []
  );

  const onClearNotifications = useCallback(
    () => dispatch(A.notificationDeleteAll()),
    []
  );

  useEffect(() => {
    dispatch(A.getMarketCarousel());
  }, []);

  // Load announcements from the runtime feed.
  //
  // A route handler, not a build-time constant, so an announcement can be posted
  // or retracted by editing a JSON file on the server - see
  // apps/hestia/src/app/api/announcements/route.ts. Announcements exist for
  // outages and maintenance windows; needing a rebuild to publish one means the
  // message often lands after it stopped being true.
  //
  // Failures are swallowed deliberately. The endpoint already answers 200 with
  // an empty list when there is nothing to say or the file is unreadable, so
  // anything reaching here is a transport problem - and a missing announcement
  // must never be able to break the trading UI.
  useEffect(() => {
    let cancelled = false;

    fetch("/api/announcements")
      .then((res) => (res.ok ? res.json() : []))
      .then((list) => {
        if (cancelled || !Array.isArray(list) || !list.length) return;
        dispatch(A.announcementsLoaded(list));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * MEMOISED, because consumers of this value feed it into dependency arrays.
   *
   * The websocket handlers in SubscriptionProvider depend on `onHandleError`,
   * `onHandleInfo` and `onPushNotification`. While this object was rebuilt on
   * every render, every notification pushed here gave those a new identity,
   * which invalidated the handlers, which tore down and re-created the order
   * subscription - the channel that had just delivered the notification.
   *
   * Three reported bugs came out of that: a filled order not appearing until you
   * switched tabs and came back, and no fill notification. Those effects no
   * longer depend on handler identity either (see subscription/useLatest.ts), so
   * this is the second of two independent guards rather than the only one.
   *
   * `state` changes on every settings action, so the value still changes then -
   * as it must, that is the point of the provider. What it no longer does is
   * change when nothing has changed.
   */
  const value = useMemo(
    () => ({
      ...state,
      fundWallet,
      onToogleFundWallet,
      onToggleChartRebuild,
      onToggleMarketSelector,
      onToggleOpenOrdersPairsSwitcher,
      onChangeTheme,
      onChangeLanguage,
      onChangeCurrency,
      onPushNotification,
      onClearNotifications,
      onRemoveNotification,
      onReadNotification,
      onReadAllNotifications,
      onHandleError: defaultToast.onError,
      onHandleAlert: defaultToast.onSuccess,
      onHandleInfo: defaultToast.onInfo,
      onToogleConnectExtension,
      onToogleConnectTrading,
      onChangeMarketCarousel,
    }),
    [
      state,
      fundWallet,
      defaultToast,
      onToogleFundWallet,
      onToggleChartRebuild,
      onToggleMarketSelector,
      onToggleOpenOrdersPairsSwitcher,
      onChangeTheme,
      onChangeLanguage,
      onChangeCurrency,
      onPushNotification,
      onClearNotifications,
      onRemoveNotification,
      onReadNotification,
      onReadAllNotifications,
      onToogleConnectExtension,
      onToogleConnectTrading,
      onChangeMarketCarousel,
    ]
  );

  return <Provider value={value}>{children}</Provider>;
};
