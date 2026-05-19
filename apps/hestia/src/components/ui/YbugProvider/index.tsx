"use client";

import { ReactNode } from "react";
import { YbugProvider as YbugProviderLib } from "ybug-react";

const ybugId = process.env.NEXT_PUBLIC_YBUG_ID;

export const YbugProvider = ({ children }: { children: ReactNode }) => {
  if (!ybugId) return <>{children}</>;
  return <YbugProviderLib ybugId={ybugId}>{children}</YbugProviderLib>;
};
