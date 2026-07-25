"use client";

import { Button, Table as PolkadexTable } from "@mitrabook/ux";
import { useWindowSize } from "usehooks-ts";
import { Fragment, forwardRef, useEffect, useMemo, useState } from "react";
import { RiExpandUpDownLine } from "@remixicon/react";

import { ResponsiveData } from "./responsiveData";

import { TablePagination } from "@/components/ui";

export type Data = (typeof fakeData)[0];

export const RewardTable = forwardRef<HTMLDivElement, { maxHeight: string }>(
  ({ maxHeight }, ref) => {
    const [state, setState] = useState<Data | null>(null);
    const { width } = useWindowSize();
    const responsiveView = useMemo(() => width <= 1000, [width]);

    useEffect(() => {
      if (!responsiveView && !!state) setState(null);
    }, [responsiveView, state]);

    return (
      <Fragment>
        <ResponsiveData
          open={!!state}
          onClose={() => setState(null)}
          data={state}
        />
        <div className="flex-1 flex flex-col justify-between border-b border-secondary-base">
          <div
            className="overflow-y-hidden hover:overflow-y-auto px-3"
            style={{ maxHeight, scrollbarGutter: "stable" }}
          >
            <PolkadexTable>
              <PolkadexTable.Header className="[&_th]:border-none">
                <PolkadexTable.Row className="border-none">
                  <PolkadexTable.Head>
                    Epoch
                    <RiExpandUpDownLine className="w-4 h-4 text-primary ml-0.5 inline-block align-middle" />
                  </PolkadexTable.Head>
                  {!responsiveView && (
                    <PolkadexTable.Head className="text-right">
                      Score
                      <RiExpandUpDownLine className="w-4 h-4 text-primary ml-0.5 inline-block align-middle" />
                    </PolkadexTable.Head>
                  )}
                  <PolkadexTable.Head className="text-right">
                    Rewards
                    <RiExpandUpDownLine className="w-4 h-4 text-primary ml-0.5 inline-block align-middle" />
                  </PolkadexTable.Head>
                  {!responsiveView && (
                    <PolkadexTable.Head className="text-right" />
                  )}
                </PolkadexTable.Row>
              </PolkadexTable.Header>
              <PolkadexTable.Body className="[&_tr]:border-none border-none">
                {fakeData.map((value) => {
                  const responsiveProps = responsiveView && {
                    role: "button",
                    onClick: () => setState(value),
                  };

                  return (
                    <PolkadexTable.Row key={value.id} {...responsiveProps}>
                      <PolkadexTable.Cell>{value.epoch}</PolkadexTable.Cell>
                      <PolkadexTable.Cell className="text-right">
                        {value.score}
                      </PolkadexTable.Cell>
                      {!responsiveView && (
                        <>
                          <PolkadexTable.Cell className="text-right w-[10rem]">
                            {value.rewards} {value.token}
                          </PolkadexTable.Cell>
                          <PolkadexTable.Cell className="flex justify-end">
                            <Button.Solid size="sm" appearance="secondary">
                              Claim rewards
                            </Button.Solid>
                          </PolkadexTable.Cell>
                        </>
                      )}
                    </PolkadexTable.Row>
                  );
                })}
              </PolkadexTable.Body>
            </PolkadexTable>
          </div>
          <TablePagination ref={ref} />
        </div>
      </Fragment>
    );
  }
);
RewardTable.displayName = "RewardTable";
const fakeData = [
  {
    id: 1,
    epoch: "4 hrs (2 hrs 51 min)",
    score: 92,
    rewards: 1.0404,
    token: "PDEX",
  },
  {
    id: 2,
    epoch: "4 hrs (3 hrs 12 min)",
    score: 87,
    rewards: 1.0201,
    token: "PDEX",
  },
  {
    id: 3,
    epoch: "4 hrs (1 hrs 43 min)",
    score: 95,
    rewards: 1.0556,
    token: "PDEX",
  },
  {
    id: 4,
    epoch: "4 hrs (3 hrs 30 min)",
    score: 89,
    rewards: 1.0302,
    token: "PDEX",
  },
  {
    id: 5,
    epoch: "4 hrs (2 hrs 03 min)",
    score: 91,
    rewards: 1.0355,
    token: "PDEX",
  },
];
