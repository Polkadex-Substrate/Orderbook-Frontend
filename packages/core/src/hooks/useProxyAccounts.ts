import { useQuery } from "@tanstack/react-query";
import { ExtensionAccount } from "@polkadex/react-providers";

import { UserAddressTuple } from "../providers/user/profile";
import { QUERY_KEYS } from "../constants";
import { appsyncOrderbookService } from "../utils/orderbookService";

export const useProxyAccounts = (extensionAccounts: ExtensionAccount[]) => {
  const {
    data: proxiesAccounts,
    isError: proxiesHasError,
    isLoading: proxiesLoading,
    isSuccess: proxiesSuccess,
    isFetching,
    status: proxiesStatus,
  } = useQuery<UserAddressTuple[]>({
    queryKey: QUERY_KEYS.proxyAccounts(
      extensionAccounts.map(({ address }) => address)
    ),
    queryFn: async () => {
      const accounts: UserAddressTuple[] = [];
      extensionAccounts.forEach(async ({ address: mainAddress }) => {
        const proxies =
          await appsyncOrderbookService.query.getTradingAddresses(mainAddress);

        proxies.forEach((proxy) => {
          accounts.push({
            mainAddress,
            tradeAddress: proxy,
          });
        });
      });
      return accounts;
    },
    enabled: !!extensionAccounts?.length,
  });

  return {
    allProxiesAccounts: proxiesAccounts || [],
    proxiesHasError,
    proxiesLoading: proxiesLoading && isFetching,
    proxiesSuccess,
    proxiesStatus,
  };
};
