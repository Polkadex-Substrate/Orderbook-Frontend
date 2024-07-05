"use client";

import {
  DirectDepositProvider,
  DirectWithdrawProvider,
} from "@orderbook/core/providers";
import { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DirectDepositProvider>
      <DirectWithdrawProvider>{children}</DirectWithdrawProvider>
    </DirectDepositProvider>
  );
}
