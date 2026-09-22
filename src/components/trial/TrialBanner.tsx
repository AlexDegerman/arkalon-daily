// Persistent banner shown throughout a trial run.
// Always visible - player cannot miss that this is not the real attempt.
export function TrialBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 rounded-lg border border-[#F59E0B]/40 bg-[#F59E0B]/10 px-3 py-2"
    >
      <span className="text-xs font-semibold uppercase tracking-widest text-[#F59E0B]">
        Trial Run
      </span>
      <span className="text-xs text-text-muted">
        This does not count toward your daily challenge
      </span>
    </div>
  )
}
