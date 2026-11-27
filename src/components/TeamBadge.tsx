import type { Team } from '../types'

const PALETTE = [
  ['#1e73a8', '#4aa3dc'],
  ['#e07b2a', '#f2a35e'],
  ['#155a86', '#2f8cff'],
  ['#c4621a', '#ff9a4d'],
  ['#2a5f9e', '#6fb6ff'],
  ['#b85d1f', '#f7b27a'],
]

function hash(s: string) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0
  return Math.abs(h)
}

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

/** Avatar circolare con le iniziali della squadra, colore stabile derivato dal nome. */
export function TeamBadge({ team, size = 28 }: { team?: Team; size?: number }) {
  if (!team) return <span className="badge badge--empty" style={{ width: size, height: size }} />
  const [a, b] = PALETTE[hash(team.name) % PALETTE.length]
  return (
    <span
      className="badge"
      aria-hidden
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {initials(team.name)}
    </span>
  )
}
