"use client";
// TODO: Replace Buy/Sell/Calendar filter

import { useWindowSize } from "usehooks-ts";
import { Fragment, useMemo, useState } from "react";
import {
  DateRangePicker,
  RangeKeyDict,
  defaultStaticRanges,
} from "react-date-range";
import { Button, Tabs, Checkbox, Popover, ScrollArea } from "@polkadex/ux";
import { useProfile } from "@orderbook/core/providers/user/profile";
import { useOpenOrders } from "@orderbook/core/hooks";
import { Ifilters } from "@orderbook/core/providers/types";
import { useSessionProvider } from "@orderbook/core/providers/user/sessionProvider";
import { RiCalendarLine, RiMore2Line } from "@remixicon/react";

import { OpenOrdersTable } from "./OpenOrders";
import { OrderHistoryTable } from "./OrderHistory";
import { BalancesTable } from "./Balances";
import { TradeHistoryTable } from "./TradeHistory";

import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import "@/styles/calendar.scss";
import { ConnectAccountWrapper } from "@/components/ui/ReadyToUse";
import { useSizeObserver } from "@/hooks";

const initialFilters: Ifilters = {
  onlyBuy: false,
  onlySell: false,
  showReverted: false,
  status: "All Orders",
};

const BUY = "BUY";
const SELL = "SELL";

