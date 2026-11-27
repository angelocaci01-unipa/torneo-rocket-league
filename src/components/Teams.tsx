import { useState } from 'react'
import { useT } from '../context'
import { uid } from '../logic'
import type { Team } from '../types'
import { Empty } from './Groups'

export function Teams() {
  const { t, admin } = useT()
  const [editing, setEditing] = useState<string | null>(null)
  const groupOf = (id: string) => t.groups.find((g) => g.teamIds.includes(id))?.name

  return (
    <div>
      {admin && <TeamForm key="new" onDone={() => {}} />}
      {t.teams.length === 0 ? (
        <Empty>Nessuna squadra iscritta per ora.</Empty>
      ) : (
        <>
          <p className="muted small">{t.teams.length} squadre iscritte</p>
          <div className="team-grid">
            {[...t.teams]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((team) =>
                editing === team.id ? (
                  <TeamForm key={team.id} team={team} onDone={() => setEditing(null)} />
                ) : (
                  <div key={team.id} className="card team-card">
                    <div className="team-card__head">
                      <h3>{team.name}</h3>
                      {groupOf(team.id) && <span className="pill">Girone {groupOf(team.id)}</span>}
                    </div>
                    <ul className="players">
                      {team.players.map((p, i) => (
                        <li key={i}>{p || <span className="muted">—</span>}</li>
                      ))}
                      {team.sub && (
                        <li className="muted">
                          {team.sub} <span className="tag">Riserva</span>
                        </li>
                      )}
                    </ul>
                    {admin && (
                      <button className="btn btn--ghost btn--sm" onClick={() => setEditing(team.id)}>
                        Modifica
                      </button>
                    )}
                  </div>
                ),
              )}
          </div>
        </>
      )}
    </div>
  )
}

function TeamForm({ team, onDone }: { team?: Team; onDone: () => void }) {
  const { update } = useT()
  const [name, setName] = useState(team?.name ?? '')
  const [players, setPlayers] = useState<[string, string, string]>(team?.players ?? ['', '', ''])
  const [sub, setSub] = useState(team?.sub ?? '')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const data = {
      name: name.trim(),
      players: players.map((p) => p.trim()) as [string, string, string],
      sub: sub.trim() || undefined,
    }
    update((d) => {
      if (team) Object.assign(d.teams.find((x) => x.id === team.id)!, data)
      else d.teams.push({ id: uid(), ...data })
      return d
    })
    if (!team) {
      setName('')
      setPlayers(['', '', ''])
      setSub('')
    }
    onDone()
  }

  const remove = () => {
    if (!team || !confirm(`Eliminare “${team.name}”? I suoi risultati nei gironi verranno persi.`)) return
    update((d) => {
      d.teams = d.teams.filter((x) => x.id !== team.id)
      d.groups.forEach((g) => (g.teamIds = g.teamIds.filter((id) => id !== team.id)))
      d.matches.forEach((m) => {
        if (m.overrideA === team.id) m.overrideA = undefined
        if (m.overrideB === team.id) m.overrideB = undefined
      })
      return d
    }, true)
    onDone()
  }

  return (
    <form className={`card team-form ${team ? '' : 'team-form--new'}`} onSubmit={submit}>
      <h3>{team ? 'Modifica squadra' : 'Nuova squadra'}</h3>
      <div className="team-form__fields">
        <label className="field">
          <span>Nome squadra</span>
          <input value={name} required onChange={(e) => setName(e.target.value)} placeholder="es. Aerial Bandits" />
        </label>
        {players.map((p, i) => (
          <label key={i} className="field">
            <span>Giocatore {i + 1}</span>
            <input
              value={p}
              placeholder="Nickname / Epic ID"
              onChange={(e) => setPlayers((ps) => ps.map((x, k) => (k === i ? e.target.value : x)) as [string, string, string])}
            />
          </label>
        ))}
        <label className="field">
          <span>Riserva (opzionale)</span>
          <input value={sub} onChange={(e) => setSub(e.target.value)} />
        </label>
      </div>
      <div className="row gap">
        <button className="btn btn--primary btn--sm" type="submit">
          {team ? 'Salva' : 'Aggiungi squadra'}
        </button>
        {team && (
          <>
            <button className="btn btn--ghost btn--sm" type="button" onClick={onDone}>
              Annulla
            </button>
            <button className="btn btn--danger btn--sm" type="button" onClick={remove}>
              Elimina
            </button>
          </>
        )}
      </div>
    </form>
  )
}
