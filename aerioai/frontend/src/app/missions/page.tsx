"use client";

import { useEffect, useState } from "react";
import { useMission } from "@/hooks/useMission";
import Loader from "@/components/ui/Loader";
import { formatTimestamp } from "@/lib/utils";

export default function MissionsPage() {
  const { missions, currentMission, fetchMissions, createMission, startMission, completeMission } = useMission();
  const [newMissionName, setNewMissionName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMissionName.trim()) return;
    setLoading(true);
    await createMission(newMissionName);
    setNewMissionName("");
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-full gap-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Mission Control</h1>
          <p className="text-[var(--text-secondary)] font-medium">Logistics, Routing & Execution</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1">
        
        {/* Left Col: Mission Timeline */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="glass-panel p-8 flex-1">
            <h2 className="text-xl font-bold mb-8 flex items-center gap-2">
              <span className="text-[var(--accent-cyan)]">⌘</span> Mission Registry
            </h2>
            
            <div className="space-y-6">
              {missions.length === 0 ? (
                <div className="py-20 text-center opacity-50">
                  <p className="text-4xl mb-4">🗺️</p>
                  <p className="font-bold">No missions logged.</p>
                </div>
              ) : (
                missions.map((mission, i) => (
                  <div key={mission.id} className="relative pl-8 group">
                    {/* Timeline Line */}
                    {i !== missions.length - 1 && (
                      <div className="absolute left-[11px] top-8 bottom-[-24px] w-0.5 bg-[var(--border-color)] group-hover:bg-[var(--accent-cyan)]/30 transition-colors" />
                    )}
                    {/* Timeline Dot */}
                    <div className="absolute left-0 top-1.5 w-6 h-6 rounded-full bg-[var(--bg-primary)] border-4 border-[var(--border-color)] group-hover:border-[var(--accent-cyan)] transition-colors z-10" />
                    
                    <div className="glass-panel p-6 hover:scale-[1.01] transition-transform">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-lg font-bold">{mission.name}</h3>
                          <p className="font-mono text-xs text-[var(--text-muted)] mt-1">{mission.id}</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          mission.status === 'COMPLETED' ? 'bg-[var(--accent-green)]/10 text-[var(--accent-green)]' :
                          mission.status === 'ACTIVE' ? 'bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] animate-pulse' :
                          'bg-[var(--text-secondary)]/10 text-[var(--text-secondary)]'
                        }`}>
                          {mission.status}
                        </span>
                      </div>
                      
                      <div className="flex gap-6 mt-6 pt-4 border-t border-[var(--border-color)]">
                        <div>
                          <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase mb-1">Created</p>
                          <p className="text-sm font-medium">{formatTimestamp(mission.created_at)}</p>
                        </div>
                        {mission.started_at && (
                          <div>
                            <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase mb-1">Launched</p>
                            <p className="text-sm font-medium">{formatTimestamp(mission.started_at)}</p>
                          </div>
                        )}
                        {mission.completed_at && (
                          <div>
                            <p className="text-[10px] font-bold tracking-widest text-[var(--text-muted)] uppercase mb-1">Recovered</p>
                            <p className="text-sm font-medium">{formatTimestamp(mission.completed_at)}</p>
                          </div>
                        )}
                      </div>
                      
                      {mission.status === 'PENDING' && (
                        <div className="mt-6 flex justify-end">
                          <button 
                            onClick={() => startMission(mission.id)}
                            className="glass-button px-6 py-2 text-sm font-bold bg-[var(--text-primary)] text-[var(--bg-primary)] hover:bg-[var(--accent-cyan)] hover:text-white"
                          >
                            Launch Mission
                          </button>
                        </div>
                      )}
                      {mission.status === 'ACTIVE' && (
                        <div className="mt-6 flex justify-end">
                          <button 
                            onClick={() => completeMission(mission.id)}
                            className="glass-button px-6 py-2 text-sm font-bold bg-[var(--accent-green)] text-white border-0"
                          >
                            Complete & RTB
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Create & Map */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-8 bg-[var(--text-primary)] text-[var(--bg-primary)] shadow-2xl">
            <h2 className="text-xl font-bold mb-2 text-[var(--bg-primary)]">Initialize New Flight</h2>
            <p className="text-sm opacity-70 mb-6 font-medium">Generate a new routing protocol.</p>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <input
                type="text"
                placeholder="Mission Designation (e.g. Sector 7G Sweep)"
                value={newMissionName}
                onChange={(e) => setNewMissionName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border-0 text-[var(--text-primary)] outline-none focus:ring-4 focus:ring-[var(--accent-cyan)]/30 font-medium placeholder-[var(--text-muted)]"
                disabled={loading}
              />
              <button 
                type="submit"
                disabled={loading || !newMissionName.trim()}
                className="w-full py-3 rounded-xl bg-[var(--accent-cyan)] text-white font-bold hover:bg-blue-500 transition-colors disabled:opacity-50 flex justify-center items-center gap-2"
              >
                {loading ? <span className="animate-spin text-xl">↻</span> : "Generate Protocol"}
              </button>
            </form>
          </div>

          <div className="glass-panel flex-1 relative overflow-hidden flex items-center justify-center min-h-[300px]">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="absolute inset-0 flex items-center justify-center flex-col opacity-50">
              <span className="text-6xl mb-4">🗺️</span>
              <p className="font-mono text-xs font-bold tracking-widest uppercase">Map Module Offline</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
