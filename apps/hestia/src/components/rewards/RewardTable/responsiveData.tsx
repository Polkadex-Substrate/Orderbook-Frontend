import { Button, Drawer } from "@mitra/ux";
import { useRouter } from "next/navigation";

import { ResponsiveCard } from "./responsiveCard";

import { Data } from ".";

export const ResponsiveData = ({
  open,
  onClose,
  data,
}: {
  open: boolean;
  onClose: () => void;
  data: Data | null;
}) => {
  const router = useRouter();

  return (
    <Drawer closeOnClickOutside open={open} onClose={onClose}>
      <Drawer.Title className="px-4">{data?.token}</Drawer.Title>
      <Drawer.Content className="flex flex-col gap-2 p-4">
        <ResponsiveCard label="Epoch">{data?.epoch}</ResponsiveCard>
        <ResponsiveCard label="Rewards">{data?.rewards}</ResponsiveCard>
        <ResponsiveCard label="Score">{data?.score}</ResponsiveCard>
        <ResponsiveCard label="ID">{data?.id}</ResponsiveCard>
      </Drawer.Content>
      <Drawer.Footer className="p-4">
        <Button.Solid
          appearance="secondary"
          className="w-full"
          onClick={() => router.push(`/rewards/${data?.token}`)}
        >
          Open metrics
        </Button.Solid>
      </Drawer.Footer>
    </Drawer>
  );
};
