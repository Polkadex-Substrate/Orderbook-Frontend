import {
  RecentTradesData,
  RecentTradesPush,
} from "../../../../src/providers/public/recentTradesProvider/actions";
import { recentTradesReducer } from "../../../../src/providers/public/recentTradesProvider/reducer";

const stateData = {
  list: [],
  loading: false,
};
const actionData: RecentTradesData = {
  type: "recentTrades/DATA",
  payload: [
    {
      amount: "0.25",
      market_id: "PDEX-1",
      price: "12",
      timestamp: 1678452252277,
    },
    {
      amount: "0.25",
      market_id: "PDEX-1",
      price: "12",
      timestamp: 1678452609042,
    },
    {
      amount: "1",
      market_id: "PDEX-1",
      price: "10",
      timestamp: 1678452307235,
    },
  ],
};

test("fetched data should be pushed in the list of the state", () => {
  expect(recentTradesReducer(stateData, actionData)).toStrictEqual({
    currentTrade: {
      amount: "0.25",
      market_id: "PDEX-1",
      price: "12",
      timestamp: 1678452609042,
    },
    lastTrade: {
      amount: "1",
      market_id: "PDEX-1",
      price: "10",
      timestamp: 1678452307235,
    },
    list: [
      {
        amount: "0.25",
        market_id: "PDEX-1",
        price: "12",
        timestamp: 1678452609042,
      },
      {
        amount: "1",
        market_id: "PDEX-1",
        price: "10",
        timestamp: 1678452307235,
      },
      {
        amount: "0.25",
        market_id: "PDEX-1",
        price: "12",
        timestamp: 1678452252277,
      },
    ],
    loading: false,
  });
});

const statePush = {
  list: [
    {
      amount: "1",
      market_id: "PDEX-1",
      price: "10",
      timestamp: 1678452123291,
    },
    {
      amount: "0.25",
      market_id: "PDEX-1",
      price: "12",
      timestamp: 1678452609042,
    },
    {
      amount: "1",
      market_id: "PDEX-1",
      price: "10",
      timestamp: 1678452307235,
    },
    {
      amount: "0.25",
      market_id: "PDEX-1",
      price: "12",
      timestamp: 1678452252277,
    },
  ],
  loading: false,
};
const actionPush: RecentTradesPush = {
  type: "recentTrades/PUSH",
  payload: {
    amount: "12",
    market_id: "PDEX-1",
    price: "13",
    timestamp: 1678452123299,
  },
};
test("new trade should be added in the list array of the state", () => {
  expect(recentTradesReducer(statePush, actionPush)).toStrictEqual({
    list: [
      {
        amount: "12",
        market_id: "PDEX-1",
        price: "13",
        timestamp: 1678452123299,
      },
      {
        amount: "1",
        market_id: "PDEX-1",
        price: "10",
        timestamp: 1678452123291,
      },
      {
        amount: "0.25",
        market_id: "PDEX-1",
        price: "12",
        timestamp: 1678452609042,
      },
      {
        amount: "1",
        market_id: "PDEX-1",
        price: "10",
        timestamp: 1678452307235,
      },
      {
        amount: "0.25",
        market_id: "PDEX-1",
        price: "12",
        timestamp: 1678452252277,
      },
    ],
    loading: false,
  });
});
