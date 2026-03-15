import { useRef, useEffect, useState, useCallback } from 'react'
import { state, initCanvas, resize, startGame, retryWithSamePlayer, update, draw, setSelectedSlot, WEAPON_DEFS, BASE_DMG_ZOMBIE, TICK_RATE, setMusicEnabled, setSfxEnabled, setMusicVol, setSfxVol, setTouchMode, setSkipIntro, zoom, SHOP_ITEMS, buyItem } from './engine'

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
  const need = 100 + (player.level - 1) * 10
  const pct = (player.xp / need) * 100
  return (
    <div className="xp-bar-wrap">
      <div className="xp-bar-fill" style={{ width: pct + '%' }} />
      <div className="xp-text">XP {player.xp}/{need}</div>
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
      <span className="map-badge">Zone #{mapCount + 1}</span>
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

const WEAPON_LABELS = { bat: 'Batte', gun: 'Pistolet', shotgun: 'Fusil', smg: 'SMG' }

function Inventory({ player }) {
  const sel = player.inventory[player.selectedSlot]
  const isRanged = sel && sel.type === 'weapon' && sel.name !== 'bat'
  const selLabel = sel ? (sel.type === 'weapon' ? WEAPON_LABELS[sel.name] : '') : ''
  return (
    <div className="inventory-wrap">
      <div className="inv-coins">💰 {player.coins || 0}$</div>
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
              </div>
            )}
          </div>
        ))}
        <div className="inv-slot heal-slot">
          <span className="slot-num">F</span>
          {player.healSlot && (
            <div className="inv-icon heal-icon">+</div>
          )}
          {player.healSlot && <span className="inv-qty">{player.healSlot.qty}</span>}
        </div>
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
        <span className="cg-key">E sur porte</span><span className="cg-desc">Reparer (300$) / Ouvrir-fermer</span>
        <span className="cg-key">F</span><span className="cg-desc">Utiliser bandage</span>
        <span className="cg-key">Maintenir clic</span><span className="cg-desc">Attaque chargee (batte)</span>
        <span className="cg-key">Molette</span><span className="cg-desc">Zoom / Dezoom</span>
        <span className="cg-key">1 - 4</span><span className="cg-desc">Changer de slot</span>
        <span className="cg-key">B</span><span className="cg-desc">Boutique</span>
        <span className="cg-key">TAB</span><span className="cg-desc">Stats / Controles</span>
      </div>
      <div className="controls-footer">Munitions universelles &bull; Armes rares sur zombies (5%) &bull; Difficulte progressive</div>
    </div>
  )
}

function ShopPanel({ player }) {
  return (
    <div className="shop-panel glass">
      <h2>Boutique</h2>
      <div className="shop-coins">{player.coins || 0}$</div>
      <div className="shop-grid">
        {SHOP_ITEMS.map(item => (
          <button key={item.id} className="shop-item" disabled={player.coins < item.cost}
            onClick={() => buyItem(item.id)}>
            <span className="shop-name">{item.label}</span>
            <span className="shop-desc">{item.desc}</span>
            <span className="shop-cost">{item.cost}$</span>
          </button>
        ))}
      </div>
      <div className="shop-hint">B ou ESC pour fermer</div>
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
        <span className="sg-label">Niveau</span><span className="sg-val">{player.level} ({player.xp}/{100 + (player.level - 1) * 10} XP)</span>
        <span className="sg-label">Eliminations</span><span className="sg-val">{kills}</span>
        <span className="sg-label">Munitions</span><span className="sg-val">{player.ammo}</span>
        <span className="sg-label">Attaque</span><span className="sg-val">{player.atk}</span>
        <span className="sg-label">Armure</span><span className="sg-val">{player.armor}</span>
        <span className="sg-label">Precision</span><span className="sg-val">{player.precision} ({spread}deg)</span>
        <span className="sg-label">Vitesse</span><span className="sg-val">{player.speed}</span>
        <span className="sg-label">Zombies</span><span className="sg-val">{alive}/{zombies.length}</span>
        <span className="sg-label">Batte</span><span className="sg-val">{WEAPON_DEFS.bat.dmg} degats</span>
        <span className="sg-label">Pistolet</span><span className="sg-val">{WEAPON_DEFS.gun.dmg} degats</span>
        <span className="sg-label">Fusil a pompe</span><span className="sg-val">{WEAPON_DEFS.shotgun.dmg}x{WEAPON_DEFS.shotgun.pellets} degats</span>
        <span className="sg-label">Mitraillette</span><span className="sg-val">{WEAPON_DEFS.smg.dmg} degats (auto)</span>
        <span className="sg-label">Zombie</span><span className="sg-val">{BASE_DMG_ZOMBIE} degats</span>
      </div>
      <div className="stats-footer">E = interagir &bull; Zone bleue = fuir &bull; Porte reparee: E pour ouvrir/fermer</div>
    </div>
  )
}

