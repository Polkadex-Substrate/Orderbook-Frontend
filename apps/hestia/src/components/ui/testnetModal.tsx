"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { RiFlaskLine, RiRefreshLine } from "@remixicon/react";
import * as Sentry from "@sentry/nextjs";

import {
  IS_TESTNET,
  TESTNET_ACK_EVENT,
  TESTNET_ACK_KEY,
} from "@/config/network";
import {
  consentRevealDelayMs,
  revealDelayMs,
} from "@/components/ui/revealSchedule";
import {
  blockedMessage,
  canProceed,
  interceptionReport,
  shouldShowTestnetNotice,
  showEscapeHatch,
  stallReport,
  type HitTest,
} from "@/components/ui/testnetGate";
import {
  FREEZE_TICK_MS,
  freezeMessage,
  freezeVerdict,
} from "@/components/ui/freezeWatch";

/** Short, identifiable descriptor for whatever is covering our button. */
const describeElement = (el: Element | null): string => {
  if (!el) return "nothing";
  const tag = el.tagName.toLowerCase();
  if (el.id) return `${tag}#${el.id}`;
  const cls = (el.getAttribute("class") ?? "").trim().split(/\s+/)[0];
  return cls ? `${tag}.${cls}` : tag;
};

/*
 * WHY THIS DOES NOT USE THE SHARED <Modal> COMPONENT
 *
 * A reviewer reported this notice "freezing": visible, page dimmed behind it,
 * and the checkbox unclickable. Intermittent, cleared on reload. A first fix
 * added feedback and a reload button and DID NOT HELP, which turned out to be
 * the most informative result available.
 *
 * The cause is in `@radix-ui/react-dismissable-layer`, which `@aksumite/ui`'s
 * `Modal` sits on via Radix AlertDialog:
 *
 *     document.body.style.pointerEvents = "none";          // a layer opens
 *     pointerEvents: isBodyPointerEventsDisabled
 *       ? (isPointerEventsEnabled ? "auto" : "none")       // per layer
 *       : undefined
 *
 * While any Radix modal layer is open, the BODY gets `pointer-events: none`,
 * and only the layer Radix considers topmost gets `auto` back. `Header` renders
 * five further Radix modals unconditionally with `open={false}`, alongside
 * popovers, dropdowns and tooltips. When that bookkeeping resolves with this
 * gate not on top, it renders perfectly and accepts no input at all.
 *
 * It also explains why the first fix failed. The escape hatch was a button
 * INSIDE the modal, so it inherited the same `pointer-events: none`. The fire
 * exit was inside the locked room.
 *
 * So this component leaves the layer system entirely and uses a native
 * `<dialog>` with `showModal()`:
 *
 *   - The browser's top layer is not Radix's, so no other component's
 *     bookkeeping can switch this off.
 *   - Real focus trap, real `::backdrop`, rest of the page inert, for free.
 *   - `pointer-events: auto` is set EXPLICITLY on the dialog. `pointer-events`
 *     inherits, and a top-layer dialog is still a DOM descendant of `<body>`,
 *     so it would otherwise inherit `none` from exactly the bug above. An
 *     explicit value overrides inheritance regardless of what body says.
 *
 * Consent is unchanged: the tick is still required, Escape is refused, and
 * there is no close control. See testnetGate.ts for the rules.
 */
