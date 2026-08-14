"use client";

import { Fragment, ReactNode } from "react";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { useParams } from "next/navigation";
import * as Sentry from "@sentry/nextjs";

import { isUnusableTitle, toastTitle } from "../toastTitle";
import { ApiConnectionNotice } from "../ApiConnectionNotice";

import { defaultConfig } from "@/config";

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
    import("@aksumite/react-providers").then(
      (mod) => mod.TransactionManagerProvider
    ),
  { ssr: false }
);
const UserAccountsProvider = dynamic(
  () =>
    import("@aksumite/react-providers").then((mod) => mod.UserAccountsProvider),
  { ssr: false }
);
const ExtensionsProvider = dynamic(
  () =>
    import("@aksumite/react-providers").then((mod) => mod.ExtensionsProvider),
  { ssr: false }
);
const ExtensionAccountsProvider = dynamic(
  () =>
    import("@aksumite/react-providers").then(
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

const Toaster = dynamic(
  () => import("@mitrabook/ux").then((mod) => mod.Toaster),
  {
    ssr: false,
  }
);

// Amplify.configure(awsconfig) used to run here at module scope. Both are gone:
// the Orderbook GraphQL backend is reached through Apollo, configured from
// GRAPHQL_URL / GRAPHQL_WS_URL in @orderbook/core's config/graphql.ts. There is
// no global client to initialise at import time any more.

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
  // react-query v5 removed the per-query `onError` callback (it only remains on
  // useMutation). The hooks that used it all did the same thing - surface the
  // message as an error toast - so that behaviour now lives here, once, for
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
              // `.toString()` used to be called directly here. An order failed
              // with a titleless error, so `title` was undefined and the ERROR
              // HANDLER threw - see ORDERBOOK-TESTNET-4 and toastTitle.ts.
              //
              // The user saw no toast, the real failure was discarded, and
              // Sentry reported this line instead of the order. 31 events from
              // one person retrying in eight minutes.
              onError: (title, description) => {
                // Report the ORIGINAL value before replacing it. Fixing only
                // the crash would leave some upstream path quietly emitting
                // errors with no message, and nothing would ever say so.
                if (isUnusableTitle(title)) {
                  Sentry.captureMessage(
                    "Toast error had no usable title - upstream error lost",
                    {
                      level: "warning",
                      extra: {
                        titleType: typeof title,
                        titleValue: String(title),
                        description,
                      },
                    }
                  );
                }
                toast.error(toastTitle(title), { description });
              },
              onSuccess: (title, description) => {
                toast.success(toastTitle(title, "Done"), {
                  description,
                });
              },
              onInfo: (title, description) => {
                toast.info(toastTitle(title, "Notice"), { description });
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
                          {/* Fallback was "DOTUSDT", a pair that does not
                              exist here, so any route without an :id param
                              subscribed to a nonexistent market. */}
                          <SubscriptionProvider
                            marketId={
                              (params.id as string) ??
                              defaultConfig.landingPageMarket
                            }
                          >
                            <TransactionManagerProvider>
                              <ConnectWalletProvider>
                                <Fragment>
                                  <YbugUserIdentifier />
                                  {/* Renders nothing; raises a persistent toast
                                      when the chain is unreachable. Mounted here
                                      rather than in the footer because the
                                      footer is not fixed on mobile, and every
                                      reported RPC timeout was on a phone. */}
                                  <ApiConnectionNotice />
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
