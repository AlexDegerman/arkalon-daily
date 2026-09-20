import type { ScoreBucket } from '@/app/actions/getYesterdayReview'

interface ScoreDistributionProps {
  buckets: ScoreBucket[]
}

export function ScoreDistribution({ buckets }: ScoreDistributionProps) {
  const maxPct = Math.max(...buckets.map((b) => b.pct), 1)

  return (
    <div className="flex flex-col gap-2" aria-label="Score distribution">
      {buckets.map((bucket) => (
        <div key={bucket.label} className="flex items-center gap-3">
          <span className="w-14 text-right font-mono text-xs text-text-muted">
            {bucket.label}
          </span>
          <div
            className="flex-1 overflow-hidden rounded-full bg-border-subtle"
            style={{ height: 8 }}
          >
            <div
              className="h-full rounded-full bg-accent-recall transition-all"
              style={{ width: `${(bucket.pct / maxPct) * 100}%` }}
              role="meter"
              aria-valuenow={bucket.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${bucket.label}: ${bucket.pct}%`}
            />
          </div>
          <span className="w-10 text-right font-mono text-xs text-text-muted">
            {bucket.pct}%
          </span>
        </div>
      ))}
    </div>
  )
}
