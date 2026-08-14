"use client";

import { ReactNode } from "react";
import { YbugProvider as YbugProviderLib, type YbugSettings } from "ybug-react";

import { LAUNCHER_POSITION } from "./launcherPosition";

type ExtendedYbugSettings = YbugSettings & { custom_css?: string };

const ybugId = process.env.NEXT_PUBLIC_YBUG_ID;

const ybugSettings: ExtendedYbugSettings = {
  // Was "top-middle", which overlapped - and, being a high z-index fixed
  // overlay, swallowed taps on - the Connect Polkadex wallet button on a phone.
  // See launcherPosition.ts: the edge is derived from the chrome this app
  // already pins, and the choice is covered by tests.
  launcher_position: LAUNCHER_POSITION,
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
