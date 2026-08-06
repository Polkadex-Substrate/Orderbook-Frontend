import { appsyncOperations } from "./writeStrategy";
import { appsyncReader } from "./readStrategy";
import { GraphQLWebSocketSubscriptions } from "./newSubscriptionStrategy";
import {
  OrderbookOperationStrategy,
  OrderbookReadStrategy,
  OrderbookService,
  OrderbookSubscriptionStrategy,
} from "./../interfaces";
export * from "./readStrategy";
export * from "./writeStrategy";
export * from "./constants";

export { GraphQLWebSocketSubscriptions } from "./newSubscriptionStrategy";

// There is one subscription transport now: graphql-ws against the Orderbook
// backend. The factory that chose between this and AppSync's MQTT/`/realtime`
// protocol is gone along with the USE_NEW_BACKEND flag that drove it.
export const orderbookSubscriptions = new GraphQLWebSocketSubscriptions(
  appsyncReader
);

type ConstructorArgs = {
  operation: OrderbookOperationStrategy;
  query: OrderbookReadStrategy;
  subscriber: OrderbookSubscriptionStrategy;
};

class AppsyncV1 implements OrderbookService {
  private _isReady: boolean;
  operation: OrderbookOperationStrategy;
  query: OrderbookReadStrategy;
  subscriber: OrderbookSubscriptionStrategy;
  async init(): Promise<void> {
    await Promise.all([
      this.operation.init(),
      this.query.init(),
      this.subscriber.init(),
    ]);
    this._isReady = true;
  }

  isReady(): boolean {
    return this._isReady;
  }

  constructor({ operation, query, subscriber }: ConstructorArgs) {
    this.operation = operation;
    this.query = query;
    this.subscriber = subscriber;
  }
}

export const appsyncOrderbookService = new AppsyncV1({
  operation: appsyncOperations,
  query: appsyncReader,
  subscriber: orderbookSubscriptions,
});
