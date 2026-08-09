import {
  batchSeq,
  initialSeqState,
  nextSeqDecision,
  SeqState,
} from "./bookSequence";

/*
 * Ground truth: a buy order was acknowledged instantly but did not appear in
 * the book. A later sell order "brought both with it" - which is what a 30s
 * snapshot poll looks like from the outside. The increments carry a sequence
 * number (`i` on the event, copied to every level as seqNum) and the client
 * discarded it, so neither a dropped increment nor a snapshot landing on top of
 * one could be noticed.
 */

const lvl = (seqNum?: number | null) => [{ price: 1, qty: 1, seqNum }];

describe("batchSeq", () => {
  it("reads the sequence shared by every level of one event", () => {
    expect(batchSeq([{ seqNum: 42 }, { seqNum: 42 }, { seqNum: 42 }])).toBe(42);
  });

  it("takes the newest when a batch somehow mixes events", () => {
    expect(batchSeq([{ seqNum: 7 }, { seqNum: 9 }, { seqNum: 8 }])).toBe(9);
  });

  it("returns null for the pre-sequencing wire format", () => {
    expect(batchSeq([{ price: 1 } as never])).toBeNull();
    expect(batchSeq([{ seqNum: null }])).toBeNull();
    expect(batchSeq([{ seqNum: undefined }])).toBeNull();
  });

  it("ignores non-finite sequence numbers rather than trusting them", () => {
    expect(batchSeq([{ seqNum: Number.NaN }])).toBeNull();
    expect(batchSeq([{ seqNum: Infinity }])).toBeNull();
    expect(batchSeq([{ seqNum: Number.NaN }, { seqNum: 5 }])).toBe(5);
  });

  it("survives empty, null and undefined input", () => {
    expect(batchSeq([])).toBeNull();
    expect(batchSeq(null)).toBeNull();
    expect(batchSeq(undefined)).toBeNull();
  });

  it("accepts sequence zero as a real sequence, not as absent", () => {
    // `if (!seqNum)` would have treated 0 as missing. It is the first message.
    expect(batchSeq([{ seqNum: 0 }])).toBe(0);
  });
});

describe("nextSeqDecision", () => {
  it("applies the first batch and adopts it as the baseline", () => {
    // There is no snapshot sequence to validate against, so refusing the first
    // increment would freeze the book forever.
    const d = nextSeqDecision(initialSeqState(), lvl(100));
    expect(d.action).toBe("apply");
    expect(d.nextSeq).toBe(100);
  });

  it("applies a contiguous increment", () => {
    const d = nextSeqDecision({ lastSeq: 100 }, lvl(101));
    expect(d.action).toBe("apply");
    expect(d.nextSeq).toBe(101);
  });

  it("THE bug: a gap asks for a resync instead of diverging silently", () => {
    // This is the case that left a placed order missing from the book until the
    // 30s poll. Now it refetches the snapshot immediately.
    const d = nextSeqDecision({ lastSeq: 100 }, lvl(103));
    expect(d.action).toBe("resync");
    if (d.action !== "resync") throw new Error("unreachable");
    expect(d.reason).toContain("expected 101");
    expect(d.reason).toContain("received 103");
    expect(d.reason).toContain("2 increment(s) missing");
    expect(d.nextSeq).toBeNull();
  });

  it("skips a replayed or out-of-order increment without resyncing", () => {
    // A duplicate is not divergence. Resyncing on it would hammer the snapshot
    // endpoint on a chatty reconnect.
    const same = nextSeqDecision({ lastSeq: 100 }, lvl(100));
    expect(same.action).toBe("skip");
    expect(same.nextSeq).toBe(100);

    const older = nextSeqDecision({ lastSeq: 100 }, lvl(97));
    expect(older.action).toBe("skip");
    expect(older.nextSeq).toBe(100);
  });

  it("stays in pre-sequencing behaviour when the wire carries no seqNum", () => {
    // Applying is the old behaviour. Resyncing on every message would be a
    // denial of service against our own backend.
    const d = nextSeqDecision({ lastSeq: 100 }, lvl(null));
    expect(d.action).toBe("apply");
    expect(d.nextSeq).toBe(100);
  });

  it("re-baselines after a resync rather than resyncing forever", () => {
    // After a gap the state is cleared, so the next increment - whatever its
    // number - is accepted as the new baseline alongside the fresh snapshot.
    let state: SeqState = { lastSeq: 100 };
    const gap = nextSeqDecision(state, lvl(140));
    expect(gap.action).toBe("resync");
    state = { lastSeq: gap.nextSeq };

    const after = nextSeqDecision(state, lvl(141));
    expect(after.action).toBe("apply");
    expect(after.nextSeq).toBe(141);
  });

  it("walks a clean stream without a single false resync", () => {
    // The property that matters most: correct streams must never trigger a
    // refetch, or the fix becomes a performance regression.
    let state: SeqState = initialSeqState();
    for (let seq = 500; seq < 600; seq++) {
      const d = nextSeqDecision(state, lvl(seq));
      expect(d.action).toBe("apply");
      state = { lastSeq: d.nextSeq };
    }
    expect(state.lastSeq).toBe(599);
  });

  it("handles a sequence of exactly zero at the start of a stream", () => {
    const d = nextSeqDecision(initialSeqState(), lvl(0));
    expect(d.action).toBe("apply");
    expect(d.nextSeq).toBe(0);
    expect(nextSeqDecision({ lastSeq: 0 }, lvl(1)).action).toBe("apply");
  });
});
