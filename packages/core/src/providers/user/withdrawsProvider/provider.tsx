import { useCallback, useReducer } from "react";
import { ApiPromise } from "@polkadot/api";
import { Signer } from "@polkadot/types/types";
import { useNativeApi } from "@orderbook/core/providers/public//nativeApi";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { ExtrinsicResult, signAndSendExtrinsic } from "@orderbook/core/helpers";
import { useFunds } from "@orderbook/core/hooks";

import * as A from "./actions";
import * as T from "./types";
import { Provider } from "./context";
import { initialState, withdrawsReducer } from "./reducer";

export const WithdrawsProvider: T.WithdrawsComponent = ({ children }) => {
  const [state, dispatch] = useReducer(withdrawsReducer, initialState);
  const { onChangeChainBalance } = useFunds();
  const nativeApiState = useNativeApi();
  const settingsState = useSettingsProvider();
  const onFetchClaimWithdraw = async ({
    selectedWallet,
    sid,
    assetIds = [],
    tokenFeeId,
  }: T.OnFetchClaimWithdraw) => {
    try {
      const api = nativeApiState.api;

      const isApiReady = nativeApiState.connected;

      if (!api || !isApiReady)
        throw new Error("You are not connected to blockchain");

      if (!selectedWallet?.address)
        throw new Error("Funding account doesn't exists");

      // TODO: Move this toast as callback to signAndSendExtrinsic,
      settingsState.onHandleAlert(
        "Processing Claim Withdraw, please wait while the withdraw is processed and the block is finalized. This may take a few mins."
      );
      dispatch(A.withdrawsClaimFetch({ sid, assetIds }));

      const res = await claimWithdrawal(
        api,
        selectedWallet.signer,
        selectedWallet.address,
        sid,
        tokenFeeId
      );
      if (res.isSuccess) {
        dispatch(A.withdrawsClaimData({ sid }));
        // TODO?: Check delay
        // for ux
        setTimeout(() => {
          settingsState.onHandleAlert(
            "Congratulations! You have successfully withdrawn your assets to your funding account."
          );

          dispatch(A.withdrawClaimReset());
        }, 3000);
      } else {
        throw new Error("Claim Withdraw failed");
      }
    } catch (error) {
      dispatch(A.withdrawClaimCancel(sid));
      settingsState.onHandleError((error as Error)?.message ?? error);
      dispatch(A.withdrawsError((error as Error)?.message ?? error));
    } finally {
      for (const assetId of assetIds) {
        await onChangeChainBalance(assetId);
      }
    }
  };

  const claimWithdrawal = useCallback(
    async (
      api: ApiPromise,
      signer: Signer,
      account: string,
      sid: number,
      assetId?: string
    ): Promise<ExtrinsicResult> => {
      const ext = api.tx.ocex.claimWithdraw(sid, account);
      return await signAndSendExtrinsic(
        api,
        ext,
        { signer },
        account,
        true,
        assetId
      );
    },
    []
  );

  return (
    <Provider
      value={{
        ...state,
        onFetchClaimWithdraw,
      }}
    >
      {children}
    </Provider>
  );
};
