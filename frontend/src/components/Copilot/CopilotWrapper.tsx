"use client";

import dynamic from "next/dynamic";

const CopilotPanel = dynamic(
  () => import("@/components/Copilot/CopilotPanel"),
  { ssr: false }
);

export default function CopilotWrapper() {
  return <CopilotPanel />;
}
