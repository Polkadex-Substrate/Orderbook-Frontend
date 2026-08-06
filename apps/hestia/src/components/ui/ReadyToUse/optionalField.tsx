import { PropsWithChildren, useState } from "react";
import { Switch, Typography } from "@mitrabook/ux";

export const OptionalField = ({
  defaultOpen,
  label,
  children,
}: PropsWithChildren<{ defaultOpen?: boolean; label: string }>) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Typography.Text bold>{label}</Typography.Text>
        <Switch checked={open} onCheckedChange={() => setOpen(!open)} />
      </div>
      {open && (
        <div className="animate-in fade-in-50 duration-300">{children}</div>
      )}
    </div>
  );
};
