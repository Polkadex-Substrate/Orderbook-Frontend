import { useCallback, useState } from "react";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { ApiPromise } from "@polkadot/api";
import { useNativeApi } from "@orderbook/core/providers/public/nativeApi";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { signAndSendExtrinsic } from "@orderbook/core/helpers/signAndSendExtrinsic";

export type ExtrinsicStatus =
  | { status: "idle" }
  | { status: "signing" }
  | { status: "submitted"; hash: string }
  | { status: "success"; hash: string }
  | { status: "error"; error: string };

type SubmitOptions = {
  successMessage?: string;
  waitForFinalization?: boolean;
};

export function usePolkadotExtrinsic() {
  const { api } = useNativeApi();
  const {
    selectedAddresses: { mainAddress },
    getSigner,
  } = useProfile();
  const { onHandleError } = useSettingsProvider();

  const [state, setState] = useState<ExtrinsicStatus>({ status: "idle" });

  const submit = useCallback(
    async (
      buildExtrinsic: (api: ApiPromise) => SubmittableExtrinsic<"promise">,
      options?: SubmitOptions
    ) => {
      if (!api?.isConnected) {
        onHandleError?.("Not connected to blockchain");
        return;
      }
      if (!mainAddress) {
        onHandleError?.("No account selected");
        return;
      }

      setState({ status: "signing" });

      try {
        const signer = getSigner(mainAddress);
        if (!signer) throw new Error("Signer not available");

        const extrinsic = buildExtrinsic(api);
        setState({ status: "submitted", hash: extrinsic.hash.toHex() });

        const result = await signAndSendExtrinsic(
          api,
          extrinsic,
          { signer },
          mainAddress,
          options?.waitForFinalization ?? false
        );

        setState({ status: "success", hash: result.hash });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setState({ status: "error", error: msg });
        onHandleError?.(msg);
      }
    },
    [api, mainAddress, getSigner, onHandleError]
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { state, submit, reset };
}
