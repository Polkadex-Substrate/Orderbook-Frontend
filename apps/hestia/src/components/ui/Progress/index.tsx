"use client";

import { Fragment } from "react";
import { useTransactionManager } from "@polkadex/react-providers";
import { ProgressBar } from "@polkadex/ux";

const messages = {
  broadcasted: "Transmitted over the network but not yet confirmed.",
  ongoing: "Currently in progress, awaiting confirmation.",
  inblock: "Included in a block but not yet confirmed.",
  finalized: "Successfully processed and finalized.",
  error: "Failed due to an encountered error.",
};

export const Progress = () => {
  const { txStatus } = useTransactionManager();
  const lastTransaction = txStatus.at(-1);
  if (!lastTransaction) return <></>;
  return (
    <Fragment>
      <ProgressBar
        key={lastTransaction.hash}
        data={lastTransaction}
        closeDelay={5000}
        completedStatus="finalized"
        statuses={["ongoing", "broadcasted", "inblock", "finalized"]}
      >
        <Fragment>
          <ProgressBar.Maximized>
            <ProgressBar.Title messages={messages} />
            <ProgressBar.Status>
              <ProgressBar.Card vertical status="broadcasted">
                Broadcasted
              </ProgressBar.Card>
              <ProgressBar.Card vertical status="inblock">
                In block
              </ProgressBar.Card>
              <ProgressBar.Card vertical status="finalized">
                Finalized
              </ProgressBar.Card>
            </ProgressBar.Status>
          </ProgressBar.Maximized>
          <ProgressBar.Minimized>
            <ProgressBar.Card status="broadcasted">
              Broadcasted
            </ProgressBar.Card>
            <ProgressBar.Card status="inblock">In block</ProgressBar.Card>
            <ProgressBar.Card status="finalized">Finalized</ProgressBar.Card>
          </ProgressBar.Minimized>
        </Fragment>
      </ProgressBar>
    </Fragment>
  );
};
