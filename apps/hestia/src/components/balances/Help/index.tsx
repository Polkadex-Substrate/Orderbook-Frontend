"use client";

import { Button } from "@mitrabook/ux";
import { forwardRef } from "react";
import { RiExternalLinkLine } from "@remixicon/react";
import Link from "next/link";

import { Card } from "./card";

import { EXTERNAL_LINKS } from "@/config/links";
import { defaultConfig } from "@/config";
import { tourLaunchHref } from "@/config/tours/tourLaunch";

export const Help = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div
      ref={ref}
      className="flex items-center max-md:flex-col border-t border-primary"
    >
      <Card title="Having Trouble?" description="Feel free to get in touch.">
        <Link href={EXTERNAL_LINKS.discord} target="_blank">
          <Button.Icon variant="outline">
            <RiExternalLinkLine className="w-full h-full" />
          </Button.Icon>
        </Link>
      </Card>
      <Card
        title="Deposit, Withdrawal, and Transfer differences"
        description="We'll guide you through these new processes on a quick tour."
      >
        {/* WAS `disabled` WITH NO onClick. Reported twice as "Open tour does
            nothing" and still open across two retest rounds, because a disabled
            button with no explanation is indistinguishable from a broken one.

            It cannot run the tour from here - every step targets a trading-page
            element - so per UX-LEARNINGS 5.8 it performs the prior step instead
            and navigates to the page the tour lives on. See
            config/tours/tourLaunch.ts. */}
        <Link
          href={tourLaunchHref(`/trading/${defaultConfig.landingPageMarket}`)}
        >
          <Button.Outline appearance="secondary" className="w-fit" size="sm">
            Open tour
          </Button.Outline>
        </Link>
      </Card>
    </div>
  );
});
Help.displayName = "Help";
