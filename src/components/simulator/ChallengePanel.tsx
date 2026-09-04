"use client";

import { useEffect, useState } from "react";

import type {
  ChallengeDefinition,
  ChallengeSnapshot,
} from "@/challenges/challenge.types";
import { calculateCompletionResult } from "@/challenges/progress/challengeScoring";
import type {
  ChallengeProgress,
  ChallengeStars,
} from "@/challenges/progress/challengeProgress.types";

const difficultyStyles = {
  beginner: "bg-emerald-500/15 text-emerald-300",
  intermediate: "bg-amber-500/15 text-amber-300",
  advanced: "bg-fuchsia-500/15 text-fuchsia-300",
} as const;

type ChallengePanelProps = {
  snapshot: ChallengeSnapshot;
  definitions: readonly ChallengeDefinition[];
  progress: ChallengeProgress;
  onSelectChallenge(challengeId: string): void;
};

export default function ChallengePanel({
  snapshot,
  definitions,
  progress,
  onSelectChallenge,
}: ChallengePanelProps) {
  const [now, setNow] = useState(() => Date.now());
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const completionResult =
    snapshot.status === "success" &&
    snapshot.startedAt !== null &&
    snapshot.endedAt !== null
      ? calculateCompletionResult(
          snapshot.definition,
          snapshot.endedAt - snapshot.startedAt,
        )
      : null;

  return (
    <aside className="absolute top-2 right-2 z-20 w-60 max-w-[calc(100%-1rem)] rounded-xl border border-white/10 bg-black/75 p-3 shadow-xl backdrop-blur-md sm:top-3 sm:right-3">
      <div className="flex min-w-0 items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold text-white">
            {snapshot.definition.title}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-[10px] text-neutral-400">
            <span
              className={`h-1.5 w-1.5 rounded-full ${snapshot.status === "running" ? "bg-blue-400" : snapshot.status === "success" ? "bg-emerald-400" : snapshot.status === "failed" ? "bg-red-400" : "bg-neutral-500"}`}
            />
            <span className="capitalize">{snapshot.status}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono">
              {(remainingMs / 1_000).toFixed(1)}s
            </span>
          </p>
        </div>
        <button
          type="button"
          aria-expanded={!isCollapsed}
          aria-controls="challenge-details"
          onClick={() => setIsCollapsed((collapsed) => !collapsed)}
          className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[10px] font-medium text-neutral-300 transition hover:bg-white/10 hover:text-white"
        >
          {isCollapsed ? "Show" : "Hide"}
        </button>
      </div>

      {isCollapsed ? null : (
        <div
          id="challenge-details"
          className="mt-3 max-h-[calc(100vh-12rem)] overflow-y-auto pr-0.5"
        >
          <select
            aria-label="Select challenge"
            value={snapshot.definition.id}
            onChange={(event) => onSelectChallenge(event.target.value)}
            className="w-full rounded-md border border-white/10 bg-neutral-900 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-400"
          >
            {definitions.map((definition) => (
              <option key={definition.id} value={definition.id}>
                {definition.title}
              </option>
            ))}
          </select>

          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-neutral-500 uppercase">
              Objective
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${difficultyStyles[snapshot.definition.difficulty]}`}
            >
              {snapshot.definition.difficulty}
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-neutral-400">
            {snapshot.definition.description}
          </p>

          <div className="mt-2 flex flex-wrap gap-1">
            {snapshot.definition.recommendedApis.map((api) => (
              <span
                key={api}
                className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-neutral-300"
              >
                {api}
              </span>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 rounded-lg bg-white/5 px-2.5 py-2 text-[10px]">
            <ProgressMetric
              label="Best"
              value={formatTime(progress.bestTimeMs)}
            />
            <ProgressMetric
              label="Score"
              value={progress.bestScore?.toString() ?? "—"}
            />
            <div className="flex items-center justify-between gap-2 text-neutral-400">
              <span>Stars</span>
              <Stars value={progress.stars} />
            </div>
            <ProgressMetric
              label="Attempts"
              value={progress.attempts.toString()}
            />
          </div>

          {failureMessage ? (
            <p className="mt-2 rounded-md bg-red-500/10 px-2 py-1.5 text-[11px] font-medium text-red-300">
              {failureMessage}
            </p>
          ) : null}

          {completionResult ? (
            <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2 text-[10px] text-emerald-100">
              <p className="font-semibold text-emerald-300">
                Challenge Complete
              </p>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-1">
                <span>Time: {formatTime(completionResult.elapsedTimeMs)}</span>
                <span>Score: {completionResult.score}</span>
                <span>Best: {formatTime(progress.bestTimeMs)}</span>
                <Stars value={completionResult.stars} />
              </div>
            </div>
          ) : null}

          <p className="mt-2 border-t border-white/10 pt-2 text-[10px] leading-4 text-neutral-400">
            <span className="font-medium text-neutral-300">Hint:</span>{" "}
            {snapshot.definition.hint}
          </p>
        </div>
      )}
    </aside>
  );
}

function ProgressMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 text-neutral-400">
      <span>{label}</span>
      <span className="font-mono text-neutral-200">{value}</span>
    </div>
  );
}

function Stars({ value }: { value: ChallengeStars }) {
  return (
    <span
      aria-label={`${value} of 3 stars`}
      className="tracking-wider text-amber-300"
    >
      <span aria-hidden="true">
        {"★".repeat(value)}
        {"☆".repeat(3 - value)}
      </span>
    </span>
  );
}

function formatTime(milliseconds: number | null): string {
  return milliseconds === null ? "—" : `${(milliseconds / 1_000).toFixed(1)}s`;
}
