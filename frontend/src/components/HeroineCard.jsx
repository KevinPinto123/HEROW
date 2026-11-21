import { PORTALS } from '../data/heroines'

// Carta de heroína real: sprite, datos y biografía.
export default function HeroineCard({ heroine, selected, onSelect, compact = false }) {
  const portal = PORTALS[heroine.portal]
  const Tag = onSelect ? 'button' : 'div'
  return (
    <Tag
      className={`heroine-card ${selected ? 'selected' : ''} ${compact ? 'compact' : ''}`}
      style={{ '--aura': portal.color }}
      onClick={onSelect ? () => onSelect(heroine) : undefined}
      type={onSelect ? 'button' : undefined}
    >
      <div className="heroine-card-sprite">
        <img src={heroine.sprite} alt={heroine.name} className="pixel-img" loading="lazy" />
      </div>
      <div className="heroine-card-info">
        <div className="heroine-card-name">{heroine.name}</div>
        <div className="heroine-card-meta">
          {heroine.years ? `${heroine.years} · ` : ''}{heroine.country}
        </div>
        <div className="heroine-card-power">⚡ {heroine.power}</div>
        {!compact && <p className="heroine-card-bio">{heroine.bio}</p>}
      </div>
    </Tag>
  )
}