export const Orders = () => {
  const { width } = useWindowSize();
  const { dispatchUserSessionData, dateFrom, dateTo } = useSessionProvider();
  const { openOrders } = useOpenOrders();
  const [ref, height] = useSizeObserver();

  const {
    selectedAddresses: { tradeAddress, mainAddress },
  } = useProfile();
  const connected = tradeAddress?.length > 0;

  const isFundingType = useMemo(() => !mainAddress, [mainAddress]);

  const [show, setShow] = useState(true);
  const [filters, setFilters] = useState<Ifilters>(initialFilters);

  const scrollAreaView = useMemo(() => width <= 600, [width]);

  const ranges = useMemo(() => {
    return [
      {
        startDate: dateFrom,
        endDate: dateTo,
        key: "selection",
        showDateDisplay: true,
      },
    ];
  }, [dateFrom, dateTo]);

  const onChangeFilters = (key: typeof BUY | typeof SELL) => {
    switch (key) {
      case BUY: {
        setFilters((filters) => ({ ...filters, onlyBuy: !filters.onlyBuy }));
        break;
      }
      case SELL: {
        setFilters((filters) => ({ ...filters, onlySell: !filters.onlySell }));
        break;
      }
      default: {
        break;
      }
    }
  };

  const onChangeDateRange = ({
    selection: { startDate, endDate },
  }: RangeKeyDict) => {
    if (startDate && endDate) {
      dispatchUserSessionData({ dateFrom: startDate, dateTo: endDate });
    }
  };

  const maxWidth = useMemo(
    () => (scrollAreaView ? `${width - 40}px` : "auto"),
    [width, scrollAreaView]
  );

  return (
    <Tabs defaultValue="openOrders" className="flex-1 h-full">
      <div className="flex items-center justify-between border-b border-primary">
        <ScrollArea className=" overflow-hidden" style={{ maxWidth }}>
          <Tabs.List className="px-2 py-2.5 whitespace-nowrap">
            <Tabs.Trigger value="openOrders" onClick={() => setShow(true)}>
              Open Orders({openOrders?.length || 0})
            </Tabs.Trigger>
            <Tabs.Trigger value="orderHistory" onClick={() => setShow(true)}>
              Order History
            </Tabs.Trigger>
            <Tabs.Trigger value="tradeHistory" onClick={() => setShow(true)}>
              Trade History
            </Tabs.Trigger>
            <Tabs.Trigger value="balances" onClick={() => setShow(false)}>
              Balances
            </Tabs.Trigger>
          </Tabs.List>
          {scrollAreaView && <ScrollArea.Bar orientation="horizontal" />}
        </ScrollArea>
        {scrollAreaView ? (
          <Popover>
            <Popover.Trigger className="group" asChild>
              <Button.Icon variant="ghost">
                <RiMore2Line className="w-6 h-6 text-primary group-hover:text-current transition-colors duration-300" />
              </Button.Icon>
            </Popover.Trigger>
            <Popover.Content className="flex flex-col gap-3 p-2">
              <Checkbox.Outline
                id={BUY}
                checked={filters.onlyBuy}
                onCheckedChange={() => onChangeFilters(BUY)}
              >
                <Checkbox.Label appearance="primary" htmlFor={BUY}>
                  Buy
                </Checkbox.Label>
              </Checkbox.Outline>
              <Checkbox.Outline
                id={SELL}
                checked={filters.onlySell}
                onCheckedChange={() => onChangeFilters(SELL)}
              >
                <Checkbox.Label appearance="primary" htmlFor={SELL}>
                  Sell
                </Checkbox.Label>
              </Checkbox.Outline>
            </Popover.Content>
          </Popover>
        ) : (
          <Fragment>
            {connected && show && (
              <div className="flex items-center gap-3 mx-2">
                <Checkbox.Outline
                  id={BUY}
                  checked={filters.onlyBuy}
                  onCheckedChange={() => onChangeFilters(BUY)}
                >
                  <Checkbox.Label appearance="primary" htmlFor={BUY}>
                    Buy
                  </Checkbox.Label>
                </Checkbox.Outline>
                <Checkbox.Outline
                  id={SELL}
                  checked={filters.onlySell}
                  onCheckedChange={() => onChangeFilters(SELL)}
                >
                  <Checkbox.Label appearance="primary" htmlFor={SELL}>
                    Sell
                  </Checkbox.Label>
                </Checkbox.Outline>
                <Popover>
                  <Popover.Trigger asChild>
                    <Button.Icon variant="light" size="2sm" className="p-1">
                      <RiCalendarLine className="w-full h-full" />
                    </Button.Icon>
                  </Popover.Trigger>
                  <Popover.Content>
                    <DateRangePicker
                      ranges={ranges}
                      onChange={onChangeDateRange}
                      rangeColors={["#E6007A"]}
                      staticRanges={defaultStaticRanges}
                      inputRanges={[]}
                    />
                  </Popover.Content>
                </Popover>
              </div>
            )}
          </Fragment>
        )}
      </div>
      <div className="h-full flex-1 flex flex-col" ref={ref}>
        <Tabs.Content
          value="openOrders"
          className="flex-1 flex flex-col bg-level-0 max-sm:max-h-[400px] max-sm:min-h-[290px]"
        >
          {connected ? (
            <OpenOrdersTable filters={filters} height={height} />
          ) : (
            <ConnectAccountWrapper funding={isFundingType} />
          )}
        </Tabs.Content>
        <Tabs.Content
          value="orderHistory"
          className="flex-1 flex flex-col bg-level-0 max-sm:max-h-[400px] max-sm:min-h-[290px]"
        >
          {connected ? (
            <OrderHistoryTable filters={filters} height={height} />
          ) : (
            <ConnectAccountWrapper funding={isFundingType} />
          )}
        </Tabs.Content>
        <Tabs.Content
          value="tradeHistory"
          className="flex-1 flex flex-col bg-level-0 max-sm:max-h-[400px] max-sm:min-h-[290px]"
        >
          {connected ? (
            <TradeHistoryTable filters={filters} height={height} />
          ) : (
            <ConnectAccountWrapper funding={isFundingType} />
          )}
        </Tabs.Content>
        <Tabs.Content
          value="balances"
          className="flex-1 flex flex-col bg-level-0 max-sm:max-h-[400px] max-sm:min-h-[290px]"
        >
          {mainAddress?.length > 0 ? (
            <BalancesTable height={height} />
          ) : (
            <ConnectAccountWrapper funding />
          )}
        </Tabs.Content>
      </div>
    </Tabs>
  );
};
