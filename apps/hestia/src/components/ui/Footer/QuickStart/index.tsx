import React, { Dispatch, SetStateAction, useMemo } from "react";
import { Button, Modal, Separator, Typography } from "@polkadex/ux";
import { RiCloseLine } from "@remixicon/react";
import Image from "next/image";
import { useWindowSize } from "react-use";
import Link from "next/link";

import SwapImage from "../../../../../public/img/swapHero.webp";

export const QuickStart = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) => {
  const { width } = useWindowSize();
  const responsiveView = useMemo(() => width <= 640, [width]);

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      placement={responsiveView ? "top center" : "center"}
      closeOnClickOutside
      className="flex flex-col border-primary bg-level-0 border w-full max-md:w-screen md:max-w-[800px] overflow-auto scrollbar-hide"
    >
      <Modal.Content className="relative flex max-md:flex-col">
        <div className="flex flex-col gap-3 p-7">
          <div className="flex flex-col">
            <Typography.Heading size="3xl">
              Polkadex is Swapping Parachain Slots
            </Typography.Heading>
            <Typography.Heading
              appearance="primary"
              size="md"
              className="font-normal"
            >
              Good news: Polkadex will extend it’s parachain lease via a slot
              swap with an existing, unused Polkadot parachain.
            </Typography.Heading>
          </div>
          <Separator.Horizontal />
          <div className="flex flex-col gap-3">
            <Typography.Text size="md" bold>
              The swap scheduled for April 9th will:
            </Typography.Text>
            <ul className="flex flex-col gap-2">
              <li className="flex items-center gap-3">
                <Typography.Text>⛓️</Typography.Text>
                <Typography.Text>
                  Extend the Polkadex x Polkadot connection to Q4 2024
                </Typography.Text>
              </li>
              <li className="flex items-center gap-3">
                <Typography.Text>💸</Typography.Text>
                <Typography.Text>
                  Ensure seamless transfers of Polkadot assets to Polkadex &
                  back continue
                </Typography.Text>
              </li>
            </ul>
          </div>
          <Separator.Horizontal />
          <div className="flex flex-col gap-1">
            <Typography.Heading size="sm">⚠️ Fair warning</Typography.Heading>
            <Typography.Paragraph size="sm" appearance="primary">
              While the most likely outcome is that the slots are swapped
              seamlessly, there’s a small chance this specific untested workflow
              in Polkadot causes an issue with the Polkadex parachain and
              temporarily disrupts the connection between Polkadex and Polkadot.
              <Typography.Text size="sm" appearance="base">
                {" "}
                While trading on Polkadex Orderbook will remain unaffected and
                you will still be in full control of your funds on the Polkadex
                Main Network{" "}
              </Typography.Text>
              , your funds could remain on the Polkadex Main Network until a
              connection with Polkadot is re-established. Should you choose to
              do so,
              <Typography.Text size="sm" appearance="base">
                {" "}
                you may transfer funds from Polkadex back to their networks of
                origin{" "}
              </Typography.Text>
              <Typography.Text
                size="sm"
                appearance="info"
                className="underline"
                asChild
              >
                <Link
                  href="/send-and-receive"
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  using THEA
                </Link>
              </Typography.Text>
              <Typography.Text size="sm" appearance="base">
                {" "}
                before the swap is executed on April 9th.
              </Typography.Text>
            </Typography.Paragraph>
          </div>
          <Separator.Horizontal />
          <Typography.Text>
            For more details,{" "}
            <Typography.Text asChild appearance="info">
              <Link
                target="_blank"
                href="https://polkadex.medium.com/polkadex-is-swapping-parachain-slots-6cacde09aafe"
              >
                check the full announcement here.
              </Link>
            </Typography.Text>{" "}
          </Typography.Text>
        </div>
        <div className="md:flex justify-end min-h-full max-md:hidden min-w-[320px] border-l border-primary">
          <Image
            src={SwapImage}
            placeholder="blur"
            alt="Orderbook presentation"
            style={{
              width: "100%",
              height: "auto",
            }}
            className="object-contain object-bottom"
          />
        </div>
        <Button.Icon
          variant="ghost"
          size="lg"
          appearance="secondary"
          rounded
          onClick={() => onOpenChange(false)}
          className="absolute top-2 right-2"
        >
          <RiCloseLine className="h-full w-full" />
        </Button.Icon>
      </Modal.Content>
    </Modal>
  );
};
