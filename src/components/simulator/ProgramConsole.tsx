import type {
  ProgramConsoleEntry,
  ProgramStatus,
} from "@/runtime/program.types";

type ProgramConsoleProps = {
  entries: readonly ProgramConsoleEntry[];
  status: ProgramStatus;
};

export default function ProgramConsole({
  entries,
  status,
}: ProgramConsoleProps) {
  return (
    <section className="flex h-36 shrink-0 flex-col border-t border-white/10 bg-[#090d14]">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-white/10 px-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
          Program Console
        </span>
        <span className="text-[11px] uppercase tracking-wider text-neutral-500">
          {status}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs leading-5">
        {entries.length === 0 ? (
          <p className="text-neutral-600">Ready.</p>
        ) : (
          entries.map((entry) => (
            <p
              key={entry.id}
              className={
                entry.level === "error"
                  ? "text-red-400"
                  : entry.level === "warning"
                    ? "text-amber-300"
                  : entry.level === "command"
                    ? "text-cyan-300"
                    : "text-neutral-400"
              }
            >
              <span className="mr-2 text-neutral-700">›</span>
              {entry.message}
            </p>
          ))
        )}
      </div>
    </section>
  );
}
