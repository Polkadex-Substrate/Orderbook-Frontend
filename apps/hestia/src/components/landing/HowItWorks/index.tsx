import Link from "next/link";
import { Button, Typography } from "@mitrabook/ux";
import { getMarketUrl } from "@orderbook/core/helpers";
import { RiArrowRightLine } from "@remixicon/react";

import { Card } from "./card";

export const HowItWorks = () => {
  const lastUsedMarketUrl = getMarketUrl();
  return (
    <section className="flex flex-col border-b border-primary max-w-screen-xl mx-auto w-fulll max-xl:px-3">
      <div className="flex flex-wrap items-center justify-around max-xl:p-4 py-12 border-b border-primary">
        <Typography.Heading
          type="h4"
          size="2xl"
          className="flex flex-col items-center"
        >
          <span>⚡</span>
          <span>Fast</span>
        </Typography.Heading>
        <Typography.Heading
          type="h4"
          size="2xl"
          className="flex flex-col items-center"
        >
          <span>🚀</span>
          <span>Simple</span>
        </Typography.Heading>
        <Typography.Heading
          type="h4"
          size="2xl"
          className="flex flex-col items-center"
        >
          <span>🔐</span>
          <span>Secure</span>
        </Typography.Heading>
      </div>
      <div className="flex max-lg:flex-col">
        <Card title="1. Connect your wallet" active>
          Choose your wallet from a variety of Polkadot-based wallets for use
          within Orderbook.
        </Card>
        <Card title="2. Add funds">
          Transfer funds into your trading account
        </Card>
        <Card title="3. Start trading">
          Now, you‘re all set to start trading.
        </Card>
      </div>
      <div className="max-md:flex-col flex items-center gap-6 p-10 border-t border-primary">
        <Typography.Text
          appearance="primary"
          className="whitespace-nowrap"
          size="base"
        >
          Click this small button to begin trading
          <RiArrowRightLine className="w-4 h-4 ml-3 inline-block max-md:rotate-90" />
        </Typography.Text>
        <Button.Solid className="w-full">
          <Link href={lastUsedMarketUrl} className="w-full">
            Start trading
          </Link>
        </Button.Solid>
      </div>
    </section>
  );
};
