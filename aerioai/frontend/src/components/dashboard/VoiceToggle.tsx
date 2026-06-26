"use client";

interface Props {
  enabled: boolean;
  onChange: (val: boolean) => void;
  label?: string;
}

export default function VoiceToggle({ enabled, onChange, label = "Voice Mode" }: Props) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className="flex items-center gap-3 group select-none"
    >
      {/* Track */}
      <span
        className="relative inline-flex h-7 w-[52px] shrink-0 rounded-full transition-all duration-300"
        style={{
          background: enabled
            ? "linear-gradient(135deg, #0071E3, #5E5CE6)"
            : "rgba(120,120,128,0.32)",
          boxShadow: enabled ? "0 0 12px rgba(0,113,227,0.4)" : "none",
          transition: "background 300ms ease, box-shadow 300ms ease",
        }}
      >
        {/* Thumb */}
        <span
          className="absolute top-0.5 inline-block w-6 h-6 rounded-full bg-white shadow-md"
          style={{
            transform: enabled ? "translateX(26px)" : "translateX(2px)",
            transition: "transform 300ms cubic-bezier(0.22, 1, 0.36, 1)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
          }}
        />
      </span>

      {/* Label */}
      <span className="flex flex-col items-start">
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{label}</span>
        <span
          className="text-xs font-medium transition-colors duration-200"
          style={{ color: enabled ? "#0071E3" : "#8E8E93" }}
        >
          {enabled ? "Listening…" : "Off"}
        </span>
      </span>
    </button>
  );
}
