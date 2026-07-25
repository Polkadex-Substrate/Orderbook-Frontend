import { Typography } from "@mitrabook/ux";
import { PropsWithChildren } from "react";

export const Card = ({
  title,
  description,
  children,
}: PropsWithChildren<{ description: string; title: string }>) => {
  return (
    <div className="flex flex-col gap-2">
      <Typography.Heading type="h3" size="lg">
        {title}
      </Typography.Heading>
      <Typography.Paragraph size="sm" appearance="primary">
        {description}
      </Typography.Paragraph>
      {children}
    </div>
  );
};
