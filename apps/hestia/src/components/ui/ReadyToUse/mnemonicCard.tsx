import { PropsWithChildren } from "react";
import { Typography } from "@mitrabook/ux";

export const MnemonicCard = ({
  position,
  children,
}: PropsWithChildren<{
  position: string | number;
}>) => {
  return (
    <div className="flex flex-1 relative bg-secondary-base rounded-md py-2">
      <Typography.Text
        className="text-secondary absolute top-1/2 transform -translate-y-1/2 left-2"
        size="xs"
      >
        {position}
      </Typography.Text>
      <Typography.Text className="px-5 w-full text-center" bold>
        {children}
      </Typography.Text>
    </div>
  );
};
