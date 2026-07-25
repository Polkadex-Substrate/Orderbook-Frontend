import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { ReadonlyURLSearchParams } from "next/navigation";

type Props = {
  data: Array<{ name: string; value?: string }>;
  pathname: string;
  searchParams: ReadonlyURLSearchParams;
  push: AppRouterInstance["push"];
};
export const createQueryString = ({
  data,
  pathname,
  searchParams,
  push,
}: Props) => {
  const current = searchParams.toString();
  const params = new URLSearchParams(current);
  data.forEach(({ name, value = "" }) => params.set(name, value));
  const next = params.toString();

  // Bail out when nothing actually changed. Callers run this from an effect
  // that depends on `searchParams`, so pushing unconditionally navigates ->
  // yields a new searchParams object -> re-runs the effect -> pushes again,
  // an infinite navigation loop.
  if (next === current) return;

  push(pathname + "?" + next);
};
