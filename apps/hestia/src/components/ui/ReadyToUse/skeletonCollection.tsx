import classNames from "classnames";
import { ComponentProps } from "react";
import { Skeleton } from "@mitra/ux";
import { twMerge } from "tailwind-merge";

interface SkeletonCollectionProps extends ComponentProps<typeof Skeleton> {
  rows?: number;
}
export const SkeletonCollection = ({
  rows = 5,
  className,
  ...props
}: SkeletonCollectionProps) => {
  return (
    <div className="flex-1 flex flex-col gap-3 p-3">
      {new Array(rows).fill("").map((_, i) => (
        <Skeleton
          key={i}
          loading
          className={twMerge(classNames("h-10"), className)}
          {...props}
        />
      ))}
    </div>
  );
};
