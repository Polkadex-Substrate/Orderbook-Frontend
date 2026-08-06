/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const websocket_streams =
  /* GraphQL */ `subscription Websocket_streams($name: String!) {
  websocket_streams(name: $name) {
    name
    data
    __typename
  }
}
` as GeneratedSubscription<
    APITypes.Websocket_streamsSubscriptionVariables,
    APITypes.Websocket_streamsSubscription
  >;
