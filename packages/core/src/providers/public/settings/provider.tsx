import { useCallback, useEffect, useReducer, useState } from "react";

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

  const onToogleConnectTrading = (payload?: boolean) =>
    dispatch(A.toogleConnectTrading(payload));

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

  const onChangeMarketCarousel = (value: T.MarketCarousel) =>
    dispatch(A.setMarketCarousel(value));

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

  return (
    <Provider
      value={{
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
      }}
    >
      {children}
    </Provider>
  );
};
