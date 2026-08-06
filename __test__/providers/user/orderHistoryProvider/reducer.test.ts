import { OrdersHistoryState } from "@polkadex/orderbook/providers/user/orderHistoryProvider/types";
import { OrdersHistoryAction } from "@polkadex/orderbook/providers/user/orderHistoryProvider/actions";

import { ordersHistoryReducer } from "../../../../src/providers/user/orderHistoryProvider/reducer";

interface testCases {
  state: OrdersHistoryState;
  action: OrdersHistoryAction;
  output: OrdersHistoryState;
}

const cases: testCases[] = [
  {
    state: {
      list: [],
      openOrders: [
        {
          avg_filled_price: "2",
          client_order_id:
            "0x7765626170702d00004430c2db567c790f426a1d2f0710eecc56d6d585f8ac04",
          fee: "0",
          filled_quantity: "2",
          id: "0xfa01d0a31d55ffa6a34c0a047be96b7bca43fd4d954a8f63fc06f078caaa0d5b",
          m: "PDEX-1",
          main_account: "esmGWYTNpzfJbRZy12Wss4spoQNkPsUBosW4EwNbqfgAZJrSt",
          order_type: "LIMIT",
          price: 2,
          qty: 3,
          side: "Bid",
          status: "Open",
          time: "2023-03-16T05:40:08.000Z",
        },
      ],
      loading: false,
      pageIndex: 0,
      success: false,
      orderHistoryNextToken: "",
    },
    action: {
      type: "ordersHistory/DATA",
      payload: {
        list: [
          {
            avg_filled_price: "2",
            client_order_id:
              "0x7765626170702d0000970d4f75876e766fb17a0bec7a0bfc429c3522b99d6ea0",
            fee: "0",
            filled_quantity: "4",
            id: "0x0e64aa55c11160298154e17535f21a78e37e6ffd98c878d00f92ba541dab4de7",
            m: "PDEX-1",
            main_account: "esmGWYTNpzfJbRZy12Wss4spoQNkPsUBosW4EwNbqfgAZJrSt",
            order_type: "MARKET",
            price: 0,
            qty: 4,
            side: "Ask",
            status: "CLOSED",
            time: "2023-03-16T09:52:35.000Z",
          },
        ],
        nextToken: "",
      },
    },
    output: {
      list: [
        {
          avg_filled_price: "2",
          client_order_id:
            "0x7765626170702d0000970d4f75876e766fb17a0bec7a0bfc429c3522b99d6ea0",
          fee: "0",
          filled_quantity: "4",
          id: "0x0e64aa55c11160298154e17535f21a78e37e6ffd98c878d00f92ba541dab4de7",
          m: "PDEX-1",
          main_account: "esmGWYTNpzfJbRZy12Wss4spoQNkPsUBosW4EwNbqfgAZJrSt",
          order_type: "MARKET",
          price: 0,
          qty: 4,
          side: "Ask",
          status: "CLOSED",
          time: "2023-03-16T09:52:35.000Z",
        },
      ],

      loading: false,
      openOrders: [
        {
          avg_filled_price: "2",
          client_order_id:
            "0x7765626170702d00004430c2db567c790f426a1d2f0710eecc56d6d585f8ac04",
          fee: "0",
          filled_quantity: "2",
          id: "0xfa01d0a31d55ffa6a34c0a047be96b7bca43fd4d954a8f63fc06f078caaa0d5b",
          m: "PDEX-1",
          main_account: "esmGWYTNpzfJbRZy12Wss4spoQNkPsUBosW4EwNbqfgAZJrSt",
          order_type: "LIMIT",
          price: 2,
          qty: 3,
          side: "Bid",
          status: "Open",
          time: "2023-03-16T05:40:08.000Z",
        },
      ],
      pageIndex: 0,
      success: true,
      orderHistoryNextToken: "",
    },
  },
  {
    state: {
      list: [],
      openOrders: [],
      loading: false,
      pageIndex: 0,
      success: true,
      orderHistoryNextToken: "",
    },
    action: {
      type: "ordersHistory/openOrders/DATA",
      payload: {
        list: [
          {
            avg_filled_price: "2",
            client_order_id:
              "0x7765626170702d00004430c2db567c790f426a1d2f0710eecc56d6d585f8ac04",
            fee: "0",
            filled_quantity: "2",
            id: "0xfa01d0a31d55ffa6a34c0a047be96b7bca43fd4d954a8f63fc06f078caaa0d5b",
            m: "PDEX-1",
            main_account: "esmGWYTNpzfJbRZy12Wss4spoQNkPsUBosW4EwNbqfgAZJrSt",
            order_type: "LIMIT",
            price: 2,
            qty: 3,
            side: "Bid",
            status: "Open",
            time: "2023-03-16T05:40:08.000Z",
          },
        ],
      },
    },
    output: {
      list: [],
      loading: false,
      openOrders: [
        {
          avg_filled_price: "2",
          client_order_id:
            "0x7765626170702d00004430c2db567c790f426a1d2f0710eecc56d6d585f8ac04",
          fee: "0",
          filled_quantity: "2",
          id: "0xfa01d0a31d55ffa6a34c0a047be96b7bca43fd4d954a8f63fc06f078caaa0d5b",
          m: "PDEX-1",
          main_account: "esmGWYTNpzfJbRZy12Wss4spoQNkPsUBosW4EwNbqfgAZJrSt",
          order_type: "LIMIT",
          price: 2,
          qty: 3,
          side: "Bid",
          status: "Open",
          time: "2023-03-16T05:40:08.000Z",
        },
      ],
      pageIndex: 0,
      success: true,
      orderHistoryNextToken: "",
    },
  },
];

test.each(cases)("order history reducer", ({ state, action, output }) => {
  expect(ordersHistoryReducer(state, action)).toStrictEqual(output);
});
