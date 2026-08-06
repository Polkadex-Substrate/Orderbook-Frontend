"use client";

import { ReactNode } from "react";
import { YbugProvider as YbugProviderLib, type YbugSettings } from "ybug-react";

type ExtendedYbugSettings = YbugSettings & { custom_css?: string };

const ybugId = process.env.NEXT_PUBLIC_YBUG_ID;

const ybugSettings: ExtendedYbugSettings = {
  launcher_position: "top-middle",
  translate: { "launcherButton.Title": "Report an Issue" },
};

export const YbugProvider = ({ children }: { children: ReactNode }) => {
  if (!ybugId) return <>{children}</>;
  return (
    <YbugProviderLib ybugId={ybugId} settings={ybugSettings}>
      {children}
    </YbugProviderLib>
  );
};
