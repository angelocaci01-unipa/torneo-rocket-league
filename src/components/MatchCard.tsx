import { useState } from 'react'
import { teamById, useT } from '../context'
import { bestOfFor, matchTeams, seriesResult, type Slot } from '../logic'
import type { Game, Match } from '../types'
import { TeamBadge } from './TeamBadge'

interface Props {
  match: Match
  title?: string
  highlight?: boolean
}

export function MatchCard({ match, title, highlight }: Props) {
  const { t, admin } = useT()
  const [editing, setEditing] = useState(false)
  const bestOf = bestOfFor(match.stage, t.settings)
  const { a, b } = matchTeams(t, match)
  const r = seriesResult(match.games, bestOf)
  const ready = !!a.teamId && !!b.teamId

  return (
    <div className={`match ${highlight ? 'match--hl' : ''} ${r.winner ? 'match--done' : ''}`}>
      <div className="match__head">
        <span>{title}</span>
        <span className="muted">
          {match.when ? `${match.when} · ` : ''}BO{bestOf}
        </span>
      </div>
      <TeamRow slot={a} side="blue" wins={r.winsA} isWinner={r.winner === 'a'} isLoser={r.winner === 'b'} played={r.played} />
      <TeamRow slot={b} side="orange" wins={r.winsB} isWinner={r.winner === 'b'} isLoser={r.winner === 'a'} played={r.played} />
      {match.games.length > 0 && (
        <div className="match__games">
          {match.games.map((g, i) => (
            <span key={i} className="chip" title={`Partita ${i + 1}`}>
              <b className={g.a > g.b ? 'blue' : ''}>{g.a}</b>–<b className={g.b > g.a ? 'orange' : ''}>{g.b}</b>
            </span>
          ))}
        </div>
      )}
      {admin && !editing && (
        <button className="btn btn--ghost btn--sm match__edit" onClick={() => setEditing(true)}>
          {ready ? 'Inserisci risultato' : 'Modifica'}
        </button>
      )}
      {admin && editing && <MatchEditor match={match} bestOf={bestOf} onClose={() => setEditing(false)} />}
    </div>
  )
}

function TeamRow(p: { slot: Slot; side: 'blue' | 'orange'; wins: number; isWinner: boolean; isLoser: boolean; played: boolean }) {
  const { t } = useT()
  const team = teamById(t, p.slot.teamId)
  return (
    <div className={`team-row team-row--${p.side} ${p.isWinner ? 'win' : ''} ${p.isLoser ? 'lose' : ''}`}>
      <span className="team-row__bar" />
      <TeamBadge team={team} size={26} />
      <span className="team-row__name">
        {team ? team.name : <span className="muted">{p.slot.label || 'Da definire'}</span>}
        {p.slot.manual && <span className="tag" title="Assegnata manualmente">M</span>}
      </span>
      <span className="team-row__score">{p.played ? p.wins : '–'}</span>
    </div>
  )
}

function MatchEditor({ match, bestOf, onClose }: { match: Match; bestOf: number; onClose: () => void }) {
  const { t, update } = useT()
  const [rows, setRows] = useState<[string, string][]>(() =>
    Array.from({ length: bestOf }, (_, i) => {
      const g = match.games[i]
      return g ? [String(g.a), String(g.b)] : ['', '']
    }),
  )
  const [when, setWhen] = useState(match.when ?? '')
  const [ovA, setOvA] = useState(match.overrideA ?? '')
  const [ovB, setOvB] = useState(match.overrideB ?? '')
  const isKo = match.stage !== 'group'

  const games: Game[] = rows
    .filter(([x, y]) => x !== '' && y !== '')
    .map(([x, y]) => ({ a: Math.max(0, Number(x) || 0), b: Math.max(0, Number(y) || 0) }))
  const preview = seriesResult(games, bestOf)
  const hasTie = games.some((g) => g.a === g.b)
  const need = Math.floor(bestOf / 2) + 1
  const extra = Math.max(preview.winsA, preview.winsB) > need || (preview.winner && games.length > preview.winsA + preview.winsB)

  const save = () => {
    update((d) => {
      const m = d.matches.find((x) => x.id === match.id)!
      m.games = games
      m.when = when.trim() || undefined
      if (isKo) {
        m.overrideA = ovA || undefined
        m.overrideB = ovB || undefined
      }
      return d
    })
    onClose()
  }

  const set = (i: number, j: 0 | 1, v: string) =>
    setRows((rs) => rs.map((r, k) => (k === i ? (j === 0 ? [v, r[1]] : [r[0], v]) : r)) as [string, string][])

  const sortedTeams = [...t.teams].sort((x, y) => x.name.localeCompare(y.name))

  return (
    <div className="editor">
      <div className="editor__games">
        {rows.map((r, i) => (
          <div key={i} className="editor__game">
            <span className="muted">G{i + 1}</span>
            <input className="blue" inputMode="numeric" type="number" min={0} value={r[0]} onChange={(e) => set(i, 0, e.target.value)} />
            <span>–</span>
            <input className="orange" inputMode="numeric" type="number" min={0} value={r[1]} onChange={(e) => set(i, 1, e.target.value)} />
          </div>
        ))}
      </div>
      <p className="muted small">
        Serie: {preview.winsA}–{preview.winsB}
        {preview.winner ? ' · conclusa' : ' · in corso'}
        {hasTie && <span className="warn"> · in Rocket League non esistono pareggi (overtime!)</span>}
        {extra && <span className="warn"> · ci sono partite oltre la fine della serie</span>}
      </p>
      <label className="field">
        <span>Data / ora</span>
        <input value={when} placeholder="es. Sab 14 dic · 18:00" onChange={(e) => setWhen(e.target.value)} />
      </label>
      {isKo && (
        <div className="editor__override">
          <label className="field">
            <span>Forza squadra 1</span>
            <select value={ovA} onChange={(e) => setOvA(e.target.value)}>
              <option value="">Automatico</option>
              {sortedTeams.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Forza squadra 2</span>
            <select value={ovB} onChange={(e) => setOvB(e.target.value)}>
              <option value="">Automatico</option>
              {sortedTeams.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="row gap">
        <button className="btn btn--primary btn--sm" onClick={save}>Salva</button>
        <button className="btn btn--ghost btn--sm" onClick={() => setRows(rows.map(() => ['', '']))}>Svuota</button>
        <button className="btn btn--ghost btn--sm" onClick={onClose}>Annulla</button>
      </div>
    </div>
  )
}
