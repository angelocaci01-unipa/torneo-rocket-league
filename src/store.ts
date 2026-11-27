import { useCallback, useEffect, useState } from 'react'
import { emptyTournament, ensureKo, syncGroupMatches } from './logic'
import type { Tournament } from './types'

const DRAFT_KEY = 'rl-tournament-draft-v1'
const PUBLISHED_URL = './tournament.json'

export function normalize(raw: Partial<Tournament>): Tournament {
  const base = emptyTournament()
  const t: Tournament = {
    ...base,
    ...raw,
    settings: { ...base.settings, ...raw.settings },
    teams: raw.teams ?? [],
    groups: raw.groups ?? [],
    matches: raw.matches ?? [],
  }
  t.matches = ensureKo(t.matches.filter((m) => m.stage !== 'group')).concat(
    t.matches.filter((m) => m.stage === 'group'),
  )
  return t
}

const POLL_MS = 60_000

/** Scarica i dati pubblicati; null se la rete o il file non sono disponibili. */
async function fetchPublished(): Promise<Tournament | null> {
  try {
    const res = await fetch(`${PUBLISHED_URL}?t=${Date.now()}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(String(res.status))
    return normalize(await res.json())
  } catch {
    return null
  }
}

function loadDraft(): Tournament | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY)
    return raw ? normalize(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

export function isAdminUrl() {
  return new URLSearchParams(location.search).has('admin') || location.hash === '#admin'
}

export function useTournament(admin: boolean) {
  const [t, setT] = useState<Tournament | null>(null)
  const [published, setPublished] = useState<Tournament | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchPublished().then((fetched) => {
      if (cancelled) return
      const pub = fetched ?? emptyTournament()
      setPublished(pub)
      setT(admin ? (loadDraft() ?? pub) : pub)
      if (fetched) setLastSync(new Date())
    })
    return () => {
      cancelled = true
    }
  }, [admin])

  // Vista pubblica: ricontrolla periodicamente i dati pubblicati
  useEffect(() => {
    if (admin) return
    const refresh = async () => {
      const pub = await fetchPublished()
      if (!pub) return
      setLastSync(new Date())
      setPublished(pub)
      setT((cur) => (cur && cur.updatedAt === pub.updatedAt ? cur : pub))
    }
    const id = setInterval(refresh, POLL_MS)
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [admin])

  const update = useCallback((fn: (t: Tournament) => Tournament, regroup = false) => {
    setT((prev) => {
      if (!prev) return prev
      let next = fn(structuredClone(prev))
      if (regroup) next = { ...next, matches: syncGroupMatches(next) }
      next.updatedAt = new Date().toISOString()
      localStorage.setItem(DRAFT_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const replace = useCallback((next: Tournament) => {
    const n = normalize(next)
    localStorage.setItem(DRAFT_KEY, JSON.stringify(n))
    setT(n)
  }, [])

  const discardDraft = useCallback(() => {
    localStorage.removeItem(DRAFT_KEY)
    if (published) setT(published)
  }, [published])

  return { t, update, replace, discardDraft, published, lastSync }
}

export function downloadJson(t: Tournament) {
  const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'tournament.json'
  a.click()
  URL.revokeObjectURL(a.href)
}
