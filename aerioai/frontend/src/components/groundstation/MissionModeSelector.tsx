"use client";

import { motion, AnimatePresence } from "framer-motion";
import { MissionModeId } from "./types";
import { MISSION_MODES } from "./missionModes";

interface MissionModeSelectorProps {
  activeMode: MissionModeId;
  onSelectMode: (mode: MissionModeId) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function MissionModeSelector({
  activeMode,
  onSelectMode,
  isOpen,
  onClose,
}: MissionModeSelectorProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6">
          {/* Dimmed backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/75 backdrop-blur-xl"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ type: "spring", bounce: 0, duration: 0.35 }}
            className="relative z-10 w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-[#0d0e15]/95 border border-white/10 rounded-3xl shadow-[0_24px_80px_rgba(0,0,0,0.8)] p-6 sm:p-8 flex flex-col gap-6 text-[var(--text-primary)] custom-scrollbar"
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-white/10 pb-5">
              <div>
                <div className="flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-cyan)] animate-pulse" />
                  <span className="font-mono text-xs uppercase tracking-widest text-[var(--text-muted)]">
                    GROUND STATION DISPATCH
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mt-1">
                  Select Mission Profile
                </h2>
                <p className="text-sm text-[var(--text-secondary)] mt-1">
                  Configure real-time HUD telemetry, sensor overlays, and AI copilot context for your operational sortie.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                title="Close selector"
              >
                ✕
              </button>
            </div>

            {/* 4 Mission Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Object.values(MISSION_MODES).map((mode) => {
                const isSelected = activeMode === mode.id;

                return (
                  <motion.div
                    key={mode.id}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.985 }}
                    transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                    onClick={() => {
                      onSelectMode(mode.id);
                      onClose();
                    }}
                    className={`relative rounded-2xl p-6 border cursor-pointer transition-all duration-300 flex flex-col justify-between overflow-hidden group ${
                      isSelected
                        ? "bg-white/[0.08] border-white/30 shadow-[0_0_30px_rgba(41,151,255,0.2)]"
                        : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20"
                    }`}
                  >
                    {/* Top ambient colored gradient wash */}
                    <div
                      className={`absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl opacity-30 pointer-events-none transition-opacity group-hover:opacity-60 bg-[radial-gradient(circle,var(--mode-color),transparent)]`}
                      style={{ ["--mode-color" as string]: mode.color }}
                    />

                    <div>
                      {/* Badge & Radio state */}
                      <div className="flex items-center justify-between mb-3">
                        <span
                          className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold tracking-widest uppercase border"
                          style={{
                            color: mode.color,
                            borderColor: `${mode.color}40`,
                            backgroundColor: `${mode.color}15`,
                          }}
                        >
                          {mode.badge}
                        </span>

                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected
                              ? "border-[var(--accent-cyan)] bg-[var(--accent-cyan)] shadow-[0_0_10px_rgba(41,151,255,0.6)]"
                              : "border-white/20 group-hover:border-white/40"
                          }`}
                        >
                          {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>

                      {/* Title & Tagline */}
                      <h3 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                        {mode.name}
                      </h3>
                      <p className="text-xs font-mono text-[var(--text-muted)] mt-0.5">
                        {mode.tagline}
                      </p>

                      {/* Description */}
                      <p className="text-xs text-[var(--text-secondary)] mt-3 leading-relaxed">
                        {mode.description}
                      </p>

                      {/* Feature Checklist */}
                      <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
                        {mode.primaryFeatures.map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-[var(--text-primary)]">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: mode.color }} />
                            <span>{feat}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Operational Readiness Footnote */}
                    <div className="mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[var(--text-muted)] truncate max-w-[80%]">
                        {mode.statusLabel}
                      </span>
                      <span
                        className="font-bold shrink-0 transition-transform group-hover:translate-x-1"
                        style={{ color: mode.color }}
                      >
                        {isSelected ? "ACTIVE" : "SELECT →"}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Safety Reminder */}
            <div className="mt-2 p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs text-[var(--text-muted)] font-mono">
              <span>SAFETY INTERLOCK: Flight-controller firmware and PID parameters remain locked in Phase 1.</span>
              <span className="text-[var(--accent-cyan)] font-bold">AERIOAI OS v1.2</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
