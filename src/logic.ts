import type { Game, Group, Id, Match, Settings, Stage, Team, Tournament } from './types'

export const uid = () => Math.random().toString(36).slice(2, 10)

export const GROUP_LETTERS = 'ABCDEFGHIJKLMNOP'

export const KO_IDS = ['qf1', 'qf2', 'qf3', 'qf4', 'sf1', 'sf2', 'final'] as const
export type KoId = (typeof KO_IDS)[number]

export const STAGE_LABEL: Record<Stage, string> = {
  group: 'Gironi',
  qf: 'Quarti di finale',
  sf: 'Semifinali',
  final: 'Finale',
}

export function bestOfFor(stage: Stage, s: Settings): number {
  switch (stage) {
    case 'group':
      return s.groupBestOf
    case 'qf':
      return s.qfBestOf
    case 'sf':
      return s.sfBestOf
    case 'final':
      return s.finalBestOf
  }
}

export interface SeriesResult {
  winsA: number
  winsB: number
  goalsA: number
  goalsB: number
  winner: 'a' | 'b' | null
  played: boolean
}

export function seriesResult(games: Game[], bestOf: number): SeriesResult {
  const need = Math.floor(bestOf / 2) + 1
  let winsA = 0
  let winsB = 0
  let goalsA = 0
  let goalsB = 0
  for (const g of games) {
    goalsA += g.a
    goalsB += g.b
    if (g.a > g.b) winsA++
    else if (g.b > g.a) winsB++
  }
  const winner = winsA >= need ? 'a' : winsB >= need ? 'b' : null
  return { winsA, winsB, goalsA, goalsB, winner, played: games.length > 0 }
}

/** Calendario all'italiana (metodo del cerchio). Ritorna le coppie in ordine di giornata. */
export function roundRobin(ids: Id[]): [Id, Id][] {
  if (ids.length < 2) return []
  const list: (Id | null)[] = [...ids]
  if (list.length % 2) list.push(null)
  const n = list.length
  const pairs: [Id, Id][] = []
  for (let r = 0; r < n - 1; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = list[i]
      const b = list[n - 1 - i]
      if (a && b) pairs.push(r % 2 ? [b, a] : [a, b])
    }
    list.splice(1, 0, list.pop()!)
  }
  return pairs
}

/** Rigenera le partite dei gironi mantenendo i risultati già inseriti per le coppie esistenti. */
export function syncGroupMatches(t: Tournament): Match[] {
  const ko = t.matches.filter((m) => m.stage !== 'group')
  const old = t.matches.filter((m) => m.stage === 'group')
  const key = (a: Id, b: Id) => [a, b].sort().join('|')
  const byPair = new Map(old.map((m) => [key(m.teamA!, m.teamB!), m]))
  const groupMatches: Match[] = []
  for (const g of t.groups) {
    for (const [a, b] of roundRobin(g.teamIds)) {
      const prev = byPair.get(key(a, b))
      groupMatches.push(
        prev
          ? { ...prev, groupId: g.id }
          : { id: uid(), stage: 'group', groupId: g.id, teamA: a, teamB: b, games: [] },
      )
    }
  }
  return [...groupMatches, ...ensureKo(ko)]
}

export function ensureKo(ko: Match[]): Match[] {
  return KO_IDS.map((id) => {
    const existing = ko.find((m) => m.id === id)
    const stage: Stage = id.startsWith('qf') ? 'qf' : id.startsWith('sf') ? 'sf' : 'final'
    return existing ?? { id, stage, games: [] }
  })
}

export interface StandingRow {
  teamId: Id
  played: number
  w: number
  l: number
  gw: number // partite (game) vinte
  gl: number
  gf: number // gol fatti
  ga: number
}

export function groupMatches(t: Tournament, groupId: Id) {
  return t.matches.filter((m) => m.stage === 'group' && m.groupId === groupId)
}

export function isGroupComplete(t: Tournament, g: Group): boolean {
  const ms = groupMatches(t, g.id)
  return ms.length > 0 && ms.every((m) => seriesResult(m.games, t.settings.groupBestOf).winner)
}

export function standings(t: Tournament, g: Group): StandingRow[] {
  const rows = new Map<Id, StandingRow>(
    g.teamIds.map((id) => [id, { teamId: id, played: 0, w: 0, l: 0, gw: 0, gl: 0, gf: 0, ga: 0 }]),
  )
  const ms = groupMatches(t, g.id)
  const h2h = new Map<string, Id>()
  for (const m of ms) {
    const r = seriesResult(m.games, t.settings.groupBestOf)
    const A = rows.get(m.teamA!)
    const B = rows.get(m.teamB!)
    if (!A || !B || !r.played) continue
    A.gw += r.winsA
    A.gl += r.winsB
    B.gw += r.winsB
    B.gl += r.winsA
    A.gf += r.goalsA
    A.ga += r.goalsB
    B.gf += r.goalsB
    B.ga += r.goalsA
    if (r.winner) {
      A.played++
      B.played++
      const [win, lose] = r.winner === 'a' ? [A, B] : [B, A]
      win.w++
      lose.l++
      h2h.set([m.teamA, m.teamB].sort().join('|'), win.teamId)
    }
  }
  const name = (id: Id) => t.teams.find((x) => x.id === id)?.name ?? ''
  return [...rows.values()].sort(
    (x, y) =>
      y.w - x.w ||
      y.gw - y.gl - (x.gw - x.gl) ||
      y.gf - y.ga - (x.gf - x.ga) ||
      y.gf - x.gf ||
      (h2h.get([x.teamId, y.teamId].sort().join('|')) === x.teamId ? -1 : 0) ||
      (h2h.get([x.teamId, y.teamId].sort().join('|')) === y.teamId ? 1 : 0) ||
      name(x.teamId).localeCompare(name(y.teamId)),
  )
}

