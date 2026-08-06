import { RedirectType, permanentRedirect } from "next/navigation";

import { defaultConfig } from "@/config";

export default function Page() {
  const defaultPage = defaultConfig.landingPageMarket;
  // Next 16 exports RedirectType as a value (enum), so reference the member
  // directly - `"push" as RedirectType` no longer type-checks.
  permanentRedirect(`/trading/${defaultPage}`, RedirectType.push);
}
