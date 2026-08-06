/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable spaced-comment */
// TODO: wrong @polkadex/polkadex-api polkadot api version

import BigNumber from "bignumber.js";
import { UNIT_BN } from "@orderbook/core/constants";
import { ISubmittableResult } from "@polkadot/types/types";
import { SubmittableExtrinsic } from "@polkadot/api/types";
import { signAndSendExtrinsic } from "@orderbook/core/helpers";

import {
  Cancel_allMutation,
  Place_orderMutation,
  WithdrawMutation,
} from "../../../API";
import * as mutation from "../../../graphql/mutations";

// GraphQLResponse aliased to GraphQLResult so the usages below read unchanged;
// same GraphQL envelope, declared locally now that Amplify is gone.
import {
  sendQueryToAppSync,
  GraphQLResponse as GraphQLResult,
} from "./helpers";
import { describeWriteError } from "./writeError";
import { interpretUserActionResponse } from "./userActionResponse";
import {
  ClaimRewardArgs,
  ClaimWithdrawArgs,
  CreateProxyAcccountArgs,
  DepositArgs,
  ExecuteArgs,
  OrderbookOperationStrategy,
  RemoveAccountArgs,
  TransferArgs,
  WithdrawArgs,
} from "./../interfaces";

class AppsyncV1Operations implements OrderbookOperationStrategy {
  init(): Promise<void> {
    return Promise.resolve(undefined);
  }

  isReady(): boolean {
    return true;
  }

  async cancelOrder(data: ExecuteArgs): Promise<void> {
    try {
      // INFO: Temporary fix => It's actually a backend issue
      const result = await sendQueryToAppSync<GraphQLResult<any>>({
        query: mutation.place_order,
        variables: { input: { payload: data.payload } },
        token: data.token,
      });
      // The reply is an opaque string. The retired Lambda backend put a JSON
      // envelope in it; the Rust backend returns a bare identifier, so the old
      // `JSON.parse(result.data.place_order)` threw "Unexpected non-whitespace
      // character after JSON at position 1" on a value like 0xabc123 - AFTER the
      // engine had already accepted and matched the order. Both shapes are
      // accepted now; see userActionResponse.test.ts.
      const outcome = interpretUserActionResponse(
        result?.data?.place_order,
        result?.errors
      );
      if (!outcome.ok)
        throw new Error(
          outcome.message ??
            "Cancel order failed: No valid response from server"
        );
    } catch (error) {
      // RETHROW UNCONDITIONALLY.
      //
      // This block used to rethrow only when `(error as GraphQLResult).errors`
      // was a non-empty array. A plain Error has no `.errors`, so the strategy's
      // OWN failures - `throw new Error(resp.body)` when the engine reports
      // is_success: false, and the "No valid response from server" throw above -
      // fell through and were discarded. The async method then resolved, React
      // Query ran onSuccess, and the UI announced "Order Placed" for an order
      // that did not exist.
      throw new Error(describeWriteError(error));
    }
  }

  async placeOrder(data: ExecuteArgs): Promise<void> {
    try {
      const result = await sendQueryToAppSync<
        GraphQLResult<Place_orderMutation>
      >({
        query: mutation.place_order,
        variables: { input: { payload: data.payload } },
        token: data.token,
      });

      // The reply is an opaque string. The retired Lambda backend put a JSON
      // envelope in it; the Rust backend returns a bare identifier, so the old
      // `JSON.parse(result.data.place_order)` threw "Unexpected non-whitespace
      // character after JSON at position 1" on a value like 0xabc123 - AFTER the
      // engine had already accepted and matched the order. Both shapes are
      // accepted now; see userActionResponse.test.ts.
      const outcome = interpretUserActionResponse(
        result?.data?.place_order,
        result?.errors
      );
      if (!outcome.ok)
        throw new Error(
          outcome.message ?? "Place order failed: No valid response from server"
        );
    } catch (error) {
      // RETHROW UNCONDITIONALLY.
      //
      // This block used to rethrow only when `(error as GraphQLResult).errors`
      // was a non-empty array. A plain Error has no `.errors`, so the strategy's
      // OWN failures - `throw new Error(resp.body)` when the engine reports
      // is_success: false, and the "No valid response from server" throw above -
      // fell through and were discarded. The async method then resolved, React
      // Query ran onSuccess, and the UI announced "Order Placed" for an order
      // that did not exist.
      throw new Error(describeWriteError(error));
    }
  }