/** Slot di qualificazione: posizione (0-based) nel girone di indice groupIndex. */
interface Seed {
  group: number
  pos: number
}

/** Accoppiamenti dei quarti in base a numero gironi e qualificate per girone. */
export function qfSeeds(numGroups: number, perGroup: number): [Seed, Seed][] {
  const s = (group: number, pos: number): Seed => ({ group, pos })
  if (numGroups === 4 && perGroup === 2)
    return [
      [s(0, 0), s(1, 1)],
      [s(2, 0), s(3, 1)],
      [s(1, 0), s(0, 1)],
      [s(3, 0), s(2, 1)],
    ]
  if (numGroups === 2 && perGroup === 4)
    return [
      [s(0, 0), s(1, 3)],
      [s(1, 1), s(0, 2)],
      [s(1, 0), s(0, 3)],
      [s(0, 1), s(1, 2)],
    ]
  if (numGroups === 8 && perGroup === 1)
    return [
      [s(0, 0), s(1, 0)],
      [s(2, 0), s(3, 0)],
      [s(4, 0), s(5, 0)],
      [s(6, 0), s(7, 0)],
    ]
  // Generico: ordina per posizione poi girone, poi 1-8, 4-5, 2-7, 3-6
  const list: Seed[] = []
  for (let p = 0; p < perGroup; p++) for (let g = 0; g < numGroups; g++) list.push(s(g, p))
  const at = (i: number) => list[i] ?? s(-1, -1)
  return [
    [at(0), at(7)],
    [at(3), at(4)],
    [at(1), at(6)],
    [at(2), at(5)],
  ]
}

export interface Slot {
  teamId?: Id
  label: string
  manual?: boolean
}

function seedSlot(t: Tournament, seed: Seed): Slot {
  const g = t.groups[seed.group]
  if (!g) return { label: 'Da definire' }
  const label = `${seed.pos + 1}° Girone ${g.name}`
  if (!isGroupComplete(t, g)) return { label }
  const row = standings(t, g)[seed.pos]
  return { label, teamId: row?.teamId }
}

function winnerSlot(t: Tournament, fromId: KoId, label: string): Slot {
  const m = t.matches.find((x) => x.id === fromId)
  if (!m) return { label }
  const { a, b } = resolveKo(t, fromId)
  const r = seriesResult(m.games, bestOfFor(m.stage, t.settings))
  const teamId = r.winner === 'a' ? a.teamId : r.winner === 'b' ? b.teamId : undefined
  return { label, teamId }
}

export function resolveKo(t: Tournament, id: KoId): { a: Slot; b: Slot } {
  const m = t.matches.find((x) => x.id === id)
  let a: Slot
  let b: Slot
  if (id.startsWith('qf')) {
    const idx = Number(id.slice(2)) - 1
    const pair = qfSeeds(t.groups.length, t.settings.advancePerGroup)[idx]
    a = seedSlot(t, pair[0])
    b = seedSlot(t, pair[1])
  } else if (id === 'sf1') {
    a = winnerSlot(t, 'qf1', 'Vincente QF1')
    b = winnerSlot(t, 'qf2', 'Vincente QF2')
  } else if (id === 'sf2') {
    a = winnerSlot(t, 'qf3', 'Vincente QF3')
    b = winnerSlot(t, 'qf4', 'Vincente QF4')
  } else {
    a = winnerSlot(t, 'sf1', 'Vincente SF1')
    b = winnerSlot(t, 'sf2', 'Vincente SF2')
  }
  if (m?.overrideA) a = { ...a, teamId: m.overrideA, manual: true }
  if (m?.overrideB) b = { ...b, teamId: m.overrideB, manual: true }
  return { a, b }
}

export function champion(t: Tournament): Id | undefined {
  return winnerSlot(t, 'final', '').teamId
}

/** Squadre del match (gironi o fase finale). */
export function matchTeams(t: Tournament, m: Match): { a: Slot; b: Slot } {
  if (m.stage === 'group')
    return { a: { teamId: m.teamA, label: '' }, b: { teamId: m.teamB, label: '' } }
  return resolveKo(t, m.id as KoId)
}

export function emptyTournament(): Tournament {
  return {
    name: 'Torneo Rocket League',
    subtitle: 'Intesa Universitaria',
    teams: [],
    groups: [],
    matches: ensureKo([]),
    settings: { groupBestOf: 3, qfBestOf: 5, sfBestOf: 5, finalBestOf: 7, advancePerGroup: 2 },
    updatedAt: new Date().toISOString(),
  }
}

export function makeGroups(count: number, existing: Group[] = []): Group[] {
  return Array.from({ length: count }, (_, i) => ({
    id: existing[i]?.id ?? uid(),
    name: GROUP_LETTERS[i],
    teamIds: existing[i]?.teamIds ?? [],
  }))
}

/** Sorteggio casuale e bilanciato delle squadre nei gironi. */
export function drawGroups(teams: Team[], groups: Group[]): Group[] {
  const ids = teams.map((t) => t.id)
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
  }
  const out = groups.map((g) => ({ ...g, teamIds: [] as Id[] }))
  ids.forEach((id, i) => out[i % out.length].teamIds.push(id))
  return out
}