function DeathScreen({ player, mapCount, kills, onRetry, onNew }) {
  return (
    <div className="death-overlay">
      <div className="death-title">Mort</div>
      <div className="death-info">Niveau {player.level} &bull; Map #{mapCount + 1} &bull; {kills} eliminations</div>
      <div className="death-stats">PV:{player.maxHp} Attaque:{player.atk} Armure:{player.armor} Precision:{player.precision} Vitesse:{player.speed}</div>
      <div style={{color:'#aaa',fontSize:'0.85rem',margin:'0.5rem 0',lineHeight:'1.6',textAlign:'center'}}>
        <div>Zombies tues: {kills}</div>
        <div>Maps parcourues: {mapCount + 1}</div>
        <div>Batiments explores: {state.buildingsExplored}</div>
        <div>Objets trouves: {state.itemsFound}</div>
      </div>
      <button className="death-btn retry" onClick={onRetry}>Recommencer (meme perso)</button>
      <button className="death-btn newgame" onClick={onNew}>Nouveau personnage</button>
    </div>
  )
}

function TouchControls() {
  const joystickRef = useRef(null)
  const joystickData = useRef({ active: false, id: null, cx: 0, cy: 0 })
  const aimData = useRef({ active: false, id: null })
  const JOYSTICK_R = 60
  const DEAD_ZONE = 10
  const [stick, setStick] = useState({ x: 0, y: 0 })

  const onJoystickStart = useCallback(e => {
    e.preventDefault()
    const t = e.changedTouches[0]
    const rect = joystickRef.current.getBoundingClientRect()
    joystickData.current = { active: true, id: t.identifier, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 }
  }, [])

  const onJoystickMove = useCallback(e => {
    e.preventDefault()
    const jd = joystickData.current
    if (!jd.active) return
    for (let t of e.changedTouches) {
      if (t.identifier !== jd.id) continue
      let dx = t.clientX - jd.cx, dy = t.clientY - jd.cy
      let dist = Math.hypot(dx, dy)
      if (dist > JOYSTICK_R) { dx = dx / dist * JOYSTICK_R; dy = dy / dist * JOYSTICK_R; dist = JOYSTICK_R }
      setStick({ x: dx, y: dy })
      if (dist < DEAD_ZONE) {
        state.keys.ArrowUp = false; state.keys.ArrowDown = false
        state.keys.ArrowLeft = false; state.keys.ArrowRight = false
      } else {
        const angle = Math.atan2(dy, dx)
        state.keys.ArrowUp = angle < -Math.PI / 6 && angle > -5 * Math.PI / 6
        state.keys.ArrowDown = angle > Math.PI / 6 && angle < 5 * Math.PI / 6
        state.keys.ArrowLeft = Math.abs(angle) > 2 * Math.PI / 6
        state.keys.ArrowRight = Math.abs(angle) < 4 * Math.PI / 6
      }
    }
  }, [])

  const onJoystickEnd = useCallback(e => {
    e.preventDefault()
    for (let t of e.changedTouches) {
      if (t.identifier !== joystickData.current.id) continue
      joystickData.current.active = false
      setStick({ x: 0, y: 0 })
      state.keys.ArrowUp = false; state.keys.ArrowDown = false
      state.keys.ArrowLeft = false; state.keys.ArrowRight = false
    }
  }, [])

  const onAimStart = useCallback(e => {
    e.preventDefault()
    const t = e.changedTouches[0]
    aimData.current = { active: true, id: t.identifier }
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2
    state.touchAimAngle = Math.atan2(t.clientY - cy, t.clientX - cx)
    state.mouseDown = true
  }, [])

  const onAimMove = useCallback(e => {
    e.preventDefault()
    for (let t of e.changedTouches) {
      if (t.identifier !== aimData.current.id) continue
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2
      state.touchAimAngle = Math.atan2(t.clientY - cy, t.clientX - cx)
    }
  }, [])

  const onAimEnd = useCallback(e => {
    e.preventDefault()
    for (let t of e.changedTouches) {
      if (t.identifier !== aimData.current.id) continue
      aimData.current.active = false
      state.mouseDown = false
      state.touchAimAngle = null
    }
  }, [])

  return (
    <>
      {/* Joystick gauche */}
      <div ref={joystickRef} className="touch-joystick"
        onTouchStart={onJoystickStart} onTouchMove={onJoystickMove}
        onTouchEnd={onJoystickEnd} onTouchCancel={onJoystickEnd}>
        <div className="joystick-bg">
          <div className="joystick-thumb" style={{ transform: `translate(${stick.x}px, ${stick.y}px)` }} />
        </div>
      </div>
      {/* Zone de tir droite */}
      <div className="touch-aim-zone"
        onTouchStart={onAimStart} onTouchMove={onAimMove}
        onTouchEnd={onAimEnd} onTouchCancel={onAimEnd} />
      {/* Bouton interagir */}
      <div className="touch-interact-btn"
        onTouchStart={e => { e.preventDefault(); state.keys.KeyE = true }}
        onTouchEnd={e => { e.preventDefault(); state.keys.KeyE = false }}
        onTouchCancel={e => { e.preventDefault(); state.keys.KeyE = false }}>E</div>
      {/* Slots d'inventaire */}
      <div className="touch-slots">
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} className={'tbtn tbtn-slot' + (state.player?.selectedSlot === i ? ' selected' : '')}
            onTouchStart={e => { e.preventDefault(); setSelectedSlot(i) }}>{i + 1}</div>
        ))}
      </div>
    </>
  )
}

