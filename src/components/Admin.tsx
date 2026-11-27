import { useRef } from 'react'
import { useT } from '../context'
import { demoTournament } from '../demo'
import { drawGroups, emptyTournament, makeGroups } from '../logic'
import { downloadJson, normalize } from '../store'
import type { Settings, Tournament } from '../types'

const BEST_OF = [1, 3, 5, 7]

interface Props {
  replace: (t: Tournament) => void
  discardDraft: () => void
  dirty: boolean
}

export function Admin({ replace, discardDraft, dirty }: Props) {
  const { t, update } = useT()
  const fileRef = useRef<HTMLInputElement>(null)
  const s = t.settings
  const qualified = t.groups.length * s.advancePerGroup
  const hasResults = t.matches.some((m) => m.games.length > 0)

  const setSetting = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    update((d) => ({ ...d, settings: { ...d.settings, [k]: v } }))

  const setGroupCount = (n: number) =>
    update((d) => {
      const groups = makeGroups(n, d.groups)
      // le squadre dei gironi rimossi tornano "senza girone"
      return { ...d, groups }
    }, true)

  const draw = () => {
    if (hasResults && !confirm('Ci sono già risultati inseriti. Rifare il sorteggio li cancellerà. Continuare?')) return
    update((d) => ({ ...d, groups: drawGroups(d.teams, d.groups), matches: d.matches.filter((m) => m.stage !== 'group') }), true)
  }

  const assign = (teamId: string, groupId: string) =>
    update((d) => {
      d.groups.forEach((g) => (g.teamIds = g.teamIds.filter((id) => id !== teamId)))
      d.groups.find((g) => g.id === groupId)?.teamIds.push(teamId)
      return d
    }, true)

  const onImport = async (file?: File) => {
    if (!file) return
    try {
      replace(normalize(JSON.parse(await file.text())))
    } catch {
      alert('File non valido')
    }
  }

  const groupOf = (id: string) => t.groups.find((g) => g.teamIds.includes(id))?.id ?? ''

  return (
    <div className="admin">
      <section className="card">
        <h2>Pubblicazione</h2>
        <p className="muted">
          Le modifiche che fai qui restano salvate <b>solo in questo browser</b> (bozza). Per renderle visibili a tutti,
          esporta il file e sostituisci <code>public/tournament.json</code> nel repository: il sito si aggiorna da solo.
        </p>
        <div className="row gap wrap">
          <button className="btn btn--primary" onClick={() => downloadJson(t)}>⬇ Esporta tournament.json</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>⬆ Importa JSON</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => onImport(e.target.files?.[0])} />
          <button className="btn btn--ghost" disabled={!dirty} onClick={() => confirm('Scartare la bozza e tornare ai dati pubblicati?') && discardDraft()}>
            Scarta bozza
          </button>
        </div>
        <p className="small">
          {dirty ? <span className="warn">● Bozza con modifiche non ancora pubblicate</span> : <span className="ok">● Bozza allineata ai dati pubblicati</span>}
        </p>
      </section>

      <section className="card">
        <h2>Torneo</h2>
        <div className="form-grid">
          <label className="field">
            <span>Nome</span>
            <input value={t.name} onChange={(e) => update((d) => ({ ...d, name: e.target.value }))} />
          </label>
          <label className="field">
            <span>Sottotitolo</span>
            <input value={t.subtitle} onChange={(e) => update((d) => ({ ...d, subtitle: e.target.value }))} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Formato</h2>
        <div className="form-grid">
          <label className="field">
            <span>Numero di gironi</span>
            <select value={t.groups.length} onChange={(e) => setGroupCount(Number(e.target.value))}>
              <option value={0}>—</option>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Qualificate per girone</span>
            <select value={s.advancePerGroup} onChange={(e) => setSetting('advancePerGroup', Number(e.target.value))}>
              {[1, 2, 3, 4, 8].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
          {(
            [
              ['groupBestOf', 'Gironi'],
              ['qfBestOf', 'Quarti'],
              ['sfBestOf', 'Semifinali'],
              ['finalBestOf', 'Finale'],
            ] as const
          ).map(([k, label]) => (
            <label key={k} className="field">
              <span>{label}: al meglio di</span>
              <select value={s[k]} onChange={(e) => setSetting(k, Number(e.target.value))}>
                {BEST_OF.map((n) => (
                  <option key={n} value={n}>BO{n}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        <p className={`small ${qualified === 8 ? 'ok' : 'warn'}`}>
          {t.groups.length} gironi × {s.advancePerGroup} qualificate = {qualified} squadre ai quarti
          {qualified !== 8 && ' — per i quarti servono esattamente 8 squadre (puoi comunque forzarle a mano nel tabellone)'}
        </p>
        <p className="muted small">Formati consigliati: 4 gironi × 2 (16 squadre) · 2 gironi × 4 · 8 gironi × 1.</p>
      </section>

      <section className="card">
        <div className="row between wrap gap">
          <h2>Composizione gironi</h2>
          <button className="btn btn--primary" disabled={!t.groups.length || !t.teams.length} onClick={draw}>
            🎲 Sorteggio casuale
          </button>
        </div>
        {t.teams.length === 0 ? (
          <p className="muted">Aggiungi prima le squadre nella scheda “Squadre”.</p>
        ) : !t.groups.length ? (
          <p className="muted">Scegli il numero di gironi qui sopra.</p>
        ) : (
          <div className="assign">
            {[...t.teams]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((team) => (
                <label key={team.id} className="assign__row">
                  <span>{team.name}</span>
                  <select value={groupOf(team.id)} onChange={(e) => assign(team.id, e.target.value)}>
                    <option value="">Nessun girone</option>
                    {t.groups.map((g) => (
                      <option key={g.id} value={g.id}>Girone {g.name}</option>
                    ))}
                  </select>
                </label>
              ))}
          </div>
        )}
        <p className="muted small">Il calendario all'italiana di ogni girone viene generato automaticamente.</p>
      </section>

      <section className="card danger-zone">
        <h2>Zona pericolosa</h2>
        <div className="row gap wrap">
          <button className="btn" onClick={() => confirm('Sostituire la bozza con un torneo demo (16 squadre)?') && replace(demoTournament())}>
            Carica dati demo
          </button>
          <button className="btn btn--danger" onClick={() => confirm('Cancellare tutto (squadre, gironi, risultati)?') && replace(emptyTournament())}>
            Azzera torneo
          </button>
        </div>
      </section>
    </div>
  )
}
