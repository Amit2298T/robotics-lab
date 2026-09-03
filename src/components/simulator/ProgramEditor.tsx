"use client";

import dynamic from "next/dynamic";
import type { Monaco } from "@monaco-editor/react";

const robotApiDeclaration = `declare const robot: {
  forward(durationMs: number): Promise<void>;
  backward(durationMs: number): Promise<void>;
  turnLeft(durationMs: number): Promise<void>;
  turnRight(durationMs: number): Promise<void>;
  wait(durationMs: number): Promise<void>;
  stop(): Promise<void>;
  distance(): Promise<number>;
  bumped(): Promise<boolean>;
  odometry(): Promise<{
    x: number;
    z: number;
    heading: number;
  }>;
};`;

function configureJavaScript(monaco: Monaco): void {
  monaco.languages.typescript.javascriptDefaults.addExtraLib(
    robotApiDeclaration,
    "robot-api.d.ts",
  );
}

const MonacoEditor = dynamic(
  () => import("@monaco-editor/react"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-[#0d1117] text-sm text-neutral-500">
        Loading editor…
      </div>
    ),
  },
);

type ProgramEditorProps = {
  value: string;
  onChange(value: string): void;
};

export default function ProgramEditor({
  value,
  onChange,
}: ProgramEditorProps) {
  return (
    <MonacoEditor
      height="100%"
      language="javascript"
      theme="vs-dark"
      value={value}
      beforeMount={configureJavaScript}
      onChange={(nextValue) => onChange(nextValue ?? "")}
      options={{
        automaticLayout: true,
        bracketPairColorization: { enabled: true },
        fontSize: 14,
        lineNumbers: "on",
        minimap: { enabled: false },
        padding: { top: 16 },
        scrollBeyondLastLine: false,
        tabSize: 2,
      }}
    />
  );
}
