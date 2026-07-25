import { ClaimRewardArgs } from "@orderbook/core/hooks";
import { GenericStatus } from "@orderbook/core/providers/user/connectWalletProvider";
import { Button, Spinner, Typography } from "@mitrabook/ux";
import classNames from "classnames";

type Props = {
  value: {
    epoch: number;
    totalReward: number;
    token: string;
    isClaimed: boolean;
  };
  market: string;
  onClaimReward: (e: ClaimRewardArgs) => void;
  claimRewardStatus: GenericStatus;
  loadingEpochs: number[];
};

export const ClaimReward = ({
  value,
  market,
  onClaimReward,
  claimRewardStatus,
  loadingEpochs,
}: Props) => {
  const disabled =
    claimRewardStatus === "pending" && !loadingEpochs.includes(value.epoch);
  const loading = loadingEpochs.includes(value.epoch);

  const hasClaimed = value.isClaimed;
  const readyToClaim = !hasClaimed;

  const status = hasClaimed ? "Claimed" : "Completed";

  return (
    <div
      className={classNames(
        "flex items-center justify-between",
        hasClaimed && "opacity-50"
      )}
      key={value.epoch}
    >
      <div className="flex items-center gap-4 flex-1">
        <div className="flex flex-col items-center justify-center border border-primary rounded-md px-2 py-3 min-w-16">
          <Typography.Text bold size="md">
            {value.epoch}
          </Typography.Text>
          <Typography.Text size="xs" appearance="primary">
            Epoch
          </Typography.Text>
        </div>
        <div className="flex flex-1 flex-col">
          <Typography.Text bold size="md">
            {value.totalReward.toFixed(4)} {value.token}
          </Typography.Text>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <Typography.Text size="xs" appearance="primary">
                {status}
              </Typography.Text>
            </div>
          </div>
        </div>
      </div>
      {readyToClaim && (
        <Button.Solid
          onClick={() =>
            onClaimReward({
              epoch: value.epoch,
              market,
              reward: value.totalReward,
            })
          }
          size="sm"
          disabled={disabled || loading}
        >
          {loading ? (
            <div className="px-9">
              <Spinner.Keyboard className="w-4 h-4" />
            </div>
          ) : (
            "Claim rewards"
          )}
        </Button.Solid>
      )}
    </div>
  );
};
