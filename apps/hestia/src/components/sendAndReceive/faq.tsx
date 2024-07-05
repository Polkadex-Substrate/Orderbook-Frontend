"use client";

import { Typography, Accordion } from "@polkadex/ux";
import React from "react";

export const Faq = () => {
  return (
    <div className="flex flex-col gap-4 max-md:pt-4 md:pt-6 px-4 max-h-[440px] overflow-scroll scrollbar-hide">
      <Typography.Heading type="h2">FAQ</Typography.Heading>
      <div className="flex flex-col gap-2 lg:w-[350px]">
        <Accordion
          type="multiple"
          defaultValue={["deposit"]}
          className="flex flex-col gap-4"
        >
          <Accordion.Item value="deposit" className="pb-3">
            <Accordion.Trigger>
              <Typography.Text appearance="primary">
                What does Deposit means ?
              </Typography.Text>
              <Accordion.Icon />
            </Accordion.Trigger>
            <Accordion.Content className="mt-3">
              <Typography.Paragraph className="leading-6" size="sm">
                Deposit refers to the transfer of tokens from an external
                network to the Polkadex orderbook.
              </Typography.Paragraph>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="depositFromMoonbeam" className="pb-3">
            <Accordion.Trigger>
              <Typography.Text className="text-left" appearance="primary">
                What can I deposit GLMR from Moonbeam to Polkadex Orderbook ?
              </Typography.Text>
              <Accordion.Icon />
            </Accordion.Trigger>
            <Accordion.Content className="mt-3">
              <Typography.Paragraph className="leading-6" size="sm">
                In order to deposit GLMR from Moonbeam network to Polkadex
                orderbook, you have to follow these steps -
                <ol className="mt-2">
                  <li>
                    1. Choose Moonbeam in &quot;From Network&quot; dropdown.
                  </li>
                  <li>
                    2. Choose EVM account in &quot;From Account&quot; dropdown.
                  </li>
                  <li>
                    3. Enter the amount which you need to Deposit i.e. 100 GLMR
                  </li>
                  <li>4. Click on Deposit</li>
                  <li>5. Verify the details and sign transaction.</li>
                </ol>
              </Typography.Paragraph>
            </Accordion.Content>
          </Accordion.Item>
          <Accordion.Item value="withdraw" className="pb-3">
            <Accordion.Trigger>
              <Typography.Text appearance="primary">
                What does Withdraw means ?
              </Typography.Text>
              <Accordion.Icon />
            </Accordion.Trigger>
            <Accordion.Content className="mt-3">
              <Typography.Paragraph className="leading-6" size="sm">
                Withdraw refers to the transfer of tokens from Polkadex
                orderbook to an external network.
              </Typography.Paragraph>
            </Accordion.Content>
          </Accordion.Item>
        </Accordion>
      </div>
    </div>
  );
};
