import { useQuery } from "@tanstack/react-query";

import { QUERY_KEYS } from "../constants/queryKeys";
import { sendQuery, sendMutation } from "../helpers/graphqlCompat";
import {
  CROSS_CHAIN_TRANSACTIONS_QUERY,
  RECORD_CROSS_CHAIN_TRANSACTION_MUTATION,
  UPDATE_CROSS_CHAIN_TRANSACTION_STATUS_MUTATION,
  CrossChainTransaction,
  CrossChainTxStatus,
  RecordCrossChainTransactionInput,
  UpdateCrossChainTransactionStatusInput,
} from "../graphql/crossChainTransactions";

export type {
  CrossChainTransaction,
  CrossChainTxStatus,
  RecordCrossChainTransactionInput,
  UpdateCrossChainTransactionStatusInput,
};

interface CrossChainTransactionsData {
  crossChainTransactions: {
    items: CrossChainTransaction[];
    nextToken: string | null;
  };
}

export const useCrossChainTransactions = ({
  address,
  limit = 20,
  status,
  nextToken,
  enabled = true,
}: {
  address: string;
  limit?: number;
  status?: CrossChainTxStatus;
  nextToken?: string;
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: QUERY_KEYS.crossChainTransactions(address, status),
    queryFn: async () => {
      const response = await sendQuery<{ data: CrossChainTransactionsData }>({
        query: CROSS_CHAIN_TRANSACTIONS_QUERY,
        variables: {
          address,
          limit,
          ...(status && { status }),
          ...(nextToken && { nextToken }),
        },
      });
      return response.data.crossChainTransactions.items;
    },
    enabled: enabled && !!address,
  });
};

export async function recordCrossChainTransaction(
  input: RecordCrossChainTransactionInput,
): Promise<CrossChainTransaction | null> {
  try {
    const response = await sendMutation<{
      data: { recordCrossChainTransaction: CrossChainTransaction };
    }>({
      mutation: RECORD_CROSS_CHAIN_TRANSACTION_MUTATION,
      variables: { input },
    });
    return response.data.recordCrossChainTransaction;
  } catch (e) {
    console.error("[CrossChain] Failed to record transaction:", e);
    return null;
  }
}

export async function updateCrossChainTransactionStatus(
  input: UpdateCrossChainTransactionStatusInput,
): Promise<{ transactionHash: string; status: CrossChainTxStatus } | null> {
  try {
    const response = await sendMutation<{
      data: {
        updateCrossChainTransactionStatus: {
          transactionHash: string;
          status: CrossChainTxStatus;
        };
      };
    }>({
      mutation: UPDATE_CROSS_CHAIN_TRANSACTION_STATUS_MUTATION,
      variables: { input },
    });
    return response.data.updateCrossChainTransactionStatus;
  } catch (e) {
    console.error("[CrossChain] Failed to update transaction status:", e);
    return null;
  }
}
