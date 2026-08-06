"use client";

import { Typography } from "@polkadex/ux";
import { useWindowSize } from "usehooks-ts";
import { Fragment, useMemo } from "react";
import { RiInformation2Line } from "@remixicon/react";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { useMeasure } from "react-use";

import { ResponsiveProfile } from "../ui/Header/Profile/responsiveProfile";

import { Help } from "./Help";
import { Form } from "./Form";

import { Footer, Header } from "@/components/ui";

export function Template() {
  const { width } = useWindowSize();

  const [footerRef, footerBounds] = useMeasure<HTMLDivElement>();
  const [interactionRef, interactionBounds] = useMeasure<HTMLDivElement>();

  const { browserAccountPresent, extensionAccountPresent } =
    useConnectWalletProvider();

  const mobileView = useMemo(() => width <= 640, [width]);

  const paddingBottom = useMemo(
    () =>
      mobileView ? `${interactionBounds.height}px` : `${footerBounds.height}px`,
    [interactionBounds.height, footerBounds.height, mobileView]
  );

  return (
    <Fragment>
      <div
        className="flex flex-1 flex-col bg-backgroundBase h-full"
        vaul-drawer-wrapper=""
      >
        <Header />
        <main
          className="flex flex-1 overflow-auto border-x border-secondary-base w-full max-w-[1920px] h-full m-auto"
          style={{
            paddingBottom,
          }}
        >
          <div className="flex-1 flex flex-col">
            <div className="flex flex-col flex-1">
              <div className="flex items-center justify-between p-4 border-b border-secondary-base">
                <Typography.Text bold size="lg">
                  Bridge
                </Typography.Text>
                <RiInformation2Line className="w-6 h-6 text-primary" />
              </div>
              <Form />
            </div>
            <Help />
          </div>
        </main>
        {mobileView && (browserAccountPresent || extensionAccountPresent) && (
          <div
            ref={interactionRef}
            className="flex flex-col gap-4 bg-level-1 border-t border-primary py-2 px-2 fixed bottom-0 left-0 w-full"
          >
            <ResponsiveProfile
              extensionAccountPresent={extensionAccountPresent}
              browserAccountPresent={browserAccountPresent}
            />
          </div>
        )}
        {!mobileView && <Footer ref={footerRef} />}
      </div>
    </Fragment>
  );
}
