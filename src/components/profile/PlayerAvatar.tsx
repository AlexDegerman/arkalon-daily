// Deterministic default avatar: gradient hues derive from the immutable
// coreId, initials from the current procedural nickname. No stored asset.
interface PlayerAvatarProps {
  playerId: string
  displayName: string
}

function fnvHash(value: string): number {
  let h = 2166136261
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h >>> 0
}

export function PlayerAvatar({ playerId, displayName }: PlayerAvatarProps) {
  const h = fnvHash(playerId)
  const hue = h % 360
  const hue2 = (hue + 50 + ((h >> 8) % 60)) % 360
  // CamelCase nickname -> first two capitals: AncientGoldTurtle -> "AG"
  const caps = displayName.match(/[A-Z]/g) ?? []
  const initials = (
    caps.slice(0, 2).join('') || displayName.slice(0, 2)
  ).toUpperCase()
  return (
    <div
      aria-hidden="true"
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-mono text-sm font-black text-bg-base"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 80% 60%), hsl(${hue2} 80% 45%))`,
        boxShadow: `0 0 10px hsl(${hue} 80% 60% / 0.35)`
      }}
    >
      {initials}
    </div>
  )
}
