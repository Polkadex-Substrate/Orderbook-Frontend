"use client";

import { Fragment, ReactNode } from "react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { Amplify } from "aws-amplify";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { useParams } from "next/navigation";

import awsconfig from "../../../../aws-exports";

const Progress = dynamic(
  () => import("../Progress").then((mod) => mod.Progress),
  { ssr: false }
);

const YbugProvider = dynamic(
  () => import("../YbugProvider").then((mod) => mod.YbugProvider),
  { ssr: false }
);

const YbugUserIdentifier = dynamic(
  () => import("../YbugUserIdentifier").then((mod) => mod.YbugUserIdentifier),
  { ssr: false }
);

const TransactionManagerProvider = dynamic(
  () =>
    import("@mitra/react-providers").then(
      (mod) => mod.TransactionManagerProvider
    ),
  { ssr: false }
);
const UserAccountsProvider = dynamic(
  () =>
    import("@mitra/react-providers").then((mod) => mod.UserAccountsProvider),
  { ssr: false }
);
const ExtensionsProvider = dynamic(
  () => import("@mitra/react-providers").then((mod) => mod.ExtensionsProvider),
  { ssr: false }
);
const ExtensionAccountsProvider = dynamic(
  () =>
    import("@mitra/react-providers").then(
      (mod) => mod.ExtensionAccountsProvider
    ),
  { ssr: false }
);

const SessionProvider = dynamic(
  () => import("@orderbook/core/providers").then((mod) => mod.SessionProvider),
  { ssr: false }
);

const ProfileProvider = dynamic(
  () => import("@orderbook/core/providers").then((mod) => mod.ProfileProvider),
  { ssr: false }
);

const SubscriptionProvider = dynamic(
  () =>
    import("@orderbook/core/providers").then((mod) => mod.SubscriptionProvider),
  { ssr: false }
);

const OrderbookServiceProvider = dynamic(
  () =>
    import("@orderbook/core/providers").then(
      (mod) => mod.OrderbookServiceProvider
    ),
  { ssr: false }
);

const NativeApiProvider = dynamic(
  () =>
    import("@orderbook/core/providers").then((mod) => mod.NativeApiProvider),
  { ssr: false }
);

const SettingProvider = dynamic(
  () => import("@orderbook/core/providers").then((mod) => mod.SettingProvider),
  { ssr: false }
);

const ConnectWalletProvider = dynamic(
  () =>
    import("@orderbook/core/providers").then(
      (mod) => mod.ConnectWalletProvider
    ),
  { ssr: false }
);

const Toaster = dynamic(() => import("@mitra/ux").then((mod) => mod.Toaster), {
  ssr: false,
});

Amplify.configure(awsconfig);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
  // react-query v5 removed the per-query `onError` callback (it only remains on
  // useMutation). The hooks that used it all did the same thing — surface the
  // message as an error toast — so that behaviour now lives here, once, for
  // every query. Mirrors SettingProvider's defaultToast.onError below.
  queryCache: new QueryCache({
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : String(error ?? "");
      if (message) toast.error(message);
    },
  }),
});

export const DynamicProviders = ({ children }: { children: ReactNode }) => {
  const params = useParams();
  return (
    <Fragment>
      <Toaster expand closeButton position="top-right" />
      <YbugProvider>
        <QueryClientProvider client={queryClient}>
          <SettingProvider
            defaultToast={{
              onError: (title, description) => {
                toast.error(title.toString(), { description });
              },
              onSuccess: (title, description) => {
                toast.success(title.toString(), {
                  description,
                });
              },
              onInfo: (title, description) => {
                toast.info(title.toString(), { description });
              },
            }}
          >
            <ExtensionsProvider>
              <ExtensionAccountsProvider
                network={"polkadex"}
                ss58={88}
                dappName={"polkadex"}
              >
                <UserAccountsProvider>
                  <ProfileProvider>
                    <NativeApiProvider>
                      <OrderbookServiceProvider>
                        <SessionProvider>
                          <SubscriptionProvider
                            marketId={(params.id as string) ?? "DOTUSDT"}
                          >
                            <TransactionManagerProvider>
                              <ConnectWalletProvider>
                                <Fragment>
                                  <YbugUserIdentifier />
                                  <Progress />
                                  {children}
                                </Fragment>
                              </ConnectWalletProvider>
                            </TransactionManagerProvider>
                          </SubscriptionProvider>
                        </SessionProvider>
                      </OrderbookServiceProvider>
                    </NativeApiProvider>
                  </ProfileProvider>
                </UserAccountsProvider>
              </ExtensionAccountsProvider>
            </ExtensionsProvider>
          </SettingProvider>
        </QueryClientProvider>
      </YbugProvider>
    </Fragment>
  );
};
