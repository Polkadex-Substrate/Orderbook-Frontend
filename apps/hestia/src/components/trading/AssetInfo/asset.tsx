import { Typography, Skeleton, Token, tokenAppearance } from "@mitra/ux";
import classNames from "classnames";
import Link from "next/link";

export const Asset = ({
  baseTicker,
  quoteTicker,
  tokenName,
  loading,
  inlineView,
}: {
  baseTicker: string;
  quoteTicker: string;
  tokenName: string;
  loading: boolean;
  inlineView?: boolean;
}) => {
  return (
    <Link
      className={classNames(
        "flex items-center gap-2 px-4  min-w-[10rem]",
        inlineView ? "py-1" : "md:border-r border-primary"
      )}
      href={`/trading/${baseTicker}${quoteTicker}`}
    >
      <Skeleton loading={!baseTicker} className="w-full h-8 max-w-8">
        <Token
          appearance={baseTicker as keyof typeof tokenAppearance}
          name={baseTicker}
          size="md"
          className="rounded-full border border-primary"
        />
      </Skeleton>
      {/* Was a HoverCard hardcoded to `open={false}` — it could never open, and
          its Radix trigger rendered an <a> inside this <Link>'s <a>, which is
          invalid HTML and caused a hydration error. Dropped the inert wrapper
          and kept the trigger's layout classes here. */}
      <div className="flex h-full flex-1">
        <div
          className={classNames(
            "flex flex-row-reverse gap-0.5 flex-1 h-full",
            inlineView
              ? "items-center justify-between"
              : "flex-col justify-center"
          )}
        >
          <Skeleton loading={loading} className="h-4 max-h-4 max-w-12">
            <div className="flex items-center gap-1 cursor-default">
              <Typography.Text size="xs" appearance="primary">
                {tokenName}
              </Typography.Text>
            </div>
          </Skeleton>
          <Skeleton
            loading={!baseTicker || !quoteTicker}
            className="h-4 max-h-4 max-w-8 "
          >
            <Typography.Text size="md" bold className="leading-none">
              {baseTicker}/{quoteTicker}
            </Typography.Text>
          </Skeleton>
        </div>
      </div>
    </Link>
  );
};