function OptionsMenu({ onClose }) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:110}}>
      <div style={{background:'#1a1a1a',border:'1px solid #444',borderRadius:12,padding:'1.5rem 2rem',minWidth:280,color:'#fff'}}>
        <h2 style={{margin:'0 0 1rem',fontSize:'1.3rem',textAlign:'center'}}>Options</h2>
        <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.5rem 0',cursor:'pointer'}}>
          <span>Musique</span>
          <input type="checkbox" checked={state.musicEnabled} onChange={e => setMusicEnabled(e.target.checked)}
            style={{width:20,height:20,cursor:'pointer'}} />
        </label>
        {state.musicEnabled && <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.25rem 0 0.5rem'}}>
          <span style={{fontSize:'0.85rem',color:'#999'}}>Volume musique</span>
          <input type="range" min="0" max="1" step="0.05" value={state.musicVol}
            onChange={e => setMusicVol(parseFloat(e.target.value))}
            style={{width:120,cursor:'pointer'}} />
        </label>}
        <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.5rem 0',cursor:'pointer'}}>
          <span>Effets sonores</span>
          <input type="checkbox" checked={state.sfxEnabled} onChange={e => setSfxEnabled(e.target.checked)}
            style={{width:20,height:20,cursor:'pointer'}} />
        </label>
        {state.sfxEnabled && <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.25rem 0 0.5rem'}}>
          <span style={{fontSize:'0.85rem',color:'#999'}}>Volume effets</span>
          <input type="range" min="0" max="1" step="0.05" value={state.sfxVol}
            onChange={e => setSfxVol(parseFloat(e.target.value))}
            style={{width:120,cursor:'pointer'}} />
        </label>}
        <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.5rem 0',cursor:'pointer'}}>
          <span>Mode tactile</span>
          <input type="checkbox" checked={state.touchMode} onChange={e => setTouchMode(e.target.checked)}
            style={{width:20,height:20,cursor:'pointer'}} />
        </label>
        <label style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0.5rem 0',cursor:'pointer'}}>
          <span>Passer l'intro</span>
          <input type="checkbox" checked={state.skipIntro} onChange={e => setSkipIntro(e.target.checked)}
            style={{width:20,height:20,cursor:'pointer'}} />
        </label>
        <div style={{textAlign:'center',marginTop:'1rem',display:'flex',gap:'0.5rem',justifyContent:'center'}}>
          <button onClick={() => { if(!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{}); else document.exitFullscreen() }} style={{background:'#444',color:'#fff',border:'1px solid #555',borderRadius:6,padding:'0.5rem 1rem',fontSize:'1rem',cursor:'pointer'}}>Plein ecran</button>
          <button onClick={onClose} style={{background:'#333',color:'#fff',border:'1px solid #555',borderRadius:6,padding:'0.5rem 1.5rem',fontSize:'1rem',cursor:'pointer'}}>Fermer</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const canvasRef = useRef(null)
  const [, forceUpdate] = useState(0)
  const [showOptions, setShowOptions] = useState(false)
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0

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
      if (e.code === 'Tab' || e.code === 'Escape') e.preventDefault()
      if (val && e.code >= 'Digit1' && e.code <= 'Digit5') setSelectedSlot(parseInt(e.code[5]) - 1)
    }
    const onKD = e => onKey(e, true)
    const onKU = e => onKey(e, false)
    const onMM = e => { state.mouseX = e.clientX; state.mouseY = e.clientY }
    const onMD = e => { if (e.button === 0) state.mouseDown = true }
    const onMU = e => { if (e.button === 0) state.mouseDown = false }
    const onCM = e => e.preventDefault()
    const onWheel = e => { e.preventDefault(); zoom(e.deltaY) }
    const onResize = () => resize()

    window.addEventListener('keydown', onKD)
    window.addEventListener('keyup', onKU)
    canvas.addEventListener('mousemove', onMM)
    canvas.addEventListener('mousedown', onMD)
    canvas.addEventListener('mouseup', onMU)
    canvas.addEventListener('contextmenu', onCM)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('resize', onResize)

    if (isTouch) state.touchMode = true
    startGame()

    let raf, lastTime = performance.now(), accum = 0
    const loop = (now) => {
      let dt = Math.min(now - lastTime, 200)
      lastTime = now
      accum += dt
      while (accum >= TICK_RATE) { update(); accum -= TICK_RATE }
      draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKD)
      window.removeEventListener('keyup', onKU)
      canvas.removeEventListener('mousemove', onMM)
      canvas.removeEventListener('mousedown', onMD)
      canvas.removeEventListener('mouseup', onMU)
      canvas.removeEventListener('contextmenu', onCM)
      canvas.removeEventListener('wheel', onWheel)
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
        <StatsBar player={p} mapCount={state.mapIndex} />
        <SlowIndicator player={p} />
      </div>

      {state.message && <div className="message-toast">{state.message}</div>}

      {state.baseEvent && !state.baseEventActive && !state.baseRewardGiven && (
        <div className="base-hint">Parlez au chef (!) pour declencher la defense</div>
      )}
      {state.baseEventActive && (
        <div className="base-status">
          DEFENSE DE BASE &bull; Vague {state.currentWave}/{2} &bull; Restants: {state.hordeAlive} &bull; Survivants: {state.npcs.filter(n => n.alive).length}/{state.npcs.filter(n => !n.isMadman).length}
          {state.baseBoss && state.baseBoss.alive && ' \u2022 BOSS'}
        </div>
      )}

      {state.paused && !showOptions && (
        <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:20,background:'rgba(0,0,0,0.6)',backdropFilter:'blur(4px)'}}>
          <div style={{color:'#fff',fontSize:'2.5rem',fontWeight:900,letterSpacing:'8px',textTransform:'uppercase',textShadow:'0 0 20px rgba(255,255,255,0.2)'}}>PAUSE</div>
        </div>
      )}

      <Inventory player={p} />

      {!state.touchMode && <div className="controls-hint">ZQSD: bouger &bull; Clic: attaquer &bull; Maintenir: charge &bull; E: interagir &bull; TAB: stats &bull; Molette: zoom</div>}
      {state.touchMode && <TouchControls />}

      <div className="options-btn" onClick={() => { state.paused = true; setShowOptions(true) }}>&#9881;</div>
      <div className="fullscreen-btn" onClick={() => { if(!document.fullscreenElement)document.documentElement.requestFullscreen().catch(()=>{}); else document.exitFullscreen() }}>&#x26F6;</div>
      {showOptions && <OptionsMenu onClose={() => { state.paused = false; setShowOptions(false) }} />}

      {(state.showStats || state.showControls) && <ControlsOverlay />}
      {state.showStats && <StatsOverlay player={p} zombies={state.zombies} mapCount={state.mapIndex} kills={state.kills} />}
      {state.shopOpen && <ShopPanel player={p} />}
      {state.gameOver && <DeathScreen player={p} mapCount={state.maxMapIndex||state.mapIndex} kills={state.kills} onRetry={handleRetry} onNew={handleNew} />}
      {state.paused && !state.gameOver && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:100}}>
          <div style={{color:'#fff',fontSize:'3rem',fontWeight:'bold',letterSpacing:'0.3em'}}>PAUSE</div>
          <div style={{color:'#aaa',fontSize:'1rem',marginTop:'1rem'}}>Echap pour reprendre</div>
        </div>
      )}
    </div>
  )
}
