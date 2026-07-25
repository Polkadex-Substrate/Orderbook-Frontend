import { Button, Icon, Typography } from "@mitra/ux";
import Link from "next/link";
import {
  RiArrowLeftRightLine,
  RiCoinLine,
  RiExternalLinkLine,
  RiMedalLine,
} from "@remixicon/react";

import { Rewards } from "@/components/ui/Icons/rewards";

export const Info = () => {
  return (
    <div className="flex md:items-center max-md:flex-col-reverse justify-between gap-2 border-b border-primary px-3 max-md:py-4 max-md:px-8">
      <div className="flex flex-col gap-4 pt-4 md:max-w-[450px]">
        <div className="flex flex-col gap-2">
          <Typography.Heading size="5xl">
            Liquidity Mining Program
          </Typography.Heading>
          <Typography.Paragraph appearance="primary" className="leading-8">
            Polkadex Launch Incentives Program features a $1 million liquidity
            fund, with participants earning points through Orderbook usage.
            Rewards are distributed at the end of each epoch based on the
            accumulated points.
          </Typography.Paragraph>
          <Button.Underline asChild className="p-0 gap-2 justify-start text-sm">
            <Link href="/">
              Read more
              <RiExternalLinkLine className="w-4 h-4" />
            </Link>
          </Button.Underline>
        </div>
        <div className="flex gap-4 md:items-center max-md:flex-col">
          <div className="flex items-center gap-2">
            <Icon
              className="flex items-center justify-center bg-level-2/55 rounded-md p-1"
              size="md"
            >
              <RiArrowLeftRightLine className="w-4 h-4 text-primary-base" />
            </Icon>
            <Typography.Text bold size="lg" className="whitespace-nowrap">
              28-day trading
            </Typography.Text>
          </div>
          <div className="grid place-content-center w-8 h-8 rounded-full bg-level-1 max-md:rotate-90">
            <Typography.Text size="xl">=</Typography.Text>
          </div>
          <div className="flex items-center gap-2">
            <Icon
              className="flex items-center justify-center bg-level-2/55 rounded-md p-1"
              size="md"
            >
              <RiCoinLine className="w-4 h-4 text-primary-base" />
            </Icon>

            <Typography.Text bold size="lg">
              Points
            </Typography.Text>
          </div>
          <div className="grid place-content-center w-8 h-8 rounded-full bg-level-1  max-md:rotate-90">
            <Typography.Text size="xl">=</Typography.Text>
          </div>
          <div className="flex items-center gap-2">
            <Icon
              className="flex items-center justify-center bg-level-2/55 rounded-md p-1"
              size="md"
            >
              <RiMedalLine className="w-4 h-4 text-primary-base" />
            </Icon>
            <Typography.Text bold size="lg">
              Rewards
            </Typography.Text>
          </div>
        </div>
      </div>
      <Rewards className="md:max-w-[450px] max-md:max-w-[250px] max-md:ml-10 self-start" />
    </div>
  );
};
