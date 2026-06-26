"use client";

interface Detection {
  label: string;
  count: number;
}

interface Props {
  detections: Detection[];
  summary?: string;
}

export default function DetectionSummary({ detections, summary }: Props) {
  const total = detections.reduce((a, d) => a + d.count, 0);

  if (total === 0 && !summary) return null;

  const summaryText =
    summary ||
    detections
      .filter((d) => d.count > 0)
      .map((d) => `${d.count} ${d.label}${d.count !== 1 ? "s" : ""}`)
      .join(", ") + " detected";

  return (
    <div
      className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-sm"
      style={{
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.12)",
      }}
    >
      {/* Pulsing dot */}
      <span className="mt-1 w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
      <span className="text-white/90 font-medium leading-snug">{summaryText}</span>
    </div>
  );
}
