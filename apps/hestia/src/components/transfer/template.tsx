"use client";

import { GenericMessage, Tabs, Typography } from "@polkadex/ux";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { RiInformation2Line } from "@remixicon/react";
import { useTransactions, useTransferHistory } from "@orderbook/core/hooks";
import { useConnectWalletProvider } from "@orderbook/core/providers/user/connectWalletProvider";
import { usePathname, useRouter } from "next/navigation";
import { useResizeObserver, useWindowSize } from "usehooks-ts";
import { sleep } from "@orderbook/core/helpers";

import { ResponsiveProfile } from "../ui/Header/Profile/responsiveProfile";

import { Help } from "./Help";
import { SelectAsset } from "./SelectAsset";
import { Form } from "./Form";
import { History } from "./History";
import { ReadyToClaim } from "./ReadyToClaim";

import { Footer, Header } from "@/components/ui";
import { useSizeObserver, useTransfer } from "@/hooks";
import { defaultConfig } from "@/config";

export function Template() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowSize();

  const headerRef = useRef<HTMLDivElement | null>(null);
  const helpRef = useRef<HTMLDivElement | null>(null);
  const tableTitleRef = useRef<HTMLDivElement | null>(null);
  const formwRef = useRef<HTMLDivElement | null>(null);
  const footerRef = useRef<HTMLDivElement | null>(null);
  const [interactionRef, interactionHeight] = useSizeObserver();

  const { height: helpHeight = 0 } = useResizeObserver({
    ref: helpRef,
    box: "border-box",
  });

  const { height: headerHeight = 0 } = useResizeObserver({
    ref: headerRef,
    box: "border-box",
  });

  const { height: tableTitleHeight = 0 } = useResizeObserver({
    ref: tableTitleRef,
    box: "border-box",
  });

  const { height: formHeight = 0 } = useResizeObserver({
    ref: formwRef,
    box: "border-box",
  });

  const { height: footerHeight = 0 } = useResizeObserver({
    ref: footerRef,
    box: "border-box",
  });

  const tableMaxHeight = useMemo(
    () =>
      `calc(100vh - ${
        formHeight + headerHeight + helpHeight + tableTitleHeight + 30
      }px)`,
    [headerHeight, formHeight, helpHeight, tableTitleHeight]
  );

  const {
    onChangeAsset,
    selectedAsset,
    assetsInteraction,
    onAssetsInteraction,
    type,
    onChangeType,
    createQueryString,
    loading: isBalanceFetching,
  } = useTransfer();

  const { readyWithdrawals } = useTransactions();
  const { selectedWallet, browserAccountPresent, extensionAccountPresent } =
    useConnectWalletProvider();

  const [activeTab, setActiveTab] = useState("history");

  const { data, isLoading, refetch } = useTransferHistory(
    defaultConfig.subscanApi,
    selectedWallet?.address as string,
    !!selectedWallet
  );

  useEffect(() => {
    if (readyWithdrawals?.length) setActiveTab("readyToClaim");
  }, [readyWithdrawals?.length]);

  const mobileView = useMemo(() => width <= 640, [width]);

  return (
    <Fragment>
      <SelectAsset
        open={assetsInteraction}
        onOpenChange={() => onAssetsInteraction()}
        selectedAssetId={selectedAsset?.id}
        onChangeAsset={onChangeAsset}
      />
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
            <div ref={formwRef} className="flex-1 flex flex-col">
              <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-secondary-base flex-wrap">
                <Typography.Text bold size="lg">
                  Transfer
                </Typography.Text>
                <RiInformation2Line className="w-6 h-6 text-primary" />
              </div>
              <Form
                isBalanceFetching={isBalanceFetching}
                assetsInteraction={assetsInteraction}
                selectedAsset={selectedAsset}
                onAssetsInteraction={onAssetsInteraction}
                type={type}
                onChangeType={(e) => {
                  onChangeType(e);
                  router.push(pathname + "?" + createQueryString("type", e));
                }}
                refetch={async () => {
                  await sleep(55000);
                  await refetch();
                }}
              />
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <div className="flex-1 flex flex-col">
                <div
                  ref={tableTitleRef}
                  className="border-b border-primary px-4 w-full py-2"
                >
                  <Tabs.List>
                    <Tabs.Trigger value="history">History</Tabs.Trigger>
                    <Tabs.Trigger value="readyToClaim">
                      Ready to claim ({readyWithdrawals.length})
                    </Tabs.Trigger>
                  </Tabs.List>
                </div>
                {browserAccountPresent || extensionAccountPresent ? (
                  <Fragment>
                    <Tabs.Content value="history" className="flex flex-col">
                      <History
                        showSubscanData={type === "transfer"}
                        subscanData={data?.pages?.[0]?.transfers}
                        subscanLoading={isLoading}
                        tableMaxHeight={tableMaxHeight}
                      />
                    </Tabs.Content>
                    <Tabs.Content
                      value="readyToClaim"
                      className="flex flex-col"
                    >
                      <ReadyToClaim maxHeight={`300px`} />
                    </Tabs.Content>
                  </Fragment>
                ) : (
                  <GenericMessage
                    title="Connect your trading account"
                    illustration="ConnectAccount"
                    className="bg-level-0 border-b border-primary"
                  />
                )}
              </div>
            </Tabs>
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
    </Fragment>
  );
}
