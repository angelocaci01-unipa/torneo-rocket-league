import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Admin } from './components/Admin'
import { Bracket, ChampionBanner } from './components/Bracket'
import { Empty, Groups } from './components/Groups'
import { MatchCard } from './components/MatchCard'
import { Teams } from './components/Teams'
import { TournamentCtx, teamById, useT } from './context'
import { bestOfFor, champion, isGroupComplete, matchTeams, seriesResult } from './logic'
import { isAdminUrl, useTournament } from './store'
import type { Match, Tournament } from './types'

const LOGO = './logo-intesa.png'
const SITE = 'https://www.intesauniversitaria.it/'

type Tab = 'panoramica' | 'gironi' | 'finale' | 'squadre' | 'gestione'

const ICONS: Record<Tab, ReactNode> = {
  panoramica: <path d="M3 12 12 4l9 8M5 10v10h5v-6h4v6h5V10" />,
  gironi: <path d="M4 5h16M4 10h16M4 15h10M4 20h7" />,
  finale: <path d="M4 4h4v6h4M4 20h4v-6h4m0-4v4m0-2h4m0-6h4v4h-4zm0 8h4v4h-4z" />,
  squadre: (
    <path d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a2.5 2.5 0 1 0 0-5M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5m2-5c2.4.3 4 2 4 5" />
  ),
  gestione: (
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14.5 3h-5l-.4 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2l.4 2.6h5l.4-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" />
  ),
}

