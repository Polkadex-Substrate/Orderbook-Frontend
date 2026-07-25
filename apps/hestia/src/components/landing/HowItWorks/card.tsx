import { Typography } from "@mitra/ux";
import classNames from "classnames";
import { PropsWithChildren } from "react";

export const Card = ({
  title,
  children,
  active,
}: PropsWithChildren<{ title?: string; active?: boolean }>) => {
  return (
    <div className="flex flex-1 flex-col gap-5 lg:border-r border-primary last:border-none max-xl:py-5 px-4 py-14 xl:px-10 max-lg:border-b max-lg:last:border-none">
      <div
        className={classNames(
          "ml-1 w-5 h-5 relative rounded-full before:-translate-x-1/2 before:-translate-y-1/2 before:top-1/2 before:left-1/2 before:transform before:absolute before:rounded-full before:w-8 before:h-8 before:border",
          active
            ? "before:border-primary-base bg-primary-base"
            : "before:border-primary bg-level-4"
        )}
      />
      <div className="flex flex-col gap-2">
        <Typography.Heading size="lg">{title}</Typography.Heading>
        <Typography.Paragraph appearance="primary">
          {children}
        </Typography.Paragraph>
      </div>
    </div>
  );
};
