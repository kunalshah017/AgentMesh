interface ActivityFeedProps {
  events: Array<{ type: string; data: unknown; timestamp: number }>;
}

export function ActivityFeed({ events }: ActivityFeedProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b-3 border-[var(--fg)] bg-[var(--surface)]">
        <h2 className="text-sm font-black uppercase tracking-wider">
          ACTIVITY LOG
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {events.length === 0 ? (
          <p className="mono text-xs text-[var(--border-heavy)]">
            Waiting for agent activity...
          </p>
        ) : (
          events.map((event, i) => (
            <div
              key={i}
              className="flex items-start gap-3 mono text-xs border-l-4 border-[var(--accent)] pl-3 py-1"
            >
              <span className="text-[var(--border-heavy)] shrink-0">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <span className="text-[var(--accent)] font-bold uppercase shrink-0">
                {event.type}
              </span>
              <span className="text-[var(--fg)] truncate">
                {typeof event.data === "string"
                  ? event.data
                  : JSON.stringify(event.data)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
