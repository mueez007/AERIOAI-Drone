"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import api from "@/lib/api";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    // Public routes that don't require authentication
    if (pathname === "/login" || pathname === "/") {
      setIsAuthorized(true);
      return;
    }

    // Check for auth token
    const token = api.getToken();
    if (!token) {
      router.push("/login");
    } else {
      setIsAuthorized(true);
    }
  }, [pathname, router]);

  // Don't render children until we've confirmed authorization to prevent flashes of content
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse-glow">
          <div className="w-16 h-16 border-4 border-[var(--border-color)] border-t-[var(--accent-cyan)] rounded-full animate-spin-slow"></div>
          <p className="font-mono text-sm text-[var(--accent-cyan)] tracking-widest">INITIALIZING SECURE UPLINK...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
