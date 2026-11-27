import { useEffect, useMemo, useState } from 'react'
import { Admin } from './components/Admin'
import { Bracket, ChampionBanner } from './components/Bracket'
import { Empty, Groups } from './components/Groups'
import { MatchCard } from './components/MatchCard'
import { Teams } from './components/Teams'
import { TournamentCtx, teamById, useT as useTournamentCtx } from './context'
import { bestOfFor, champion, isGroupComplete, matchTeams, seriesResult } from './logic'
import { isAdminUrl, useTournament } from './store'
import type { Match, Tournament } from './types'

type Tab = 'panoramica' | 'gironi' | 'finale' | 'squadre' | 'gestione'

const TABS: { id: Tab; label: string; admin?: boolean }[] = [
  { id: 'panoramica', label: 'Panoramica' },
  { id: 'gironi', label: 'Gironi' },
  { id: 'finale', label: 'Fase finale' },
  { id: 'squadre', label: 'Squadre' },
  { id: 'gestione', label: 'Gestione', admin: true },
]

const PHASES = ['Iscrizioni', 'Gironi', 'Quarti', 'Semifinali', 'Finale', 'Concluso'] as const

function currentPhase(t: Tournament): number {
  const done = (ids: string[]) =>
    ids.every((id) => {
      const m = t.matches.find((x) => x.id === id)
      return m && seriesResult(m.games, bestOfFor(m.stage, t.settings)).winner
    })
  if (!t.groups.some((g) => g.teamIds.length > 1)) return 0
  if (!t.groups.every((g) => g.teamIds.length < 2 || isGroupComplete(t, g))) return 1
  if (!done(['qf1', 'qf2', 'qf3', 'qf4'])) return 2
  if (!done(['sf1', 'sf2'])) return 3
  if (!done(['final'])) return 4
  return 5
}

const tabFromHash = (): Tab => {
  const h = location.hash.slice(1) as Tab
  return TABS.some((x) => x.id === h) ? h : 'panoramica'
}

export default function App() {
  const admin = useMemo(() => isAdminUrl(), [])
  const { t, update, replace, discardDraft, published } = useTournament(admin)
  const [tab, setTab] = useState<Tab>(tabFromHash)

  useEffect(() => {
    const on = () => setTab(tabFromHash())
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])

  useEffect(() => {
    if (t) document.title = `${t.name} · ${t.subtitle}`
  }, [t])

  if (!t) return <div className="loading">Caricamento…</div>

  const strip = (x: Tournament | null) => (x ? JSON.stringify({ ...x, updatedAt: '' }) : '')
  const dirty = admin && strip(t) !== strip(published)
  const phase = currentPhase(t)

  return (
    <TournamentCtx.Provider value={{ t, admin, update }}>
      {admin && (
        <div className="admin-bar">
          <span>🔧 Modalità organizzatore {dirty && <span className="warn">· modifiche non pubblicate</span>}</span>
          <a href={location.pathname}>Vista pubblica ↗</a>
        </div>
      )}
      <header className="hero">
        <div className="hero__inner">
          <div className="hero__kicker">{t.subtitle}</div>
          <h1>{t.name}</h1>
          <ol className="phases">
            {PHASES.map((p, i) => (
              <li key={p} className={i < phase ? 'past' : i === phase ? 'current' : ''}>
                {p}
              </li>
            ))}
          </ol>
        </div>
      </header>

      <nav className="tabs">
        {TABS.filter((x) => !x.admin || admin).map((x) => (
          <a key={x.id} href={`${admin ? '?admin' : ''}#${x.id}`} className={tab === x.id ? 'active' : ''}>
            {x.label}
          </a>
        ))}
      </nav>

      <main className="container">
        {tab === 'panoramica' && <Overview />}
        {tab === 'gironi' && <Groups />}
        {tab === 'finale' && <Bracket />}
        {tab === 'squadre' && <Teams />}
        {tab === 'gestione' && admin && <Admin replace={replace} discardDraft={discardDraft} dirty={dirty} />}
      </main>

      <footer className="footer">
        <span>
          Aggiornato il {new Date(t.updatedAt).toLocaleString('it-IT', { dateStyle: 'medium', timeStyle: 'short' })}
        </span>
        <span>
          <a href="https://www.intesauniversitaria.it/" target="_blank" rel="noreferrer">Intesa Universitaria</a>
          {!admin && (
            <>
              {' · '}
              <a href="?admin#gestione">Area organizzatori</a>
            </>
          )}
        </span>
      </footer>
    </TournamentCtx.Provider>
  )
}

function Overview() {
  const { t, admin } = useTournamentCtx()
  const champ = teamById(t, champion(t))
  const ready = (m: Match) => {
    const { a, b } = matchTeams(t, m)
    return a.teamId && b.teamId
  }
  const finished = (m: Match) => !!seriesResult(m.games, bestOfFor(m.stage, t.settings)).winner
  const order = (m: Match) => ['group', 'qf', 'sf', 'final'].indexOf(m.stage)
  const upcoming = t.matches.filter((m) => ready(m) && !finished(m)).sort((x, y) => order(x) - order(y)).slice(0, 6)
  const recent = t.matches.filter(finished).sort((x, y) => order(y) - order(x)).slice(0, 6)
  const total = t.matches.filter((m) => m.stage === 'group').length + 7
  const done = t.matches.filter(finished).length

  if (t.teams.length === 0)
    return (
      <Empty>
        Il torneo è in fase di organizzazione: le squadre saranno annunciate a breve.
        {admin && ' Inizia aggiungendo le squadre nella scheda “Squadre”.'}
      </Empty>
    )

  return (
    <div className="overview">
      {champ && <ChampionBanner name={champ.name} players={[...champ.players, champ.sub].filter(Boolean) as string[]} />}
      <div className="stats">
        <Stat value={t.teams.length} label="Squadre" />
        <Stat value={t.teams.length * 3} label="Giocatori" />
        <Stat value={t.groups.length} label="Gironi" />
        <Stat value={`${done}/${total}`} label="Serie giocate" />
      </div>
      <section>
        <h2 className="section-title">Prossime partite</h2>
        {upcoming.length ? (
          <div className="match-grid">
            {upcoming.map((m) => (
              <MatchCard key={m.id} match={m} title={labelFor(t, m)} />
            ))}
          </div>
        ) : (
          <p className="muted">Nessuna partita in programma.</p>
        )}
      </section>
      <section>
        <h2 className="section-title">Ultimi risultati</h2>
        {recent.length ? (
          <div className="match-grid">
            {recent.map((m) => (
              <MatchCard key={m.id} match={m} title={labelFor(t, m)} />
            ))}
          </div>
        ) : (
          <p className="muted">Ancora nessun risultato.</p>
        )}
      </section>
    </div>
  )
}

function labelFor(t: Tournament, m: Match) {
  if (m.stage === 'group') return `Girone ${t.groups.find((g) => g.id === m.groupId)?.name ?? ''}`
  return { qf: 'Quarti', sf: 'Semifinale', final: 'Finale' }[m.stage] + (m.id !== 'final' ? ` · ${m.id.toUpperCase()}` : '')
}

function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="card stat">
      <div className="stat__value">{value}</div>
      <div className="stat__label">{label}</div>
    </div>
  )
}

