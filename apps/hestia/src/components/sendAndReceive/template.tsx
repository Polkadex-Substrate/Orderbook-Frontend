"use client";

import { Tabs } from "@polkadex/ux";
import { useWindowSize } from "usehooks-ts";
import { Fragment, useMemo, useState } from "react";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { useMeasure } from "react-use";
import { useRouter, useSearchParams } from "next/navigation";
import { RiArrowDownLine, RiArrowUpLine } from "@remixicon/react";
import classNames from "classnames";

import { ResponsiveProfile } from "../ui/Header/Profile/responsiveProfile";
import { ConnectAccountWrapper } from "../ui/ReadyToUse";

import { Help } from "./help";
import { Deposit } from "./deposit";
import { Withdraw } from "./withdraw";
import { History } from "./History";
import { Faq } from "./faq";

import { Footer, Header } from "@/components/ui";

export function Template() {
  const [activeTab, setActiveTab] = useState("history");
  const { width } = useWindowSize();
  const router = useRouter();
  const params = useSearchParams();

  const [footerRef, footerBounds] = useMeasure<HTMLDivElement>();
  const [interactionRef, interactionBounds] = useMeasure<HTMLDivElement>();

  const { browserAccountPresent, extensionAccountPresent } =
    useConnectWalletProvider();

  const mobileView = useMemo(() => width <= 640, [width]);
  const responsiveFaq = useMemo(() => width >= 1024, [width]);

  const paddingBottom = useMemo(
    () =>
      mobileView
        ? `${interactionBounds.height + 20}px`
        : `${footerBounds.height + 4}px`,
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
            <Tabs
              className="flex flex-row flex-1 md:min-h-[430px] max-md:flex-col md:flex-row"
              defaultValue={params.get("type") || "deposit"}
              onValueChange={(e) =>
                router.replace(`/send-and-receive?type=${e}`)
              }
            >
              <div className="flex flex-col">
                <Tabs.List className="flex max-md:flex-row md:flex-col items-start gap-0 py-4">
                  <Tabs.Trigger
                    className="flex items-center gap-2 pl-4 md:pr-10 py-2 md:w-full text-left data-[state=active]:text-success-base data-[state=active]:hover:text-success-hover"
                    value="deposit"
                  >
                    <RiArrowDownLine className="w-5 h-5" />
                    Deposit
                  </Tabs.Trigger>
                  <Tabs.Trigger
                    className="flex items-center gap-2 pl-4 md:pr-10 py-2 md:w-full text-left data-[state=active]:text-primary-base data-[state=active]:hover:text-primary-hover"
                    value="withdraw"
                  >
                    <RiArrowUpLine className="w-5 h-5" />
                    Withdraw
                  </Tabs.Trigger>
                </Tabs.List>
              </div>
              <div className="flex flex-1 border-x border-primary">
                <Tabs.Content value="deposit">
                  <Deposit />
                </Tabs.Content>
                <Tabs.Content value="withdraw">
                  <Withdraw />
                </Tabs.Content>
              </div>
              <div className={classNames(!responsiveFaq && "hidden")}>
                <Faq />
              </div>
            </Tabs>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="border-t border-primary"
            >
              <div className="flex-1 flex flex-col">
                <Tabs.List className="border-b border-primary px-4 w-full py-2">
                  <Tabs.Trigger value="history">History</Tabs.Trigger>
                </Tabs.List>
                {extensionAccountPresent ? (
                  <Tabs.Content value="history" className="flex flex-col">
                    <History searchTerm="" />
                  </Tabs.Content>
                ) : (
                  <ConnectAccountWrapper funding />
                )}
              </div>
            </Tabs>
            <div className={classNames(responsiveFaq && "hidden")}>
              <Faq />
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
