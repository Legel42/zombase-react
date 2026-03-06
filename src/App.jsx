import { useRef, useEffect, useState, useCallback } from 'react'
import { state, initCanvas, resize, startGame, retryWithSamePlayer, update, draw, setSelectedSlot, INV_SIZE, BASE_HP_PLAYER, BASE_DMG_GUN, BASE_DMG_ZOMBIE } from './engine'

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
  if (!player.isAttacking && player.hitSlowTimer <= 0) return null
  return <div className="slow-indicator"><span className="slow-tag">Ralenti</span></div>
}

function BatIcon() {
  return <svg viewBox="0 0 28 28"><rect x="3" y="12" width="18" height="4" rx="1" fill="#c49a6c"/><rect x="18" y="10" width="7" height="8" rx="2" fill="#a07848"/></svg>
}
function GunIcon() {
  return <svg viewBox="0 0 28 28"><rect x="2" y="12" width="20" height="4" rx="1" fill="#666"/><rect x="0" y="10" width="8" height="8" rx="1" fill="#444"/></svg>
}
function MatIcon() {
  return <svg viewBox="0 0 28 28"><rect x="6" y="6" width="16" height="16" rx="2" fill="#cc0" opacity="0.8"/></svg>
}

function Inventory({ player }) {
  return (
    <div className="inventory">
      {player.inventory.map((item, i) => (
        <div key={i} className={`inv-slot${i === player.selectedSlot ? ' selected' : ''}`}>
          <span className="slot-num">{i + 1}</span>
          {item && (
            <div className="inv-icon">
              {item.name === 'bat' && <BatIcon />}
              {item.name === 'gun' && <GunIcon />}
              {item.type === 'material' && <MatIcon />}
            </div>
          )}
          {item?.name === 'gun' && <span className="inv-ammo">{item.ammo}</span>}
          {item?.type === 'material' && <span className="inv-qty">{item.qty}</span>}
        </div>
      ))}
    </div>
  )
}

function StatsOverlay({ player, zombies, mapCount }) {
  const spread = ((6 - player.precision) * 0.05 * 180 / Math.PI).toFixed(1)
  const alive = zombies.filter(z => z.alive).length
  return (
    <div className="stats-overlay glass">
      <h2>Stats &mdash; Map #{mapCount + 1}</h2>
      <div className="stats-grid">
        <span className="sg-label">PV</span><span className="sg-val">{player.hp}/{player.maxHp}</span>
        <span className="sg-label">Attaque</span><span className="sg-val">{player.atk}</span>
        <span className="sg-label">Armure</span><span className="sg-val">{player.armor}</span>
        <span className="sg-label">Precision</span><span className="sg-val">{player.precision} ({spread}deg)</span>
        <span className="sg-label">Vitesse</span><span className="sg-val">{player.speed}</span>
        <span className="sg-label">Zombies</span><span className="sg-val">{alive}/{zombies.length}</span>
        <span className="sg-label">Pistolet</span><span className="sg-val">{BASE_DMG_GUN} dmg</span>
        <span className="sg-label">Zombie</span><span className="sg-val">{BASE_DMG_ZOMBIE} dmg</span>
      </div>
      <div className="stats-footer">E = interagir &bull; Zone bleue = fuir</div>
    </div>
  )
}

function DeathScreen({ player, mapCount, onRetry, onNew }) {
  return (
    <div className="death-overlay">
      <div className="death-title">Mort</div>
      <div className="death-info">Map #{mapCount + 1} &bull; PV:{player.maxHp} ATK:{player.atk} ARM:{player.armor}</div>
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
  const handleNew = useCallback(() => { startGame(); forceUpdate(n => n + 1) }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    initCanvas(canvas)
    resize()

    state.onStateChange = () => forceUpdate(n => n + 1)
    state.onDeath = () => forceUpdate(n => n + 1)

    const onKey = (e, val) => {
      state.keys[e.code] = val
      if (e.code === 'Tab') e.preventDefault()
      if (val && e.code >= 'Digit1' && e.code <= 'Digit4') setSelectedSlot(parseInt(e.code[5]) - 1)
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
          <HpBar hp={p.hp} maxHp={p.maxHp} />
        </div>
        <StatsBar player={p} mapCount={state.mapCount} />
        <SlowIndicator player={p} />
      </div>

      {state.message && <div className="message-toast">{state.message}</div>}

      <Inventory player={p} />

      {!isTouch && <div className="controls-hint">ZQSD: bouger &bull; Souris: viser &bull; Clic: attaquer &bull; E: interagir &bull; 1-4: inventaire &bull; TAB: stats</div>}
      {isTouch && <TouchControls />}

      {state.showStats && <StatsOverlay player={p} zombies={state.zombies} mapCount={state.mapCount} />}
      {state.gameOver && <DeathScreen player={p} mapCount={state.mapCount} onRetry={handleRetry} onNew={handleNew} />}
    </div>
  )
}
