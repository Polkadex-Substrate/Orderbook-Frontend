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
      const results = await Promise.all(
        extensionAccounts.map(async ({ address: mainAddress }) => {
          const proxies =
            await appsyncOrderbookService.query.getTradingAddresses(mainAddress);
          return proxies.map((tradeAddress) => ({ mainAddress, tradeAddress }));
        })
      );
      return results.flat();
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
