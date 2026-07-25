"use client";

import { Button } from "@mitra/ux";
import { forwardRef } from "react";
import { RiExternalLinkLine } from "@remixicon/react";
import Link from "next/link";

import { Card } from "./card";

export const Help = forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <div ref={ref} className="flex items-center">
      <Card title="Having Trouble?" description="Feel free to get in touch.">
        <Link href="https://discord.gg/G4KMw2sGGe" target="_blank">
          <Button.Icon variant="outline">
            <RiExternalLinkLine className="w-full h-full" />
          </Button.Icon>
        </Link>
      </Card>
    </div>
  );
});

Help.displayName = "Help";
