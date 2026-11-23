export default function Loading() {
  return (
    <main className="broadcast-grain flex min-h-screen flex-col items-center justify-center bg-[#09090B] text-[#F4F2EC]">
      <div className="w-64 space-y-4">
        <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-[#8E8E93]">
          <span className="inline-flex items-center gap-2 text-[#FF2E17]">
            <span className="h-2 w-2 animate-ping bg-[#FF2E17]" />
            SYNCING FEED
          </span>
          <span>CH-01</span>
        </div>
        <div className="h-1 w-full overflow-hidden bg-[#1D1D22]">
          <div className="h-full w-1/2 animate-pulse bg-[#F4F2EC]" />
        </div>
      </div>
    </main>
  );
}