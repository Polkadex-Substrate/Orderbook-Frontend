import { SkeletonCollection } from "@/components/ui/ReadyToUse";

export const SkeletonLoading = () => {
  return (
    <div className="flex-1 [&_div]:flex-none">
      <SkeletonCollection className="h-16" rows={4} />
    </div>
  );
};
