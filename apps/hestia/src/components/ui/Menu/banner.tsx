import { Button, Typography } from "@mitra/ux";
import { RiNotification3Line } from "@remixicon/react";
export const Banner = ({ open }: { open: boolean }) => {
  return open ? (
    <div className="flex flex-col gap-4 mx-3 bg-level-3 p-4 rounded-md">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-center w-8 h-8 p-2 rounded-full bg-level-4">
          <RiNotification3Line className="w-4 h-4 mt-1 text-primary-base" />
        </div>
        <div className="flex flex-col">
          <Typography.Text bold>Pending transactions</Typography.Text>
          <Typography.Text appearance="secondary">
            5 claims are in the queue
          </Typography.Text>
        </div>
      </div>
      <Button.Solid size="sm">Claim Now!</Button.Solid>
    </div>
  ) : (
    <div className="flex items-center justify-center w-7 h-7 p-1 ml-2 rounded-full bg-level-3">
      <RiNotification3Line className="w-4 h-4 mt-1 text-primary-base" />
    </div>
  );
};
