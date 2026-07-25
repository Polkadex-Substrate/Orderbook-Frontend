import { getMarketUrl } from "@orderbook/core/helpers";
import { Button, Logo, Typography } from "@mitra/ux";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import { RiCloseLine, RiMenuLine } from "@remixicon/react";

export const Header = () => {
  const [state, setState] = useState(false);
  const { width } = useWindowSize();
  const lastUsedMarketUrl = getMarketUrl();

  const responsiveView = useMemo(() => width >= 768, [width]);

  useEffect(() => {
    if (responsiveView && !!state) setState(false);
  }, [responsiveView, state]);
  return (
    <header className="flex relative items-center justify-between max-2xl:px-2 py-4 border-b border-primary max-w-screen-2xl mx-auto w-full">
      <Logo.Orderbook className="min-w-[150px] max-h-8" />
      <div className="items-center gap-5 hidden md:flex">
        <div className="flex items-center gap-4">
          <Typography.Text>Products</Typography.Text>
          <Typography.Text>About</Typography.Text>
          <Typography.Text>Resources</Typography.Text>
          <Typography.Text>Community</Typography.Text>
        </div>
        <Button.Solid asChild>
          <Link href={lastUsedMarketUrl}>Start trading</Link>
        </Button.Solid>
      </div>
      <Button.Icon
        size="md"
        className="hidden max-md:flex"
        onClick={() => setState(true)}
      >
        <RiMenuLine className="w-full h-full" />
      </Button.Icon>
      {state && (
        <div className="flex flex-col z-10 fixed top-0 right-0 w-screen h-screen bg-level-0 rounded-sm">
          <div className="flex justify-end p-2">
            <Button.Icon size="lg" rounded onClick={() => setState(false)}>
              <RiCloseLine className="w-full h-full" />
            </Button.Icon>
          </div>
          <div className="flex flex-col justify-between flex-1 p-6">
            <div className="flex flex-col gap-4">
              <Typography.Text size="lg">Products</Typography.Text>
              <Typography.Text size="lg">About</Typography.Text>
              <Typography.Text size="lg">Resources</Typography.Text>
              <Typography.Text size="lg">Community</Typography.Text>
            </div>
            <Button.Solid asChild>
              <Link href={lastUsedMarketUrl}>Start trading</Link>
            </Button.Solid>
          </div>
        </div>
      )}
    </header>
  );
};
