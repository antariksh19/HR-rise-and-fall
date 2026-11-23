import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CornerMarks } from '@/components/ui/BroadcastPrimitives';

export default function NotFound() {
  return (
    <main className="broadcast-grain bg-telemetry-dots flex min-h-screen items-center justify-center bg-[#09090B] px-6 text-[#F4F2EC]">
      <div className="relative w-full max-w-lg border border-[#222226] bg-[#0D0D10] p-10 text-center">
        <CornerMarks />
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#FF2E17]">
          [ SIGNAL LOST // 404 ]
        </p>
        <h1 className="mt-3 font-display text-7xl font-extrabold uppercase leading-none">
          NO SIGNAL
        </h1>
        <p className="mt-4 text-sm text-[#A1A1AA]">
          The requested broadcast route does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center gap-2 bg-[#F4F2EC] px-6 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#09090B] transition-colors hover:bg-[#FF2E17] hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Return to Main Stage
        </Link>
      </div>
    </main>
  );
}