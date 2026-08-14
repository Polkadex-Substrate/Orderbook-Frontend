import React, { Dispatch, SetStateAction } from "react";
import { Button, Modal, Typography } from "@mitrabook/ux";
import Image from "next/image";
import { getMarketUrl } from "@orderbook/core/helpers";
import { useWindowSize } from "usehooks-ts";
import {
  RiCloseLine,
  RiEarthLine,
  RiMoonLine,
  RiPaletteLine,
} from "@remixicon/react";
import { defaultConfig } from "@orderbook/core/config";

import QrCode from "../../../../public/img/qrCode.png";

import { HeaderLink } from "./headerLink";

import { EXTERNAL_LINKS } from "@/config/links";
import { LEGAL_LINKS } from "@/config/legalLinks";
export const ResponsiveMenuModal = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: Dispatch<SetStateAction<boolean>>;
}) => {
  const isBridgeDisabled = !defaultConfig.isBridgeEnabled;
  const isFaucetDisabled = process.env.NEXT_PUBLIC_ENABLE_FAUCET !== "true";
  const lastUsedMarketUrl = getMarketUrl();
  const { width } = useWindowSize();
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      placement="top right"
      closeOnClickOutside
      className="flex flex-col border-primary bg-level-0 border-x w-screen h-screen md:max-w-md overflow-x-hidden overflow-y-auto"
    >
      {/* The "Menu" title was removed: a panel of navigation links opened from
          a hamburger does not need to announce that it is a menu. The close
          button stays, so the row is kept and justified to the end. */}
      <Modal.Title className="flex justify-end items-center py-4 pl-4">
        <Button.Icon
          variant="ghost"
          size="lg"
          appearance="secondary"
          rounded
          onClick={() => onOpenChange(false)}
        >
          <RiCloseLine className="w-full h-full" />
        </Button.Icon>
      </Modal.Title>
      <Modal.Content className="flex flex-col flex-1">
        <div className="flex flex-col justify-between flex-1">
          <div className="flex flex-col gap-10 p-4">
            {/* "Quick links" removed - the links are self-evidently links, and
                the label competed with them for attention. */}
            {width <= 1024 && (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-5">
                  <HeaderLink.Single
                    size="lg"
                    href={lastUsedMarketUrl}
                    className="text-lg"
                  >
                    Trade
                  </HeaderLink.Single>
                  <HeaderLink.Single
                    size="lg"
                    href="/bridge"
                    className="text-lg"
                    disabled={isBridgeDisabled}
                  >
                    Bridge
                  </HeaderLink.Single>
                  {/* Not gated: the page shows the programme when live and an
                      explanation when not. Mirrors Header/index.tsx. */}
                  <HeaderLink.Single
                    size="lg"
                    href="/rewards"
                    className="text-lg"
                  >
                    Rewards
                  </HeaderLink.Single>
                  <HeaderLink.Single
                    size="lg"
                    href="/faucet"
                    className="text-lg"
                    disabled={isFaucetDisabled}
                  >
                    Faucet
                  </HeaderLink.Single>
                  {/* Analytics removed 2026-08-10 - see Header/index.tsx.
                      Kept in step with the desktop header on purpose: two navs
                      that disagree about what exists is its own bug. */}
                  {/* "Documentation" removed until the new docs exist. A menu
                      item that lands somewhere stale is worse than a shorter
                      menu. Kept in step with the desktop Help dropdown in
                      Header/index.tsx - two navs that disagree about what
                      exists is its own bug. */}
                  <HeaderLink.Accordion
                    items={[
                      {
                        href: EXTERNAL_LINKS.testnetGuide,
                        label: "Orderbook guide",
                      },
                      {
                        href: "/faq",
                        label: "FAQ",
                      },
                    ]}
                  >
                    Help
                  </HeaderLink.Accordion>
                  <HeaderLink.Accordion items={[...LEGAL_LINKS]}>
                    Legal
                  </HeaderLink.Accordion>
                  {/* Community accordion removed 2026-08-10 - see Header/index.tsx */}
                </div>
              </div>
            )}

            {/* "General settings" removed. It was the only section label left
                after "Quick links" went, so it read as a heading for a group
                that is already visually separated. */}
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RiEarthLine className="w-4 h-4 text-primary" />
                    <Typography.Text size="lg">Language</Typography.Text>
                  </div>
                  <Typography.Text appearance="primary">
                    English
                  </Typography.Text>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RiMoonLine className="w-4 h-4 text-primary" />
                    <Typography.Text size="lg">Appearance</Typography.Text>
                  </div>
                  <Typography.Text appearance="primary">
                    Dark Mode
                  </Typography.Text>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <RiPaletteLine className="w-4 h-4 text-primary" />
                    <Typography.Text size="lg">
                      Color Preference
                    </Typography.Text>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-success-base" />
                    <div className="w-4 h-4 bg-danger-base" />
                  </div>
                </div>
                {/* Every row in this group carries a leading icon: Language,
                    Appearance and Color Preference. The reviewer's note was that
                    the icon treatment was inconsistent, so if a row is added
                    here it needs an icon too rather than being the odd one out. */}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 border-t border-primary p-4">
            <Image
              src={QrCode}
              placeholder="blur"
              alt="padlock"
              style={{
                width: "100%",
                height: "auto",
              }}
              className="max-w-[80px]"
            />
            <div className="flex flex-col gap-2">
              <Typography.Heading>Download Polkadex App</Typography.Heading>
              <Typography.Paragraph size="sm" appearance="primary">
                Take Polkadex Orderbook with you and trade anywhere you want
                with the Polkadex App.
              </Typography.Paragraph>
            </div>
          </div>
        </div>
      </Modal.Content>
    </Modal>
  );
};