  async withdraw(data: WithdrawArgs): Promise<void> {
    try {
      const payload = JSON.stringify({ Withdraw: data.payload });
      const result = await sendQueryToAppSync<GraphQLResult<WithdrawMutation>>({
        query: mutation.withdraw,
        variables: { input: { payload } },
        token: data.address,
      });
      // The reply is an opaque string. The retired Lambda backend put a JSON
      // envelope in it; the Rust backend returns a bare identifier, so the old
      // `JSON.parse(result.data.withdraw)` threw "Unexpected non-whitespace
      // character after JSON at position 1" on a value like 0xabc123 - AFTER the
      // engine had already accepted and matched the order. Both shapes are
      // accepted now; see userActionResponse.test.ts.
      const outcome = interpretUserActionResponse(
        result?.data?.withdraw,
        result?.errors
      );
      if (!outcome.ok)
        throw new Error(
          outcome.message ?? "withdraw failed: No valid response from server"
        );
    } catch (error) {
      // RETHROW UNCONDITIONALLY.
      //
      // This block used to rethrow only when `(error as GraphQLResult).errors`
      // was a non-empty array. A plain Error has no `.errors`, so the strategy's
      // OWN failures - `throw new Error(resp.body)` when the engine reports
      // is_success: false, and the "No valid response from server" throw above -
      // fell through and were discarded. The async method then resolved, React
      // Query ran onSuccess, and the UI announced "Order Placed" for an order
      // that did not exist.
      throw new Error(describeWriteError(error));
    }
  }

  async cancelAll({ payload, token }: ExecuteArgs): Promise<void> {
    try {
      const result = await sendQueryToAppSync<
        GraphQLResult<Cancel_allMutation>
      >({
        query: mutation.cancel_all,
        variables: { input: { payload } },
        token,
      });
      // The reply is an opaque string. The retired Lambda backend put a JSON
      // envelope in it; the Rust backend returns a bare identifier, so the old
      // `JSON.parse(result.data.cancel_all)` threw "Unexpected non-whitespace
      // character after JSON at position 1" on a value like 0xabc123 - AFTER the
      // engine had already accepted and matched the order. Both shapes are
      // accepted now; see userActionResponse.test.ts.
      const outcome = interpretUserActionResponse(
        result?.data?.cancel_all,
        result?.errors
      );
      if (!outcome.ok)
        throw new Error(
          outcome.message ?? "cancelAll failed: No valid response from server"
        );
    } catch (error) {
      // RETHROW UNCONDITIONALLY.
      //
      // This block used to rethrow only when `(error as GraphQLResult).errors`
      // was a non-empty array. A plain Error has no `.errors`, so the strategy's
      // OWN failures - `throw new Error(resp.body)` when the engine reports
      // is_success: false, and the "No valid response from server" throw above -
      // fell through and were discarded. The async method then resolved, React
      // Query ran onSuccess, and the UI announced "Order Placed" for an order
      // that did not exist.
      throw new Error(describeWriteError(error));
    }
  }