const TABS: { id: Tab; label: string; short: string; admin?: boolean }[] = [
  { id: 'panoramica', label: 'Panoramica', short: 'Home' },
  { id: 'gironi', label: 'Gironi', short: 'Gironi' },
  { id: 'finale', label: 'Fase finale', short: 'Tabellone' },
  { id: 'squadre', label: 'Squadre', short: 'Squadre' },
  { id: 'gestione', label: 'Gestione', short: 'Gestione', admin: true },
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

function useNow(ms: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}

function relTime(d: Date | string, now: number) {
  const diff = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000))
  if (diff < 60) return 'adesso'
  if (diff < 3600) return `${Math.floor(diff / 60)} min fa`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h fa`
  return new Date(d).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

export default function App() {
  const admin = useMemo(() => isAdminUrl(), [])
  const { t, update, replace, discardDraft, published, lastSync } = useTournament(admin)
  const [tab, setTab] = useState<Tab>(tabFromHash)
  const now = useNow(30_000)

  useEffect(() => {
    const on = () => {
      setTab(tabFromHash())
      scrollTo({ top: 0, behavior: 'smooth' })
    }
    addEventListener('hashchange', on)
    return () => removeEventListener('hashchange', on)
  }, [])

  useEffect(() => {
    if (t) document.title = `${t.name} · ${t.subtitle}`
  }, [t])

  if (!t)
    return (
      <div className="loading">
        <img src={LOGO} alt="" width={72} height={72} />
        <span>Caricamento…</span>
      </div>
    )

  const strip = (x: Tournament | null) => (x ? JSON.stringify({ ...x, updatedAt: '' }) : '')
  const dirty = admin && strip(t) !== strip(published)
  const phase = currentPhase(t)
  const tabs = TABS.filter((x) => !x.admin || admin)
  const href = (id: Tab) => `${admin ? '?admin' : ''}#${id}`
  const live = phase > 0 && phase < 5

  return (
    <TournamentCtx.Provider value={{ t, admin, update }}>
      {admin && (
        <div className="admin-bar">
          <span>
            🔧 Modalità organizzatore{dirty && <span className="warn"> · modifiche non pubblicate</span>}
          </span>
          <a href={location.pathname}>Vista pubblica ↗</a>
        </div>
      )}

      <nav className="topbar">
        <div className="topbar__inner">
          <a className="topbar__brand" href={href('panoramica')}>
            <img src={LOGO} alt="Intesa Universitaria" width={34} height={34} />
            <span>{t.name}</span>
          </a>
          <div className="topbar__tabs">
            {tabs.map((x) => (
              <a key={x.id} href={href(x.id)} className={tab === x.id ? 'active' : ''}>
                {x.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="hero__field" aria-hidden />
        <div className="hero__inner">
          <img className="hero__logo" src={LOGO} alt="Logo Intesa Universitaria" width={132} height={132} />
          <div className="hero__text">
            <div className="hero__kicker">{t.subtitle} presenta</div>
            <h1>{t.name}</h1>
            <div className="hero__meta">
              <span className="meta-chip">🎮 3v3</span>
              {t.teams.length > 0 && <span className="meta-chip">{t.teams.length} squadre</span>}
              <span className="meta-chip">Gironi + Fase finale</span>
              {live && (
                <span className="meta-chip meta-chip--live">
                  <span className="pulse" /> In corso
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="hero__inner">
          <Stepper phase={phase} />
        </div>
      </header>

      <main className="container" key={tab}>
        {tab === 'panoramica' && <Overview />}
        {tab === 'gironi' && <Groups />}
        {tab === 'finale' && <Bracket />}
        {tab === 'squadre' && <Teams />}
        {tab === 'gestione' && admin && <Admin replace={replace} discardDraft={discardDraft} dirty={dirty} />}
      </main>

      <footer className="footer">
        <div className="footer__inner">
          <a className="footer__brand" href={SITE} target="_blank" rel="noreferrer">
            <img src={LOGO} alt="" width={44} height={44} />
            <span>
              <b>Intesa Universitaria</b>
              <small>I tuoi diritti, le nostre battaglie</small>
            </span>
          </a>
          <div className="footer__sync">
            {!admin && (
              <span className="sync">
                <span className="pulse pulse--sm" /> Aggiornamento automatico
                {lastSync && ` · controllato ${relTime(lastSync, now)}`}
              </span>
            )}
            <span>Risultati aggiornati {relTime(t.updatedAt, now)}</span>
          </div>
        </div>
      </footer>

      <nav className="bottombar" aria-label="Sezioni">
        {tabs.map((x) => (
          <a key={x.id} href={href(x.id)} className={tab === x.id ? 'active' : ''}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              {ICONS[x.id]}
            </svg>
            <span>{x.short}</span>
          </a>
        ))}
      </nav>
    </TournamentCtx.Provider>
  )
}

function Stepper({ phase }: { phase: number }) {
  return (
    <ol className="stepper" style={{ ['--progress' as string]: `${(phase / (PHASES.length - 1)) * 100}%` }}>
      {PHASES.map((p, i) => (
        <li key={p} className={i < phase ? 'past' : i === phase ? 'current' : ''}>
          <span className="stepper__dot">{i < phase ? '✓' : i === PHASES.length - 1 && i === phase ? '🏆' : i + 1}</span>
          <span className="stepper__label">{p}</span>
        </li>
      ))}
    </ol>
  )
}

function Overview() {
  const { t, admin } = useT()
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
  const goals = t.matches.reduce((s, m) => s + m.games.reduce((g, x) => g + x.a + x.b, 0), 0)

  if (t.teams.length === 0)
    return (
      <Empty>
        <img src={LOGO} alt="" width={64} height={64} className="empty__logo" />
        <h2>Il torneo sta per iniziare</h2>
        <p>Le squadre saranno annunciate a breve. Resta sintonizzato!</p>
        {admin && <p className="muted small">Inizia aggiungendo le squadre nella scheda “Squadre”.</p>}
      </Empty>
    )

  return (
    <div className="overview">
      {champ && <ChampionBanner name={champ.name} players={[...champ.players, champ.sub].filter(Boolean) as string[]} />}
      <div className="stats">
        <Stat value={t.teams.length} label="Squadre" accent="blue" />
        <Stat value={t.teams.length * 3} label="Giocatori" accent="orange" />
        <Stat value={`${done}/${total}`} label="Serie giocate" accent="blue" progress={total ? done / total : 0} />
        <Stat value={goals} label="Gol segnati" accent="orange" />
      </div>
      <section>
        <h2 className="section-title">
          <span className="section-title__bar" /> Prossime partite
        </h2>
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
        <h2 className="section-title">
          <span className="section-title__bar section-title__bar--orange" /> Ultimi risultati
        </h2>
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

function Stat(p: { value: ReactNode; label: string; accent: 'blue' | 'orange'; progress?: number }) {
  return (
    <div className={`card stat stat--${p.accent}`}>
      <div className="stat__value">{p.value}</div>
      <div className="stat__label">{p.label}</div>
      {p.progress !== undefined && (
        <div className="stat__progress">
          <span style={{ width: `${Math.round(p.progress * 100)}%` }} />
        </div>
      )}
    </div>
  )
}
