import { ChangeEvent, useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSettingsProvider } from "@orderbook/core/providers/public/settings";
import { useProfile } from "@orderbook/core/providers/user/profile";

import { QUERY_KEYS } from "../constants";
import {
  appsyncOrderbookService,
  MaybePaginated,
  Transaction,
} from "../utils/orderbookService";
import {
  groupWithdrawsBySnapShotIds,
  subtractMonthsFromDateOrNow,
} from "../helpers";

const DEPOSIT = "DEPOSIT";
const WITHDRAW = "WITHDRAW";

export function useTransactions() {
  const {
    selectedAddresses: { mainAddress },
  } = useProfile();
  const { onHandleError } = useSettingsProvider();

  const [filterBy, setFilterBy] = useState({
    type: "all",
    fieldValue: "",
  });

  const { data: depositTransactions, isLoading: isDepositLoading } = useQuery({
    queryKey: QUERY_KEYS.transactions(mainAddress, DEPOSIT),
    queryFn: async () => {
      const fromDate = subtractMonthsFromDateOrNow(3);
      return await appsyncOrderbookService.query.getTransactions({
        address: mainAddress,
        limit: 100000,
        from: fromDate,
        to: new Date(),
        pageParams: null,
        transaction_type: DEPOSIT,
      });
    },
    enabled: Boolean(mainAddress?.length > 0),
    onError: onHandleError,
  });

  const { data: withdrawTransactions, isLoading: isWithdrawLoading } = useQuery(
    {
      queryKey: QUERY_KEYS.transactions(mainAddress, WITHDRAW),
      queryFn: async () => {
        const fromDate = subtractMonthsFromDateOrNow(3);
        return await appsyncOrderbookService.query.getTransactions({
          address: mainAddress,
          limit: 100000,
          from: fromDate,
          to: new Date(),
          pageParams: null,
          transaction_type: WITHDRAW,
        });
      },
      enabled: Boolean(mainAddress?.length > 0),
      onError: onHandleError,
      refetchInterval: 30 * 1000,
    }
  );

  const getFilteredHistory = useCallback(
    (transactions?: MaybePaginated<Transaction[]>) => {
      const transactionsBydate =
        transactions?.data?.sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        ) ?? [];
      const txs = transactionsBydate?.reduce((pv: Transaction[], cv) => {
        if (
          mainAddress
            .toLowerCase()
            .includes(filterBy.fieldValue.toLowerCase()) &&
          (filterBy.type === "" ||
            filterBy.type === cv.txType.toLowerCase() ||
            filterBy.type === "all")
        ) {
          pv.push(cv);
        }
        return pv;
      }, []);
      return txs;
    },
    [filterBy.fieldValue, filterBy.type, mainAddress]
  );

  const deposits = useMemo(
    () => getFilteredHistory(depositTransactions),
    [depositTransactions, getFilteredHistory]
  );

  const withdrawalsList = useMemo(
    () => getFilteredHistory(withdrawTransactions),
    [getFilteredHistory, withdrawTransactions]
  );

  const readyWithdrawals = useMemo(
    () => groupWithdrawsBySnapShotIds(withdrawalsList),
    [withdrawalsList]
  );

  return {
    loading: isDepositLoading || isWithdrawLoading,
    allWithdrawals: withdrawalsList,
    readyWithdrawals,
    deposits,

    onChangeFilterByType: (value: string) =>
      setFilterBy({ ...filterBy, type: value }),
    onChangeSearch: (e: ChangeEvent<HTMLInputElement>) =>
      setFilterBy({ ...filterBy, fieldValue: e.target.value }),
  };
}
