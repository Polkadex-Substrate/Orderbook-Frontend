import { FC, PropsWithChildren } from "react";

import * as N from "./notifications";
import { marketCarouselValues } from "./constants";

export type MarketCarousel = (typeof marketCarouselValues)[number];

export type NotificationCategory = (typeof N.notificationCategories)[number];

export type NotificationPayload = {
  type: "Error" | "Information" | "Success" | "Loading" | "Attention";
  message: string;
  description: string;
  category: NotificationCategory;
  href?: string;
};

export interface Notification extends NotificationPayload {
  id: string;
  date: number;
  active: boolean;
}
export interface SettingState {
  chartRebuild: boolean;
  ordersHideOtherPairs: boolean;
  marketSelectorActive: boolean;
  marketCarousel: MarketCarousel;
  theme: "light" | "dark";
  language: "en";
  currency: "USD" | "EUR" | "CNY" | "INR";
  notifications: Notification[];
  hasExtension?: boolean;
  connectExtension?: boolean;
  connectTrading?: boolean;
}

export type SettingProviderProps = PropsWithChildren<{
  value: SettingContextProps;
}>;

type ToastActions = {
  onError: (title: string, description?: string) => void;
  onSuccess: (title: string, description?: string) => void;
  onInfo?: (title: string, description?: string) => void;
};

export type SettingContextProps = SettingState & {
  fundWallet: boolean;
  onToogleFundWallet: (value?: boolean) => void;
  onToggleChartRebuild: () => void;
  onToggleMarketSelector: () => void;
  onToggleOpenOrdersPairsSwitcher: (value: boolean) => void;
  onChangeTheme: (value: SettingState["theme"]) => void;
  onChangeLanguage: (value: SettingState["language"]) => void;
  onChangeCurrency: (value: SettingState["currency"]) => void;
  onPushNotification: (value: NotificationPayload) => void;
  onRemoveNotification: (value: Notification["id"]) => void;
  onReadNotification: (value: Notification["id"]) => void;
  onReadAllNotifications: () => void;
  onClearNotifications: () => void;
  onHandleError: ToastActions["onError"];
  onHandleAlert: ToastActions["onSuccess"];
  onHandleInfo: ToastActions["onInfo"];
  onToogleConnectExtension: (value?: boolean) => void;
  onToogleConnectTrading: (value?: boolean) => void;
  onChangeMarketCarousel: (value: MarketCarousel) => void;
};

export type SettingsProps = {
  defaultTheme?: SettingState["theme"];
  defaultLanguage?: SettingState["language"];
  defaultCurrency?: SettingState["currency"];
  defaultToast: ToastActions;
};

export type SettingComponent = FC<PropsWithChildren<SettingsProps>>;
