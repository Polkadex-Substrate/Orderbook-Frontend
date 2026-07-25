import { isNewBackendEnabled } from "../../../helpers";

// Factory below picks the subscription strategy from the feature flag.
import { appsyncOperations } from "./writeStrategy";
import { appsyncReader } from "./readStrategy";
import { GraphQLWebSocketSubscriptions } from "./newSubscriptionStrategy";
import { appsyncSubscriptions } from "./subscriptionStrategy";
import {
  OrderbookOperationStrategy,
  OrderbookReadStrategy,
  OrderbookService,
  OrderbookSubscriptionStrategy,
} from "./../interfaces";
export * from "./readStrategy";
export * from "./writeStrategy";
export * from "./constants";

// Export both subscription strategies
export { appsyncSubscriptions } from "./subscriptionStrategy";
export { GraphQLWebSocketSubscriptions } from "./newSubscriptionStrategy";

/**
 * Get the appropriate subscription strategy based on feature flag
 * @returns OrderbookSubscriptionStrategy instance
 */
export function getSubscriptionStrategy() {
  if (isNewBackendEnabled()) {
    console.log("[Subscriptions] Using new GraphQL WebSocket strategy");
    return new GraphQLWebSocketSubscriptions(appsyncReader);
  } else {
    console.log("[Subscriptions] Using legacy AppSync MQTT strategy");
    return appsyncSubscriptions;
  }
}

// Export default instance (will use feature flag)
export const orderbookSubscriptions = getSubscriptionStrategy();

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
