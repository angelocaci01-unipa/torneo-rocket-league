import { createContext, useContext } from 'react'
import type { Id, Team, Tournament } from './types'

export interface Ctx {
  t: Tournament
  admin: boolean
  update: (fn: (t: Tournament) => Tournament, regroup?: boolean) => void
}

export const TournamentCtx = createContext<Ctx | null>(null)

export function useT() {
  const c = useContext(TournamentCtx)
  if (!c) throw new Error('TournamentCtx mancante')
  return c
}

export function teamById(t: Tournament, id?: Id): Team | undefined {
  return id ? t.teams.find((x) => x.id === id) : undefined
}
