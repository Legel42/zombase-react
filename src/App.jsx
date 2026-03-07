import { useRef, useEffect, useState, useCallback } from 'react'
import { state, initCanvas, resize, startGame, retryWithSamePlayer, update, draw, setSelectedSlot, WEAPON_DEFS, BASE_DMG_ZOMBIE } from './engine'

function HpBar({ hp, maxHp }) {
  const pct = Math.max(0, hp / maxHp * 100)
  const level = pct > 50 ? 'high' : pct > 25 ? 'mid' : 'low'
  return (
    <div className="hp-bar-wrap">
      <div className={`hp-bar-fill ${level}`} style={{ width: pct + '%' }} />
      <div className="hp-text">PV {hp}/{maxHp}</div>
    </div>
  )
}

function XpBar({ player }) {
  const pct = (player.xp / 100) * 100
  return (
    <div className="xp-bar-wrap">
      <div className="xp-bar-fill" style={{ width: pct + '%' }} />
      <div className="xp-text">XP {player.xp}/100</div>
    </div>
  )
}

function LevelBadge({ level }) {
  return <span className="level-badge">Nv.{level}</span>
}

function KillBadge({ kills }) {
  return <span className="kill-badge">{kills}</span>
}

function StatsBar({ player, mapCount }) {
  return (
    <div className="stats-bar">
      <div className="stat-item"><span className="stat-label">ATK</span><span className="stat-val">{player.atk}</span></div>
      <div className="stat-item"><span className="stat-label">ARM</span><span className="stat-val">{player.armor}</span></div>
      <div className="stat-item"><span className="stat-label">PRE</span><span className="stat-val">{player.precision}</span></div>
      <div className="stat-item"><span className="stat-label">VIT</span><span className="stat-val">{player.speed}</span></div>
      <span className="map-badge">Map #{mapCount + 1}</span>
    </div>
  )
}

function SlowIndicator({ player }) {
  if (!player.isAttacking && player.hitSlowTimer <= 0 && player.postAttackSlow <= 0) return null
  return <div className="slow-indicator"><span className="slow-tag">Ralenti</span></div>
}

function BatIcon() {
  return <svg viewBox="0 0 28 28"><rect x="3" y="12" width="16" height="3" rx="1" fill="#888"/><rect x="16" y="10" width="6" height="7" rx="1" fill="#aaa"/></svg>
}
function GunIcon() {
  return <svg viewBox="0 0 28 28"><rect x="2" y="12" width="16" height="4" rx="1" fill="#2a2a2a"/><rect x="0" y="10" width="6" height="6" rx="1" fill="#1a1a1a"/><rect x="16" y="13" width="4" height="2" fill="#333"/></svg>
}
function ShotgunIcon() {
  return <svg viewBox="0 0 28 28"><rect x="2" y="11" width="18" height="4" rx="1" fill="#3a2a1a"/><rect x="0" y="10" width="5" height="6" rx="1" fill="#1a1a1a"/><rect x="18" y="10.5" width="4" height="5" rx="1" fill="#2a2a2a"/></svg>
}
function SmgIcon() {
  return <svg viewBox="0 0 28 28"><rect x="4" y="12" width="14" height="3" rx="1" fill="#222"/><rect x="2" y="10.5" width="5" height="5" rx="1" fill="#1a1a1a"/><rect x="10" y="15" width="3" height="4" rx="1" fill="#333"/></svg>
}
function MatIcon() {
  return <svg viewBox="0 0 28 28"><rect x="6" y="6" width="16" height="16" rx="2" fill="#cc0" opacity="0.8"/></svg>
}

const WEAPON_LABELS = { bat: 'Batte', gun: 'Pistolet', shotgun: 'Fusil', smg: 'SMG' }

