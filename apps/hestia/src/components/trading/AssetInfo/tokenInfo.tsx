import { Typography } from "@mitra/ux";
import Link from "next/link";
import { RiArrowRightLine } from "@remixicon/react";

import { InfoCard } from "./infoCard";

export const TokenInfo = ({
  baseTicker,
  tokenName,
}: {
  baseTicker: string;
  tokenName: string;
}) => {
  return (
    <div className="flex flex-col gap-5 md:min-w-[380px] md:max-w-[390px] rounded-md p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Typography.Heading className="font-semibold text-lg">
            {tokenName}
          </Typography.Heading>
          <Typography.Text appearance="secondary" size="xs" bold>
            {baseTicker}
          </Typography.Text>
        </div>
        <Typography.Text appearance="secondary">#11</Typography.Text>
      </div>

      <div className="flex flex-col gap-3">
        <InfoCard label="Market Cap">$11,628,307,811</InfoCard>
        <InfoCard label="Circulating Supply">
          1,280,849,877 {baseTicker}
        </InfoCard>
        <InfoCard label="Total Supply">1,391,816,965 {baseTicker}</InfoCard>
        <InfoCard label="Max Supply">∞</InfoCard>
        <InfoCard label="Website">
          <Link href="www.polkadot.network/" className="text-primary-base">
            https://polkadot.network
          </Link>
        </InfoCard>
        <InfoCard label="Explorer">
          <Link href="http://polkascan.io/" className="text-primary-base">
            www.polkascan.io
          </Link>
        </InfoCard>
        <div className="flex flex-col gap-4">
          <Typography.Text appearance="primary">About Polkadot</Typography.Text>
          <Typography.Paragraph className="leading-6" size="sm">
            Polkadot is an open-source sharded multichain protocol that connects
            and secures a network of specialized blockchains, facilitating
            cross-chain transfer of any data or asset types, not just tokens,
            thereby allowing blockchains to be interoperable with each other.
            Polkadot was designed to provide a foundation for a decentralized
            internet of blockchains, also known as Web3.
          </Typography.Paragraph>
        </div>

        <Link href="/" className="text-primary-base">
          View more
          <RiArrowRightLine className="w-3 h-3 inline-block ml-2" />
        </Link>
      </div>
    </div>
  );
};
