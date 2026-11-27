import { drawGroups, makeGroups, syncGroupMatches, uid, emptyTournament } from './logic'
import type { Game, Tournament } from './types'

const NAMES = [
  'Aerial Bandits', 'Boost Brigade', 'Ceiling Shotters', 'Demo Kings', 'Flip Reset FC',
  'Kickoff Crew', 'Musty Flickers', 'Octane Ultras', 'Pinch Masters', 'Rotazione Zero',
  'Salvataggi Epici', 'Speedflip Squad', 'Turtle Power', 'Wavedash Wizards', 'Zero Second Goal',
  'Dribble Dynasty',
]

const rnd = (n: number) => Math.floor(Math.random() * n)

function randomSeries(bestOf: number): Game[] {
  const need = Math.floor(bestOf / 2) + 1
  const games: Game[] = []
  let wa = 0
  let wb = 0
  while (wa < need && wb < need) {
    const win = rnd(4) + 1
    const lose = rnd(win)
    if (Math.random() < 0.5) {
      games.push({ a: win, b: lose })
      wa++
    } else {
      games.push({ a: lose, b: win })
      wb++
    }
  }
  return games
}

/** Torneo demo: 16 squadre, 4 gironi, gironi quasi conclusi. */
export function demoTournament(): Tournament {
  const t = emptyTournament()
  t.teams = NAMES.map((name, i) => ({
    id: uid(),
    name,
    players: [`Player${i * 3 + 1}`, `Player${i * 3 + 2}`, `Player${i * 3 + 3}`],
  }))
  t.groups = drawGroups(t.teams, makeGroups(4))
  t.matches = syncGroupMatches(t)
  const gm = t.matches.filter((m) => m.stage === 'group')
  gm.slice(0, gm.length - 3).forEach((m) => (m.games = randomSeries(t.settings.groupBestOf)))
  return t
}
