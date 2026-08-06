import { MINIMUM_PDEX_REQUIRED } from "@orderbook/core/constants";
import { Typography, Icon, Illustrations, Interaction } from "@polkadex/ux";
import { RiArrowRightSLine } from "@remixicon/react";
import Link from "next/link";

export const NewUser = ({
  walletBalance,
  onContinue,
  onReadMore,
  onBack,
  onClose,
}: {
  walletBalance: number;
  onContinue: () => void;
  onReadMore: () => void;
  onBack: () => void;
  onClose: () => void;
}) => {
  return (
    <Interaction className="gap-10 pt-2 w-full md:min-w-[24rem] md:max-w-[24rem]">
      <Interaction.Title className="-mb-8 mt-" onBack={{ onClick: onBack }} />
      <Interaction.Content
        className="flex flex-col gap-1 flex-1"
        withPadding={false}
      >
        <div className="flex flex-col gap-8">
          <div className="w-full">
            <Illustrations.NewUser />
          </div>
          <div className="flex flex-col gap-5 px-7">
            <div className="flex flex-col gap-1">
              <Typography.Text bold size="xl">
                Welcome to Polkadex Orderbook
              </Typography.Text>
              <div className="flex flex-col gap-4">
                {walletBalance >= MINIMUM_PDEX_REQUIRED ? (
                  <>
                    <Typography.Paragraph size="sm" appearance="primary">
                      Get ready to level up your trading experience with the
                      non-custodial, order book-based DEX for Polkadot and
                      beyond. Enjoy limit & market orders, ZERO gas fees,
                      trading bot integrations, and more!
                    </Typography.Paragraph>
                    <Typography.Paragraph size="sm" appearance="primary">
                      Start your decentralized trading journey now with your
                      first transfer! Happy trading! 🌟
                    </Typography.Paragraph>
                  </>
                ) : (
                  <>
                    <Typography.Paragraph size="sm" appearance="primary">
                      We&apos;re excited to have you join our trading community.
                      As a new user, we understand that getting started might
                      seem challenging, especially if you don&apos;t have enough
                      PDEX tokens to begin trading.
                    </Typography.Paragraph>
                    <Typography.Paragraph size="sm" appearance="primary">
                      Not to worry! While PDEX tokens are essential for trading
                      on our platform, there are various ways to acquire them.
                      Please proceed to explore ways of getting PDEX tokens.
                    </Typography.Paragraph>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={onReadMore}
              className="flex items-center gap-2 text-primary-base"
            >
              <Icon name="Wallet" className="w-6 h-6" />
              <Typography.Text className="text-primary-base">
                Read More
              </Typography.Text>
              <RiArrowRightSLine className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Interaction.Content>
      <Interaction.Footer>
        {walletBalance >= MINIMUM_PDEX_REQUIRED ? (
          <Link href="/send-and-receive">
            <Interaction.Action className="w-full" onClick={onClose}>
              Transfer funds
            </Interaction.Action>
          </Link>
        ) : (
          <Interaction.Action className="w-full" onClick={onContinue}>
            Continue
          </Interaction.Action>
        )}
        <Interaction.Close onClick={onClose}>Not now</Interaction.Close>
      </Interaction.Footer>
    </Interaction>
  );
};
