"use client";

import { useEffect } from "react";
import { useYbugApi } from "ybug-react";
import { useProfile } from "@orderbook/core/providers/user/profile";

export const YbugUserIdentifier = () => {
  const ybug = useYbugApi();
  const { selectedAddresses } = useProfile();
  const mainAddress = selectedAddresses?.mainAddress;

  useEffect(() => {
    if (!ybug?.Ybug || !mainAddress) return;
    ybug.Ybug.setUser({ id: mainAddress, name: mainAddress, email: "" });
  }, [ybug?.Ybug, mainAddress]);

  return null;
};
