"use client";

import {
  GenericMessage,
  Skeleton,
  Table as PolkadexTable,
  Typography,
  truncateString,
} from "@polkadex/ux";
import { useLMPLeaderboard, LeaderboardEntry } from "@orderbook/core/hooks";
import { UNIT } from "@orderbook/core/constants";
import classNames from "classnames";

import { VolatilityMultiplierBadge } from "../VolatilityMultiplierBadge";

function formatPdex(raw: string): string {
  try {
    const val = Number(BigInt(raw) / (UNIT / BigInt(10_000))) / 10_000;
    return `${val.toFixed(2)}`;
  } catch {
    return "—";
  }
}

function SelfRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <PolkadexTable.Row className="sticky bottom-0 bg-level-1 border-t border-primary">
      <PolkadexTable.Cell align="left">
        <Typography.Text bold size="xs" className="text-primary-base">
          #{entry.rank} You
        </Typography.Text>
      </PolkadexTable.Cell>
      <PolkadexTable.Cell>
        <Typography.Text size="xs">{truncateString(entry.address, 6)}</Typography.Text>
      </PolkadexTable.Cell>
      <PolkadexTable.Cell align="right">
        <Typography.Text size="xs">{parseFloat(entry.depthScore).toFixed(3)}</Typography.Text>
      </PolkadexTable.Cell>
      <PolkadexTable.Cell align="right">
        <Typography.Text size="xs">{parseFloat(entry.uptimeScore).toFixed(3)}</Typography.Text>
      </PolkadexTable.Cell>
      <PolkadexTable.Cell align="right">
        <Typography.Text size="xs">{parseFloat(entry.makerVolume).toFixed(3)}</Typography.Text>
      </PolkadexTable.Cell>
      <PolkadexTable.Cell align="right">
        <Typography.Text bold size="xs">{parseFloat(entry.qFinal).toFixed(4)}</Typography.Text>
      </PolkadexTable.Cell>
      <PolkadexTable.Cell align="right">
        <Typography.Text size="xs">{formatPdex(entry.estimatedReward)}</Typography.Text>
      </PolkadexTable.Cell>
    </PolkadexTable.Row>
  );
}

type Props = {
  epoch: number;
  pair: string;
  maxHeight: string;
  currentUserAddress?: string;
  volatilityActive?: boolean;
};

export function LMPLeaderboard({
  epoch,
  pair,
  maxHeight,
  currentUserAddress,
  volatilityActive,
}: Props) {
  const { entries, totalParticipants, isLoading } = useLMPLeaderboard(epoch, pair);

  const top20 = entries.slice(0, 20);
  const selfEntry = currentUserAddress
    ? entries.find((e) => e.address === currentUserAddress) ?? null
    : null;
  const selfInTop20 = selfEntry ? selfEntry.rank <= 20 : false;

  const headers = ["Rank", "Address", "Depth", "Uptime", "Volume", "Q-Final", "Est. Reward (PDEX)"];

  return (
    <div className="flex flex-col h-full min-h-[440px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-primary py-3 px-4">
        <div className="flex items-center gap-2">
          <Typography.Heading size="md">Leaderboard</Typography.Heading>
          {totalParticipants > 0 && (
            <Typography.Text size="xs" appearance="primary">
              ({totalParticipants} traders)
            </Typography.Text>
          )}
        </div>
        <VolatilityMultiplierBadge active={!!volatilityActive} />
      </div>

      {isLoading ? (
        <Skeleton loading className="flex-1 m-2 rounded-md" />
      ) : top20.length === 0 ? (
        <GenericMessage
          title="No leaderboard data"
          illustration="NoResultFound"
          className="bg-level-1 border-b border-b-primary"
          imageProps={{ className: "w-16 self-center" }}
        />
      ) : (
        <div
          className="overflow-y-hidden hover:overflow-y-auto px-2 flex-1 relative"
          style={{ maxHeight, scrollbarGutter: "stable" }}
        >
          <PolkadexTable className="w-full [&_th]:border-b [&_th]:border-primary">
            <PolkadexTable.Header className="sticky top-0 bg-backgroundBase z-10">
              <PolkadexTable.Row>
                {headers.map((h, i) => (
                  <PolkadexTable.Head
                    key={h}
                    align={i === 0 || i === 1 ? "left" : "right"}
                    className="text-xs whitespace-nowrap"
                  >
                    {h}
                  </PolkadexTable.Head>
                ))}
              </PolkadexTable.Row>
            </PolkadexTable.Header>

            <PolkadexTable.Body>
              {top20.map((entry) => {
                const isSelf = entry.address === currentUserAddress;
                return (
                  <PolkadexTable.Row
                    key={entry.rank}
                    className={classNames(
                      "hover:bg-level-1",
                      isSelf && "bg-level-1 outline outline-1 outline-primary-base/40"
                    )}
                  >
                    <PolkadexTable.Cell align="left">
                      <Typography.Text
                        bold={isSelf}
                        size="xs"
                        className={classNames(isSelf && "text-primary-base")}
                      >
                        #{entry.rank}{isSelf && " (You)"}
                      </Typography.Text>
                    </PolkadexTable.Cell>
                    <PolkadexTable.Cell align="left">
                      <Typography.Text size="xs">
                        {truncateString(entry.address, 6)}
                      </Typography.Text>
                    </PolkadexTable.Cell>
                    <PolkadexTable.Cell align="right">
                      <Typography.Text size="xs">{parseFloat(entry.depthScore).toFixed(3)}</Typography.Text>
                    </PolkadexTable.Cell>
                    <PolkadexTable.Cell align="right">
                      <Typography.Text size="xs">{parseFloat(entry.uptimeScore).toFixed(3)}</Typography.Text>
                    </PolkadexTable.Cell>
                    <PolkadexTable.Cell align="right">
                      <Typography.Text size="xs">{parseFloat(entry.makerVolume).toFixed(3)}</Typography.Text>
                    </PolkadexTable.Cell>
                    <PolkadexTable.Cell align="right">
                      <Typography.Text bold size="xs">{parseFloat(entry.qFinal).toFixed(4)}</Typography.Text>
                    </PolkadexTable.Cell>
                    <PolkadexTable.Cell align="right">
                      <Typography.Text size="xs">{formatPdex(entry.estimatedReward)}</Typography.Text>
                    </PolkadexTable.Cell>
                  </PolkadexTable.Row>
                );
              })}
            </PolkadexTable.Body>
          </PolkadexTable>

          {/* Sticky self-row when user is outside top 20 */}
          {selfEntry && !selfInTop20 && (
            <PolkadexTable className="w-full">
              <PolkadexTable.Body>
                <SelfRow entry={selfEntry} />
              </PolkadexTable.Body>
            </PolkadexTable>
          )}
        </div>
      )}
    </div>
  );
}
