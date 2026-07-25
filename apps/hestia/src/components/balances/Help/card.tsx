import { Typography } from "@mitrabook/ux";
import { PropsWithChildren } from "react";

export const Card = ({
  description,
  title,
  children,
}: PropsWithChildren<{
  description?: string;
  title: string;
}>) => {
  return (
    <div className="flex-1 w-full max-md:first:border-b md:h-full flex items-center justify-between px-5 py-6 h-fit gap-10 first:border-r border-secondary-base">
      <div className="flex flex-col gap-2 max-w-[25rem]">
        <div className="flex flex-col">
          <Typography.Paragraph
            size="md"
            className="font-medium leading-normal"
          >
            {title}
          </Typography.Paragraph>
          {description && (
            <Typography.Paragraph appearance="primary" size="sm">
              {description}
            </Typography.Paragraph>
          )}
        </div>
      </div>
      {children}
    </div>
  );
};
