export type Id = string

export interface Team {
  id: Id
  name: string
  /** 3 titolari */
  players: [string, string, string]
  /** riserva opzionale */
  sub?: string
}

export interface Group {
  id: Id
  name: string // "A", "B", ...
  teamIds: Id[]
}

/** Punteggio di una singola partita (gol). */
export interface Game {
  a: number
  b: number
}

export type Stage = 'group' | 'qf' | 'sf' | 'final'

export interface Match {
  id: Id
  stage: Stage
  groupId?: Id
  /** Per i gironi le squadre sono fisse; per la fase finale sono calcolate (vedi override). */
  teamA?: Id
  teamB?: Id
  /** Solo fase finale: forza manualmente una squadra nello slot. */
  overrideA?: Id
  overrideB?: Id
  games: Game[]
  /** Data/ora o nota libera, es. "Sab 14 dic · 18:00" */
  when?: string
}

export interface Settings {
  groupBestOf: number
  qfBestOf: number
  sfBestOf: number
  finalBestOf: number
  /** Quante squadre passano da ogni girone */
  advancePerGroup: number
}

export interface Tournament {
  name: string
  subtitle: string
  teams: Team[]
  groups: Group[]
  matches: Match[]
  settings: Settings
  updatedAt: string
}
