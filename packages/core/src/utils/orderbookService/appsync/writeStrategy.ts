/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable spaced-comment */
// TODO: wrong @polkadex/polkadex-api polkadot api version

import { GraphQLResult } from "@aws-amplify/api";
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

import { sendQueryToAppSync } from "./helpers";
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

type UserActionLambdaResp = {
  is_success: boolean;
  body: string;
};
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
      if (result?.data?.place_order) {
        const resp: UserActionLambdaResp = JSON.parse(result.data.place_order);
        if (!resp.is_success) {
          throw new Error(resp.body);
        }
      } else {
        throw new Error("Cancel order failed: No valid response from server");
      }
    } catch (error) {
      const errors = (error as GraphQLResult).errors;
      if (errors && errors.length > 0) {
        let concatError = "";
        errors.forEach((error) => {
          concatError += error.message;
          concatError += ":";
        });
        throw new Error(concatError);
      }
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

      if (result?.data?.place_order) {
        const resp: UserActionLambdaResp = JSON.parse(result.data.place_order);
        if (!resp.is_success) {
          throw new Error(resp.body);
        }
      } else {
        throw new Error("Place order failed: No valid response from server");
      }
    } catch (error) {
      const errors = (error as GraphQLResult).errors;
      if (errors && errors.length > 0) {
        let concatError = "";
        errors.forEach((error) => {
          concatError += error.message;
          concatError += ":";
        });
        throw new Error(concatError);
      }
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
      if (result?.data?.withdraw) {
        const resp: UserActionLambdaResp = JSON.parse(result.data.withdraw);
        if (!resp.is_success) {
          throw new Error(resp.body);
        }
      } else {
        throw new Error("withdraw failed: No valid response from server");
      }
    } catch (error) {
      const errors = (error as GraphQLResult).errors;
      if (errors && errors.length > 0) {
        let concatError = "";
        errors.forEach((error) => {
          concatError += error.message;
          concatError += ":";
        });
        throw new Error(concatError);
      }
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
      if (result?.data?.cancel_all) {
        const resp: UserActionLambdaResp = JSON.parse(result.data.cancel_all);
        if (!resp.is_success) {
          throw new Error(resp.body);
        }
      } else {
        throw new Error("cancelAll failed: No valid response from server");
      }
    } catch (error) {
      const errors = (error as GraphQLResult).errors;
      if (errors && errors.length > 0) {
        let concatError = "";
        errors.forEach((error) => {
          concatError += error.message;
          concatError += ":";
        });
        throw new Error(concatError);
      }
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
