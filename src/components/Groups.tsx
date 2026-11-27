import { teamById, useT } from '../context'
import { groupMatches, isGroupComplete, standings } from '../logic'
import { MatchCard } from './MatchCard'

export function Groups() {
  const { t, admin } = useT()
  if (t.groups.length === 0 || t.groups.every((g) => g.teamIds.length === 0))
    return (
      <Empty>
        I gironi non sono ancora stati sorteggiati.
        {admin && ' Vai su “Gestione” per crearli.'}
      </Empty>
    )

  return (
    <div className="groups">
      {t.groups.map((g) => {
        const rows = standings(t, g)
        const ms = groupMatches(t, g.id)
        const done = isGroupComplete(t, g)
        const playedCount = ms.filter((m) => m.games.length > 0).length
        return (
          <section key={g.id} className="card group">
            <header className="group__head">
              <h2>Girone {g.name}</h2>
              <span className={`pill ${done ? 'pill--ok' : ''}`}>
                {done ? 'Concluso' : `${playedCount}/${ms.length} partite`}
              </span>
            </header>
            <div className="table-wrap">
              <table className="standings">
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="left">Squadra</th>
                    <th title="Serie giocate">G</th>
                    <th title="Serie vinte">V</th>
                    <th title="Serie perse">P</th>
                    <th title="Differenza partite (game)">±Game</th>
                    <th title="Differenza reti">±Gol</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const q = i < t.settings.advancePerGroup
                    const gd = r.gw - r.gl
                    const gold = r.gf - r.ga
                    return (
                      <tr key={r.teamId} className={q ? 'qualified' : ''}>
                        <td>{i + 1}</td>
                        <td className="left strong">{teamById(t, r.teamId)?.name}</td>
                        <td>{r.played}</td>
                        <td className="strong">{r.w}</td>
                        <td>{r.l}</td>
                        <td>{gd > 0 ? `+${gd}` : gd}</td>
                        <td>{gold > 0 ? `+${gold}` : gold}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <p className="muted small legend">
              <span className="dot" /> Le prime {t.settings.advancePerGroup} accedono ai quarti · Ordine: vittorie,
              differenza game, differenza reti, gol fatti, scontro diretto
            </p>
            <div className="match-grid">
              {ms.map((m, i) => (
                <MatchCard key={m.id} match={m} title={`Match ${i + 1}`} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="card empty">{children}</div>
}
