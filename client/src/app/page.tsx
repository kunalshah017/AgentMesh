"use client";

import { ChatPanel } from "@/components/ChatPanel";
import { ActivityFeed } from "@/components/ActivityFeed";
import { NetworkGraph } from "@/components/NetworkGraph";
import { Header } from "@/components/Header";
import { PaymentTicker } from "@/components/PaymentTicker";
import { useOrchestrator } from "@/hooks/useOrchestrator";

export default function Home() {
  const { status, events, sendGoal } = useOrchestrator();

  // Derive which nodes are currently active from recent events
  const activeNodes = new Set<string>();
  const recentEvents = events.slice(-10);
  for (const e of recentEvents) {
    if (e.type === "tool_called") {
      const tool = String(e.tool ?? "");
      if (tool.includes("researcher")) activeNodes.add("researcher");
      if (tool.includes("analyst")) activeNodes.add("risk-analyst");
      if (tool.includes("executor")) activeNodes.add("executor");
    }
  }
  if (events.some((e) => e.type === "task_created" && !events.some((e2) => e2.type === "task_completed"))) {
    activeNodes.add("orchestrator");
  }

  return (
    <div className="h-screen flex flex-col bg-neo-bg overflow-hidden">
      <Header status={status} eventCount={events.length} />
      <PaymentTicker events={events} />

      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-0 border-t-4 border-black min-h-0">
        {/* Chat Panel — Left */}
        <section className="md:col-span-5 border-r-0 md:border-r-4 border-black flex flex-col min-h-0">
          <ChatPanel events={events} onSendGoal={sendGoal} status={status} />
        </section>

        {/* Right Side — Network + Activity Feed */}
        <section className="md:col-span-7 flex flex-col min-h-0">
          {/* Network Graph — Top Right */}
          <div className="flex-1 border-b-4 border-black min-h-0 overflow-hidden">
            <NetworkGraph activeNodes={activeNodes} />
          </div>

          {/* Activity Feed — Bottom Right */}
          <div className="h-[280px] shrink-0 overflow-y-auto">
            <ActivityFeed events={events} />
          </div>
        </section>
      </main>
    </div>
  );
}
