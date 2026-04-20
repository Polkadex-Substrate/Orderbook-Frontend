import { TransferHistory } from "@orderbook/core/helpers/types";

export interface IndexerTransferNode {
  id: string;
  blockNumber: number;
  timestamp: string;
  extrinsicHash: string;
  from: string;
  to: string;
  asset: string;
  amount: string;
  transferType: string;
  successful: boolean;
}

export const INDEXER_GETTERS = {
  fetchTransfers: async (
    url: string,
    address: string,
    offset: number,
    limit: number
  ): Promise<{ count: number; transfers: TransferHistory[] }> => {
    const query = `
      query($address: String!, $first: Int!, $offset: Int!) {
        transfers(
          first: $first,
          offset: $offset,
          filter: {
            or: [
              { from: { equalTo: $address } },
              { to: { equalTo: $address } }
            ]
          },
          orderBy: TIMESTAMP_DESC
        ) {
          totalCount
          nodes {
            id
            blockNumber
            timestamp
            extrinsicHash
            from
            to
            asset
            amount
            transferType
            successful
          }
        }
      }
    `;

    const variables = {
      address,
      first: limit,
      offset,
    };

    const response = await fetch(url || 'https://sq-indexer.polkadex.ee', {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });

    const body = await response.json();
    const data = body.data?.transfers;

    if (!data) {
      return { count: 0, transfers: [] };
    }

    const transfers: TransferHistory[] = data.nodes.map(
      (node: IndexerTransferNode) => {
        return {
          from: node.from,
          to: node.to,
          extrinsic_index: "",
          success: node.successful,
          hash: node.extrinsicHash,
          block_num: node.blockNumber,
          block_timestamp: new Date(node.timestamp).getTime() / 1000,
          module: "",
          amount: node.amount,
          amount_v2: node.amount,
          usd_amount: "",
          fee: "0",
          nonce: 0,
          asset_symbol: "",
          asset_unique_id: node.asset || "",
          asset_type: "",
          item_id: null,
          from_account_display: { address: node.from },
          to_account_display: { address: node.to, display: "" },
          event_idx: 0,
          item_detail: null,
        } as TransferHistory;
      }
    );

    return {
      count: data.totalCount,
      transfers,
    };
  },
};
