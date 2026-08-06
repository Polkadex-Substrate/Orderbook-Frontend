import { Icons, Typography, truncateString } from "@mitrabook/ux";

export const AccountCard = ({ address }: { address: string }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex place-items-center">
        <Icons.Avatar className="w-6 h-6 text-red-500" />
      </div>
      <Typography.Text size="xs"> {truncateString(address, 6)}</Typography.Text>
    </div>
  );
};
