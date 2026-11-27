import { teamById, useT } from '../context'
import { champion } from '../logic'
import { MatchCard } from './MatchCard'

const COLUMNS = [
  { title: 'Quarti di finale', ids: ['qf1', 'qf2', 'qf3', 'qf4'], labels: ['QF1', 'QF2', 'QF3', 'QF4'] },
  { title: 'Semifinali', ids: ['sf1', 'sf2'], labels: ['SF1', 'SF2'] },
  { title: 'Finale', ids: ['final'], labels: ['Finale'] },
]

export function Bracket() {
  const { t } = useT()
  const champ = teamById(t, champion(t))
  return (
    <div>
      {champ && <ChampionBanner name={champ.name} players={[...champ.players, champ.sub].filter(Boolean) as string[]} />}
      <div className="bracket">
        {COLUMNS.map((col, ci) => (
          <div key={col.title} className={`bracket__col bracket__col--${ci}`}>
            <h3 className="bracket__title">{col.title}</h3>
            <div className="bracket__matches">
              {col.ids.map((id, i) => {
                const m = t.matches.find((x) => x.id === id)
                return m ? (
                  <div key={id} className="bracket__slot">
                    <MatchCard match={m} title={col.labels[i]} highlight={id === 'final'} />
                  </div>
                ) : null
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChampionBanner({ name, players }: { name: string; players: string[] }) {
  return (
    <div className="champion">
      <div className="champion__cup">🏆</div>
      <div>
        <div className="champion__label">Campioni del torneo</div>
        <div className="champion__name">{name}</div>
        <div className="muted">{players.join(' · ')}</div>
      </div>
    </div>
  )
}

export { ChampionBanner }
