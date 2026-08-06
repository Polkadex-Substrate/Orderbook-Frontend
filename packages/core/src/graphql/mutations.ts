/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import * as APITypes from "../API";
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const place_order =
  /* GraphQL */ `mutation Place_order($input: UserActionInput!) {
  place_order(input: $input)
}
` as GeneratedMutation<
    APITypes.Place_orderMutationVariables,
    APITypes.Place_orderMutation
  >;
export const cancel_order =
  /* GraphQL */ `mutation Cancel_order($input: UserActionInput!) {
  cancel_order(input: $input)
}
` as GeneratedMutation<
    APITypes.Cancel_orderMutationVariables,
    APITypes.Cancel_orderMutation
  >;
export const cancel_all =
  /* GraphQL */ `mutation Cancel_all($input: UserActionInput!) {
  cancel_all(input: $input)
}
` as GeneratedMutation<
    APITypes.Cancel_allMutationVariables,
    APITypes.Cancel_allMutation
  >;
export const withdraw =
  /* GraphQL */ `mutation Withdraw($input: UserActionInput!) {
  withdraw(input: $input)
}
` as GeneratedMutation<
    APITypes.WithdrawMutationVariables,
    APITypes.WithdrawMutation
  >;
export const publish =
  /* GraphQL */ `mutation Publish($name: String!, $data: String!) {
  publish(name: $name, data: $data) {
    name
    data
    __typename
  }
}
` as GeneratedMutation<
    APITypes.PublishMutationVariables,
    APITypes.PublishMutation
  >;
