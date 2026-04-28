"use client";

import { useState } from "react";
import { ChatPanel } from "@/components/ChatPanel";
import { ActivityFeed } from "@/components/ActivityFeed";
import { NetworkGraph } from "@/components/NetworkGraph";
import { Header } from "@/components/Header";

export default function Home() {
  const [events, setEvents] = useState<Array<{ type: string; data: unknown; timestamp: number }>>([]);

  const addEvent = (type: string, data: unknown) => {
    setEvents((prev) => [...prev, { type, data, timestamp: Date.now() }]);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 grid grid-cols-12 gap-0 border-t-3 border-[var(--fg)]">
        {/* Chat Panel — Left */}
        <section className="col-span-5 border-r-3 border-[var(--fg)] flex flex-col h-[calc(100vh-64px)]">
          <ChatPanel onEvent={addEvent} />
        </section>

        {/* Right Side — Activity Feed + Network */}
        <section className="col-span-7 flex flex-col h-[calc(100vh-64px)]">
          {/* Network Graph — Top Right */}
          <div className="flex-1 border-b-3 border-[var(--fg)]">
            <NetworkGraph />
          </div>

          {/* Activity Feed — Bottom Right */}
          <div className="h-[320px] overflow-y-auto">
            <ActivityFeed events={events} />
          </div>
        </section>
      </main>
    </div>
  );
}
