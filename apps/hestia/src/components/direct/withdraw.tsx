"use client";

import {
  HoverInformation,
  ResponsiveCard,
  Typography,
  Button,
  Input,
  Tooltip,
} from "@mitra/ux";
import { RiCheckLine, RiInformationFill } from "@remixicon/react";
import classNames from "classnames";
import { useMeasure } from "react-use";
import { useState } from "react";

import { SelectNetwork, fakeNetworks } from "./selectNetwork";
import { SelectAsset } from "./selectAsset";
import { SelectWallet } from "./selectWallet";

export const Withdraw = () => {
  const [ref, bounds] = useMeasure<HTMLDivElement>();

  const [network, setNetwork] = useState(fakeNetworks[0]);
  const isEVM = network.genesis === "0x006";

  return (
    <div className="flex flex-col md:max-w-[500px] py-8 max-md:pl-6">
      <div className="flex flex-col">
        {isEVM && (
          <div className="flex flex-col gap-2 border-l-2 border-success-base px-8 pb-5 relative">
            <Typography.Text size="lg" bold>
              From
            </Typography.Text>
            <div className="border border-primary rounded-sm px-2 py-4">
              <SelectWallet account={null} setAccount={() => {}} />
            </div>
            <div className="flex item-center justify-center bg-primary rounded-full w-4 h-4 p-0.5 absolute top-0 -left-2.5"></div>
          </div>
        )}
        <div className="flex flex-col gap-2 border-l-2 border-success-base px-8 pb-5 relative">
          <Typography.Heading size="lg" className="leading-none">
            Network
          </Typography.Heading>
          <SelectNetwork network={network} setNetwork={(e) => setNetwork(e)} />
          <div className="flex item-center justify-center bg-success-base rounded-full w-4 h-4 p-0.5 absolute top-0 -left-2.5">
            <RiCheckLine className="w-full h-full" />
          </div>
        </div>
        <div className="flex flex-col gap-2 pb-5 px-8 relative">
          <div className="flex items-center justify-between gap-2">
            <Typography.Heading size="lg" className="leading-none">
              Asset
            </Typography.Heading>
            <HoverInformation>
              <HoverInformation.Trigger className="min-w-20">
                <RiInformationFill className="w-3 h-3 text-actionInput" />
                <Typography.Text size="xs" appearance="primary">
                  Available: 0
                </Typography.Text>
              </HoverInformation.Trigger>
              <HoverInformation.Content>
                <ResponsiveCard label="Source fee" loading={false}>
                  0
                </ResponsiveCard>
                <ResponsiveCard label="Destination fee" loading={false}>
                  0
                </ResponsiveCard>
                <ResponsiveCard label="Available" loading={false}>
                  0
                </ResponsiveCard>
              </HoverInformation.Content>
            </HoverInformation>
          </div>
          <div className="flex flex-col gap-2">
            <div
              ref={ref}
              className="flex item-center border border-primary rounded-sm"
            >
              <SelectAsset width={bounds.width} />
              <Tooltip open={false}>
                <Tooltip.Trigger asChild>
                  <div
                    className={classNames(
                      "w-full pr-4",
                      false && "border-danger-base border"
                    )}
                  >
                    <Input.Vertical
                      type="text"
                      autoComplete="off"
                      placeholder="Enter an amount"
                      // {...getFieldProps("amount")}
                      className="max-sm:focus:text-[16px] w-full pl-4 py-4"
                    >
                      <Input.Action
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                        }}
                      >
                        MAX
                      </Input.Action>
                    </Input.Vertical>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content className="bg-level-5 z-[2] p-1">
                  Error message
                </Tooltip.Content>
              </Tooltip>
            </div>
          </div>
          <div className="flex item-center justify-center bg-success-base rounded-full w-4 h-4 p-0.5 absolute top-0 -left-2.5">
            <RiCheckLine className="w-full h-full" />
          </div>
        </div>
        <div className="px-8 w-full">
          <Button.Light className="w-full" appearance="secondary">
            Withdraw
          </Button.Light>
        </div>
      </div>
    </div>
  );
};
