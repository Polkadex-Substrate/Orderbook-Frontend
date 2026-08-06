import { RedirectType, permanentRedirect } from "next/navigation";

import { defaultConfig } from "@/config";

export default function Page() {
  const defaultPage = defaultConfig.defaultTransferToken;
  // Next 16: RedirectType is a value (const object), not a type.
  permanentRedirect(`/transfer/${defaultPage}`, RedirectType.push);
}
