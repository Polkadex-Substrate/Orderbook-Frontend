"use client";

import { Checkbox } from "@mitrabook/ux";
import Link from "next/link";

type Props = {
  checked: boolean;
  setChecked: (e: boolean) => void;
};

export const Terms = ({ checked, setChecked }: Props) => {
  return (
    <Checkbox.Solid
      id="termsAndConditions"
      checked={checked}
      onCheckedChange={() => setChecked(!checked)}
      className="w-7"
    >
      <Checkbox.Label
        size="xs"
        appearance="primary"
        htmlFor="termsAndConditions"
      >
        By checking this box, I acknowledge that I have read and agree to be
        bound by the{" "}
        <Link
          href="/legal/terms"
          target="_blank"
          className="text-primary-hover"
        >
          Terms and Conditions.
        </Link>
      </Checkbox.Label>
    </Checkbox.Solid>
  );
};
