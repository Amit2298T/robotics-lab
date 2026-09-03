"use client";

import { useEffect, useState } from "react";

import type { ChallengeSnapshot } from "@/challenges/challenge.types";

const statusStyles = {
  idle: "bg-white/10 text-neutral-300",
  running: "bg-blue-500/20 text-blue-300",
  success: "bg-emerald-500/20 text-emerald-300",
  failed: "bg-red-500/20 text-red-300",
} as const;

type ChallengePanelProps = {
  snapshot: ChallengeSnapshot;
};

export default function ChallengePanel({ snapshot }: ChallengePanelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (snapshot.status !== "running") {
      return;
    }

    const interval = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(interval);
  }, [snapshot.status, snapshot.deadline]);

  const displayTime = snapshot.endedAt ?? now;
  const remainingMs =
    snapshot.deadline !== null
      ? Math.min(
          snapshot.definition.timeLimitMs,
          Math.max(0, snapshot.deadline - displayTime),
        )
      : snapshot.definition.timeLimitMs;

  const failureMessage =
    snapshot.failureReason === "collision"
      ? "Collision detected"
      : snapshot.failureReason === "timeout"
        ? "Time expired"
        : null;

  return (
    <aside className="pointer-events-none absolute top-4 right-4 z-20 w-56 rounded-xl border border-white/10 bg-black/70 p-4 shadow-xl backdrop-blur-md">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-neutral-500 uppercase">
        Challenge
      </p>
      <h2 className="mt-1 text-sm font-semibold text-white">
        {snapshot.definition.title}
      </h2>
      <p className="mt-1 text-xs leading-5 text-neutral-400">
        Reach the green target without collision.
      </p>

      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
        <span
          className={`rounded-full px-2 py-1 font-medium capitalize ${statusStyles[snapshot.status]}`}
        >
          {snapshot.status}
        </span>
        <span className="font-mono text-neutral-300">
          {(remainingMs / 1_000).toFixed(1)}s
        </span>
      </div>

      {failureMessage ? (
        <p className="mt-2 text-xs font-medium text-red-300">
          {failureMessage}
        </p>
      ) : null}

      {snapshot.status === "success" ? (
        <p className="mt-2 text-xs font-medium text-emerald-300">
          Goal reached
        </p>
      ) : null}
    </aside>
  );
}
