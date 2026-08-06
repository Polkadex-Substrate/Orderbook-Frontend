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
  const params = new URLSearchParams(searchParams.toString());
  data.forEach(({ name, value = "" }) => params.set(name, value));
  push(pathname + "?" + params.toString());
};
