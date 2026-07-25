"use client";

import { Button, Typography } from "@mitra/ux";
import Image from "next/image";

import OrderbookImage from "../../../public/img/obHestia.webp";

export const CallToAction = () => {
  return (
    <div className="relative max-lg:flex-col flex items-center justify-between lg:gap-8 max-md:px-4 pl-10 border border-primary md:rounded-md my-10 overflow-hidden">
      <div className="flex flex-col gap-6 flex-1 max-w-[350px] max-lg:py-10 max-lg:text-center max-lg:items-center">
        <div className="flex flex-col gap-2">
          <Typography.Text size="xl" appearance="primary">
            Your keys, your crypto, your exchange
          </Typography.Text>
          <Typography.Heading size="3xl">
            Fast, Decentralized and Secure Trading.
          </Typography.Heading>
        </div>
        <div className="flex gap-2">
          <Button.Solid className="w-fit">Trade Now</Button.Solid>
          <Button.Outline appearance="secondary" className="w-fit">
            Rewards
          </Button.Outline>
        </div>
      </div>
      <Image
        alt="Orderbook preview"
        src={OrderbookImage}
        placeholder="blur"
        style={{
          width: "100%",
          height: "100%",
        }}
        className="flex-1 lg:border-[1px] border-primary max-lg:max-w-[600px] lg:max-w-[650px] lg:mt-10"
      />
    </div>
  );
};
