"use client";

import Link from "next/link";
import { Button, Logo, Typography } from "@mitra/ux";
import Image from "next/image";
import { RiDiscordLine, RiTelegramLine, RiTwitterLine } from "@remixicon/react";

import AccessDeniedIllustration from "../../../public/img/accessDenied.webp";

export function Template() {
  return (
    <div className="min-h-screen flex bg-backgroundBase">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-2">
        <div className="p-4">
          <Link href="/">
            <div className="max-w-[150px] mx-auto">
              <Logo.Orderbook />
            </div>
          </Link>
        </div>
        <div className="flex-1 h-full flex max-md:flex-col bg-level-0 rounded-lg items-center">
          <div className="flex flex-col gap-5 max-md:p-3 md:p-12 max-w-[500px]">
            <div className="flex flex-col gap-1">
              <div className="bg-primary-base/20 p-1 rounded-md w-fit">
                <Typography.Text size="lg" bold appearance="primary-base">
                  403
                </Typography.Text>
              </div>
              <Typography.Heading size="3xl">
                This page is not available in your jurisdiction due to
                geoblocking
              </Typography.Heading>
            </div>
            <Typography.Text size="md">
              Your IP address indicates that you are attempting to access our
              services from a{" "}
              <Typography.Text asChild appearance="primary-base" bold>
                <Link
                  target="_blank"
                  href="https://github.com/Polkadex-Substrate/Docs/blob/master/Polkadex_Excluded_Jurisdictions.pdf"
                  className="underline"
                >
                  Restricted jurisdiction
                </Link>
              </Typography.Text>
              . Based on the{" "}
              <Typography.Text asChild appearance="primary-base" bold>
                <Link
                  target="_blank"
                  href="https://github.com/Polkadex-Substrate/Docs/blob/master/Polkadex_Terms_of_Use.pdf"
                  className="underline"
                >
                  Terms of use
                </Link>
              </Typography.Text>
              , Polkadex is unable to provide services to users from this
              jurisdiction.
            </Typography.Text>
            <div className="flex flex-col gap-2">
              <Typography.Text appearance="primary">Need help?</Typography.Text>
              <div className="flex items-center gap-2 flex-wrap">
                <Button.Solid
                  asChild
                  className="gap-2 w-fit"
                  appearance="secondary"
                >
                  <Link
                    target="_blank"
                    href="https://discord.com/invite/Uvua83QAzk"
                  >
                    <RiDiscordLine className="w-4 h-4" />
                    <Typography.Text>Discord</Typography.Text>
                  </Link>
                </Button.Solid>
                <Button.Solid
                  asChild
                  className="gap-2 w-fit"
                  appearance="secondary"
                >
                  <Link target="_blank" href="https://t.me/Polkadex">
                    <RiTelegramLine className="w-4 h-4" />
                    <Typography.Text>Telegram</Typography.Text>
                  </Link>
                </Button.Solid>
                <Button.Solid
                  asChild
                  className="gap-2 w-fit"
                  appearance="secondary"
                >
                  <Link target="_blank" href="https://twitter.com/polkadex">
                    <RiTwitterLine className="w-4 h-4" />
                    <Typography.Text>Twitter</Typography.Text>
                  </Link>
                </Button.Solid>
              </div>
            </div>
          </div>
          <div className="max-md:mt-4">
            <Image
              src={AccessDeniedIllustration}
              placeholder="blur"
              alt="access denied"
              style={{
                width: "100%",
                height: "auto",
              }}
              className="animate-smoothBouce"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
