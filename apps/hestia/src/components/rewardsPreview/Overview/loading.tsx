import { Skeleton } from "@mitrabook/ux";

export const MarketSkeleton = () => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-row animate-pulse">
        <div className="flex-none bg-level-3 w-14 h-14 rounded-full" />
        <div className="flex-none bg-level-3 w-14 h-14 rounded-full -ml-3" />
      </div>
      <Skeleton loading className="flex-none w-28 h-5" />
    </div>
  );
};