  async deposit({
    account,
    amount,
    api,
    asset,
    tokenFeeId,
  }: DepositArgs): Promise<SubmittableExtrinsic<"promise">> {
    const assetId =
      tokenFeeId && tokenFeeId !== "PDEX" ? { assetId: tokenFeeId } : {};
    // `amount` is in human units and may be a JS float carrying binary noise
    // (0.1 + 0.2 -> 0.30000000000000004). BigNumber builds from the number's
    // decimal string, so multiplying by 10^12 can leave a fractional part -
    // and `Compact<u128>` rejects it with "String should not contain decimal
    // points or scientific notation". `.toString()` would also emit exponent
    // form for very large or small values, which the codec likewise refuses.
    //
    // integerValue + toFixed(0) guarantees a plain integer string. FLOOR, not
    // round: the caller has usually capped the amount at the user's available
    // balance, and rounding up by one planck would make the extrinsic fail.
    const amountStr = new BigNumber(amount)
      .multipliedBy(UNIT_BN)
      .integerValue(BigNumber.ROUND_FLOOR)
      .toFixed(0);
    const ext = api.tx.ocex.deposit(asset as unknown as string, amountStr);
    const signedExt = await ext.signAsync(account.address, {
      signer: account.signer,
      // assetId,
    });

    return signedExt;
  }

  async removeAccount({
    account,
    proxyAddress,
    api,
    tokenFeeId,
  }: RemoveAccountArgs): Promise<SubmittableExtrinsic<"promise">> {
    const assetId =
      tokenFeeId && tokenFeeId !== "PDEX" ? { assetId: tokenFeeId } : {};
    const ext = api.tx.ocex.removeProxyAccount(proxyAddress);
    const signedExt = await ext.signAsync(account.address, {
      signer: account.signer,
      // assetId,
    });

    return signedExt;
  }

  async createProxyAcccount({
    account,
    proxyAddress,
    api,
    tokenFeeId,
    firstAccount,
  }: CreateProxyAcccountArgs): Promise<SubmittableExtrinsic<"promise">> {
    const assetId =
      tokenFeeId && tokenFeeId !== "PDEX" ? { assetId: tokenFeeId } : {};
    let ext: SubmittableExtrinsic<"promise", ISubmittableResult>;
    if (firstAccount) ext = api.tx.ocex.registerMainAccount(proxyAddress);
    else ext = api.tx.ocex.addProxyAccount(proxyAddress);

    const signedExt = await ext.signAsync(account.address, {
      signer: account.signer,
      // assetId,
    });

    return signedExt as SubmittableExtrinsic<"promise">;
  }

  async claimReward({
    api,
    signer,
    lmp,
    epoch,
    market,
    address,
    tokenFeeId,
  }: ClaimRewardArgs): Promise<void> {
    const assetId =
      tokenFeeId && tokenFeeId !== "PDEX" ? { assetId: tokenFeeId } : {};

    const ext = (await lmp.claimRewardsTx(
      epoch,
      market
    )) as unknown as SubmittableExtrinsic<"promise">;

    const res = await signAndSendExtrinsic(api, ext, { signer }, address, true);
    if (!res.isSuccess) {
      throw new Error("Claim reward failed");
    }
  }

  async transfer({
    api,
    account,
    asset,
    amount,
    dest,
    tokenFeeId,
  }: TransferArgs): Promise<SubmittableExtrinsic<"promise">> {
    const assetId =
      tokenFeeId && tokenFeeId !== "PDEX" ? { assetId: tokenFeeId } : {};

    const ext = asset?.asset
      ? api.tx.assets.transferKeepAlive(asset?.asset, dest, amount)
      : api.tx.balances.transferKeepAlive(dest, amount);

    const signedExt = await ext.signAsync(account.address, {
      signer: account.signer,
      // assetId,
    });

    return signedExt;
  }

  async claimWithdrawal({
    api,
    account,
    sid,
    tokenFeeId,
  }: ClaimWithdrawArgs): Promise<SubmittableExtrinsic<"promise">> {
    const assetId =
      tokenFeeId && tokenFeeId !== "PDEX" ? { assetId: tokenFeeId } : {};

    const ext = api.tx.ocex.claimWithdraw(sid, account.address);

    const signedExt = await ext.signAsync(account.address, {
      signer: account.signer,
      // assetId,
    });

    return signedExt;
  }
}

export const appsyncOperations = new AppsyncV1Operations();
