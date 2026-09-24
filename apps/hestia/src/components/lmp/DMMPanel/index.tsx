"use client";

import {
  GenericMessage,
  Skeleton,
  Table as PolkadexTable,
  Typography,
  truncateString,
} from "@polkadex/ux";
import { useDMMs, DMMAssignment } from "@orderbook/core/hooks";
import { UNIT } from "@orderbook/core/constants";
import classNames from "classnames";
import { useState } from "react";
import { RiArrowDownSLine } from "@remixicon/react";

function formatPdex(raw: string): string {
  try {
    const val = Number(BigInt(raw) / (UNIT / BigInt(10_000))) / 10_000;
    return `${val.toFixed(2)} PDEX`;
  } catch {
    return "—";
  }
}

function UptimeBar({ live, committed }: { live: number; committed: number }) {
  const pct = Math.max(0, Math.min(100, live));
  const isBelow = live < committed;
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-16 h-1.5 rounded-full bg-level-2 overflow-hidden">
        <div
          className={classNames(
            "h-full rounded-full transition-all duration-300",
            isBelow ? "bg-red-500" : "bg-green-500"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <Typography.Text
        size="xs"
        className={classNames(isBelow ? "text-red-400" : "text-green-400")}
      >
        {live}%
      </Typography.Text>
    </div>
  );
}

function DMMRow({ a }: { a: DMMAssignment }) {
  return (
    <PolkadexTable.Row className="hover:bg-level-1">
      <PolkadexTable.Cell align="left">
        <Typography.Text size="xs">{a.pair}</Typography.Text>
      </PolkadexTable.Cell>
      <PolkadexTable.Cell align="left">
        <Typography.Text size="xs">{truncateString(a.account, 6)}</Typography.Text>
      </PolkadexTable.Cell>
      <PolkadexTable.Cell align="right">
        <Typography.Text size="xs">≤ {a.committedSpread} bps</Typography.Text>
      </PolkadexTable.Cell>
      <PolkadexTable.Cell align="right">
        <Typography.Text size="xs">{a.committedUptime}%</Typography.Text>
      </PolkadexTable.Cell>
      <PolkadexTable.Cell align="right">
        <UptimeBar live={a.liveUptime} committed={a.committedUptime} />
      </PolkadexTable.Cell>
      <PolkadexTable.Cell align="right">
        <Typography.Text size="xs">{formatPdex(a.stipend)}</Typography.Text>
      </PolkadexTable.Cell>
    </PolkadexTable.Row>
  );
}

const HEADERS = ["Pair", "DMM Account", "Spread", "Committed Uptime", "Live Uptime", "Stipend / Epoch"];

export function DMMPanel() {
  const { assignments, isLoading } = useDMMs();
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-secondary-base">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-between w-full px-4 py-3 hover:bg-level-1 transition-colors duration-150"
      >
        <div className="flex items-center gap-2">
          <Typography.Heading size="md">DMM Assignments</Typography.Heading>
          {assignments.length > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-level-2 border border-primary text-primary">
              {assignments.length} active
            </span>
          )}
        </div>
        <RiArrowDownSLine
          className={classNames(
            "w-4 h-4 text-primary transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div className="overflow-x-auto px-2 pb-2">
          {isLoading ? (
            <Skeleton loading className="h-24 rounded-md m-2" />
          ) : assignments.length === 0 ? (
            <GenericMessage
              title="No active DMM assignments"
              illustration="NoResultFound"
              className="bg-level-1"
              imageProps={{ className: "w-12 self-center" }}
            />
          ) : (
            <PolkadexTable className="w-full [&_th]:border-b [&_th]:border-primary">
              <PolkadexTable.Header>
                <PolkadexTable.Row>
                  {HEADERS.map((h, i) => (
                    <PolkadexTable.Head
                      key={h}
                      align={i < 2 ? "left" : "right"}
                      className="text-xs whitespace-nowrap"
                    >
                      {h}
                    </PolkadexTable.Head>
                  ))}
                </PolkadexTable.Row>
              </PolkadexTable.Header>
              <PolkadexTable.Body>
                {assignments.map((a) => (
                  <DMMRow key={`${a.pair}-${a.account}`} a={a} />
                ))}
              </PolkadexTable.Body>
            </PolkadexTable>
          )}
        </div>
      )}
    </div>
  );
}
