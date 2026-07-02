export type CrossChainTxStatus = "PENDING" | "TIMEDOUT" | "COMPLETED";

export const CROSS_CHAIN_TRANSACTIONS_QUERY = /* GraphQL */ `
  query GetCrossChainTransactions(
    $address: String!
    $status: CrossChainTxStatus
    $limit: Int
    $nextToken: String
  ) {
    crossChainTransactions(
      address: $address
      status: $status
      limit: $limit
      nextToken: $nextToken
    ) {
      items {
        transactionHash
        commitment
        address
        assetId
        symbol
        amount
        sourceChain
        destinationChain
        status
        timestamp
      }
      nextToken
    }
  }
`;

export const RECORD_CROSS_CHAIN_TRANSACTION_MUTATION = /* GraphQL */ `
  mutation RecordCrossChainTransaction($input: RecordCrossChainTransactionInput!) {
    recordCrossChainTransaction(input: $input) {
      transactionHash
      commitment
      address
      assetId
      symbol
      amount
      sourceChain
      destinationChain
      status
      timestamp
    }
  }
`;

export const UPDATE_CROSS_CHAIN_TRANSACTION_STATUS_MUTATION = /* GraphQL */ `
  mutation UpdateCrossChainTransactionStatus($input: UpdateCrossChainTransactionStatusInput!) {
    updateCrossChainTransactionStatus(input: $input) {
      transactionHash
      status
    }
  }
`;

export interface CrossChainTransaction {
  transactionHash: string;
  commitment?: string | null;
  address: string;
  assetId: string;
  symbol: string;
  amount: string;
  sourceChain: string;
  destinationChain: string;
  status: CrossChainTxStatus;
  timestamp: string;
}

export interface RecordCrossChainTransactionInput {
  transactionHash: string;
  commitment: string;
  assetId: string;
  symbol: string;
  amount: string;
  sourceChain: string;
  destinationChain: string;
  timestamp: string;
  address: string;
}

export interface UpdateCrossChainTransactionStatusInput {
  transactionHash: string;
  status: CrossChainTxStatus;
  address: string;
}
