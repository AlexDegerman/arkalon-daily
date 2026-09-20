import type { ResultMetricDefinition } from '@/types/puzzle'
import { formatElapsedMs } from '@/lib/format'

interface CategoryMetricsProps {
  metrics: ResultMetricDefinition[]
  values: Record<string, unknown>
}

function formatValue(
  value: unknown,
  format: ResultMetricDefinition['format']
): string {
  if (value === undefined || value === null) return '-'
  switch (format) {
    case 'percent':
      return `${Math.round(Number(value))}%`
    case 'integer':
      return String(Math.round(Number(value)))
    case 'time':
      return formatElapsedMs(Number(value))
    case 'string':
      return String(value)
    default:
      return String(value)
  }
}

export function CategoryMetrics({ metrics, values }: CategoryMetricsProps) {
  if (metrics.length === 0) return null

  return (
    <div className="w-full">
      <div className="divide-y divide-border-subtle">
        {metrics.map((metric) => (
          <div
            key={metric.key}
            className="flex items-center justify-between py-2"
          >
            <span className="text-xs uppercase tracking-wider text-text-muted">
              {metric.label}
            </span>
            <span className="font-mono text-sm font-medium text-text-primary">
              {formatValue(values[metric.key], metric.format)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
