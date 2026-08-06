"use client";

import { renderSendWidget } from "@cedelabs/widgets-universal";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { Typography } from "@polkadex/ux";
import { RiInformation2Line } from "@remixicon/react";
import { useEffect, useMemo, useRef } from "react";
import { useResizeObserver, useWindowSize } from "usehooks-ts";

import { themeConfig } from "../../../../../themeConfig";
import { ResponsiveProfile } from "../ui/Header/Profile/responsiveProfile";

import { Help } from "./Help";

import { Footer, Header } from "@/components/ui";
const extend = themeConfig.theme.extend;

export function Template() {
  const { width } = useWindowSize();

  const headerRef = useRef<HTMLDivElement | null>(null);
  const helpRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const interactionRef = useRef<HTMLDivElement | null>(null);

  const { height: footerHeight = 0 } = useResizeObserver({
    ref: footerRef,
    box: "border-box",
  });

  const { height: interactionHeight = 0 } = useResizeObserver({
    ref: interactionRef,
    box: "border-box",
  });

  const { selectedWallet, browserAccountPresent, extensionAccountPresent } =
    useConnectWalletProvider();

  useEffect(() => {
    const widgetDiv = document.getElementById("cede-widget");
    if (widgetDiv) {
      widgetDiv.innerHTML = "";
    }
    renderSendWidget("#cede-widget", {
      theme: {
        borderRadius: 1,
        borderColor: extend.colors["secondary-base"],
        inputBorderColor: extend.colors["secondary-base"],
        logoBorderColor: extend.colors["primary-base"],
        accentColor: extend.colors["primary-base"],
      },
      config: {
        tokenSymbol: "PDEX",
        network: "polkadex",
        address: selectedWallet?.address,
      },
    });
  }, [selectedWallet?.address]);

  const mobileView = useMemo(() => width <= 640, [width]);

  return (
    <div
      className="flex flex-1 flex-col bg-backgroundBase h-full"
      vaul-drawer-wrapper=""
    >
      <Header ref={headerRef} />
      <main
        className="flex flex-1 overflow-auto border-x border-secondary-base w-full max-w-[1920px] m-auto"
        style={{
          paddingBottom: mobileView
            ? `${interactionHeight}px`
            : `${footerHeight}px`,
        }}
      >
        <div className="flex flex-col flex-1">
          <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-secondary-base flex-wrap">
            <Typography.Text bold size="lg">
              CEX On-Ramp
            </Typography.Text>
            <RiInformation2Line className="w-6 h-6 text-primary" />
          </div>
          <div className="flex flex-1 flex-col items-center justify-center">
            <div id="cede-widget" />
          </div>
          <Help ref={helpRef} />
        </div>
      </main>
      {mobileView && (browserAccountPresent || extensionAccountPresent) && (
        <div
          ref={interactionRef}
          className="flex flex-col gap-4 py-2 bg-level-1 border-t border-primary px-2 fixed bottom-0 left-0 w-full"
        >
          <ResponsiveProfile
            extensionAccountPresent={extensionAccountPresent}
            browserAccountPresent={browserAccountPresent}
          />
        </div>
      )}
      {!mobileView && <Footer ref={footerRef} />}
    </div>
  );
}
