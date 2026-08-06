/**
 * Runtime announcements feed.
 *
 * Announcements used to be a hardcoded array in @orderbook/core, which meant
 * every wording change - or retracting one - needed a full rebuild and redeploy.
 * That is a bad fit for the things announcements are for: outages, pauses,
 * maintenance windows. By the time a rebuild finishes the message is often
 * already wrong.
 *
 * This reads a JSON file from disk on each request. Because it is a route
 * handler in a `output: "standalone"` server running under systemd, it executes
 * on the server at request time - unlike NEXT_PUBLIC_* values, which are inlined
 * into the browser bundle at build time and therefore cannot change without one.
 *
 * Editing /etc/orderbook-fe/announcements.json takes effect on the next page
 * load. No rebuild, no restart.
 *
 * The file lives outside the app tree on purpose: `deploy.sh` replaces
 * /opt/orderbook-fe wholesale, so anything inside it is lost on every deploy.
 * /etc/orderbook-fe is the directory install.sh already owns for the env file.
 */
import { readFile } from "node:fs/promises";

// force-dynamic: without it Next may statically evaluate this at build time and
// serve a snapshot of whatever the file said when the image was built - exactly
// the problem this endpoint exists to avoid.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const ANNOUNCEMENTS_PATH =
  process.env.ANNOUNCEMENTS_FILE || "/etc/orderbook-fe/announcements.json";

type Announcement = {
  id: string;
  category: string;
  type: string;
  message: string;
  description: string;
  date: number;
  active: boolean;
  href?: string;
};

const REQUIRED_STRINGS = [
  "id",
  "category",
  "type",
  "message",
  "description",
] as const;

/**
 * Drop anything malformed rather than failing the whole response.
 *
 * One bad entry should not blank the others, and a broken announcements file
 * must never be able to break the trading UI. Every rejection is logged with a
 * reason - silent filtering would leave someone editing the JSON with no idea
 * why their announcement is not appearing.
 */
const validate = (raw: unknown): Announcement[] => {
  if (!Array.isArray(raw)) {
    console.error(
      `[announcements] ${ANNOUNCEMENTS_PATH} must contain a JSON array, got ${typeof raw}`
    );
    return [];
  }

  const seen = new Set<string>();

  return raw.filter((entry): entry is Announcement => {
    if (!entry || typeof entry !== "object") {
      console.error("[announcements] skipped a non-object entry");
      return false;
    }

    const e = entry as Record<string, unknown>;

    for (const key of REQUIRED_STRINGS) {
      if (typeof e[key] !== "string" || !e[key]) {
        console.error(
          `[announcements] skipped entry: "${key}" must be a non-empty string`
        );
        return false;
      }
    }

    // Ids are the dismissal key in the client's localStorage. A duplicate means
    // dismissing one silently dismisses the other.
    if (seen.has(e.id as string)) {
      console.error(`[announcements] skipped duplicate id "${e.id}"`);
      return false;
    }
    seen.add(e.id as string);

    if (typeof e.date !== "number" || !Number.isFinite(e.date)) {
      console.error(
        `[announcements] skipped "${e.id}": "date" must be epoch milliseconds (a number)`
      );
      return false;
    }

    return true;
  });
};

export async function GET() {
  try {
    const contents = await readFile(ANNOUNCEMENTS_PATH, "utf8");
    const announcements = validate(JSON.parse(contents));

    return Response.json(announcements, {
      // Short cache: long enough that a busy page does not re-read the file on
      // every navigation, short enough that a retraction lands promptly.
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (e) {
    const err = e as NodeJS.ErrnoException;

    // A missing file is the normal state, not an error - most deployments have
    // nothing to announce. Anything else is worth a log line.
    if (err?.code !== "ENOENT") {
      console.error(
        `[announcements] could not read ${ANNOUNCEMENTS_PATH}:`,
        err
      );
    }

    // Always 200 with an empty list. A non-2xx here would surface as a console
    // error on every page load of an app that simply has no announcements.
    return Response.json([], {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  }
}
