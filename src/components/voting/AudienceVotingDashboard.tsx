'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  ArrowUpRight,
  Search,
  ShieldCheck,
  User,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { useEventRealtime } from '@/hooks/useEventRealtime';
import {
  getDeviceFingerprint,
  getCrossBrowserHardwareSignature,
  getOrCreatePersistentDeviceId,
} from '@/lib/device/fingerprint';
import {
  LiveTimecode,
  AnimatedNumber,
  CornerMarks,
} from '@/components/ui/BroadcastPrimitives';
import type { EventRecord, TeamRecord } from '@/types/database';

interface Props {
  initialEvent: EventRecord;
  initialTeams: TeamRecord[];
}

function readVotedFlag(eventId: string): boolean {
  try {
    return localStorage.getItem(`hr_rf_voted_${eventId}`) === '1';
  } catch {
    return false;
  }
}

function writeVotedFlag(eventId: string, voted: boolean): void {
  try {
    const key = `hr_rf_voted_${eventId}`;
    if (voted) localStorage.setItem(key, '1');
    else localStorage.removeItem(key);
  } catch {
    // The server-side vote check remains authoritative when storage is unavailable.
  }
}

export function AudienceVotingDashboard({ initialEvent, initialTeams }: Props) {
  const { event, teams } = useEventRealtime(initialEvent, initialTeams);
  const [query, setQuery] = useState('');
  const [voterName, setVoterName] = useState('');
  const [voterContact, setVoterContact] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<TeamRecord | null>(null);
  const [checkingDevice, setCheckingDevice] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  const [fingerprint, setFingerprint] = useState('');
  const [hardwareSignature, setHardwareSignature] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isVotingLive = event?.status === 'voting_live';

  useEffect(() => {
    let active = true;

    async function verifyDevice() {
      try {
        const [localId, fp, hwSig] = await Promise.all([
          getOrCreatePersistentDeviceId(),
          getDeviceFingerprint(),
          getCrossBrowserHardwareSignature(),
        ]);
        if (!active) return;

        setDeviceId(localId);
        setFingerprint(fp);
        setHardwareSignature(hwSig);

        const res = await fetch(
          `/api/vote?eventId=${initialEvent.id}&deviceId=${encodeURIComponent(
            localId
          )}&fingerprint=${encodeURIComponent(fp)}&hardwareSignature=${encodeURIComponent(
            hwSig
          )}`,
          { cache: 'no-store' }
        );
        if (!res.ok) throw new Error('Unable to verify device eligibility.');
        const data = await res.json();
        if (!active) return;

        const voted = Boolean(data.hasVoted);
        setHasVoted(voted);
        writeVotedFlag(initialEvent.id, voted);
      } catch (verificationError) {
        if (!active) return;
        if (readVotedFlag(initialEvent.id)) {
          setHasVoted(true);
        } else {
          setError(
            verificationError instanceof Error
              ? verificationError.message
              : 'Unable to verify device eligibility. Please refresh and try again.'
          );
        }
      } finally {
        if (active) setCheckingDevice(false);
      }
    }

    verifyDevice();
    return () => {
      active = false;
    };
  }, [initialEvent.id, event?.status]);

  const filteredTeams = teams.filter(
    (t) =>
      t.team_name.toLowerCase().includes(query.trim().toLowerCase()) ||
      t.team_code.toLowerCase().includes(query.trim().toLowerCase())
  );

  async function handleConfirmVote(e: React.FormEvent) {
    e.preventDefault();
    const cleanedName = voterName.trim();
    const cleanedContact = voterContact.trim();

    if (cleanedName.length < 2) {
      toast.error('Please enter your full name.');
      return;
    }
    if (cleanedContact.length < 5) {
      toast.error('Please enter your phone number or email.');
      return;
    }
    if (
      !selectedTeam ||
      isSubmitting ||
      hasVoted ||
      !deviceId ||
      !fingerprint ||
      !hardwareSignature
    ) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetTeamId: selectedTeam.id,
          voterName: cleanedName,
          voterContact: cleanedContact,
          deviceId,
          fingerprint,
          hardwareSignature,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setHasVoted(true);
          writeVotedFlag(initialEvent.id, true);
          setSelectedTeam(null);
        }
        throw new Error(data.error || 'Failed to submit vote.');
      }

      setHasVoted(true);
      writeVotedFlag(initialEvent.id, true);
      setSelectedTeam(null);
      toast.success(`Thank you, ${cleanedName}! Your ballot is locked.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error submitting vote.';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="broadcast-grain stage-overhead-glow pb-safe min-h-dvh bg-[#09090B] text-[#F4F2EC]">
      {/* Sticky Broadcast Header */}
      <header className="pt-safe sticky top-0 z-30 border-b border-[#24242A] bg-[#09090B]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1440px] items-stretch justify-between">
          <div className="flex min-w-0 items-center gap-3 px-4 py-3.5 sm:gap-4 sm:px-8 sm:py-4">
            <Link
              href="/"
              className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#27272A] bg-[#0E0E12] text-[#A1A1AA] transition-colors active:border-[#F4F2EC] active:text-[#F4F2EC] sm:hover:border-[#F4F2EC] sm:hover:text-[#F4F2EC]"
              aria-label="Back to main stage"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <p className="flex items-center gap-2 truncate font-mono text-[10px] uppercase tracking-[0.18em] text-[#FF2E17] sm:text-[11px]">
                <span className="relative flex h-2 w-2 shrink-0">
                  {isVotingLive && (
                    <span className="absolute inline-flex h-full w-full animate-ping bg-[#FF2E17] opacity-75" />
                  )}
                  <span
                    className={`relative inline-flex h-2 w-2 ${
                      isVotingLive ? 'bg-[#FF2E17]' : 'bg-[#52525B]'
                    }`}
                  />
                </span>
                AUDIENCE BALLOT // 1 VOTE PER DEVICE
              </p>
              <h1 className="truncate font-display text-2xl font-extrabold uppercase leading-none tracking-tight sm:text-3xl">
                {event?.name ?? 'HR RISE & FALL'}
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-stretch">
            <div className="hidden items-center border-l border-[#24242A] px-5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#71717A] md:flex">
              <LiveTimecode />
            </div>

            <div className="flex items-center gap-2 border-l border-[#24242A] bg-[#0E0E12] px-4 font-mono text-xs uppercase tracking-[0.16em] sm:px-6">
              <span className="text-[#8E8E93]">VOTES</span>
              <span className="font-bold tabular-nums text-[#FF2E17]">
                <AnimatedNumber value={event?.valid_vote_count ?? 0} padZero />
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px]">
        {checkingDevice ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-[#8E8E93]">
            <Loader2 className="h-5 w-5 animate-spin text-[#FF2E17]" />
            <span>VERIFYING DEVICE ELIGIBILITY...</span>
          </div>
        ) : hasVoted ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-telemetry-dots relative mx-4 my-12 max-w-2xl border border-[#24242A] bg-[#0E0E12] p-8 text-center sm:mx-auto sm:my-24 sm:p-14"
          >
            <CornerMarks />
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center bg-[#F4F2EC] text-[#09090B]">
              <Check className="h-7 w-7 stroke-[3]" />
            </div>
            <p className="font-mono text-xs uppercase tracking-[0.26em] text-[#FF2E17]">
              DEVICE BALLOT LOCKED
            </p>
            <h2 className="mt-2 font-display text-5xl font-extrabold uppercase leading-none sm:text-6xl">
              YOUR VOTE IS COUNTED.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-[#A1A1AA]">
              Strictly one audience vote is permitted per device and attendee.
              Watch the live stage display for the Top Three Reveal.
            </p>
            <Link
              href="/"
              className="mt-8 inline-flex min-h-[50px] items-center justify-center gap-2 bg-[#F4F2EC] px-7 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#09090B] transition-colors active:bg-[#FF2E17] active:text-white sm:hover:bg-[#FF2E17] sm:hover:text-white"
            >
              Return to Live Stage
            </Link>
          </motion.div>
        ) : (
          <>
            {/* Editorial Instruction Banner */}
            <div className="flex flex-col justify-between gap-4 border-b border-[#24242A] px-4 py-6 sm:px-10 sm:py-10 md:flex-row md:items-end">
              <div>
                <p className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-[#FF2E17] sm:text-xs">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  OFFICIAL AUDIENCE BALLOT // {teams.length} TEAMS
                </p>
                <h2 className="mt-2 font-display text-4xl font-extrabold uppercase leading-[0.9] sm:text-6xl">
                  SELECT ONE TEAM TO RISE
                </h2>
              </div>
              {!isVotingLive && (
                <div className="border border-[#27272A] bg-[#141418] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#A1A1AA]">
                  {event?.status === 'not_started'
                    ? 'STANDBY — UNLOCKS AUTOMATICALLY WHEN VOTING OPENS'
                    : 'AUDIENCE VOTING IS CLOSED'}
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-center gap-3 border-b border-[#FF2E17] bg-[#FF2E17]/10 px-4 py-3.5 font-mono text-xs uppercase tracking-wider text-[#FF2E17] sm:px-10">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Instant Search Bar */}
            <div className="flex items-center gap-3 border-b border-[#24242A] bg-[#0E0E12] px-4 py-3.5 sm:px-10">
              <Search className="h-4 w-4 shrink-0 text-[#71717A]" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="SEARCH TEAM NAME..."
                className="w-full bg-transparent font-mono text-base uppercase tracking-[0.12em] text-[#F4F2EC] placeholder:text-[#52525B] focus:outline-none sm:text-xs"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="min-h-[44px] px-2 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8E8E93] active:text-[#F4F2EC]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Competing Teams Grid */}
            {filteredTeams.length === 0 ? (
              <div className="px-5 py-16 text-center font-mono text-xs uppercase tracking-[0.2em] text-[#52525B]">
                NO TEAMS MATCH &ldquo;{query}&rdquo;.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <AnimatePresence mode="popLayout">
                  {filteredTeams.map((team, idx) => {
                    const isSelected = selectedTeam?.id === team.id;
                    const serial = String(idx + 1).padStart(2, '0');

                    return (
                      <motion.button
                        key={team.id}
                        layout
                        type="button"
                        disabled={!isVotingLive || !deviceId || !fingerprint || !hardwareSignature}
                        onClick={() => setSelectedTeam(team)}
                        className={`group relative flex min-h-[140px] flex-col justify-between overflow-hidden border-b border-[#24242A] p-6 text-left transition-all duration-150 sm:min-h-[190px] sm:border-r sm:p-9 ${
                          isSelected
                            ? 'bg-[#FF2E17] text-white'
                            : isVotingLive
                              ? 'cursor-pointer bg-[#09090B] active:scale-[0.99] active:bg-[#F4F2EC] active:text-[#09090B] sm:hover:bg-[#F4F2EC] sm:hover:text-[#09090B]'
                              : 'cursor-not-allowed bg-[#09090B] opacity-45'
                        }`}
                      >
                        {isVotingLive && !isSelected && (
                          <span className="pointer-events-none absolute inset-y-0 left-0 w-1 origin-bottom scale-y-0 bg-[#FF2E17] transition-transform duration-200 group-hover:scale-y-100" />
                        )}

                        <div className="flex w-full items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em]">
                          <span className="opacity-60">NO. {serial}</span>
                          <span className="opacity-50">{team.team_code}</span>
                        </div>

                        <p className="mt-5 font-display text-4xl font-extrabold uppercase leading-none tracking-tight transition-transform duration-200 sm:mt-10 sm:text-5xl sm:group-hover:translate-x-1">
                          {team.team_name}
                        </p>

                        <div className="mt-5 flex w-full items-center justify-between border-t border-current/15 pt-3.5 font-mono text-[10px] uppercase tracking-[0.2em] opacity-80 sm:mt-8 sm:pt-4">
                          <span>{isVotingLive ? 'TAP TO VOTE' : 'VOTING LOCKED'}</span>
                          {isVotingLive && (
                            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </main>

      {/* One-Handed Bottom Sheet Confirmation */}
      <AnimatePresence>
        {selectedTeam && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && setSelectedTeam(null)}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-xs sm:items-center sm:p-4"
          >
            <motion.form
              onSubmit={handleConfirmVote}
              initial={{ y: '100%', opacity: 0.85 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0.85 }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              onClick={(e) => e.stopPropagation()}
              className="pb-safe relative w-full border-t border-[#F4F2EC] bg-[#09090B] p-6 sm:max-w-md sm:border sm:p-8"
            >
              <CornerMarks />
              <div className="mx-auto mb-5 h-1 w-10 bg-[#27272A] sm:hidden" />

              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#FF2E17]">
                FINAL AUDIENCE BALLOT
              </p>
              <h3 className="mt-2 font-display text-4xl font-extrabold uppercase leading-none">
                VOTE FOR {selectedTeam.team_name}?
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-[#A1A1AA] sm:text-sm">
                Strictly one vote per device &amp; attendee. Your phone/email is securely hashed and only used to prevent duplicate votes.
              </p>

              <div className="mt-5 space-y-4">
                <div className="space-y-1.5">
                  <label
                    htmlFor="audience-voter-name"
                    className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]"
                  >
                    <User className="h-3.5 w-3.5 text-[#FF2E17]" />
                    Your Full Name *
                  </label>
                  <input
                    id="audience-voter-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={60}
                    autoComplete="name"
                    enterKeyHint="next"
                    value={voterName}
                    onChange={(e) => setVoterName(e.target.value)}
                    placeholder="Enter your name"
                    className="min-h-[50px] w-full border border-[#27272A] bg-[#0E0E12] px-4 py-3 font-mono text-base text-[#F4F2EC] placeholder:text-[#52525B] focus:border-[#F4F2EC] focus:outline-none sm:text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="audience-voter-contact"
                    className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[#8E8E93]"
                  >
                    <Phone className="h-3.5 w-3.5 text-[#FF2E17]" />
                    Phone Number or Email *
                  </label>
                  <input
                    id="audience-voter-contact"
                    type="text"
                    required
                    minLength={5}
                    maxLength={100}
                    autoComplete="tel"
                    enterKeyHint="done"
                    value={voterContact}
                    onChange={(e) => setVoterContact(e.target.value)}
                    placeholder="9876543210 or you@email.com"
                    className="min-h-[50px] w-full border border-[#27272A] bg-[#0E0E12] px-4 py-3 font-mono text-base text-[#F4F2EC] placeholder:text-[#52525B] focus:border-[#F4F2EC] focus:outline-none sm:text-sm"
                  />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-3">
                <button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    !deviceId ||
                    !fingerprint ||
                    !hardwareSignature ||
                    voterName.trim().length < 2 ||
                    voterContact.trim().length < 5
                  }
                  className="order-1 flex min-h-[52px] items-center justify-center bg-[#FF2E17] px-4 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-white transition-all active:scale-[0.98] disabled:opacity-45 sm:order-2 sm:hover:bg-[#F4F2EC] sm:hover:text-[#09090B]"
                >
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirm Vote'}
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setSelectedTeam(null)}
                  className="order-2 min-h-[48px] border border-[#27272A] px-4 py-3.5 font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#F4F2EC] active:border-[#F4F2EC] sm:order-1 sm:hover:border-[#F4F2EC]"
                >
                  Cancel
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}