function Inventory({ player }) {
  const sel = player.inventory[player.selectedSlot]
  const isRanged = sel && sel.type === 'weapon' && sel.name !== 'bat'
  const selLabel = sel ? (sel.type === 'weapon' ? WEAPON_LABELS[sel.name] : sel.type === 'material' ? 'Materiaux' : '') : ''
  return (
    <div className="inventory-wrap">
      {selLabel && <div className="inv-weapon-name">{selLabel}</div>}
      {isRanged && (
        <div className="inv-ammo-display">{player.ammo} balles</div>
      )}
      <div className="inventory">
        {player.inventory.map((item, i) => (
          <div key={i} className={`inv-slot${i === player.selectedSlot ? ' selected' : ''}`}>
            <span className="slot-num">{i + 1}</span>
            {item && (
              <div className="inv-icon">
                {item.name === 'bat' && <BatIcon />}
                {item.name === 'gun' && <GunIcon />}
                {item.name === 'shotgun' && <ShotgunIcon />}
                {item.name === 'smg' && <SmgIcon />}
                {item.type === 'material' && <MatIcon />}
              </div>
            )}
            {item?.type === 'material' && <span className="inv-qty">{item.qty}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}

function ControlsOverlay() {
  return (
    <div className="controls-overlay glass">
      <h2>Controles</h2>
      <div className="controls-grid">
        <span className="cg-key">Z Q S D</span><span className="cg-desc">Se deplacer</span>
        <span className="cg-key">Souris</span><span className="cg-desc">Viser</span>
        <span className="cg-key">Clic gauche</span><span className="cg-desc">Attaquer</span>
        <span className="cg-key">E</span><span className="cg-desc">Interagir / Ramasser</span>
        <span className="cg-key">E (maintenir)</span><span className="cg-desc">Deplacer un baril</span>
        <span className="cg-key">E sur porte</span><span className="cg-desc">Reparer (3 mat.) / Ouvrir-fermer</span>
        <span className="cg-key">1 - 5</span><span className="cg-desc">Changer de slot</span>
        <span className="cg-key">TAB</span><span className="cg-desc">Stats / Controles</span>
      </div>
      <div className="controls-footer">Munitions universelles &bull; Armes rares sur zombies (5%) &bull; Difficulte progressive</div>
    </div>
  )
}

function StatsOverlay({ player, zombies, mapCount, kills }) {
  const spread = ((6 - player.precision) * 0.05 * 180 / Math.PI).toFixed(1)
  const alive = zombies.filter(z => z.alive).length
  return (
    <div className="stats-overlay glass">
      <h2>Stats &mdash; Map #{mapCount + 1}</h2>
      <div className="stats-grid">
        <span className="sg-label">PV</span><span className="sg-val">{player.hp}/{player.maxHp}</span>
        <span className="sg-label">Niveau</span><span className="sg-val">{player.level} ({player.xp}/100 XP)</span>
        <span className="sg-label">Kills</span><span className="sg-val">{kills}</span>
        <span className="sg-label">Munitions</span><span className="sg-val">{player.ammo}</span>
        <span className="sg-label">Attaque</span><span className="sg-val">{player.atk}</span>
        <span className="sg-label">Armure</span><span className="sg-val">{player.armor}</span>
        <span className="sg-label">Precision</span><span className="sg-val">{player.precision} ({spread}deg)</span>
        <span className="sg-label">Vitesse</span><span className="sg-val">{player.speed}</span>
        <span className="sg-label">Zombies</span><span className="sg-val">{alive}/{zombies.length}</span>
        <span className="sg-label">Batte</span><span className="sg-val">{WEAPON_DEFS.bat.dmg} dmg</span>
        <span className="sg-label">Pistolet</span><span className="sg-val">{WEAPON_DEFS.gun.dmg} dmg</span>
        <span className="sg-label">Fusil a pompe</span><span className="sg-val">{WEAPON_DEFS.shotgun.dmg}x{WEAPON_DEFS.shotgun.pellets} dmg</span>
        <span className="sg-label">Mitraillette</span><span className="sg-val">{WEAPON_DEFS.smg.dmg} dmg (auto)</span>
        <span className="sg-label">Zombie</span><span className="sg-val">{BASE_DMG_ZOMBIE} dmg</span>
      </div>
      <div className="stats-footer">E = interagir &bull; Zone bleue = fuir &bull; Porte reparee: E pour ouvrir/fermer</div>
    </div>
  )
}

function DeathScreen({ player, mapCount, kills, onRetry, onNew }) {
  return (
    <div className="death-overlay">
      <div className="death-title">Mort</div>
      <div className="death-info">Niveau {player.level} &bull; Map #{mapCount + 1} &bull; {kills} kills</div>
      <div className="death-stats">PV:{player.maxHp} ATK:{player.atk} ARM:{player.armor} PRE:{player.precision} VIT:{player.speed}</div>
      <button className="death-btn retry" onClick={onRetry}>Recommencer (meme perso)</button>
      <button className="death-btn newgame" onClick={onNew}>Nouveau personnage</button>
    </div>
  )
}

function TouchControls() {
  const setKey = (code, val) => { state.keys[code] = val }
  const dirs = [
    [null, { dir: 'ArrowUp', label: '^' }, null],
    [{ dir: 'ArrowLeft', label: '<' }, { dir: 'ArrowDown', label: 'v' }, { dir: 'ArrowRight', label: '>' }]
  ]
  return (
    <>
      <div className="touch-pad">
        {dirs.map((row, ri) => (
          <div key={ri} style={{ display: 'flex', gap: 4 }}>
            {row.map((d, ci) => d ? (
              <div key={ci} className="tbtn"
                onTouchStart={e => { e.preventDefault(); setKey(d.dir, true) }}
                onTouchEnd={e => { e.preventDefault(); setKey(d.dir, false) }}>
                {d.label}
              </div>
            ) : <div key={ci} style={{ width: 54, height: 54 }} />)}
          </div>
        ))}
      </div>
      <div className="touch-actions">
        <div className="tbtn" onTouchStart={e => { e.preventDefault(); state.mouseDown = true }}
          onTouchEnd={e => { e.preventDefault(); state.mouseDown = false }}>ATK</div>
        <div className="tbtn" onTouchStart={e => { e.preventDefault(); state.keys.KeyE = true }}>E</div>
      </div>
    </>
  )
}

export default function App() {
  const canvasRef = useRef(null)
  const [, forceUpdate] = useState(0)
  const isTouch = 'ontouchstart' in window

  const handleRetry = useCallback(() => { retryWithSamePlayer() }, [])
  const handleNew = useCallback(() => { state.firstGame = false; startGame(); forceUpdate(n => n + 1) }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    initCanvas(canvas)
    resize()

    state.onStateChange = () => forceUpdate(n => n + 1)
    state.onDeath = () => forceUpdate(n => n + 1)

    const onKey = (e, val) => {
      state.keys[e.code] = val
      if (e.code === 'Tab') e.preventDefault()
      if (val && e.code >= 'Digit1' && e.code <= 'Digit5') setSelectedSlot(parseInt(e.code[5]) - 1)
    }
    const onKD = e => onKey(e, true)
    const onKU = e => onKey(e, false)
    const onMM = e => { state.mouseX = e.clientX; state.mouseY = e.clientY }
    const onMD = e => { if (e.button === 0) state.mouseDown = true }
    const onMU = e => { if (e.button === 0) state.mouseDown = false }
    const onCM = e => e.preventDefault()
    const onResize = () => resize()

    window.addEventListener('keydown', onKD)
    window.addEventListener('keyup', onKU)
    canvas.addEventListener('mousemove', onMM)
    canvas.addEventListener('mousedown', onMD)
    canvas.addEventListener('mouseup', onMU)
    canvas.addEventListener('contextmenu', onCM)
    window.addEventListener('resize', onResize)

    startGame()

    let raf
    const loop = () => { update(); draw(); raf = requestAnimationFrame(loop) }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKD)
      window.removeEventListener('keyup', onKU)
      canvas.removeEventListener('mousemove', onMM)
      canvas.removeEventListener('mousedown', onMD)
      canvas.removeEventListener('mouseup', onMU)
      canvas.removeEventListener('contextmenu', onCM)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const p = state.player
  if (!p) return <div className="game-container"><canvas ref={canvasRef} /></div>

  return (
    <div className="game-container">
      <canvas ref={canvasRef} />

      <div className="hud">
        <div className="top-bar">
          <LevelBadge level={p.level} />
          <HpBar hp={p.hp} maxHp={p.maxHp} />
          <XpBar player={p} />
          <KillBadge kills={state.kills} />
        </div>
        <StatsBar player={p} mapCount={state.mapCount} />
        <SlowIndicator player={p} />
      </div>

      {state.message && <div className="message-toast">{state.message}</div>}

      {state.baseEvent && !state.baseEventActive && (
        <div className="base-hint">Parlez au chef (!) pour declencher la defense</div>
      )}
      {state.baseEventActive && (
        <div className="base-status">
          DEFENSE DE BASE &bull; Survivants: {state.npcs.filter(n => n.alive).length}/{state.npcs.length}
          {state.baseBoss && state.baseBoss.alive && ' &bull; BOSS'}
        </div>
      )}

      <Inventory player={p} />

      {!isTouch && <div className="controls-hint">ZQSD: bouger &bull; Clic: attaquer &bull; E: interagir &bull; TAB: stats</div>}
      {isTouch && <TouchControls />}

      {(state.showStats || state.showControls) && <ControlsOverlay />}
      {state.showStats && <StatsOverlay player={p} zombies={state.zombies} mapCount={state.mapCount} kills={state.kills} />}
      {state.gameOver && <DeathScreen player={p} mapCount={state.mapCount} kills={state.kills} onRetry={handleRetry} onNew={handleNew} />}
    </div>
  )
}