export const TestnetModal = () => {
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [openedForMs, setOpenedForMs] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const stallReported = useRef(false);
  const freezeReported = useRef(false);
  const interceptionReported = useRef(false);

  useEffect(() => {
    let acked = false;
    try {
      acked = !!sessionStorage.getItem(TESTNET_ACK_KEY);
    } catch {
      // Private-mode Safari can throw. Showing the notice twice is harmless; a
      // consent gate crashing the page it gates is not.
    }
    if (shouldShowTestnetNotice(IS_TESTNET, acked)) setOpen(true);
  }, []);

  // showModal() rather than the `open` attribute. Only showModal() promotes the
  // element to the top layer; a plain `open` attribute leaves it in normal flow,
  // where it would be subject to the same stacking and pointer-events problems
  // this component exists to escape.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  // Escape must not dismiss a consent gate.
  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const onCancel = (e: Event) => e.preventDefault();
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, []);

  /*
   * The tick that measures elapsed time ALSO measures how late it is.
   *
   * THE BLIND SPOT THIS CLOSES. `stallReport` derives elapsed time from this
   * interval, so during a real freeze the callback does not run, openedForMs
   * does not advance, and the reporter can never reach its threshold. The
   * instrument needed a healthy thread in order to report an unhealthy one,
   * which is why six weeks of "Sentry shows nothing" meant nothing.
   *
   * A tick scheduled for 1s that arrives 12s late proves the thread was blocked
   * for 11 of them. The evidence is late but complete, and it survives the
   * event that produced it. See freezeWatch.ts.
   */
  useEffect(() => {
    if (!open) return;
    const startedAt = Date.now();
    let lastTickAt = startedAt;
    // Visibility is checked per tick rather than once: a background tab has its
    // timers throttled to roughly once a minute, which is indistinguishable
    // from a freeze. Any hidden moment during the gap disqualifies it.
    let stayedVisible = document.visibilityState === "visible";
    const onVisibility = () => {
      if (document.visibilityState !== "visible") stayedVisible = false;
    };
    document.addEventListener("visibilitychange", onVisibility);

    const id = setInterval(() => {
      const now = Date.now();
      const gapMs = now - lastTickAt;
      lastTickAt = now;
      setOpenedForMs(now - startedAt);

      const verdict = freezeVerdict({
        gapMs,
        tickMs: FREEZE_TICK_MS,
        wasVisibleThroughout: stayedVisible,
        alreadyReported: freezeReported.current,
      });
      // Reset for the next window regardless of the verdict, so one background
      // excursion does not disqualify every later tick.
      stayedVisible = document.visibilityState === "visible";

      if (verdict.frozen) {
        freezeReported.current = true;
        Sentry.captureMessage(freezeMessage(verdict.blockedForMs), {
          level: "error",
          extra: {
            blockedForMs: verdict.blockedForMs,
            clamped: verdict.clamped,
            openedForMs: now - startedAt,
            documentReadyState: document.readyState,
          },
        });
      }
    }, FREEZE_TICK_MS);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [open]);

  const state = { checked, openedForMs, attempted };

  /*
   * Make a genuinely BLOCKED gate visible in Sentry. Being unable to click is
   * not an exception, so nothing here would be reported otherwise.
   *
   * `bodyPointerEvents` is now read BEFORE the decision and passed in, because
   * it IS the decision. It used to be gathered only after `stallReport` had
   * already said yes on elapsed time alone - which reported six people for
   * reading carefully, one of them on a demonstrably interactive page. The
   * field that identifies the bug was being collected as a footnote to a
   * conclusion already reached. See ORDERBOOK-TESTNET-D and testnetGate.ts.
   */
  useEffect(() => {
    if (!open) return;
    const report = stallReport(
      state,
      typeof document === "undefined" ? "unknown" : document.readyState,
      stallReported.current,
      typeof document === "undefined"
        ? "unknown"
        : getComputedStyle(document.body).pointerEvents
    );
    if (!report) return;
    stallReported.current = true;
    Sentry.captureMessage(report.message, {
      level: "warning",
      extra: {
        documentReadyState: report.documentReadyState,
        openedForMs: report.openedForMs,
        bodyPointerEvents: report.bodyPointerEvents,
      },
    });
  }, [open, checked, openedForMs, attempted]); // eslint-disable-line react-hooks/exhaustive-deps

  /*
   * Ask the browser what is actually on top of our own Continue button.
   *
   * The reporter above only fires when `body` carries `pointer-events: none`,
   * which is the Radix layer bug and nothing else. Users kept reporting a dead
   * button while that stayed silent, so it was reporting one cause and calling
   * the silence proof. A hit test does not care WHY the click will not land: if
   * the topmost element at the button's centre is not inside our dialog, some
   * thing is covering it, and this names it.
   */
  useEffect(() => {
    if (!open) return;
    const btn = continueRef.current;
    const dlg = dialogRef.current;

    let hitTest: HitTest = {
      ran: false,
      insideDialog: false,
      topElement: "unknown",
      topElementFound: false,
      pointInViewport: false,
      viewportSized: false,
    };
    try {
      if (btn && dlg) {
        const r = btn.getBoundingClientRect();
        // A zero-sized rect means the button has not been laid out yet, and
        // elementFromPoint at (0,0) would name the page's top-left corner - a
        // confident answer to a question we did not ask.
        if (r.width > 0 && r.height > 0) {
          const x = r.left + r.width / 2;
          const y = r.top + r.height / 2;
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          const top = document.elementFromPoint(x, y);
          hitTest = {
            ran: true,
            insideDialog: !!top && dlg.contains(top),
            topElement: describeElement(top),
            topElementFound: !!top,
            // elementFromPoint returns null for a point OUTSIDE the viewport,
            // which means "off-screen", not "something is on top". Recording
            // both facts lets the reporter tell those apart instead of
            // emitting "covered by nothing". See ORDERBOOK-TESTNET-Q.
            pointInViewport: x >= 0 && y >= 0 && x <= vw && y <= vh,
            viewportSized: vw > 0 && vh > 0,
          };
        }
      }
    } catch {
      // Leave hitTest.ran false. A test we could not run is not evidence.
    }

    const report = interceptionReport(
      { checked, openedForMs, attempted },
      hitTest,
      interceptionReported.current
    );
    if (!report) return;
    interceptionReported.current = true;
    Sentry.captureMessage(report.message, {
      level: "error",
      extra: {
        openedForMs: report.openedForMs,
        topElement: report.topElement,
        documentReadyState: document.readyState,
        bodyPointerEvents: getComputedStyle(document.body).pointerEvents,
      },
    });
  }, [open, checked, openedForMs, attempted]);

  const handleContinue = useCallback(() => {
    if (!canProceed({ checked, openedForMs, attempted })) {
      setAttempted(true);
      return;
    }
    try {
      sessionStorage.setItem(TESTNET_ACK_KEY, "1");
    } catch {
      // Reappearing next load beats trapping the user here.
    }
    setOpen(false);
    // Lets the product tour know the viewport is clear; without it the tour
    // highlights elements behind the backdrop.
    window.dispatchEvent(new Event(TESTNET_ACK_EVENT));
  }, [checked, openedForMs, attempted]);

  const message = blockedMessage(state);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="testnet-notice-title"
      // See the header note: explicit, because `pointer-events` inherits and
      // body may be carrying `none` from an unrelated Radix layer.
      style={{ pointerEvents: "auto" }}
      className={
        "pointer-events-auto m-auto w-full max-w-[480px] rounded-md border " +
        "border-primary bg-level-0 p-0 text-current backdrop:bg-black/70"
      }
    >
      <div className="flex flex-col gap-5 p-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-primary bg-level-1">
            <RiFlaskLine className="h-7 w-7 text-primary-hover" />
          </div>
          <div className="flex flex-col gap-1">
            <h2 id="testnet-notice-title" className="text-xl font-bold">
              Testnet Environment
            </h2>
            <p className="text-sm text-primary">
              You are using a testnet version of Polkadex Orderbook
            </p>
          </div>
        </div>

        <hr className="border-primary" />

        {/* Each bullet is RENDERED NOW and revealed by CSS animation-delay. No
            JS timer gates any of this: on a blocked main thread timers never
            fire, and a reveal driven by them would withhold the checkbox and
            button entirely. Compositor animations keep running regardless, so
            a frozen tab shows the sequence finish and then stop responding
            instead of looking like a slow reader. See revealSchedule.ts. */}
        <ul className="flex flex-col gap-2 text-sm text-primary">
          <li
            className="testnet-reveal flex gap-2"
            style={{ animationDelay: `${revealDelayMs(0)}ms` }}
          >
            <span className="shrink-0">⚠️</span>
            <span>
              All assets and transactions on this network are{" "}
              <strong className="text-current">
                for testing purposes only
              </strong>{" "}
              and have no real monetary value.
            </span>
          </li>
          <li
            className="testnet-reveal flex gap-2"
            style={{ animationDelay: `${revealDelayMs(1)}ms` }}
          >
            <span className="shrink-0">🚫</span>
            <span>Do not send real funds to any testnet address.</span>
          </li>
          <li
            className="testnet-reveal flex gap-2"
            style={{ animationDelay: `${revealDelayMs(2)}ms` }}
          >
            <span className="shrink-0">👛</span>
            <span>
              Create a <strong className="text-current">new wallet</strong>{" "}
              dedicated to this testnet and use the{" "}
              <strong className="text-current">Faucet</strong> to receive test
              funds.
            </span>
          </li>
          <li
            className="testnet-reveal flex gap-2"
            style={{ animationDelay: `${revealDelayMs(3)}ms` }}
          >
            <span className="shrink-0">🔬</span>
            <span>Testnet data may be reset at any time without notice.</span>
          </li>
        </ul>

        <hr className="border-primary" />

        <div
          className="testnet-reveal flex flex-col gap-4"
          style={{ animationDelay: `${consentRevealDelayMs()}ms` }}
        >
          {/* A plain input, not the Radix checkbox. This component's whole
              purpose is to depend on nothing that participates in the layer
              system that broke it. */}
          <label
            htmlFor="testnetAcknowledge"
            className="flex cursor-pointer items-start gap-2 text-xs text-primary"
          >
            <input
              id="testnetAcknowledge"
              type="checkbox"
              autoFocus
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary-hover"
            />
            <span>
              I understand that this is a testnet environment and all activity
              here has no real-world value.
            </span>
          </label>

          {/* Not disabled. A disabled button cannot explain itself, so a click
              that fails to register produced silence. */}
          <button
            ref={continueRef}
            type="button"
            onClick={handleContinue}
            className="w-full rounded-sm bg-primary-hover px-4 py-3 font-medium text-white transition-opacity hover:opacity-90"
          >
            Continue to Testnet
          </button>

          {message && (
            <p role="alert" className="text-center text-xs text-danger-base">
              {message}
            </p>
          )}

          {showEscapeHatch(state) && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-primary">
                Not responding? The page may not have finished loading.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-1 rounded-sm border border-primary px-3 py-1.5 text-xs"
              >
                <RiRefreshLine className="h-3 w-3" />
                Reload page
              </button>
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
};
