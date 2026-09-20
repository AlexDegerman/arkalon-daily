import type { PuzzleCategory } from '@/types/puzzle';

interface RecommendationEntry {
  appName: string;
  tagline: string;
  url: string;
}

// Static skill-matched recommendations - populated fully in Commit 7.4
const PLACEHOLDER_RECOMMENDATIONS: Partial<Record<PuzzleCategory, RecommendationEntry>> = {
  recall: {
    appName: 'ARKALON RAIDS',
    tagline: 'Tactical positioning and pattern reading.',
    url: 'https://arkalon.fi',
  },
};

interface NetworkRecommendationProps {
  category: PuzzleCategory;
}

export function NetworkRecommendation({ category }: NetworkRecommendationProps) {
  const rec = PLACEHOLDER_RECOMMENDATIONS[category];
  if (!rec) return null;

  return (
    <div className="w-full border-t border-border-subtle pt-6">
      <p className="mb-2 text-xs uppercase tracking-wider text-text-muted">
        Arkalon Network
      </p>
      <div className="rounded-xl border border-border-subtle bg-surface-panel p-4">
        <p className="mb-1 text-xs text-text-muted">
          Strong {category} performance. You may also enjoy:
        </p>
        <p className="mb-1 text-sm font-semibold text-text-primary">{rec.appName}</p>
        <p className="mb-3 text-xs text-text-muted">{rec.tagline}</p>
        <a
          href={rec.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-semibold text-accent-recall transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-accent-recall"
        >
          Explore Arkalon Network &rarr;
        </a>
      </div>
    </div>
  );
}