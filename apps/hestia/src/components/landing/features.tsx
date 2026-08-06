import Link from "next/link";
import { Button, Typography } from "@mitrabook/ux";
import Image from "next/image";
import { getMarketUrl } from "@orderbook/core/helpers";
import { RiArrowRightLine } from "@remixicon/react";

import SpeedImage from "../../../public/img/speed.webp";
import PadLock from "../../../public/img/padlock.webp";
import MarketImage from "../../../public/img/market.webp";
import NonCustodial from "../../../public/img/nonCustodial.webp";

export const Features = () => {
  const lastUsedMarketUrl = getMarketUrl();
  return (
    <section className="flex flex-col border-b border-primary max-w-screen-xl mx-auto w-fulll max-xl:px-2">
      <div className="flex flex-wrap items-center justify-around">
        <Typography.Heading type="h4" size="4xl" className="py-6">
          Your keys
        </Typography.Heading>
        <Typography.Heading type="h4" size="4xl" className="py-6">
          Your Crypto
        </Typography.Heading>
        <Typography.Heading type="h4" size="4xl" className="py-6">
          Your exchange
        </Typography.Heading>
      </div>
      <div className="flex flex-col">
        <div className="max-md:flex-col flex items-center justify-between max-md:pt-10 md:px-10 border-y border-primary">
          <div className="flex flex-col gap-2 md:max-w-xs md:min-w-[250px]">
            <Typography.Heading size="2xl">
              Lightning fast trades
            </Typography.Heading>
            <Typography.Paragraph appearance="primary">
              Trade crypto with sub-milisecond latency on a DEX that’s as fast
              as CEXs.
            </Typography.Paragraph>
          </div>
          <Image
            src={SpeedImage}
            placeholder="blur"
            alt="benefits"
            priority
            draggable={false}
            style={{
              width: "100%",
              height: "auto",
            }}
            className="max-h-[400px] max-w-[550]"
          />
        </div>
        <div className="max-md:flex-col flex">
          <div className="flex flex-col gap-2 text-center items-center justify-between max-md:border-b md:border-r border-primary pt-12 md:px-10 flex-1">
            <div className="flex flex-col gap-2">
              <Typography.Heading size="2xl">
                Blockchain security
              </Typography.Heading>
              <Typography.Paragraph appearance="primary">
                Secured by a validator set of 200+ network nodes.
              </Typography.Paragraph>
            </div>
            <Image
              src={PadLock}
              placeholder="blur"
              alt="padlock"
              style={{
                width: "100%",
                height: "auto",
              }}
              className="max-w-[380px]"
            />
          </div>
          <div className="flex flex-col gap-2 text-center items-center justify-between max-md:border-b md:border-r border-primary pt-12 md:px-10 flex-1">
            <div className="flex flex-col gap-2">
              <Typography.Heading size="2xl">
                Limit & market orders
              </Typography.Heading>
              <Typography.Paragraph appearance="primary">
                Control price with limit orders, achieve instant execution with
                market orders.
              </Typography.Paragraph>
            </div>
            <Image
              src={MarketImage}
              placeholder="blur"
              alt="padlock"
              style={{
                width: "100%",
                height: "auto",
              }}
              className="max-w-[380px]"
            />
          </div>
          <div className="flex flex-col gap-2 text-center items-center justify-between pt-12 md:px-10 flex-1">
            <div className="flex flex-col gap-2">
              <Typography.Heading size="2xl">Non-custodial</Typography.Heading>
              <Typography.Paragraph appearance="primary">
                You have full control over your liquidity, ensuring both safety
                and the flexibility to withdraw it at any time.
              </Typography.Paragraph>
            </div>
            <Image
              src={NonCustodial}
              placeholder="blur"
              alt="padlock"
              style={{
                width: "100%",
                height: "auto",
              }}
              className="max-w-[380px]"
            />
          </div>
        </div>
      </div>
      <div className="max-md:flex-col flex items-center justify-between gap-6 max-xl:p-2 py-8 border-t border-primary">
        <Typography.Text
          appearance="primary"
          className="whitespace-nowrap"
          size="base"
        >
          Read more about Polkadex Orderbook
          <RiArrowRightLine className="w-4 h-4 ml-3 inline-block max-md:rotate-90" />
        </Typography.Text>
        <Link href={lastUsedMarketUrl}>
          <Button.Solid>Start trading</Button.Solid>
        </Link>
      </div>
    </section>
  );
};
