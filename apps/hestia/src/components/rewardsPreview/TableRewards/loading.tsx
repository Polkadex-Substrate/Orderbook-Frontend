import { Skeleton } from "@mitra/ux";

export const RewardsSkeleton = () => {
  return (
    <>
      <div className="flex items-start gap-2 p-2">
        <Skeleton loading className="flex-none w-20 h-20 rounded-lg" />
        <div className="grid grid-rows-3 h-full w-full py-2">
          <Skeleton loading className="max-w-40 h-3" />
          <Skeleton loading className="max-w-20 h-3 -mt-1" />
          <Skeleton loading className="h-3 self-end rounded-lg" />
        </div>
      </div>
      {new Array(3).fill("").map((_, i) => (
        <div key={i} className="flex items-start gap-2 p-2">
          <Skeleton loading className="flex-none w-20 h-20 rounded-lg" />
          <div className="grid grid-rows-3 h-full w-full py-2">
            <Skeleton loading className="max-w-40 h-3" />
            <Skeleton loading className="max-w-20 h-3 -mt-1" />
            <Skeleton loading className="max-w-40 h-3" />
          </div>
        </div>
      ))}
    </>
  );
};
