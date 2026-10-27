"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AppSidebar } from "@/components/app/app-sidebar";
import { AppTopbar } from "@/components/app/app-topbar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    const hasParam = searchParams.get("embedded") === "true";
    const inIframe = typeof window !== "undefined" && window.self !== window.top;
    if (hasParam || inIframe) {
      setIsEmbedded(true);
    }
  }, [searchParams]);

  if (isEmbedded) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <AppSidebar />
        <div className="lg:pl-64">
          {/* Topbar suppressed in embedded mode to avoid duplicated headers */}
          <main className="min-h-screen">{children}</main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <AppSidebar />
      <div className="lg:pl-64">
        <AppTopbar />
        <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      </div>
    </div>
  );
}
