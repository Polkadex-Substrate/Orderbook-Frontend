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
