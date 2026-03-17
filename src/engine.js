export const TILE=32,MAP_W=80,MAP_H=60,INV_SIZE=4;
const COLORS={
 floor:'#2e2a26',wall:'#4a4644',wallTop:'#3a3836',wallEdge:'#222',
 wallInner:'#3e3a38',wallInnerTop:'#333030',
 door:'#6a5030',doorBroken:'#4a3a28',grass:'#1e3a1e',grassAlt:'#1a331a',grassDetail:'#162e16',
 escape:'#0af',cityWall:'#3e3c3a',cityWallTop:'#2e2c2a',
 doorArmored:'#5a6a7a',doorArmoredTop:'#4a5a6a'
};
const SIGHT_RADIUS=7,GUNSHOT_ALERT_RADIUS=18;
export const BASE_HP_PLAYER=25,BASE_HP_ZOMBIE=50,BASE_DMG_ZOMBIE=12;
const WEAPONS={
 bat:{name:'bat',type:'weapon',range:2.8,arc:Math.PI/1.5,dmg:13,cooldown:45,melee:true,label:'Batte'},
 gun:{name:'gun',type:'weapon',range:15,dmg:22,cooldown:20,melee:false,label:'Pistolet',baseSpread:0.03},
 shotgun:{name:'shotgun',type:'weapon',range:10,dmg:20,cooldown:28,melee:false,pellets:5,baseSpread:0.18,label:'Fusil a pompe'},
 smg:{name:'smg',type:'weapon',range:12,dmg:15,cooldown:10,melee:false,label:'Mitraillette',baseSpread:0.06}
};
export const WEAPON_DEFS=WEAPONS;
const ZOMBIE_ATK_RANGE=1.8;
const HIT_SLOW_DURATION=20;
const POST_ATTACK_SLOW_DURATION=60;
const INTERACT_RANGE=1.8;
const BARREL_EXPLOSION_RADIUS=3,BARREL_EXPLOSION_DMG=40;
const XP_PER_KILL=5,XP_BOSS_MULT=10;
const XP_PER_LEVEL=100;
const DIST_SPREAD_FACTOR=0.008;
const ZOMBIE_CLEANUP_INTERVAL=120;
const SMG_HEAT_PER_SHOT=0.08,SMG_HEAT_DECAY=0.006,SMG_HEAT_SPREAD_MULT=6,SMG_OVERHEAT_THRESHOLD=0.85;
const GUNSHOT_SPAWN_COOLDOWN=45*60; // 45 seconds in ticks (60fps)
const GUNSHOT_SPAWN_COUNT={gun:1,shotgun:3,smg:2};
const ZOMBIE_GROANS=['Grrr...','Braaains...','Rrrhh...','Graaaah...','Hnnngg...','Uuugh...','Raaah...','Mmrgh...'];
const NPC_DIALOGUES=[
 'On va tous mourir!','Miam, il reste un cafard dans mon assiette',
 'J\'ai mal aux pieds...','C\'est quoi cette odeur?',
 'Mon ex etait pire que ces zombies','Quelqu\'un a du cafe?',
 'Je regrette de pas avoir pris ma retraite','Avant c\'etait mieux...',
 'Y\'a du wifi ici?','J\'aurais du rester au lit',
 'Si je survis, j\'ecris un livre','C\'est bientot fini?',
 'J\'ai faim...','Qui a mange mon dernier biscuit?!',
 'Les zombies puent!','Je prefere les vampires...',
];
const MADMAN_LINES=[
 'Viens la toi!','HAHAHA!','T\'es le prochain!','Encore un!',
 'Qui veut danser?!','J\'adore ce boulot!','BOOM HEADSHOT!',
 'Personne ne m\'arrete!','C\'est tout ce que t\'as?!','Trop facile!',
 'Je suis inarretable!','Allez, approchez!','Un de plus pour la route!'
];
let _prngSeed=Date.now();
function seedRNG(s){_prngSeed=s>>>0}
function prng(){_prngSeed=(_prngSeed*1664525+1013904223)>>>0;return _prngSeed/4294967296}
const rand=(a,b)=>(prng()*(b-a+1)|0)+a;
const distXY=(x1,y1,x2,y2)=>Math.hypot(x1-x2,y1-y2);
const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
const tileKey=(x,y)=>y*MAP_W+x;
const fl=(v)=>v+0.5|0;
export const state={
 canvas:null,ctx:null,cam:{x:0,y:0},
 keys:{},mouseX:0,mouseY:0,mouseDown:false,touchAimAngle:null,
 gameOver:false,showStats:false,
 map:[],buildings:[],doors:[],items:[],zombies:[],bullets:[],barrels:[],barricades:[],cityWalls:[],
 npcs:[],allies:[],rocks:[],rockWarnings:[],explosions:[],dmgFloaters:[],confetti:[],grenades:[],spits:[],acidPools:[],
 playerRallyBuff:0,playerRallyDmgMult:1,
 doorMap:new Map(),buildingGrid:null,wallGrid:null,barricadeMap:new Map(),cityWallMap:new Map(),
 escapeZone:{x:0,y:0},exitPrev:{x:-10,y:-10},exitNext:{x:0,y:0},
 player:null,mapIndex:0,mapCount:0,tick:0,attackPressed:false,kills:0,lastGunSpawnTick:-99999,
 itemsFound:0,buildingsExplored:0,
 maxMapIndex:0,savedMaps:{},
 W:0,H:0,scale:1,
 message:'',msgTimer:null,
 onDeath:null,onStateChange:null,
 firstGame:true,showControls:false,
 holdingE:false,holdETimer:0,draggingBarrel:null,
 baseEvent:false,baseEventActive:false,baseWaveTimer:0,baseWavesLeft:0,
 baseBoss:null,baseRewardGiven:false,hordeAlive:0,currentWave:0,hordeEncounters:0,
 paused:false,pausePressed:false,
 shakeTimer:0,shakeMaxTimer:0,shakeIntensity:0,
 camInitialized:false,iFrames:0,dmgVignetteTimer:0,
 musicEnabled:true,sfxEnabled:true,musicVol:0.6,sfxVol:0.8,touchMode:false,showOptions:false,skipIntro:false,
 shopOpen:false,shopPressed:false,healCooldown:0,
 zoomLevel:1,targetZoom:1
};
export const TICK_RATE=1000/60;
const music=new Audio('sounds/music.mp3');
music.loop=true;music.volume=0.6;
const sfx={
 gun:new Audio('sounds/gun.mp3'),
 shotgun:new Audio('sounds/shotgun.mp3'),
 smg:new Audio('sounds/smg.mp3'),
 bat:new Audio('sounds/bat.mp3'),
 zombie_hit:new Audio('sounds/bat.mp3'),
 zombie_alert:new Audio('sounds/zombie_alert.mp3'),
 door:new Audio('sounds/door.mp3'),
 pickup:new Audio('sounds/pickup.mp3'),
 explosion:new Audio('sounds/explosion.mp3')
};
for(let k in sfx)sfx[k].volume=0.3;
sfx.shotgun.volume=0.15;sfx.smg.volume=0.15;
const audioPool={};
function playSound(name){
 if(!state.sfxEnabled)return;
 let s=sfx[name];if(!s)return;
 if(!audioPool[name])audioPool[name]=[];
 let pool=audioPool[name];
 for(let i=pool.length-1;i>=0;i--){if(pool[i].ended)pool.splice(i,1)}
 if(pool.length>=8)return;
 let c=s.cloneNode();c.volume=s.volume*state.sfxVol/0.8;c.play().catch(()=>{});
 pool.push(c);
}
let musicStarted=false;
function startMusic(){
 if(!state.musicEnabled||musicStarted)return;
 music.volume=state.musicVol;
 let tryPlay=()=>{music.play().then(()=>{musicStarted=true;document.removeEventListener('click',tryPlay);document.removeEventListener('keydown',tryPlay)}).catch(()=>{})};
 tryPlay();
 document.addEventListener('click',tryPlay);
 document.addEventListener('keydown',tryPlay);
}
function stopMusic(){music.pause();music.currentTime=0;musicStarted=false}
export function setMusicEnabled(v){state.musicEnabled=v;if(v){startMusic()}else{stopMusic()}emitChange()}
export function setSfxEnabled(v){state.sfxEnabled=v;emitChange()}
export function setMusicVol(v){state.musicVol=v;music.volume=v;emitChange()}
export function setSfxVol(v){state.sfxVol=v;emitChange()}
export function setTouchMode(v){state.touchMode=v;emitChange()}
export function setSkipIntro(v){state.skipIntro=v;emitChange()}
function emitChange(){state.onStateChange?.()}
function msg(t,d=2000){
 state.message=t;clearTimeout(state.msgTimer);
 state.msgTimer=setTimeout(()=>{state.message='';emitChange()},d);emitChange();
}
function addFloater(x,y,text,color){
 state.dmgFloaters.push({x,y,text,color:color||'#fff',life:40,maxLife:40});
}
function rebuildSpatialMaps(){
 state.doorMap=new Map();
 for(let d of state.doors)state.doorMap.set(tileKey(d.x,d.y),d);
 state.buildingGrid=new Array(MAP_H*MAP_W).fill(null);
 state.wallGrid=new Array(MAP_H*MAP_W).fill(null);
 for(let b of state.buildings){
  for(let y=b.y;y<b.y+b.h;y++)for(let x=b.x;x<b.x+b.w;x++){
   let k=tileKey(x,y);
   if(y>b.y&&y<b.y+b.h-1&&x>b.x&&x<b.x+b.w-1)state.buildingGrid[k]=b;
   state.wallGrid[k]=b;
  }
 }
 state.cityWallMap=new Map();
 for(let cw of state.cityWalls)state.cityWallMap.set(tileKey(cw.x,cw.y),cw);
 rebuildBarricadeMap();
}
function rebuildBarricadeMap(){
 state.barricadeMap=new Map();
 if(state.barricades)for(let b of state.barricades)state.barricadeMap.set(tileKey(b.x,b.y),b);
}
function doorAt(x,y){return state.doorMap.get(tileKey(x,y))||null}
function isInBuilding(tx,ty){return tx>=0&&ty>=0&&tx<MAP_W&&ty<MAP_H&&!!state.buildingGrid[tileKey(tx,ty)]}
function getBuildingAt(tx,ty){return(tx>=0&&ty>=0&&tx<MAP_W&&ty<MAP_H)?state.buildingGrid[tileKey(tx,ty)]:null}
function getBuildingOwner(x,y){return(x>=0&&y>=0&&x<MAP_W&&y<MAP_H)?state.wallGrid[tileKey(x,y)]:null}
function isBuildingOccupied(bld){
 if(!bld)return false;
 let p=state.player;
 if(getBuildingAt(fl(p.fx),fl(p.fy))===bld)return true;
 for(let n of state.npcs){if(n.alive&&getBuildingAt(fl(n.fx),fl(n.fy))===bld)return true}
 return false;
}
function zombieCanEnter(tx,ty,alerted){
 let bld=getBuildingAt(tx,ty)||getBuildingOwner(tx,ty);
 if(!bld)return true;
 if(alerted)return true;
 return isBuildingOccupied(bld);
}
function getWallSide(bld,x,y){
 let isTop=y===bld.y,isBot=y===bld.y+bld.h-1,isLeft=x===bld.x,isRight=x===bld.x+bld.w-1;
 if(isTop&&isLeft)return 'tl';if(isTop&&isRight)return 'tr';
 if(isBot&&isLeft)return 'bl';if(isBot&&isRight)return 'br';
 if(isTop)return 'top';if(isBot)return 'bottom';
 if(isLeft)return 'left';if(isRight)return 'right';
 return null;
}
function isWallBetween(x1,y1,x2,y2){
 let dx=x2-x1,dy=y2-y1;
 let steps=Math.max(Math.abs(dx),Math.abs(dy))*2;
 if(steps===0)return false;
 let sx=dx/steps,sy=dy/steps;
 for(let i=1;i<steps;i++){
  let cx=x1+sx*i+0.5|0,cy=y1+sy*i+0.5|0;
  if(cx>=0&&cy>=0&&cx<MAP_W&&cy<MAP_H){
   let t=state.map[cy][cx];
   if(t===1||t===5||t===6)return true;
   if(t===3){let door=doorAt(cx,cy);if(door&&door.barricaded&&!door.open)return true}
   if(barricadeAt(cx,cy))return true;
  }
 }
 return false;
}
function getSpreadAtDist(wep,precision,d){
 if(wep.pellets){
  let base=wep.baseSpread*(1-precision*0.03);
  return Math.max(0.04,base+DIST_SPREAD_FACTOR*d*0.5);
 }
 let base=(wep.baseSpread||0.05)*(6-precision)/5;
 return base+DIST_SPREAD_FACTOR*d;
}
function drawHumanoid(ctx,cx,cy,s,angle,opts){
 ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);
 let u=s/32;
 let walk=opts.walkPhase||0;
 let legOff=Math.sin(walk*Math.PI*2)*3*u;
 ctx.fillStyle='rgba(0,0,0,0.35)';
 ctx.beginPath();ctx.ellipse(0,3*u,11*u,5*u,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle=opts.legs||'#2a2a2a';
 ctx.fillRect(-3*u,2*u+legOff,4*u,8*u);ctx.fillRect(1*u,2*u-legOff,4*u,8*u);
 ctx.fillStyle=opts.boots||'#1a1a1a';
 ctx.fillRect(-3*u,8*u+legOff,4*u,3*u);ctx.fillRect(1*u,8*u-legOff,4*u,3*u);
 let bodyBob=Math.abs(Math.sin(walk*Math.PI*2))*1.5*u;
 ctx.fillStyle=opts.body;ctx.fillRect(-7*u,-7*u-bodyBob,14*u,14*u);
 if(opts.vest){ctx.fillStyle=opts.vest;ctx.fillRect(-7*u,-7*u-bodyBob,3*u,14*u);ctx.fillRect(4*u,-7*u-bodyBob,3*u,14*u)}
 if(opts.pocket){ctx.fillStyle=opts.pocket;ctx.fillRect(-2*u,-4*u-bodyBob,4*u,6*u)}
 ctx.fillStyle=opts.arms||opts.body;
 let armExt=opts.armExtend||0;
 let armSwing=Math.sin(walk*Math.PI*2)*2*u;
 ctx.fillRect(7*u,-5*u-bodyBob+armSwing,4*u+armExt,10*u);ctx.fillRect(-11*u,-5*u-bodyBob-armSwing,4*u,10*u);
 ctx.fillStyle=opts.gloves||opts.skin||'#1a1a1a';
 ctx.fillRect(7*u+armExt,3*u-bodyBob+armSwing,4*u,4*u);ctx.fillRect(-11*u,3*u-bodyBob-armSwing,4*u,4*u);
 ctx.fillStyle=opts.skin||'#d4a870';ctx.fillRect(-5*u,-14*u-bodyBob,10*u,9*u);
 if(opts.helmet){ctx.fillStyle=opts.helmet;ctx.fillRect(-6*u,-16*u-bodyBob,12*u,5*u);ctx.fillStyle=opts.helmetRim||opts.helmet;ctx.fillRect(-6*u,-12*u-bodyBob,12*u,2*u)}
 ctx.fillStyle=opts.eyeColor||'#111';ctx.fillRect(3*u,-13*u-bodyBob,2*u,2*u);
 ctx.fillStyle=opts.skin||'#d4a870';ctx.fillRect(2*u,-9*u-bodyBob,3*u,1*u);
 ctx.restore();
}
function drawPlayer(ctx,cx,cy,s,angle,swingAnim,player){
 let isMoving=(state.keys.ArrowUp||state.keys.KeyW||state.keys.KeyZ||state.keys.ArrowDown||state.keys.KeyS||state.keys.ArrowLeft||state.keys.KeyA||state.keys.KeyQ||state.keys.ArrowRight||state.keys.KeyD);
 let walkPhase=isMoving?(state.tick%30)/30:0;
 drawHumanoid(ctx,cx,cy,s,angle,{
  body:'#3a4a2a',vest:'#4a5a3a',pocket:'#2a3a1a',
  arms:'#3a4a2a',gloves:'#1a1a1a',skin:'#d4a870',
  helmet:'#3a4a2a',helmetRim:'#2a3a1a',walkPhase
 });
 ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);
 let u=s/32,sel=player.inventory[player.selectedSlot],wn=sel&&sel.name;
 if(wn==='bat'){
  let batLen=WEAPONS.bat.range*s/2*0.5;
  if(swingAnim>0){ctx.save();ctx.rotate(-WEAPONS.bat.arc/2+swingAnim*WEAPONS.bat.arc*1.2)}
  ctx.fillStyle='#888';ctx.fillRect(10*u,-1.5*u,batLen,3*u);
  ctx.fillStyle='#aaa';ctx.fillRect(10*u+batLen*0.7,-2.5*u,batLen*0.3,5*u);
  if(swingAnim>0)ctx.restore();
 }else if(wn==='gun'){
  ctx.fillStyle='#2a2a2a';ctx.fillRect(10*u,-2*u,14*u,4*u);ctx.fillStyle='#1a1a1a';ctx.fillRect(8*u,-3*u,6*u,6*u);ctx.fillStyle='#333';ctx.fillRect(22*u,-1*u,4*u,2*u);
 }else if(wn==='shotgun'){
  ctx.fillStyle='#3a2a1a';ctx.fillRect(10*u,-2*u,20*u,4*u);ctx.fillStyle='#1a1a1a';ctx.fillRect(8*u,-3*u,6*u,6*u);ctx.fillStyle='#2a2a2a';ctx.fillRect(28*u,-2.5*u,4*u,5*u);ctx.fillStyle='#555';ctx.fillRect(28*u,-1*u,5*u,2*u);
 }else if(wn==='smg'){
  ctx.fillStyle='#222';ctx.fillRect(10*u,-1.5*u,12*u,3*u);ctx.fillStyle='#1a1a1a';ctx.fillRect(8*u,-2.5*u,5*u,5*u);ctx.fillStyle='#333';ctx.fillRect(14*u,1.5*u,3*u,4*u);ctx.fillStyle='#2a2a2a';ctx.fillRect(20*u,-1*u,4*u,2*u);
 }
 ctx.restore();
}
const NPC_COLORS={
 leader:{body:'#4a3a2a',vest:'#5a4a3a',pocket:'#3a2a1a',skin:'#d4a870',helmet:'#5a4a3a',helmetRim:'#4a3a2a'},
 medic:{body:'#e8e8e8',vest:'#cc3333',pocket:null,skin:'#d4a870',helmet:'#e0e0e0',helmetRim:'#cc3333'},
 grenadier:{body:'#3a4a3a',vest:'#5a6a4a',pocket:'#2a3a1a',skin:'#d4a870',helmet:'#4a5a3a',helmetRim:'#3a4a2a'},
 scout:{body:'#2a2a3a',vest:'#3a3a5a',pocket:'#1a1a2a',skin:'#d4a870',helmet:'#2a2a4a',helmetRim:'#1a1a3a'},
 ally:{body:'#2a4a2a',vest:'#3a6a3a',pocket:'#1a3a1a',skin:'#d4a870',helmet:'#2a5a2a',helmetRim:'#1a4a1a'},
 default:{body:'#3a3a4a',vest:'#4a4a5a',pocket:null,skin:'#d4a870',helmet:'#3a3a4a',helmetRim:'#2a2a3a'}
};
function drawNPC(ctx,cx,cy,s,angle,npc){
 let wn=npc.weapon,wp=npc._moving?(state.tick%24)/24:0;
 let c={...(npc.isLeader?NPC_COLORS.leader:NPC_COLORS[npc.npcType]||NPC_COLORS.default),walkPhase:wp};
 drawHumanoid(ctx,cx,cy,s,angle,c);
 ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);let u=s/32;
 if(wn==='bat'){ctx.fillStyle='#888';ctx.fillRect(10*u,-1.5*u,20*u,3*u);ctx.fillStyle='#aaa';ctx.fillRect(26*u,-2.5*u,6*u,5*u)}
 else if(wn==='gun'){ctx.fillStyle='#2a2a2a';ctx.fillRect(10*u,-2*u,14*u,4*u);ctx.fillStyle='#1a1a1a';ctx.fillRect(8*u,-3*u,6*u,6*u)}
 else if(wn==='shotgun'){ctx.fillStyle='#3a2a1a';ctx.fillRect(10*u,-2*u,20*u,4*u);ctx.fillStyle='#1a1a1a';ctx.fillRect(8*u,-3*u,6*u,6*u);ctx.fillStyle='#2a2a2a';ctx.fillRect(28*u,-2.5*u,4*u,5*u)}
 else if(wn==='smg'){ctx.fillStyle='#2a2a2a';ctx.fillRect(10*u,-2*u,16*u,4*u);ctx.fillStyle='#1a1a1a';ctx.fillRect(8*u,-3*u,5*u,6*u);ctx.fillStyle='#3a3a3a';ctx.fillRect(24*u,-1.5*u,3*u,3*u)}
 ctx.restore();
}
function drawZombie(ctx,cx,cy,s,angle,variant,atkAnim,isBoss,isMoving,isSpitter,isRunner,isNecromancer){
 let sc=isBoss?1.4:isSpitter||isNecromancer?1.15:1;
 ctx.save();ctx.translate(cx,cy);
 if(isBoss||isSpitter||isNecromancer)ctx.scale(sc,sc);
 ctx.rotate(angle);
 let u=s/32;
 if(isNecromancer){
  let walk=isMoving?(state.tick%28)/28:0;
  let legOff=Math.sin(walk*Math.PI*2)*2*u;
  let bodyBob=isMoving?Math.abs(Math.sin(walk*Math.PI*2))*1*u:0;
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.ellipse(0,5*u,12*u,5*u,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#2a1a3a';ctx.fillRect(-4*u,3*u+legOff,4*u,7*u);ctx.fillRect(1*u,3*u-legOff,4*u,7*u);
  ctx.fillStyle='#3a2a4a';ctx.fillRect(-8*u,-8*u-bodyBob,16*u,16*u);
  ctx.fillStyle='#4a3a5a';ctx.fillRect(-8*u,-8*u-bodyBob,16*u,3*u);
  ctx.fillStyle='#2a1a3a';ctx.fillRect(-2*u,-2*u-bodyBob,4*u,4*u);
  let armReach=atkAnim>0?ZOMBIE_ATK_RANGE*s/2*atkAnim*0.5:0;
  ctx.fillStyle='#4a3a5a';
  ctx.fillRect(8*u,-4*u-bodyBob,5*u+armReach,8*u);ctx.fillRect(-13*u,-4*u-bodyBob,5*u,8*u);
  // Staff in hand
  ctx.fillStyle='#6a5a2a';ctx.fillRect(11*u+armReach,-10*u-bodyBob,2*u,18*u);
  ctx.fillStyle='#a040ff';ctx.beginPath();ctx.arc(12*u+armReach,-11*u-bodyBob,3*u,0,Math.PI*2);ctx.fill();
  // Head
  ctx.fillStyle='#5a4a6a';ctx.fillRect(-5*u,-16*u-bodyBob,10*u,9*u);
  // Hood
  ctx.fillStyle='#3a2a4a';ctx.fillRect(-6*u,-17*u-bodyBob,12*u,5*u);
  // Eyes
  ctx.fillStyle='#a040ff';ctx.fillRect(-3*u,-14*u-bodyBob,2*u,2*u);ctx.fillRect(2*u,-14*u-bodyBob,2*u,2*u);
  // Glow aura
  let ga=0.15+0.1*Math.sin(state.tick*0.08);
  ctx.globalAlpha=ga;ctx.fillStyle='#8020cc';ctx.beginPath();ctx.arc(0,-5*u-bodyBob,14*u,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 }else if(isSpitter){
  let walk=isMoving?(state.tick%24)/24:0;
  let legOff=Math.sin(walk*Math.PI*2)*2*u;
  let bodyBob=isMoving?Math.abs(Math.sin(walk*Math.PI*2))*1*u:0;
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.beginPath();ctx.ellipse(0,5*u,14*u,6*u,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1a4a1a';
  ctx.fillRect(-5*u,3*u+legOff,5*u,7*u);ctx.fillRect(1*u,3*u-legOff,5*u,7*u);
  ctx.fillStyle='#2a5a2a';ctx.beginPath();ctx.ellipse(0,-2*u-bodyBob,11*u,10*u,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#3a6a3a';ctx.beginPath();ctx.ellipse(0,-5*u-bodyBob,10*u,6*u,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#1a4a1a';ctx.beginPath();ctx.ellipse(0,2*u-bodyBob,8*u,5*u,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#5a2';ctx.beginPath();ctx.arc(5*u,-1*u-bodyBob,2*u,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#4a1';ctx.beginPath();ctx.arc(-4*u,1*u-bodyBob,1.5*u,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#6a3';ctx.beginPath();ctx.arc(2*u,3*u-bodyBob,1.5*u,0,Math.PI*2);ctx.fill();
  let armReach=atkAnim>0?ZOMBIE_ATK_RANGE*s/2*atkAnim*0.6:0;
  ctx.fillStyle='#3a6a3a';
  ctx.fillRect(9*u,-3*u-bodyBob,5*u+armReach,6*u);
  ctx.fillRect(-14*u,-3*u-bodyBob,5*u+(atkAnim>0?armReach*0.5:0),6*u);
  ctx.fillStyle='#2a5a2a';ctx.fillRect(-3*u,-11*u-bodyBob,6*u,3*u); // neck
  ctx.fillStyle='#3a6a3a';ctx.fillRect(-5*u,-17*u-bodyBob,10*u,7*u); // head
  ctx.fillStyle='#4a8a4a';ctx.fillRect(-5*u,-11*u-bodyBob,10*u,2*u); // jaw
  ctx.fillStyle='#0f0';ctx.fillRect(-3*u,-15*u-bodyBob,2*u,2*u);ctx.fillRect(2*u,-15*u-bodyBob,2*u,2*u);
  ctx.fillStyle='#040';ctx.fillRect(-2.5*u,-14.5*u-bodyBob,1*u,1*u);ctx.fillRect(2.5*u,-14.5*u-bodyBob,1*u,1*u);
  if(atkAnim>0){
   let jawOpen=atkAnim*4*u;
   ctx.fillStyle='#040';ctx.fillRect(0,-11*u-bodyBob,5*u,2*u+jawOpen);
   ctx.fillStyle='#0f0';ctx.fillRect(1*u,-9*u-bodyBob+jawOpen,2*u,3*u+atkAnim*3*u);
  }else{
   ctx.fillStyle='#0a0';ctx.fillRect(1*u,-11*u-bodyBob,3*u,2*u);
  }
 }else if(isRunner){
  let walk=isMoving?(state.tick%14)/14:0; // faster walk cycle
  let legOff=Math.sin(walk*Math.PI*2)*4*u;
  let bodyBob=isMoving?Math.abs(Math.sin(walk*Math.PI*2))*2*u:0;
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(0,3*u,8*u,4*u,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#4a3040';
  ctx.fillRect(-2*u,2*u+legOff,2*u,9*u);ctx.fillRect(1*u,2*u-legOff,2*u,9*u);
  ctx.fillStyle='#5a3040';ctx.fillRect(-4*u,-7*u-bodyBob,8*u,12*u);
  ctx.fillStyle='#6a3848';ctx.fillRect(-4*u,-7*u-bodyBob,8*u,2*u);
  ctx.fillStyle='rgba(0,0,0,0.15)';
  ctx.fillRect(-3*u,-3*u-bodyBob,6*u,1*u);ctx.fillRect(-3*u,-1*u-bodyBob,6*u,1*u);ctx.fillRect(-3*u,1*u-bodyBob,6*u,1*u);
  let armReach=atkAnim>0?ZOMBIE_ATK_RANGE*s/2*atkAnim:0;
  let armSwing=isMoving&&atkAnim<=0?Math.sin(walk*Math.PI*2)*3*u:0;
  ctx.fillStyle='#6a5060';
  ctx.fillRect(4*u,-3*u-bodyBob+armSwing,3*u+armReach,5*u);
  ctx.fillRect(-7*u,-3*u-bodyBob-armSwing,3*u+(atkAnim>0?armReach*0.6:0),5*u);
  ctx.fillStyle='#8a6070';
  ctx.fillRect(5*u+armReach,-4*u-bodyBob+armSwing,3*u,2*u);ctx.fillRect(5*u+armReach,1*u-bodyBob+armSwing,3*u,2*u);
  ctx.fillStyle='#7a6070';ctx.fillRect(-4*u,-13*u-bodyBob,8*u,7*u);
  ctx.fillStyle='#6a5060';ctx.fillRect(-4*u,-7*u-bodyBob,8*u,1.5*u);
  ctx.fillStyle='#f44';ctx.fillRect(-2*u,-12*u-bodyBob,2*u,2*u);ctx.fillRect(1*u,-12*u-bodyBob,2*u,2*u);
  ctx.fillStyle='#200';ctx.fillRect(-1.5*u,-11.5*u-bodyBob,1*u,1*u);ctx.fillRect(1.5*u,-11.5*u-bodyBob,1*u,1*u);
  if(atkAnim>0){
   let jawOpen=atkAnim*3*u;
   ctx.fillStyle='#300';ctx.fillRect(0,-7*u-bodyBob,4*u,2*u+jawOpen);
   ctx.fillStyle='#fff';ctx.fillRect(0.5*u,-7*u-bodyBob,1*u,1*u);ctx.fillRect(2.5*u,-7*u-bodyBob,1*u,1*u);
  }
 }else{
  let walk=isMoving?(state.tick%20)/20:0;
  let legOff=Math.sin(walk*Math.PI*2)*3*u;
  let bodyBob=isMoving?Math.abs(Math.sin(walk*Math.PI*2))*1.5*u:0;
  ctx.fillStyle='rgba(0,0,0,0.35)';
  ctx.beginPath();ctx.ellipse(0,3*u,11*u,5*u,0,0,Math.PI*2);ctx.fill();
  let legCol=variant===0?'#3a3030':'#2a3a30';
  ctx.fillStyle=legCol;
  ctx.fillRect(-3*u,2*u+legOff,4*u,8*u);ctx.fillRect(1*u,2*u-legOff,4*u,8*u);
  let bc=variant===0?'#4a3030':'#3a4030';
  let bc2=variant===0?'#5a3838':'#4a5038';
  ctx.fillStyle=bc;ctx.fillRect(-7*u,-8*u-bodyBob,14*u,14*u);
  ctx.fillStyle=bc2;ctx.fillRect(-7*u,-8*u-bodyBob,14*u,3*u);
  ctx.fillStyle=variant===0?'#3a2020':'#2a3020';
  ctx.fillRect(-2*u,-3*u-bodyBob,6*u,4*u);
  let armReach=atkAnim>0?ZOMBIE_ATK_RANGE*s/2*atkAnim:0;
  let armSpread=atkAnim>0?atkAnim*3*u:0;
  let armSwing=isMoving&&atkAnim<=0?Math.sin(walk*Math.PI*2)*2*u:0;
  ctx.fillStyle='#5a7a50';
  ctx.fillRect(7*u,-4*u-bodyBob-armSpread+armSwing,4*u+armReach,8*u);
  ctx.fillRect(-11*u,-4*u-bodyBob+armSpread-armSwing,4*u+(atkAnim>0?armReach*0.6:0),8*u);
  ctx.fillStyle='#4a6a40';
  ctx.fillRect(9*u+armReach,-5*u-bodyBob-armSpread,5*u,3*u);ctx.fillRect(9*u+armReach,2*u-bodyBob-armSpread,5*u,3*u);
  if(atkAnim>0){
   ctx.fillRect(-11*u+armReach*0.6,-5*u-bodyBob+armSpread,5*u,3*u);
   ctx.fillRect(-11*u+armReach*0.6,2*u-bodyBob+armSpread,5*u,3*u);
  }else{
   ctx.fillRect(-11*u,-5*u-bodyBob,3*u,3*u);
  }
  ctx.fillStyle=isBoss?'#5a6a50':'#6a8a60';ctx.fillRect(-5*u,-15*u-bodyBob,10*u,9*u);
  ctx.fillStyle='#5a7a50';ctx.fillRect(-5*u,-8*u-bodyBob,10*u,2*u);
  ctx.fillStyle='#4a6a40';ctx.fillRect(-3*u,-14*u-bodyBob,3*u,3*u);
  ctx.fillStyle=isBoss?'#ff0':'#f22';ctx.fillRect(2*u,-13*u-bodyBob,3*u,3*u);
  if(atkAnim>0){
   let jawOpen=atkAnim*4*u;
   ctx.fillStyle='#300';ctx.fillRect(0*u,-8*u-bodyBob,5*u,3*u+jawOpen);
   ctx.fillStyle='#fff';
   ctx.fillRect(1*u,-8*u-bodyBob,1*u,1.5*u);ctx.fillRect(3*u,-8*u-bodyBob,1*u,1.5*u);
   ctx.fillRect(1*u,-6*u-bodyBob+jawOpen,1*u,1.5*u);ctx.fillRect(3*u,-6*u-bodyBob+jawOpen,1*u,1.5*u);
   ctx.fillStyle='rgba(180,0,0,0.6)';ctx.fillRect(2*u,-5*u-bodyBob+jawOpen,1*u,2*u+atkAnim*2*u);
  }
  if(isBoss){
   ctx.fillStyle='#aa6600';
   ctx.fillRect(-4*u,-18*u-bodyBob,2*u,4*u);ctx.fillRect(2*u,-18*u-bodyBob,2*u,4*u);
  }
 }
 ctx.restore();
}
function initPlayer(){
 let pvStat=5+rand(0,2);
 state.player={
  x:Math.floor(MAP_W/2),y:Math.floor(MAP_H/2),
  hp:BASE_HP_PLAYER+pvStat*5,maxHp:BASE_HP_PLAYER+pvStat*5,
  pvStat,atk:5+rand(0,2),armor:5+rand(0,2),precision:5+rand(0,2),speed:5+rand(0,2),
  inventory:[{type:'weapon',name:'bat',ammo:0},null,null,null],healSlot:null,
  selectedSlot:0,cooldown:0,angle:0,
  fx:Math.floor(MAP_W/2),fy:Math.floor(MAP_H/2),
  swingTimer:0,swingDuration:25,hitSlowTimer:0,isAttacking:false,
  postAttackSlow:0,xp:0,level:1,ammo:0,smgHeat:0,smgJammed:false,smgJamCooldown:0,kbVx:0,kbVy:0,chargedCooldown:0,chargeHold:0,coins:0
 };
}
function addCoins(p,n){p.coins+=n;addFloater(p.fx,p.fy,'+'+n+'$','#ff0')}
function addXP(p,amount){
 p.xp+=amount;
 let need=XP_PER_LEVEL+(p.level-1)*10;
 while(p.xp>=need){p.xp-=need;p.level++;levelUp(p);need=XP_PER_LEVEL+(p.level-1)*10}
}
function levelUp(p){
 let stats=['pvStat','atk','armor','precision','speed'];
 p.maxHp+=5;p.hp=Math.min(p.hp+5,p.maxHp);
 let parts=['+5 PV'];
 for(let s of stats){
  let boost=rand(0,3);
  if(boost>0){applyStat(p,s,boost);parts.push('+'+boost+' '+statName(s))}
 }
 msg('Niveau '+p.level+'! '+parts.join(', '),3000);
}
function applyStat(p,stat,amount){
 p[stat]+=amount;
 if(stat==='pvStat'){p.maxHp=BASE_HP_PLAYER+p.pvStat*5;p.hp=Math.min(p.hp+amount*5,p.maxHp)}
}
function statName(s){
 switch(s){case 'pvStat':return'PV';case 'atk':return'ATK';case 'armor':return'ARM';case 'precision':return'PRE';case 'speed':return'VIT'}return s;
}
function getZombieLevel(mapIdx){
 let mi=mapIdx!==undefined?mapIdx:state.mapIndex;
 let lv=1+mi;
 return lv;
}
function getBossLevel(mapIdx){let mi=mapIdx!==undefined?mapIdx:state.mapIndex;return getZombieLevel(mi)+5+Math.floor(mi/5)*5}
function getNPCLevel(mapIdx){let mi=mapIdx!==undefined?mapIdx:state.mapIndex;return 1+mi}
function makeZombie(x,y,level,forceRunner){
 let lv=level||getZombieLevel();
 let isRunner=forceRunner||(prng()<0.15);
 let pvStat=isRunner?rand(1,3)*lv:rand(1,10)*lv;
 let hp=isRunner?Math.floor((BASE_HP_ZOMBIE+pvStat*3)*0.7):(BASE_HP_ZOMBIE+pvStat*5);
 let spd=isRunner?Math.max(3,Math.ceil((rand(3,5)+Math.floor(lv/2))*1.1)):Math.max(1,rand(1,3)+Math.floor(lv/3));
 return{x,y,hp,maxHp:hp,atk:isRunner?rand(1,5)*lv:rand(1,10)*lv,armor:isRunner?rand(0,2)+lv:rand(1,5)+lv*2,precision:rand(1,8)+lv,
  speed:spd,fx:x,fy:y,
  cooldown:0,atkCooldown:isRunner?Math.max(20,40-lv*2):Math.max(30,60-lv*3),atkTimer:0,atkDuration:isRunner?10:15,
  alive:true,alerted:false,variant:rand(0,1),isRunner,
  angle:prng()*Math.PI*2,hitSlowTimer:0,isAttacking:false,
  postAttackSlow:0,isBoss:false,speech:null,speechTimer:0,alertDelay:0,jumpAnim:0,
  stuckTimer:0,stuckOriginX:x,stuckOriginY:y,stuckPerp:0,stuckPerpTimer:0,kbVx:0,kbVy:0,playerDamaged:false};
}
function makeBossZombie(x,y){
 let lv=getBossLevel();
 let hp=300+lv*50;
 return{x,y,hp,maxHp:hp,atk:20+lv*8,armor:15+lv*3,precision:8+lv,
  speed:2+Math.floor(lv/4),fx:x,fy:y,
  cooldown:0,atkCooldown:50,atkTimer:0,atkDuration:20,
  alive:true,alerted:true,variant:0,
  angle:0,hitSlowTimer:0,isAttacking:false,
  postAttackSlow:0,isBoss:true,throwCooldown:0,throwTimer:0,meleeCooldown:0,kbVx:0,kbVy:0,
  alertDelay:60,jumpAnim:20,stuckTimer:0,stuckOriginX:x,stuckOriginY:y,stuckPerp:0,stuckPerpTimer:0,playerDamaged:false};
}
function makeSpitter(x,y){
 let lv=getZombieLevel();
 let hp=150+lv*30;
 return{x,y,hp,maxHp:hp,atk:3+lv,armor:5+lv*2,precision:6+lv,
  speed:1,fx:x,fy:y,
  cooldown:0,atkCooldown:90,atkTimer:0,atkDuration:20,
  alive:true,alerted:false,variant:0,
  angle:prng()*Math.PI*2,hitSlowTimer:0,isAttacking:false,
  postAttackSlow:0,isBoss:false,isSpitter:true,
  speech:null,speechTimer:0,alertDelay:0,jumpAnim:0,
  stuckTimer:0,stuckOriginX:x,stuckOriginY:y,stuckPerp:0,stuckPerpTimer:0,kbVx:0,kbVy:0,
  spitCooldown:0,hearRadius:25,seeRadius:5,playerDamaged:false};
}
function makeNPC(x,y,weapon,isLeader,npcType,level){
 let lv=level||getNPCLevel();
 let hp=(isLeader?105:60)+lv*10;
 let type=npcType||'fighter';
 let seeRadius=type==='scout'?0.5:1; // scout seen radius multiplier
 return{x,y,fx:x,fy:y,hp,maxHp:hp,
  atk:(isLeader?5:2)+lv*2,armor:(isLeader?5:2)+lv,precision:(isLeader?6:3)+lv,speed:isLeader?3:2,
  weapon,isLeader,alive:true,angle:0,_moving:false,isNPC:true,
  cooldown:0,atkCooldown:weapon==='bat'?30:25,speech:null,speechTimer:0,
  stuckTimer:0,stuckOriginX:x,stuckOriginY:y,stuckPerp:0,stuckPerpTimer:0,
  retreatTimer:0,retreatAngle:0,kbVx:0,kbVy:0,
  npcType:type,rallyCooldown:0,abilityCooldown:0,
  rallyBuff:0,rallyDmgMult:1,rallyHpMult:1,
  seeRadius,groupId:null,
  homeBase:null,notFightingTimer:0,healMode:false,healAmount:0,
  healTick:0,wanderAngle:prng()*Math.PI*2,wanderTimer:rand(60,180),exiting:false,exitX:0,exitY:0,defenseX:0,defenseY:0,defenseReached:false,patrolGroup:undefined,patrolCenterX:0,patrolCenterY:0,
  hostileTo:null,playerDamaged:false}; // 'player','zombie', or null
}
function makeMadman(x,y,mapIdx){
 let lv=getNPCLevel(mapIdx);
 let madman=makeNPC(x,y,'gun',false,'fighter',lv);
 madman.isMadman=true;madman.name='Fou';madman.hp=150+lv*15;madman.maxHp=madman.hp;
 madman.speed=4;madman.precision=7;madman.atk=6+lv;
 madman.patrolIdx=0;madman.boostCooldown=0;madman.boostTimer=0;madman.enraged=false;
 madman.baseAtk=madman.atk;madman.baseSpeed=madman.speed;madman.basePrecision=madman.precision;madman.baseArmor=madman.armor;
 madman.madmanHouseTrigger=0;
 return madman;
}
function makeInjuredAlly(x,y,mapIdx){
 let lv=mapIdx!==undefined?mapIdx+1:state.mapIndex+1;
 let weapons=['bat','gun','shotgun','smg'];
 let wep=weapons[rand(0,3)];
 let ally=makeNPC(x,y,wep,false,'fighter',lv);
 ally.isAlly=true;ally.isInjured=true;ally.recruited=false;
 ally.hp=Math.ceil(ally.maxHp*0.2);
 ally.npcType='ally';ally.hostileTo=null;
 ally.followTarget=null;
 return ally;
}
function makeNecromancer(x,y){
 let lv=getBossLevel();
 let hp=250+lv*40;
 let z={x,y,hp,maxHp:hp,atk:10+lv*3,armor:10+lv*2,precision:6+lv,
  speed:1,fx:x,fy:y,
  cooldown:0,atkCooldown:60,atkTimer:0,atkDuration:20,
  alive:true,alerted:false,variant:0,
  angle:prng()*Math.PI*2,hitSlowTimer:0,isAttacking:false,
  postAttackSlow:0,isBoss:false,isNecromancer:true,
  speech:null,speechTimer:0,alertDelay:0,jumpAnim:0,
  stuckTimer:0,stuckOriginX:x,stuckOriginY:y,stuckPerp:0,stuckPerpTimer:0,kbVx:0,kbVy:0,
  resurrectionCooldown:0,playerDamaged:false};
 return z;
}
function spawnNPCGroup(bld,mapIdx){
 let npcs=[];
 let lv=getNPCLevel(mapIdx);
 let gid=prng();
 let gx=rand(bld.x+1,bld.x+bld.w-2),gy=rand(bld.y+1,bld.y+bld.h-2);
 let g1=makeNPC(gx,gy,'smg',false,'grenadier',lv);g1.groupId=gid;npcs.push(g1);
 if(prng()<0.5){
  let gx2=rand(bld.x+1,bld.x+bld.w-2),gy2=rand(bld.y+1,bld.y+bld.h-2);
  let g2=makeNPC(gx2,gy2,'smg',false,'grenadier',lv);g2.groupId=gid;npcs.push(g2);
 }
 if(prng()<0.25){
  let mx=rand(bld.x+1,bld.x+bld.w-2),my=rand(bld.y+1,bld.y+bld.h-2);
  let m=makeNPC(mx,my,'gun',false,'medic',lv);m.groupId=gid;npcs.push(m);
 }
 if(prng()<0.25){
  let cx=rand(bld.x+1,bld.x+bld.w-2),cy=rand(bld.y+1,bld.y+bld.h-2);
  let c=makeNPC(cx,cy,'shotgun',true,'fighter',lv);c.groupId=gid;npcs.push(c);
  let ex=rand(bld.x+1,bld.x+bld.w-2),ey=rand(bld.y+1,bld.y+bld.h-2);
  let eg=makeNPC(ex,ey,'smg',false,'grenadier',lv);eg.groupId=gid;npcs.push(eg);
 }
 let sx=rand(bld.x+1,bld.x+bld.w-2),sy=rand(bld.y+1,bld.y+bld.h-2);
 let sc=makeNPC(sx,sy,'gun',false,'scout',lv);sc.groupId=gid;npcs.push(sc);
 return npcs;
}
function setGroupHostile(npc,target){
 if(npc.hostileTo===target)return;
 npc.hostileTo=target;npc.speech='HE!';npc.speechTimer=120;
 if(npc.groupId){
  for(let n of state.npcs){
   if(n.alive&&n!==npc&&n.groupId===npc.groupId&&n.hostileTo!==target){
    n.hostileTo=target;n.speech='A L\'ATTAQUE!';n.speechTimer=120;
   }
  }
 }
}
function spawnOutsideBuilding(bld){
 for(let a=0;a<80;a++){
  let side=rand(0,3),x,y;
  if(side===0){x=rand(bld.x-3,bld.x+bld.w+2);y=rand(bld.y-4,bld.y-2)}
  else if(side===1){x=rand(bld.x-3,bld.x+bld.w+2);y=rand(bld.y+bld.h+1,bld.y+bld.h+3)}
  else if(side===2){x=rand(bld.x-4,bld.x-2);y=rand(bld.y-3,bld.y+bld.h+2)}
  else{x=rand(bld.x+bld.w+1,bld.x+bld.w+3);y=rand(bld.y-3,bld.y+bld.h+2)}
  if(x>=1&&y>=1&&x<MAP_W-1&&y<MAP_H-1&&canWalk(x,y))return{x,y};
 }
 return{x:clamp(bld.x-2,1,MAP_W-2),y:clamp(bld.y-2,1,MAP_H-2)};
}
function clearExitZone(map,ex,ey,radius){
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){
  let tx=ex+dx,ty=ey+dy;
  if(tx>=0&&ty>=0&&tx<MAP_W&&ty<MAP_H){
   let t=map[ty][tx];
   if(t===1||t===5||t===6)map[ty][tx]=0;
  }
 }
}
function pickExitPos(side){
 let ex,ey;
 if(side===0){ex=rand(3,8);ey=rand(MAP_H/4|0,MAP_H*3/4|0)}
 else if(side===1){ex=rand(MAP_W-9,MAP_W-4);ey=rand(MAP_H/4|0,MAP_H*3/4|0)}
 else if(side===2){ey=rand(3,8);ex=rand(MAP_W/4|0,MAP_W*3/4|0)}
 else{ey=rand(MAP_H-9,MAP_H-4);ex=rand(MAP_W/4|0,MAP_W*3/4|0)}
 return{x:ex,y:ey};
}
function saveCurrentMap(){
 let data={
  map:state.map,buildings:state.buildings,doors:state.doors.map(d=>({x:d.x,y:d.y,barricaded:d.barricaded,open:d.open,buildingIdx:state.buildings.indexOf(d.building),doorHp:d.doorHp,maxDoorHp:d.maxDoorHp,doorType:d.doorType||'normal'})),
  items:state.items,
  zombies:state.zombies.map(z=>({...z})),
  npcs:state.npcs.filter(n=>!n.recruited).map(n=>{let o={...n};o.homeBaseIdx=n.homeBase?state.buildings.indexOf(n.homeBase):-1;delete o.homeBase;return o}),
  barrels:state.barrels.map(b=>({...b})),
  cityWalls:state.cityWalls,
  exitPrev:state.exitPrev,exitNext:state.exitNext,
  baseEvent:state.baseEvent,baseEventActive:state.baseEventActive,baseRewardGiven:state.baseRewardGiven,
  baseBoss:state.baseBoss?{...state.baseBoss}:null,
  hordeSpawned:state.hordeSpawned||0,currentWave:state.currentWave,
  mapType:state.currentMapType||'normal'
 };
 state.savedMaps[state.mapIndex]=data;
}
function loadMap(idx){
 let data=state.savedMaps[idx];
 if(!data)return false;
 state.map=data.map;state.buildings=data.buildings;
 state.doors=data.doors.map(d=>{let door={...d,building:data.buildings[d.buildingIdx]};delete door.buildingIdx;if(!door.doorType)door.doorType='normal';return door});
 state.items=[...data.items];
 state.zombies=data.zombies.map(z=>({...z}));
 state.npcs=data.npcs.map(n=>{let o={...n};o.homeBase=n.homeBaseIdx>=0?data.buildings[n.homeBaseIdx]:null;delete o.homeBaseIdx;return o});
 state.barrels=data.barrels.map(b=>({...b}));
 state.cityWalls=data.cityWalls;
 state.exitPrev=data.exitPrev;state.exitNext=data.exitNext;
 state.baseEvent=data.baseEvent;state.baseEventActive=data.baseEventActive;state.baseRewardGiven=data.baseRewardGiven;
 state.baseBoss=data.baseBoss;state.currentWave=data.currentWave;
 state.hordeSpawned=data.hordeSpawned||0;
 state.currentMapType=data.mapType||'normal';
 state.bullets=[];state.rocks=[];state.rockWarnings=[];state.explosions=[];state.dmgFloaters=[];state.confetti=[];state.grenades=[];
 state.playerRallyBuff=0;state.playerRallyDmgMult=1;
 rebuildSpatialMaps();
 return true;
}
function genMap(){
 seedRNG(state.mapIndex*2654435761+42);
 state.map=Array.from({length:MAP_H},()=>Array(MAP_W).fill(0));
 state.buildings=[];state.doors=[];state.items=[];state.zombies=[];
 state.bullets=[];state.barrels=[];state.barricades=[];state.cityWalls=[];
 state.npcs=[];state.rocks=[];state.rockWarnings=[];state.explosions=[];state.dmgFloaters=[];state.confetti=[];state.grenades=[];state.spits=[];state.acidPools=[];
 state.baseBoss=null;state.baseEventActive=false;state.baseRewardGiven=false;state.hordeSpawned=0;
 state.playerRallyBuff=0;state.playerRallyDmgMult=1;
 let{map,buildings,doors,items,zombies}=state;
 let mi=state.mapIndex;
 let roll=prng();
 let isBaseLevel=roll<0.1&&mi>=4;
 let isZombieBase=!isBaseLevel&&roll<0.2&&mi>=2;
 let isMadmanBase=!isBaseLevel&&!isZombieBase&&roll<0.3&&mi>=2;
 state.baseEvent=isBaseLevel;
 state.currentMapType=isBaseLevel?'military':isZombieBase?'zombie_base':isMadmanBase?'madman_base':'normal';
 let nextSide=prng()<0.5?1:3;
 let exitNextPos=pickExitPos(nextSide);
 let exitPrevPos=mi>0?pickExitPos(nextSide===1?0:2):{x:-10,y:-10};
 let exitClearR=6; // reservation radius (slightly larger than clear radius)
 function isInExitZone(bx,by,bw,bh){
  for(let ep of[exitNextPos,exitPrevPos]){
   if(ep.x<0)continue;
   if(bx-exitClearR<ep.x+exitClearR&&bx+bw+exitClearR>ep.x-exitClearR&&
      by-exitClearR<ep.y+exitClearR&&by+bh+exitClearR>ep.y-exitClearR)return true;
  }
  return false;
 }
 let targetBuildings=isBaseLevel?rand(4,6):rand(6,10);
 let attempts=0;
 if(isBaseLevel){
  let placed=false;
  for(let a=0;a<200&&!placed;a++){
   let w=rand(10,14),h=rand(8,11),bx=rand(2,MAP_W-w-2),by=rand(2,MAP_H-h-2);
   let ok=true;
   for(let b of buildings){if(bx<b.x+b.w+2&&bx+w+2>b.x&&by<b.y+b.h+2&&by+h+2>b.y){ok=false;break}}
   if(!ok||isInExitZone(bx,by,w,h))continue;
   for(let y=by;y<by+h;y++)for(let x=bx;x<bx+w;x++){
    map[y][x]=(y===by||y===by+h-1||x===bx||x===bx+w-1)?1:2;
   }
   let bld={x:bx,y:by,w,h,searched:false,isHQ:true,baseType:'military'};
   buildings.push(bld);
   let doorPositions=[
    {x:rand(bx+2,bx+w-3),y:by},
    {x:rand(bx+2,bx+w-3),y:by+h-1},
    {x:bx,y:rand(by+2,by+h-3)},
    {x:bx+w-1,y:rand(by+2,by+h-3)}
   ];
   for(let dp of doorPositions){
    map[dp.y][dp.x]=3;
    doors.push({x:dp.x,y:dp.y,barricaded:true,open:false,building:bld,doorHp:200,maxDoorHp:200,doorType:'npc'});
   }
   placed=true;
  }
 }
 while(buildings.length<targetBuildings&&attempts<400){
  attempts++;
  let w=rand(5,9),h=rand(6,8),bx=rand(1,MAP_W-w-1),by=rand(1,MAP_H-h-1);
  let ok=true;
  for(let b of buildings){if(bx<b.x+b.w+2&&bx+w+2>b.x&&by<b.y+b.h+2&&by+h+2>b.y){ok=false;break}}
  if(!ok||isInExitZone(bx,by,w,h))continue;
  for(let y=by;y<by+h;y++)for(let x=bx;x<bx+w;x++){
   map[y][x]=(y===by||y===by+h-1||x===bx||x===bx+w-1)?1:2;
  }
  let doorSide=rand(0,3),doorPos;
  if(doorSide===0)doorPos={x:rand(bx+1,bx+w-2),y:by};
  else if(doorSide===1)doorPos={x:rand(bx+1,bx+w-2),y:by+h-1};
  else if(doorSide===2)doorPos={x:bx,y:rand(by+1,by+h-2)};
  else doorPos={x:bx+w-1,y:rand(by+1,by+h-2)};
  map[doorPos.y][doorPos.x]=3;
  let bld={x:bx,y:by,w,h,searched:false,zombieCount:0,zombieTriggered:false,triggerTimer:0,baseType:null};
  buildings.push(bld);
  doors.push({x:doorPos.x,y:doorPos.y,barricaded:false,open:false,building:bld,doorHp:3,maxDoorHp:3,doorType:'normal'});
  let winSide=(doorSide+rand(1,3))%4,winPos;
  if(winSide===0)winPos={x:rand(bx+1,bx+w-2),y:by};
  else if(winSide===1)winPos={x:rand(bx+1,bx+w-2),y:by+h-1};
  else if(winSide===2)winPos={x:bx,y:rand(by+1,by+h-2)};
  else winPos={x:bx+w-1,y:rand(by+1,by+h-2)};
  if(map[winPos.y][winPos.x]===1){map[winPos.y][winPos.x]=6}
 }
 for(let i=0;i<rand(8,16);i++){
  let horizontal=prng()<0.5;
  let len=rand(3,8);
  let wx=rand(1,MAP_W-len-1),wy=rand(1,MAP_H-len-1);
  let valid=true;
  for(let j=0;j<len;j++){
   let cx=horizontal?wx+j:wx,cy=horizontal?wy:wy+j;
   if(map[cy][cx]!==0){valid=false;break}
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    let nx=cx+dx,ny=cy+dy;
    if(nx>=0&&ny>=0&&nx<MAP_W&&ny<MAP_H&&map[ny][nx]===3){valid=false;break}
   }
   if(!valid)break;
  }
  if(!valid)continue;
  for(let j=0;j<len;j++){
   let cx=horizontal?wx+j:wx,cy=horizontal?wy:wy+j;
   map[cy][cx]=5;state.cityWalls.push({x:cx,y:cy,horiz:horizontal});
  }
 }
 let usedPos=new Set();
 function itemPos(x,y){return y*MAP_W+x}
 function placeItem(item){if(!usedPos.has(itemPos(item.x,item.y))&&canWalk(item.x,item.y)){usedPos.add(itemPos(item.x,item.y));items.push(item);return true}return false}
 for(let bi=0;bi<buildings.length;bi++){
  let b=buildings[bi];
  if(b.isHQ)continue;
  let ix=rand(b.x+1,b.x+b.w-2),iy=rand(b.y+1,b.y+b.h-2);
  if(prng()<0.08)placeItem({x:ix,y:iy,type:'weapon',name:prng()<0.5?'gun':prng()<0.5?'shotgun':'smg'});
  if(prng()<0.1){let mx=rand(b.x+1,b.x+b.w-2),my=rand(b.y+1,b.y+b.h-2);placeItem({x:mx,y:my,type:'bandage'})}
  if(prng()<0.05){let ax=rand(b.x+1,b.x+b.w-2),ay=rand(b.y+1,b.y+b.h-2);placeItem({x:ax,y:ay,type:'ammo'})}
  if(prng()<0.1){let mx2=rand(b.x+1,b.x+b.w-2),my2=rand(b.y+1,b.y+b.h-2);placeItem({x:mx2,y:my2,type:'coin'})}
 }
 if(prng()<0.05){
  let x,y,tries=0;
  do{x=rand(1,MAP_W-2);y=rand(1,MAP_H-2);tries++}while((map[y][x]!==0)&&tries<100);
  if(tries<100)placeItem({x,y,type:'weapon',name:'gun'});
 }
 for(let i=0;i<rand(2,5);i++){
  let x,y,tries=0;
  do{x=rand(1,MAP_W-2);y=rand(1,MAP_H-2);tries++}while((map[y][x]!==0)&&tries<100);
  if(tries<100)placeItem({x,y,type:'coin'});
 }
 for(let i=0;i<rand(1,2);i++){
  let x,y,tries=0;
  do{x=rand(1,MAP_W-2);y=rand(1,MAP_H-2);tries++}while((map[y][x]!==0)&&tries<100);
  if(tries<100)placeItem({x,y,type:'ammo'});
 }
 let spawnBld=buildings.find(bl=>!bl.baseType);
 if(spawnBld)spawnBld.isSpawn=true;
 let exitSafeR=8;
 function isInExitSafeZone(ex,ey){
  for(let ep of[exitNextPos,exitPrevPos]){
   if(ep.x<0)continue;
   if(distXY(ex,ey,ep.x,ep.y)<exitSafeR)return true;
  }
  return false;
 }
 let totalNpcs=state.npcs.length;
 if(isBaseLevel){
  let baseBld=buildings[0];
  for(let g=0;g<2;g++){
   let group=spawnNPCGroup(baseBld,mi);
   for(let n of group){
    if(totalNpcs<200){
     let pos=spawnOutsideBuilding(baseBld);
     n.x=pos.x;n.y=pos.y;n.fx=pos.x;n.fy=pos.y;
     n.homeBase=baseBld;
     state.npcs.push(n);totalNpcs++;
    }
   }
  }
  if(!state.npcs.find(n=>n.isLeader)){
   let lx=baseBld.x+Math.floor(baseBld.w/2),ly=baseBld.y+Math.floor(baseBld.h/2);
   let leader=makeNPC(lx,ly,'shotgun',true,'fighter',getNPCLevel(mi)+rand(2,3));
   leader.homeBase=baseBld;
   state.npcs.push(leader);totalNpcs++;
  }
  let borderZ=rand(16,28);
  for(let i=0;i<borderZ;i++){
   let side=rand(0,3),x,y;
   if(side===0){x=rand(0,MAP_W-1);y=rand(0,2)}
   else if(side===1){x=rand(0,MAP_W-1);y=rand(MAP_H-3,MAP_H-1)}
   else if(side===2){x=rand(0,2);y=rand(0,MAP_H-1)}
   else{x=rand(MAP_W-3,MAP_W-1);y=rand(0,MAP_H-1)}
   if(map[y][x]===0)zombies.push(makeZombie(x,y,getZombieLevel(mi)));
  }
 }else if(isZombieBase){
  let zBaseBld=buildings.find(b=>!b.isHQ);
  if(zBaseBld){
   zBaseBld.baseType='zombie_base';zBaseBld.searched=true;
   for(let d of doors){if(d.building===zBaseBld){d.doorHp=50;d.maxDoorHp=50;d.doorType='zombie';d.barricaded=true;d.open=false}}
  }
  let zLv=getZombieLevel(mi)+rand(5,10);
  let insideCount=zBaseBld?Math.ceil(40/3):0;
  for(let i=0;i<40;i++){
   let x,y,tries=0;
   if(i<insideCount&&zBaseBld){
    do{x=rand(zBaseBld.x+1,zBaseBld.x+zBaseBld.w-2);y=rand(zBaseBld.y+1,zBaseBld.y+zBaseBld.h-2);tries++}while(map[y][x]!==2&&tries<100);
   }else{
    do{x=rand(2,MAP_W-3);y=rand(2,MAP_H-3);tries++}while(map[y][x]!==0&&tries<100);
   }
   if(tries<100){let z=makeZombie(x,y,zLv);z.alerted=true;z.alertDelay=60;z.jumpAnim=20;zombies.push(z)}
  }
 }else if(isMadmanBase){
  let mBaseBld=buildings.find(b=>!b.isHQ);
  if(mBaseBld){
   mBaseBld.baseType='madman_base';mBaseBld.searched=true;
   for(let d of doors){if(d.building===mBaseBld){d.doorHp=50;d.maxDoorHp=50;d.doorType='madman';d.barricaded=true;d.open=false}}
  }
  let mLv=getNPCLevel(mi)+rand(1,2);
  for(let m=0;m<rand(1,2);m++){
   let mx,my,mt=0;
   do{mx=rand(2,MAP_W-3);my=rand(2,MAP_H-3);mt++}while(map[my][mx]!==0&&mt<100);
   if(mt<100){let mm=makeMadman(mx,my,mi);mm.atk+=mLv;state.npcs.push(mm);totalNpcs++}
  }
  let zLv=getZombieLevel(mi)+rand(1,2);
  for(let i=0;i<10;i++){
   let x,y,tries=0;
   do{x=rand(2,MAP_W-3);y=rand(2,MAP_H-3);tries++}while(map[y][x]!==0&&tries<100);
   if(tries<100)zombies.push(makeZombie(x,y,zLv));
  }
 }
 if(!isBaseLevel){
  let zCount=rand(10,40);
  for(let i=0;i<zCount;i++){
   let x,y,tries=0;
   if(prng()<0.3&&buildings.length>0){
    let b=buildings[rand(0,buildings.length-1)];
    if(!b.isHQ&&!b.isSpawn){
     x=rand(b.x+1,b.x+b.w-2);y=rand(b.y+1,b.y+b.h-2);
     if(map[y]&&map[y][x]===2){
      let z=makeZombie(x,y,getZombieLevel(mi));
      z.inBuilding=true;
      zombies.push(z);
      if(b.zombieCount!==undefined)b.zombieCount++;
      continue;
     }
    }
   }
   do{x=rand(2,MAP_W-3);y=rand(2,MAP_H-3);tries++}while((map[y][x]!==0||isInExitSafeZone(x,y))&&tries<100);
   if(tries<100){
    let z=makeZombie(x,y,getZombieLevel(mi));
    z.wanderAngle=prng()*Math.PI*2;z.wanderTimer=rand(60,180);
    zombies.push(z);
   }
  }
  let npcGroupCount=rand(0,3);
  let nonHQBuildings=buildings.filter(b=>!b.isHQ&&!b.baseType&&!b.isSpawn);
  for(let g=0;g<npcGroupCount&&totalNpcs<200;g++){
   if(nonHQBuildings.length>0){
    let bld=nonHQBuildings[rand(0,nonHQBuildings.length-1)];
    let group=spawnNPCGroup(bld,mi);
    for(let n of group){
     if(totalNpcs<200){
      let pos=spawnOutsideBuilding(bld);
      n.x=pos.x;n.y=pos.y;n.fx=pos.x;n.fy=pos.y;
      n.homeBase=bld;
      state.npcs.push(n);totalNpcs++;
     }
    }
   }
  }
  if(!isMadmanBase&&mi>=2){
   let madCount=prng()<0.08?1:0;
   for(let m=0;m<madCount;m++){
    let mx,my,mt=0;
    do{mx=rand(2,MAP_W-3);my=rand(2,MAP_H-3);mt++}while((map[my][mx]!==0||isInExitSafeZone(mx,my))&&mt<100);
    if(mt<100&&totalNpcs<200){let mm=makeMadman(mx,my,mi);state.npcs.push(mm);totalNpcs++}
   }
  }
 }
 if(prng()<0.5){
  let spitterBld=buildings.filter(b=>!b.isHQ&&!b.baseType&&!b.isSpawn);
  if(spitterBld.length>0){
   let bld=spitterBld[rand(0,spitterBld.length-1)];
   let sx=rand(bld.x+1,bld.x+bld.w-2),sy=rand(bld.y+1,bld.y+bld.h-2);
   if(map[sy][sx]===2){let sp=makeSpitter(sx,sy);sp.alerted=false;zombies.push(sp)}
  }
 }
 // Injured ally spawn (40% chance)
 if(prng()<0.4){
  let allyBlds=buildings.filter(b=>!b.isHQ&&!b.baseType&&!b.isSpawn);
  let allyOutside=prng()<0.4;
  if(allyOutside){
   let ax,ay,tries=0;
   do{ax=rand(3,MAP_W-4);ay=rand(3,MAP_H-4);tries++}while((map[ay][ax]!==0||isInExitSafeZone(ax,ay))&&tries<100);
   if(tries<100){let ally=makeInjuredAlly(ax,ay,mi);state.npcs.push(ally);totalNpcs++}
  }else if(allyBlds.length>0){
   let bld=allyBlds[rand(0,allyBlds.length-1)];
   let ax=rand(bld.x+1,bld.x+bld.w-2),ay=rand(bld.y+1,bld.y+bld.h-2);
   if(map[ay][ax]===2){let ally=makeInjuredAlly(ax,ay,mi);state.npcs.push(ally);totalNpcs++}
  }
 }
 // Necromancer spawn (15% chance, map 3+)
 if(mi>=3&&prng()<0.15){
  let nx,ny,tries=0;
  do{nx=rand(3,MAP_W-4);ny=rand(3,MAP_H-4);tries++}while((map[ny][nx]!==0||isInExitSafeZone(nx,ny))&&tries<100);
  if(tries<100){let necro=makeNecromancer(nx,ny);zombies.push(necro)}
 }
 for(let i=0;i<rand(2,10);i++){
  let x,y,tries=0;
  do{x=rand(1,MAP_W-2);y=rand(1,MAP_H-2);tries++}while(map[y][x]!==0&&tries<50);
  if(tries<50)state.barrels.push({x,y,fx:x+0.5,fy:y+0.5,hp:20,alive:true});
 }
 clearExitZone(map,exitNextPos.x,exitNextPos.y,5);
 map[exitNextPos.y][exitNextPos.x]=4;
 state.exitNext=exitNextPos;
 if(mi>0){
  clearExitZone(map,exitPrevPos.x,exitPrevPos.y,5);
  map[exitPrevPos.y][exitPrevPos.x]=4;
  state.exitPrev=exitPrevPos;
 }else{
  state.exitPrev={x:-10,y:-10};
 }
 state.escapeZone=state.exitNext;
 rebuildSpatialMaps();
}
function spawnPlayerInBuilding(){
 if(!state.buildings.length)return;
 let b=state.buildings.find(bl=>!bl.baseType);
 if(!b){
  let pos=spawnOutsideBuilding(state.buildings[0]);
  let p=state.player;
  p.x=pos.x;p.y=pos.y;p.fx=p.x;p.fy=p.y;
  return;
 }
 let p=state.player;
 p.x=b.x+Math.floor(b.w/2);p.y=b.y+Math.floor(b.h/2);
 p.fx=p.x;p.fy=p.y;b.searched=true;
}
function spawnPlayerAtExit(exit){
 let p=state.player;
 p.x=exit.x;p.y=exit.y;p.fx=exit.x;p.fy=exit.y;
 p.hitSlowTimer=0;p.postAttackSlow=0;p.smgHeat=0;
}
function alertZombiesNear(px,py,radius){
 let playerInside=isInBuilding(fl(px),fl(py));
 for(let z of state.zombies){
  if(!z.alive)continue;
  let d=distXY(px,py,z.fx,z.fy);
  let effectiveRadius=z.isSpitter?Math.max(radius,z.hearRadius):radius;
  if(d>effectiveRadius)continue;
  if(isWallBetween(px,py,z.fx,z.fy))continue;
  if(playerInside&&!isInBuilding(z.x,z.y))continue;
  if(z.alerted)continue;
  let sr=z.isSpitter?z.seeRadius:SIGHT_RADIUS;
  if(d<=sr){z.alerted=true;z.alertDelay=60;z.jumpAnim=20;playSound('zombie_alert')}
  else{z.investigateX=px;z.investigateY=py;z.investigateTimer=120}
 }
}
function gunShotSpawnZombies(weaponName){
 if(state.tick-state.lastGunSpawnTick<GUNSHOT_SPAWN_COOLDOWN)return;
 let count=GUNSHOT_SPAWN_COUNT[weaponName]||0;
 if(count<=0)return;
 state.lastGunSpawnTick=state.tick;
 let p=state.player;
 let dTop=p.fy,dBot=MAP_H-1-p.fy,dLeft=p.fx,dRight=MAP_W-1-p.fx;
 let minD=Math.min(dTop,dBot,dLeft,dRight);
 let side=minD===dTop?0:minD===dBot?1:minD===dLeft?2:3;
 for(let i=0;i<count;i++){
  let x,y,found=false;
  let spread=15;
  let pxI=fl(p.fx),pyI=fl(p.fy);
  for(let attempt=0;attempt<40;attempt++){
   if(side===0){x=rand(Math.max(1,pxI-spread),Math.min(MAP_W-2,pxI+spread));for(y=0;y<6;y++){if(canWalk(x,y)){found=true;break}}}
   else if(side===1){x=rand(Math.max(1,pxI-spread),Math.min(MAP_W-2,pxI+spread));for(y=MAP_H-1;y>MAP_H-7;y--){if(canWalk(x,y)){found=true;break}}}
   else if(side===2){y=rand(Math.max(1,pyI-spread),Math.min(MAP_H-2,pyI+spread));for(x=0;x<6;x++){if(canWalk(x,y)){found=true;break}}}
   else{y=rand(Math.max(1,pyI-spread),Math.min(MAP_H-2,pyI+spread));for(x=MAP_W-1;x>MAP_W-7;x--){if(canWalk(x,y)){found=true;break}}}
   if(found)break;
  }
  if(!found)continue;
  let z=makeZombie(x,y);z.alerted=true;z.alertDelay=60;z.jumpAnim=20;
  state.zombies.push(z);
 }
}
function getSpeedMult(entity){
 let m=1;
 if(entity.isAttacking)m*=0.35;
 if(entity.hitSlowTimer>0)m*=0.5;
 if(entity.postAttackSlow>0)m*=0.6;
 return m;
}
function updateStuck(e,adx,ady,len,tx,ty,canEnter){
 e.stuckTimer++;
 if(e.stuckPerp===0&&e.stuckTimer>=90){
  let movedDist=Math.hypot(e.fx-e.stuckOriginX,e.fy-e.stuckOriginY);
  if(movedDist<0.3){
   let pA={x:-ady/len,y:adx/len},pB={x:ady/len,y:-adx/len};
   let dA=Math.hypot(e.fx+pA.x*2-tx,e.fy+pA.y*2-ty);
   let dB=Math.hypot(e.fx+pB.x*2-tx,e.fy+pB.y*2-ty);
   e.stuckPerp=dA<=dB?1:-1;e.stuckPerpTimer=120;
  }
  e.stuckOriginX=e.fx;e.stuckOriginY=e.fy;e.stuckTimer=0;
 }
 if(e.stuckPerp!==0){
  e.stuckPerpTimer--;
  if(e.stuckPerpTimer<=0){
   let testX=e.fx+adx/len*0.5,testY=e.fy+ady/len*0.5;
   if(canWalk(fl(testX),fl(testY))&&(!canEnter||canEnter(fl(testX),fl(testY)))){e.stuckPerp=0}
   else{e.stuckPerpTimer=60}
  }
  if(e.stuckPerp!==0){let dx0=adx/len,dy0=ady/len;return{dx:-dy0*e.stuckPerp,dy:dx0*e.stuckPerp,len:1}}
 }
 return{dx:adx,dy:ady,len};
}
const KB_FRICTION=0.7;
function applyKnockback(e){
 if(Math.abs(e.kbVx)<0.01&&Math.abs(e.kbVy)<0.01){e.kbVx=0;e.kbVy=0;return}
 let nx=e.fx+e.kbVx,ny=e.fy+e.kbVy;
 if(canWalk(fl(nx),fl(e.fy)))e.fx=nx;
 if(canWalk(fl(e.fx),fl(ny)))e.fy=ny;
 clampToMap(e);
 e.kbVx*=KB_FRICTION;e.kbVy*=KB_FRICTION;
}
function setKnockback(e,angle,force){
 e.kbVx=Math.cos(angle)*force;e.kbVy=Math.sin(angle)*force;
}
function killZombie(z){
 z.alive=false;zombieDrop(z.x,z.y);onZombieDeath(z);state.kills++;
 let bld=getBuildingAt(fl(z.fx),fl(z.fy));
 if(bld&&bld.zombieCount>0)bld.zombieCount--;
 if(z.playerDamaged)addXP(state.player,z.isBoss?XP_PER_KILL*XP_BOSS_MULT:XP_PER_KILL);
}
function killNPC(n){
 n.alive=false;
 if(n.playerDamaged){
  let xpAmt=n.isMadman?15:n.isLeader?50:30;addXP(state.player,xpAmt);
  for(let o of state.npcs){
   if(!o.alive||o===n||o.hostileTo==='player'||o.isAlly)continue;
   let sameFaction=n.isMadman?o.isMadman:!o.isMadman&&!o.isAlly;
   if(sameFaction&&distXY(o.fx,o.fy,n.fx,n.fy)<SIGHT_RADIUS){o.hostileTo='player';o.speech='ASSASSIN!';o.speechTimer=120}
  }
 }
 msg(n.isMadman?'Le Fou est mort!':n.isLeader?'Le chef est mort!':'Un survivant est mort!');
}
function killPlayer(){
 state.gameOver=true;stopMusic();state.onDeath?.();emitChange();
}
function hitNPC(n,dmg){
 n.hp-=dmg;n.playerDamaged=true;addFloater(n.fx,n.fy,'-'+dmg,'#f44');
 setGroupHostile(n,'player');
 if(n.isMadman&&!n.enraged){n.enraged=true;n.speech='TU VAS LE REGRETTER!';n.speechTimer=180;addFloater(n.fx,n.fy-0.5,'ENRAGE!','#f00')}
 if(n.hp<=0)killNPC(n);
}
function clampToMap(e){e.fx=clamp(e.fx,0.5,MAP_W-1.5);e.fy=clamp(e.fy,0.5,MAP_H-1.5);e.x=fl(e.fx);e.y=fl(e.fy)}
const PUSH_RADIUS=0.6;
const GRID_CELL=4;
const GRID_W=Math.ceil(MAP_W/GRID_CELL),GRID_H=Math.ceil(MAP_H/GRID_CELL);
function resolveCollisions(){
 let grid=new Array(GRID_W*GRID_H);
 let p=state.player;
 function addToGrid(e){
  let cx=Math.min(GRID_W-1,Math.max(0,e.fx/GRID_CELL|0)),cy=Math.min(GRID_H-1,Math.max(0,e.fy/GRID_CELL|0));
  let k=cy*GRID_W+cx;
  if(!grid[k])grid[k]=[e];else grid[k].push(e);
 }
 addToGrid(p);
 for(let z of state.zombies)if(z.alive)addToGrid(z);
 for(let n of state.npcs)if(n.alive)addToGrid(n);
 for(let cy=0;cy<GRID_H;cy++)for(let cx=0;cx<GRID_W;cx++){
  let k=cy*GRID_W+cx;
  let cell=grid[k];if(!cell)continue;
  for(let i=0;i<cell.length;i++)for(let j=i+1;j<cell.length;j++){
   let a=cell[i],b=cell[j];
   let dx=b.fx-a.fx,dy=b.fy-a.fy,d=Math.hypot(dx,dy);
   if(d<PUSH_RADIUS&&d>0.001){
    let overlap=(PUSH_RADIUS-d)/2,nx=dx/d*overlap,ny=dy/d*overlap;
    let aM=canWalk(fl(a.fx-nx),fl(a.fy-ny)),bM=canWalk(fl(b.fx+nx),fl(b.fy+ny));
    if(aM&&bM){a.fx-=nx;a.fy-=ny;b.fx+=nx;b.fy+=ny}
    else if(aM){a.fx-=nx*2;a.fy-=ny*2}
    else if(bM){b.fx+=nx*2;b.fy+=ny*2}
    clampToMap(a);clampToMap(b);
   }
  }
  for(let dx2=0;dx2<=1;dx2++)for(let dy2=0;dy2<=1;dy2++){
   if(dx2===0&&dy2===0)continue;
   let nx2=cx+dx2,ny2=cy+dy2;
   if(nx2>=GRID_W||ny2>=GRID_H)continue;
   let nb=grid[ny2*GRID_W+nx2];if(!nb)continue;
   for(let i=0;i<cell.length;i++)for(let j=0;j<nb.length;j++){
    let a=cell[i],b=nb[j];
    let dx=b.fx-a.fx,dy=b.fy-a.fy,d=Math.hypot(dx,dy);
    if(d<PUSH_RADIUS&&d>0.001){
     let overlap=(PUSH_RADIUS-d)/2,nx=dx/d*overlap,ny=dy/d*overlap;
     let aM=canWalk(fl(a.fx-nx),fl(a.fy-ny)),bM=canWalk(fl(b.fx+nx),fl(b.fy+ny));
     if(aM&&bM){a.fx-=nx;a.fy-=ny;b.fx+=nx;b.fy+=ny}
     else if(aM){a.fx-=nx*2;a.fy-=ny*2}
     else if(bM){b.fx+=nx*2;b.fy+=ny*2}
     clampToMap(a);clampToMap(b);
    }
   }
  }
 }
}
function zombieDrop(x,y){
 if(prng()<0.05){state.items.push({x,y,type:'weapon',name:prng()<0.5?'shotgun':'smg'});return}
 if(prng()<0.15){let amt=rand(50,200);state.items.push({x,y,type:'coins',coins:amt});return}
 if(prng()>0.25)return;
 state.items.push({x,y,type:prng()<0.5?'bandage':'ammo'});
}
function onZombieDeath(z){
 if(z.isSpitter){
  state.acidPools.push({fx:z.fx,fy:z.fy,radius:1.2,timer:900,dmgCooldown:0});
  addCoins(state.player,5000);
  let wNames=['gun','shotgun','smg'];
  state.items.push({x:z.x,y:z.y,type:'weapon',name:wNames[rand(0,2)]});
  state.items.push({x:z.x,y:z.y,type:'ammo'});
 }
 if(z.isBoss){
  addCoins(state.player,10000);
 }
 if(z.isNecromancer){
  addCoins(state.player,7500);
  let wNames=['gun','shotgun','smg'];
  state.items.push({x:z.x,y:z.y,type:'weapon',name:wNames[rand(0,2)]});
  msg('Le Necromancien est mort!');
 }
}
function canWalk(tx,ty){
 if(tx<0||ty<0||tx>=MAP_W||ty>=MAP_H)return false;
 let t=state.map[ty][tx];
 if(t===1||t===5||t===6)return false;
 if(t===3){let door=doorAt(tx,ty);if(door&&door.barricaded&&!door.open)return false}
 if(state.barricadeMap.has(tileKey(tx,ty)))return false;
 return true;
}
function barricadeAt(tx,ty){return state.barricadeMap.get(tileKey(tx,ty))||null}
function explodeBarrel(barrel){
 let queue=[barrel];
 while(queue.length>0){
  let b=queue.shift();
  if(!b.alive)continue;
  b.alive=false;playSound('explosion');
  let bx=b.fx,by=b.fy;
  for(let z of state.zombies){
   if(!z.alive)continue;
   let d=distXY(bx,by,z.fx,z.fy);
   if(d<BARREL_EXPLOSION_RADIUS){
    let dmg=Math.max(1,Math.floor(BARREL_EXPLOSION_DMG*2.5*(1-d/BARREL_EXPLOSION_RADIUS)));
    z.hp-=dmg;z.alerted=true;z.alertDelay=0;z.hitSlowTimer=HIT_SLOW_DURATION;
    addFloater(z.fx,z.fy,'-'+dmg,'#f80');
    if(z.hp<=0)killZombie(z)
   }
  }
  let pd=distXY(bx,by,state.player.fx,state.player.fy);
  if(pd<BARREL_EXPLOSION_RADIUS){
   let dmg=Math.max(1,Math.floor(BARREL_EXPLOSION_DMG*(1-pd/BARREL_EXPLOSION_RADIUS)));
   state.player.hp-=dmg;state.player.hitSlowTimer=HIT_SLOW_DURATION;
   state.shakeTimer=15;state.shakeMaxTimer=15;state.shakeIntensity=0.5;state.dmgVignetteTimer=25;
   addFloater(state.player.fx,state.player.fy,'-'+dmg,'#f44');
   if(state.player.hp<=0)killPlayer()
  }
  for(let ob of state.barrels){
   if(!ob.alive||ob===b)continue;
   if(distXY(bx,by,ob.fx,ob.fy)<BARREL_EXPLOSION_RADIUS)queue.push(ob);
  }
  alertZombiesNear(bx,by,GUNSHOT_ALERT_RADIUS);
  state.explosions.push({fx:bx,fy:by,timer:20});
 }
}
function getWeaponDef(sel){
 if(!sel||sel.type!=='weapon')return null;
 return WEAPONS[sel.name]||null;
}
function meleeAttack(p){
 let wep=getWeaponDef(p.inventory[p.selectedSlot]);
 if(!wep)return;
 p.cooldown=wep.cooldown;
 playSound('bat');
 let range=wep.range,arc=wep.arc||Math.PI/2;
 let bestZ=null,bestD=Infinity;
 for(let z of state.zombies){
  if(!z.alive)continue;
  let d=distXY(p.fx,p.fy,z.fx,z.fy);
  if(d<range&&d<bestD&&!isWallBetween(p.fx,p.fy,z.fx,z.fy)){
   let toZ=Math.atan2(z.fy-p.fy,z.fx-p.fx);
   let diff=Math.abs(toZ-p.angle);if(diff>Math.PI)diff=2*Math.PI-diff;
   if(diff<arc/2){bestZ=z;bestD=d}
  }
 }
 if(bestZ){
  let z=bestZ;
  let hitChance=wep.melee?0.99:(p.precision+3)/10;
  if(prng()<hitChance){
   let dmg=Math.max(1,Math.floor((wep.dmg+p.atk+3-Math.floor(z.armor/3))*state.playerRallyDmgMult));
   z.hp-=dmg;z.alerted=true;z.alertDelay=0;z.hitSlowTimer=HIT_SLOW_DURATION;z.playerDamaged=true;
   let ka=Math.atan2(z.fy-p.fy,z.fx-p.fx);
   setKnockback(z,ka,z.isBoss?0.1:0.25);
   addFloater(z.fx,z.fy,'-'+dmg,'#fc0');
   if(z.hp<=0){
    killZombie(z);
    addFloater(z.fx,z.fy-0.5,'TUE','#f44');
   }
  }else{addFloater(z.fx,z.fy,'Loupe','#888')}
 }
 for(let n of state.npcs){
  if(!n.alive)continue;
  let d=distXY(p.fx,p.fy,n.fx,n.fy);
  if(d<range&&!isWallBetween(p.fx,p.fy,n.fx,n.fy)){
   let toN=Math.atan2(n.fy-p.fy,n.fx-p.fx);
   let diff=Math.abs(toN-p.angle);if(diff>Math.PI)diff=2*Math.PI-diff;
   if(diff<arc/2){
    let dmg=Math.max(1,Math.floor(wep.dmg+p.atk+3));
    hitNPC(n,dmg);
   }
  }
 }
 for(let b of state.barrels){
  if(!b.alive)continue;
  let d=distXY(p.fx,p.fy,b.fx,b.fy);
  if(d<range&&!isWallBetween(p.fx,p.fy,b.fx,b.fy)){
   let toB=Math.atan2(b.fy-p.fy,b.fx-p.fx);
   let diff=Math.abs(toB-p.angle);if(diff>Math.PI)diff=2*Math.PI-diff;
   if(diff<arc/2){b.hp-=5;if(b.hp<=0)explodeBarrel(b)}
  }
 }
 for(let door of state.doors){
  if(!door.barricaded||door.open||!door.doorHp)continue;
  let d=distXY(p.fx,p.fy,door.x+0.5,door.y+0.5);
  if(d<range){
   let toD=Math.atan2(door.y+0.5-p.fy,door.x+0.5-p.fx);
   let diff=Math.abs(toD-p.angle);if(diff>Math.PI)diff=2*Math.PI-diff;
   if(diff<arc/2){
    let dmg=Math.max(1,Math.floor(wep.dmg+p.atk));
    door.doorHp-=dmg;
    addFloater(door.x+0.5,door.y+0.5,'-'+dmg,'#a60');
    if(door.doorHp<=0){door.barricaded=false;door.open=true;playSound('door');msg('Porte defoncee!')}
   }
  }
 }
}
function shootOneBullet(p,wep,shotAngle){
 let adx=Math.cos(shotAngle),ady=Math.sin(shotAngle),range=wep.range;
 let bullet={x:p.fx,y:p.fy,angle:shotAngle,maxDist:range,hitDist:range,life:8};
 state.bullets.push(bullet);
 let steps=Math.ceil(range*2);
 for(let i=1;i<=steps;i++){
  let rd=i*range/steps;
  let sx=Math.floor(p.fx+0.5+adx*rd),sy=Math.floor(p.fy+0.5+ady*rd);
  if(sx<0||sy<0||sx>=MAP_W||sy>=MAP_H){bullet.hitDist=rd;break}
  let t=state.map[sy][sx];if(t===1||t===5||t===6){bullet.hitDist=rd;break}
  if(barricadeAt(sx,sy)){bullet.hitDist=rd;break}
  if(t===3){let door=doorAt(sx,sy);if(door&&door.barricaded&&!door.open){
   bullet.hitDist=rd;
   if(door.doorHp!==undefined){
    let ddmg=Math.max(1,Math.floor(wep.dmg*0.5));
    door.doorHp-=ddmg;addFloater(door.x+0.5,door.y+0.5,'-'+ddmg,'#a60');
    if(door.doorHp<=0){door.barricaded=false;door.open=true;playSound('door');msg('Porte defoncee!')}
   }
   break;
  }}
  let px2=p.fx+0.5+adx*rd,py2=p.fy+0.5+ady*rd;
  let hitBarrel=null;for(let b of state.barrels){if(b.alive&&distXY(b.fx,b.fy,px2,py2)<0.8){hitBarrel=b;break}}
  if(hitBarrel){bullet.hitDist=rd;hitBarrel.hp-=10;if(hitBarrel.hp<=0)explodeBarrel(hitBarrel);return true}
  let hit=null;for(let z of state.zombies){if(z.alive&&distXY(z.fx,z.fy,px2,py2)<0.8){hit=z;break}}
  if(hit){
   bullet.hitDist=rd;
   let heatPenalty=wep.name==='smg'?1-p.smgHeat*0.35:1;
   let dmg=Math.max(1,Math.floor((wep.dmg+p.atk-Math.floor(hit.armor/3))*state.playerRallyDmgMult*heatPenalty));
   hit.hp-=dmg;hit.hitSlowTimer=HIT_SLOW_DURATION;hit.alerted=true;hit.playerDamaged=true;
   addFloater(hit.fx,hit.fy,'-'+dmg,'#fc0');
   if(hit.hp<=0){
    killZombie(hit);
    addFloater(hit.fx,hit.fy-0.5,'TUE','#f44');
   }
   return true;
  }
  for(let n of state.npcs){
   if(!n.alive)continue;
   if(distXY(n.fx,n.fy,px2,py2)<0.8){
    bullet.hitDist=rd;
    let dmg=Math.max(1,Math.floor(wep.dmg+p.atk));
    hitNPC(n,dmg);
    return true;
   }
  }
 }
 return false;
}
function shootAttack(p){
 let sel=p.inventory[p.selectedSlot];
 let wep=getWeaponDef(sel);if(!wep)return;
 playSound(wep.name);
 p.cooldown=Math.max(4,wep.cooldown-Math.floor(p.speed));
 alertZombiesNear(p.fx,p.fy,GUNSHOT_ALERT_RADIUS);
 gunShotSpawnZombies(wep.name);
 let s=TILE*state.scale;
 let pwx=p.fx*s-state.cam.x+s/2,pwy=p.fy*s-state.cam.y+s/2;
 let mouseDist=Math.hypot(state.mouseX-pwx,state.mouseY-pwy)/s;
 let spreadAtDist=getSpreadAtDist(wep,p.precision,mouseDist);
 if(wep.name==='smg')spreadAtDist=Math.min(spreadAtDist+p.smgHeat*SMG_HEAT_SPREAD_MULT,wep.baseSpread*1.5+DIST_SPREAD_FACTOR*mouseDist);
 if(wep.pellets){
  let anyHit=false;
  for(let pi=0;pi<wep.pellets;pi++){
   let spread=(prng()-0.5)*2*spreadAtDist;
   if(shootOneBullet(p,wep,p.angle+spread))anyHit=true;
  }
  if(!anyHit)addFloater(p.fx+Math.cos(p.angle)*2,p.fy+Math.sin(p.angle)*2,'Loupe','#888');
 }else{
  let spread=(prng()-0.5)*2*spreadAtDist;
  if(!shootOneBullet(p,wep,p.angle+spread))addFloater(p.fx+Math.cos(p.angle)*2,p.fy+Math.sin(p.angle)*2,'Loupe','#888');
 }
}
function findNearestInteractable(p){
 let best=null,bd=Infinity;
 for(let i=0;i<state.items.length;i++){
  let it=state.items[i];
  let d=distXY(p.fx,p.fy,it.x+0.5,it.y+0.5);
  if(d<INTERACT_RANGE&&d<bd){best={kind:'item',index:i,item:it};bd=d}
 }
 return best;
}
function getNearestInteraction(p){
 let candidates=[];
 for(let door of state.doors){
  let d=distXY(door.x+0.5,door.y+0.5,p.fx,p.fy);
  if(d<INTERACT_RANGE&&door.barricaded)candidates.push({type:'door',label:door.open?'Fermer':'Ouvrir',dist:d});
  else if(d<INTERACT_RANGE&&!door.barricaded)candidates.push({type:'repair',coins:p.coins,dist:d});
 }
 let item=findNearestInteractable(p);
 if(item)candidates.push({type:'item',item:item.item,dist:distXY(p.fx,p.fy,item.item.x+0.5,item.item.y+0.5)});
 let injuredAlly=state.npcs.find(n=>n.alive&&n.isAlly&&n.isInjured&&!n.recruited&&distXY(n.fx,n.fy,p.fx,p.fy)<INTERACT_RANGE);
 if(injuredAlly)candidates.push({type:'ally',label:'Recruter (bandage+2000$)',dist:distXY(p.fx,p.fy,injuredAlly.fx,injuredAlly.fy)});
 if(state.baseEvent&&!state.baseEventActive&&!state.baseRewardGiven){
  let chef=state.npcs.find(n=>n.alive&&n.isLeader&&distXY(n.fx,n.fy,p.fx,p.fy)<INTERACT_RANGE);
  if(chef)candidates.push({type:'leader',label:'Parler au chef',dist:distXY(p.fx,p.fy,chef.fx,chef.fy)});
 }
 if(!state.baseEvent||!state.baseEventActive){
  if(state.exitNext.x>=0){let d=distXY(p.fx,p.fy,state.exitNext.x+0.5,state.exitNext.y+0.5);if(d<INTERACT_RANGE)candidates.push({type:'escape',label:'Zone suivante',dist:d})}
  if(state.exitPrev.x>=0){let d=distXY(p.fx,p.fy,state.exitPrev.x+0.5,state.exitPrev.y+0.5);if(d<INTERACT_RANGE)candidates.push({type:'escape',label:'Zone precedente',dist:d})}
 }
 if(candidates.length===0)return null;
 candidates.sort((a,b)=>a.dist-b.dist);
 return candidates[0];
}
function npcShoot(npc,wep){
 npc.cooldown=wep.cooldown;playSound(wep.name);
 let adx=Math.cos(npc.angle),ady=Math.sin(npc.angle);
 let b={x:npc.fx,y:npc.fy,angle:npc.angle,maxDist:wep.range,hitDist:wep.range,life:6};
 state.bullets.push(b);
 for(let i=1;i<wep.range;i++){
  let sx=Math.floor(npc.fx+0.5+adx*i),sy=Math.floor(npc.fy+0.5+ady*i);
  if(sx<0||sy<0||sx>=MAP_W||sy>=MAP_H){b.hitDist=i;break}
  let t=state.map[sy][sx];if(t===1||t===5||t===6){b.hitDist=i;break}
  if(barricadeAt(sx,sy)){b.hitDist=i;break}
  let hx=npc.fx+0.5+adx*i,hy=npc.fy+0.5+ady*i;
  let hit=null;for(let z of state.zombies){if(z.alive&&distXY(z.fx,z.fy,hx,hy)<0.9){hit=z;break}}
  if(hit){b.hitDist=i;let dmg=Math.max(1,Math.floor((wep.dmg+npc.atk)*0.5));hit.hp-=dmg;hit.hitSlowTimer=HIT_SLOW_DURATION;hit.alerted=true;if(hit.hp<=0)killZombie(hit);break}
  if(npc.hostileTo==='player'&&distXY(state.player.fx,state.player.fy,hx,hy)<0.8){
   b.hitDist=i;let dmg=Math.max(1,Math.floor((wep.dmg+npc.atk)*0.5));let pp=state.player;
   if(state.iFrames<=0){dmg=Math.max(1,dmg-Math.floor(pp.armor/2));pp.hp-=dmg;pp.hitSlowTimer=HIT_SLOW_DURATION;state.iFrames=20;state.dmgVignetteTimer=15;addFloater(pp.fx,pp.fy,'-'+dmg,'#f44');if(pp.hp<=0)killPlayer()}break}
 }
}
function updateNPC(npc){
 if(!npc.alive)return;
 npc.notFightingTimer=0;
 if(npc.healMode){npc.healMode=false;npc.healAmount=0;npc.healTick=0}
 applyKnockback(npc);
 if(npc.rallyBuff>0){npc.rallyBuff--;if(npc.rallyBuff<=0){npc.rallyDmgMult=1;npc.rallyHpMult=1}}
 if(npc.abilityCooldown>0)npc.abilityCooldown--;
 if(npc.rallyCooldown>0)npc.rallyCooldown--;
 if(npc.isLeader&&npc.rallyCooldown<=0){
  let hasNearbyEnemy=state.zombies.some(z=>z.alive&&distXY(npc.fx,npc.fy,z.fx,z.fy)<12);
  if(!hasNearbyEnemy&&npc.hostileTo==='player')hasNearbyEnemy=distXY(npc.fx,npc.fy,state.player.fx,state.player.fy)<12;
  if(hasNearbyEnemy){
   npc.rallyCooldown=45*60;
   npc.speech='RALLLIEMENT!';npc.speechTimer=120;
   playSound('zombie_alert');
   addFloater(npc.fx,npc.fy-0.5,'RALLIEMENT!','#fc0');
   let rallyR=8;
   let p=state.player;
   let hostileToPlayer=npc.hostileTo==='player';
   if(!hostileToPlayer&&distXY(npc.fx,npc.fy,p.fx,p.fy)<rallyR){
    p.hp=Math.min(p.maxHp,p.hp+Math.ceil(p.maxHp*0.1));
    addFloater(p.fx,p.fy,'+PV','#0f0');
   }
   for(let n of state.npcs){
    if(!n.alive||n===npc)continue;
    if(distXY(npc.fx,npc.fy,n.fx,n.fy)<rallyR){
     n.rallyBuff=10*60;n.rallyDmgMult=1.1;n.rallyHpMult=1.1;
     n.hp=Math.min(n.maxHp,n.hp+Math.ceil(n.maxHp*0.1));
     addFloater(n.fx,n.fy,'+PV +DEG','#fc0');
    }
   }
   if(!hostileToPlayer&&distXY(npc.fx,npc.fy,p.fx,p.fy)<rallyR){
    state.playerRallyBuff=10*60;state.playerRallyDmgMult=1.1;
    addFloater(p.fx,p.fy,'+10% DEG','#fc0');
   }
  }
 }
 if(npc.npcType==='medic'&&npc.abilityCooldown<=0){
  let healed=false,healR=6;
  let p=state.player;
  if(!npc.hostileTo&&p.hp<p.maxHp&&distXY(npc.fx,npc.fy,p.fx,p.fy)<healR){
   p.hp=Math.min(p.maxHp,p.hp+Math.ceil(p.maxHp*0.1));
   addFloater(p.fx,p.fy,'+SOIN','#0f0');healed=true;
  }
  for(let n of state.npcs){
   if(!n.alive||n===npc)continue;
   if(n.hp<n.maxHp&&distXY(npc.fx,npc.fy,n.fx,n.fy)<healR){
    n.hp=Math.min(n.maxHp,n.hp+Math.ceil(n.maxHp*0.1));
    addFloater(n.fx,n.fy,'+SOIN','#0f0');healed=true;
   }
  }
  if(healed){npc.abilityCooldown=45*60;npc.speech='Soins!';npc.speechTimer=90}
 }
 if(npc.npcType==='grenadier'&&npc.abilityCooldown<=0){
  let nearZ=null,nd=Infinity;
  if(npc.hostileTo==='player'){let pd=distXY(npc.fx,npc.fy,state.player.fx,state.player.fy);if(pd<10){nearZ={fx:state.player.fx,fy:state.player.fy,isPlayerTarget:true};nd=pd}}
  else{for(let z of state.zombies){if(!z.alive)continue;let d=distXY(npc.fx,npc.fy,z.fx,z.fy);if(d<10&&d<nd){nearZ=z;nd=d}}}
  if(nearZ&&nd<10&&nd>2&&!isWallBetween(npc.fx,npc.fy,nearZ.fx,nearZ.fy)){
   let npcBld=getBuildingAt(fl(npc.fx),fl(npc.fy));
   let tgtBld=getBuildingAt(fl(nearZ.fx),fl(nearZ.fy));
   if(npcBld===tgtBld){
    npc.abilityCooldown=45*60;npc.speech='Grenade!';npc.speechTimer=90;
    state.grenades=state.grenades||[];
    state.grenades.push({fx:npc.fx,fy:npc.fy,tx:nearZ.fx,ty:nearZ.fy,timer:40,dmg:30+getNPCLevel()*5,radius:2.5});
   }
  }
 }
 if(npc.retreatTimer>0){
  npc.retreatTimer--;
  let spd=0.03+npc.speed*0.006;
  let rx=npc.fx+Math.cos(npc.retreatAngle)*spd,ry=npc.fy+Math.sin(npc.retreatAngle)*spd;
  let rCanX=canWalk(fl(rx),fl(npc.fy)),rCanY=canWalk(fl(npc.fx),fl(ry));
  if(rCanX)npc.fx=rx;
  if(rCanY)npc.fy=ry;
  if(!rCanX){let bd=doorAt(fl(rx),fl(npc.fy));if(bd&&bd.barricaded&&!bd.open)bd.open=true}
  if(!rCanY){let bd=doorAt(fl(npc.fx),fl(ry));if(bd&&bd.barricaded&&!bd.open)bd.open=true}
  npc.x=fl(npc.fx);npc.y=fl(npc.fy);npc._moving=true;
  let wep=WEAPONS[npc.weapon];
  if(wep&&!wep.melee&&npc.cooldown<=0){
   let nearZ=null,nnd=Infinity;
   if(npc.hostileTo==='player'){let pd=distXY(npc.fx,npc.fy,state.player.fx,state.player.fy);nearZ={fx:state.player.fx,fy:state.player.fy,isPlayerTarget:true};nnd=pd}
   else{for(let z of state.zombies){if(!z.alive)continue;let d=distXY(npc.fx,npc.fy,z.fx,z.fy);if(d<nnd){nearZ=z;nnd=d}}}
   if(nearZ&&nnd<wep.range&&!isWallBetween(npc.fx,npc.fy,nearZ.fx,nearZ.fy)){
    npc.angle=Math.atan2(nearZ.fy-npc.fy,nearZ.fx-npc.fx);
    npcShoot(npc,wep);
   }
  }
  if(npc.cooldown>0)npc.cooldown--;
  return;
 }
 let nearestZ=null,nd=Infinity;
 if(npc.hostileTo==='player'){
  let pd=distXY(npc.fx,npc.fy,state.player.fx,state.player.fy);
  nearestZ={fx:state.player.fx,fy:state.player.fy,x:fl(state.player.fx),y:fl(state.player.fy),alive:true,hp:state.player.hp,isPlayerTarget:true,armor:state.player.armor};nd=pd;
 }else{
  for(let z of state.zombies){
   if(!z.alive)continue;
   let d=distXY(npc.fx,npc.fy,z.fx,z.fy);
   if(d<nd){nearestZ=z;nd=d}
  }
 }
 if(!nearestZ){npc._moving=false;return}
 npc.angle=Math.atan2(nearestZ.fy-npc.fy,nearestZ.fx-npc.fx);
 let wep=WEAPONS[npc.weapon];
 let range=wep?wep.range:2;
 if(nd>range*0.7){
  npc._moving=true;
  let spd=0.02+npc.speed*0.005;
  let adx=nearestZ.fx-npc.fx,ady=nearestZ.fy-npc.fy,len=Math.hypot(adx,ady)||1;
  let st=updateStuck(npc,adx,ady,len,nearestZ.fx,nearestZ.fy);adx=st.dx;ady=st.dy;len=st.len;
  let nx=npc.fx+adx/len*spd,ny=npc.fy+ady/len*spd;
  let nCanX=canWalk(fl(nx),fl(npc.fy));
  let nCanY=canWalk(fl(npc.fx),fl(ny));
  if(nCanX)npc.fx=nx;
  if(nCanY)npc.fy=ny;
  if(!nCanX&&!nCanY){
   let px1=npc.fx+ady/len*spd,py1=npc.fy+adx/len*spd;
   let px2=npc.fx-ady/len*spd,py2=npc.fy-adx/len*spd;
   let c1=canWalk(fl(px1),fl(py1));
   let c2=canWalk(fl(px2),fl(py2));
   if(c1&&c2){
    let d1=Math.hypot(px1-nearestZ.fx,py1-nearestZ.fy);
    let d2=Math.hypot(px2-nearestZ.fx,py2-nearestZ.fy);
    if(d1<=d2){npc.fx=px1;npc.fy=py1}else{npc.fx=px2;npc.fy=py2}
   }else if(c1){npc.fx=px1;npc.fy=py1}
   else if(c2){npc.fx=px2;npc.fy=py2}
  }else if(!nCanX){
   let su=canWalk(fl(nx),fl(npc.fy-spd));
   let sd=canWalk(fl(nx),fl(npc.fy+spd));
   if(su&&sd){if(Math.abs(nearestZ.fy-(npc.fy-spd))<Math.abs(nearestZ.fy-(npc.fy+spd)))npc.fy-=spd;else npc.fy+=spd}
   else if(su)npc.fy-=spd;else if(sd)npc.fy+=spd;
  }else if(!nCanY){
   let sl=canWalk(fl(npc.fx-spd),fl(ny));
   let sr=canWalk(fl(npc.fx+spd),fl(ny));
   if(sl&&sr){if(Math.abs(nearestZ.fx-(npc.fx-spd))<Math.abs(nearestZ.fx-(npc.fx+spd)))npc.fx-=spd;else npc.fx+=spd}
   else if(sl)npc.fx-=spd;else if(sr)npc.fx+=spd;
  }
  if(!nCanX||!nCanY){
   let checkTx=fl(nx),checkTy=fl(ny);
   if(!nCanX){let bd=doorAt(checkTx,fl(npc.fy));if(bd&&bd.barricaded&&!bd.open){bd.open=true}}
   if(!nCanY){let bd=doorAt(fl(npc.fx),checkTy);if(bd&&bd.barricaded&&!bd.open){bd.open=true}}
  }
  npc.x=fl(npc.fx);npc.y=fl(npc.fy);
 }else{npc._moving=false}
 function npcHitTarget(target,dmg,ka,kbForce){
  if(target.isPlayerTarget){
   let p=state.player;
   if(state.iFrames>0)return;
   dmg=Math.max(1,dmg-Math.floor(p.armor/2));
   p.hp-=dmg;p.hitSlowTimer=HIT_SLOW_DURATION;
   state.iFrames=20;state.dmgVignetteTimer=15;
   setKnockback(p,ka,kbForce);
   addFloater(p.fx,p.fy,'-'+dmg,'#f44');
   if(p.hp<=0)killPlayer();
  }else{
   target.hp-=dmg;if(target.alerted!==undefined)target.alerted=true;if(target.hitSlowTimer!==undefined)target.hitSlowTimer=HIT_SLOW_DURATION;
   addFloater(target.fx,target.fy,'-'+dmg,'#0af');
   setKnockback(target,ka,kbForce);
   if(target.hp<=0)killZombie(target)
  }
 }
 if(npc.cooldown>0){
  npc.cooldown--;
  if(wep&&!wep.melee&&nd<1.5&&!isWallBetween(npc.fx,npc.fy,nearestZ.fx,nearestZ.fy)&&npc.cooldown<=wep.cooldown-15){
   npc.cooldown=20;
   if(prng()*10<npc.precision+2){
    let dmg=Math.max(1,Math.floor((3+npc.atk)*0.5));
    let ka=Math.atan2(nearestZ.fy-npc.fy,nearestZ.fx-npc.fx);
    npcHitTarget(nearestZ,dmg,ka,0.3);
   }
  }
  return;
 }
 if(nd<1.5&&!isWallBetween(npc.fx,npc.fy,nearestZ.fx,nearestZ.fy)){
  npc.cooldown=20;
  if(prng()*10<npc.precision+2){
   let dmg=Math.max(1,Math.floor((3+npc.atk)*0.5));
   let ka=Math.atan2(nearestZ.fy-npc.fy,nearestZ.fx-npc.fx);
   npcHitTarget(nearestZ,dmg,ka,0.4);
  }
  npc.retreatAngle=Math.atan2(npc.fy-nearestZ.fy,npc.fx-nearestZ.fx);
  npc.retreatTimer=60;
 }else if(wep&&wep.melee&&nd<wep.range&&!isWallBetween(npc.fx,npc.fy,nearestZ.fx,nearestZ.fy)){
  npc.cooldown=wep.cooldown;
  if(prng()*10<npc.precision+2){
   let dmg=Math.max(1,Math.floor((wep.dmg+npc.atk)*0.5));
   let ka=Math.atan2(nearestZ.fy-npc.fy,nearestZ.fx-npc.fx);
   npcHitTarget(nearestZ,dmg,ka,0.5);
  }
  npc.retreatAngle=Math.atan2(npc.fy-nearestZ.fy,npc.fx-nearestZ.fx);
  npc.retreatTimer=60;
 }else if(wep&&!wep.melee&&nd<wep.range&&!isWallBetween(npc.fx,npc.fy,nearestZ.fx,nearestZ.fy)){
  npcShoot(npc,wep);
 }
}
function bossThrowRock(boss,target){
 boss.throwCooldown=900;
 let angle=Math.atan2(target.fy-boss.fy,target.fx-boss.fx);
 state.rockWarnings.push({fx:boss.fx,fy:boss.fy,angle,timer:45,boss});
}
function launchRock(w){
 let lv=getBossLevel();
 state.rocks.push({fx:w.fx,fy:w.fy,angle:w.angle,spd:0.25,dmg:30+lv*5+rand(0,15),life:80,active:true});
}
const HORDE_WAVES=2,HORDE_WAVE_COUNTS=[20,30];
function startBaseAssault(){
 state.baseEventActive=true;
 state.baseWavesLeft=HORDE_WAVES;
 state.baseWaveTimer=0;
 state.hordeSpawned=0;
 state.currentWave=0;
 state.hordeEncounters++;
 let b=state.buildings[0];
 let baseDoors=state.doors.filter(d=>d.building===b);
 let posts=[];
 let cx=b.x+b.w/2,cy=b.y+b.h/2;
 for(let d of baseDoors){
  let side=getWallSide(b,d.x,d.y);
  for(let dist=3;dist<=5;dist++){
   let ox=d.x,oy=d.y;
   if(side==='top')oy-=dist;else if(side==='bottom')oy+=dist;
   else if(side==='left')ox-=dist;else if(side==='right')ox+=dist;
   ox=clamp(ox,1,MAP_W-2);oy=clamp(oy,1,MAP_H-2);
   if(canWalk(ox,oy)){posts.push({x:ox,y:oy});break}
  }
 }
 let needed=state.npcs.length-posts.length;
 for(let i=0;i<needed;i++){
  let ang=((posts.length+i)/state.npcs.length)*Math.PI*2;
  let r=Math.max(b.w,b.h)/2+4;
  for(let tr=0;tr<6;tr++){
   let px=clamp(Math.round(cx+Math.cos(ang)*(r+tr)),1,MAP_W-2);
   let py=clamp(Math.round(cy+Math.sin(ang)*(r+tr)),1,MAP_H-2);
   if(canWalk(px,py)){posts.push({x:px,y:py});break}
  }
 }
 for(let d of baseDoors){if(d.barricaded)d.open=true}
 for(let i=0;i<state.npcs.length;i++){
  let n=state.npcs[i];
  n.defenseX=posts[i%posts.length].x;n.defenseY=posts[i%posts.length].y;n.defenseReached=false;
  let nBld=getBuildingAt(fl(n.fx),fl(n.fy));
  if(nBld){
   let nearDoor=null,nearDist=Infinity;
   for(let d of state.doors){
    if(d.building===nBld){
     let dd=distXY(n.fx,n.fy,d.x,d.y);
     if(dd<nearDist){nearDist=dd;nearDoor=d}
    }
   }
   if(nearDoor){
    let side=getWallSide(nBld,nearDoor.x,nearDoor.y);
    let exitX=nearDoor.x,exitY=nearDoor.y;
    if(side==='top')exitY-=2;else if(side==='bottom')exitY+=2;
    else if(side==='left')exitX-=2;else if(side==='right')exitX+=2;
    exitX=clamp(exitX,1,MAP_W-2);exitY=clamp(exitY,1,MAP_H-2);
    n.exitX=exitX;n.exitY=exitY;n.exiting=true;
   }
  }
 }
 msg('ALERTE! Les zombies attaquent la base!',3000);
 spawnAssaultWave();
}
function spawnHordeZombies(count){
 for(let i=0;i<count;i++){
  let side=rand(0,3);
  let x,y;
  if(side===0){x=rand(2,MAP_W-3);y=0}
  else if(side===1){x=rand(2,MAP_W-3);y=MAP_H-1}
  else if(side===2){x=0;y=rand(2,MAP_H-3)}
  else{x=MAP_W-1;y=rand(2,MAP_H-3)}
  for(let t=0;t<5;t++){
   if(canWalk(x,y))break;
   if(side===0)y++;else if(side===1)y--;else if(side===2)x++;else x--;
  }
  let z=makeZombie(x,y,getZombieLevel()+2);z.alerted=true;z.alertDelay=60;z.jumpAnim=20;z.isHorde=true;
  state.zombies.push(z);
 }
 state.hordeSpawned+=count;
}
function spawnAssaultWave(){
 state.currentWave++;
 let bonus=Math.floor((state.hordeEncounters-1)*10/HORDE_WAVES);
 let count=(HORDE_WAVE_COUNTS[state.currentWave-1]||10)+bonus;
 spawnHordeZombies(count);
 if(state.currentWave===1){
  for(let z of state.zombies){if(z.alive&&!z.isHorde){z.alerted=true;z.alertDelay=60;z.jumpAnim=20}}
 }
 if(state.currentWave>=HORDE_WAVES){
  let side=rand(0,3);
  let bx,by;
  if(side===0){bx=rand(5,MAP_W-5);by=0}
  else if(side===1){bx=rand(5,MAP_W-5);by=MAP_H-1}
  else if(side===2){bx=0;by=rand(5,MAP_H-5)}
  else{bx=MAP_W-1;by=rand(5,MAP_H-5)}
  let boss=makeBossZombie(bx,by);boss.isHorde=true;
  state.zombies.push(boss);
  state.baseBoss=boss;
  msg('BOSS ZOMBIE approche!',3000);
 }
}
function updateGrenades(){
 let p=state.player;
 for(let i=state.grenades.length-1;i>=0;i--){
  let g=state.grenades[i];
  let prog=1-g.timer/40;
  g.cx=g.fx+(g.tx-g.fx)*prog;g.cy=g.fy+(g.ty-g.fy)*prog;
  g.timer--;
  if(g.timer<=0){
   state.grenades.splice(i,1);
   playSound('explosion');
   state.explosions.push({fx:g.tx,fy:g.ty,timer:20,maxTimer:20});
   state.shakeTimer=8;state.shakeMaxTimer=8;state.shakeIntensity=0.25;
   for(let z of state.zombies){
    if(!z.alive)continue;
    let d=distXY(g.tx,g.ty,z.fx,z.fy);
    if(d<g.radius){
     let dmg=Math.max(1,Math.floor(g.dmg*(1-d/g.radius)));
     z.hp-=dmg;z.alerted=true;z.hitSlowTimer=HIT_SLOW_DURATION;
     let ka=Math.atan2(z.fy-g.ty,z.fx-g.tx);setKnockback(z,ka,0.4);
     addFloater(z.fx,z.fy,'-'+dmg,'#f80');
     if(z.hp<=0)killZombie(z)
    }
   }
   let pd=distXY(g.tx,g.ty,p.fx,p.fy);
   if(pd<g.radius&&state.iFrames<=0){
    let dmg=Math.max(1,Math.floor(g.dmg*0.5*(1-pd/g.radius))-Math.floor(p.armor/3));
    p.hp-=dmg;p.hitSlowTimer=HIT_SLOW_DURATION;state.iFrames=20;state.dmgVignetteTimer=15;
    let ka=Math.atan2(p.fy-g.ty,p.fx-g.tx);setKnockback(p,ka,0.5);
    addFloater(p.fx,p.fy,'-'+dmg,'#f80');
    if(p.hp<=0)killPlayer()
   }
  }
 }
}
function updateRocks(){
 let p=state.player;
 for(let i=state.rockWarnings.length-1;i>=0;i--){
  let w=state.rockWarnings[i];w.timer--;
  if(w.timer<=0){launchRock(w);state.rockWarnings.splice(i,1)}
 }
 for(let i=state.rocks.length-1;i>=0;i--){
  let r=state.rocks[i];
  r.life--;
  if(r.life<=0){state.rocks.splice(i,1);continue}
  let nx=r.fx+Math.cos(r.angle)*r.spd,ny=r.fy+Math.sin(r.angle)*r.spd;
  let tx=fl(nx),ty=fl(ny);
  if(tx<0||ty<0||tx>=MAP_W||ty>=MAP_H||state.map[ty][tx]===1||state.map[ty][tx]===5){
   state.explosions.push({fx:r.fx,fy:r.fy,timer:10});state.rocks.splice(i,1);continue;
  }
  let blockedDoor=doorAt(tx,ty);
  if(blockedDoor&&blockedDoor.barricaded&&!blockedDoor.open){
   if(blockedDoor.doorHp!==undefined){blockedDoor.doorHp--;if(blockedDoor.doorHp<=0){blockedDoor.barricaded=false;blockedDoor.open=true;msg('Une porte a ete defoncee!')}}
   state.explosions.push({fx:r.fx,fy:r.fy,timer:10});state.rocks.splice(i,1);continue;
  }
  r.fx=nx;r.fy=ny;
  if(distXY(r.fx,r.fy,p.fx,p.fy)<0.8){
   let dmg=Math.max(1,r.dmg-Math.floor(p.armor/3));p.hp-=dmg;p.hitSlowTimer=HIT_SLOW_DURATION;
   state.shakeTimer=10;state.shakeMaxTimer=10;state.shakeIntensity=0.4;state.dmgVignetteTimer=20;
   addFloater(p.fx,p.fy,'-'+dmg,'#f80');
   if(p.hp<=0)killPlayer()
   state.explosions.push({fx:r.fx,fy:r.fy,timer:10});state.rocks.splice(i,1);continue;
  }
  for(let n of state.npcs){
   if(!n.alive)continue;
   if(distXY(r.fx,r.fy,n.fx,n.fy)<0.8){
    n.hp-=r.dmg;
    setGroupHostile(n,'zombie');
    if(n.isMadman&&!n.enraged){n.enraged=true;n.speech='ON M\'ATTAQUE!';n.speechTimer=120}
    if(n.hp<=0)killNPC(n);
    addFloater(n.fx,n.fy,'-'+r.dmg,'#f80');
    state.explosions.push({fx:r.fx,fy:r.fy,timer:10});state.rocks.splice(i,1);break;
   }
  }
 }
}
function updateSpits(){
 let p=state.player;
 for(let i=state.spits.length-1;i>=0;i--){
  let sp=state.spits[i];sp.timer--;
  let dx=sp.tx-sp.fx,dy=sp.ty-sp.fy,d=Math.hypot(dx,dy)||1;
  sp.fx+=dx/d*sp.speed;sp.fy+=dy/d*sp.speed;
  if(d<0.5||sp.timer<=0){state.spits.splice(i,1);continue}
  if(distXY(sp.fx,sp.fy,p.fx,p.fy)<0.7&&state.iFrames<=0){
   p.hp-=sp.dmg;p.hitSlowTimer=HIT_SLOW_DURATION;state.iFrames=20;state.dmgVignetteTimer=15;
   p.spitDebuff=Math.min((p.spitDebuff||0)+300,900);
   addFloater(p.fx,p.fy,'-'+sp.dmg,'#0f0');state.spits.splice(i,1);
   if(p.hp<=0)killPlayer()
  }
 }
}
function updateAcidPools(){
 let p=state.player;
 for(let i=state.acidPools.length-1;i>=0;i--){
  let ap=state.acidPools[i];ap.timer--;ap.dmgCooldown--;
  if(ap.timer<=0){state.acidPools.splice(i,1);continue}
  let pInPool=distXY(ap.fx,ap.fy,p.fx,p.fy)<ap.radius;
  if(pInPool&&!ap.playerInside){
   ap.playerInside=true;
   if(state.iFrames<=0){
    p.hp-=5;addFloater(p.fx,p.fy,'-5','#0a0');state.iFrames=10;state.dmgVignetteTimer=10;
    p.spitDebuff=Math.min((p.spitDebuff||0)+180,900);
    if(p.hp<=0)killPlayer()
   }
  }
  if(!pInPool)ap.playerInside=false;
  if(ap.dmgCooldown<=0){
   ap.dmgCooldown=30;
   if(pInPool&&state.iFrames<=0){
    p.hp-=3;addFloater(p.fx,p.fy,'-3','#0a0');state.iFrames=10;state.dmgVignetteTimer=10;
    if(p.hp<=0)killPlayer()
   }
   for(let n of state.npcs){if(n.alive&&distXY(ap.fx,ap.fy,n.fx,n.fy)<ap.radius){n.hp-=3;if(n.hp<=0)killNPC(n)}}
  }
 }
}
function updateBullets(){
 for(let i=state.bullets.length-1;i>=0;i--){state.bullets[i].life--;if(state.bullets[i].life<=0)state.bullets.splice(i,1)}
 for(let i=state.explosions.length-1;i>=0;i--){state.explosions[i].timer--;if(state.explosions[i].timer<=0)state.explosions.splice(i,1)}
 for(let i=state.dmgFloaters.length-1;i>=0;i--){
  state.dmgFloaters[i].life--;state.dmgFloaters[i].y-=0.02;
  if(state.dmgFloaters[i].life<=0)state.dmgFloaters.splice(i,1);
 }
 for(let i=state.confetti.length-1;i>=0;i--){
  let c=state.confetti[i];c.x+=c.vx;c.y+=c.vy;c.vy+=0.002;c.life--;
  if(c.life<=0)state.confetti.splice(i,1);
 }
}
function updatePlayerMovement(){
 let p=state.player,{keys}=state;
 if(p.postAttackSlow>0)p.postAttackSlow--;
 applyKnockback(p);
 if(p.swingTimer>0)p.swingTimer--;
 if(p.cooldown>0){p.cooldown--;p.isAttacking=true}
 else{p.isAttacking=false}
 if(p.smgHeat>0)p.smgHeat=Math.max(0,p.smgHeat-SMG_HEAT_DECAY);
 let s=TILE*state.scale;
 let pwx=p.fx*s-state.cam.x,pwy=p.fy*s-state.cam.y;
 if(state.touchMode){
  if(state.touchAimAngle!==null)p.angle=state.touchAimAngle;
  else{
   let nearZ=null,nd=Infinity;
   for(let z of state.zombies){if(!z.alive)continue;let d=distXY(p.fx,p.fy,z.fx,z.fy);if(d<nd){nearZ=z;nd=d}}
   if(nearZ&&nd<15)p.angle=Math.atan2(nearZ.fy-p.fy,nearZ.fx-p.fx);
  }
 }else{
  p.angle=Math.atan2(state.mouseY-pwy-s/2,state.mouseX-pwx-s/2);
 }
 let dx=0,dy=0;
 if(keys.ArrowUp||keys.KeyW||keys.KeyZ)dy=-1;
 if(keys.ArrowDown||keys.KeyS)dy=1;
 if(keys.ArrowLeft||keys.KeyA||keys.KeyQ)dx=-1;
 if(keys.ArrowRight||keys.KeyD)dx=1;
 if(dx||dy){
  let rawSpd=Math.min(p.speed,20);
  let spd=(0.05+rawSpd*0.01)*getSpeedMult(p);
  let moveAngle=Math.atan2(dy,dx);
  let angleDiff=Math.abs(moveAngle-p.angle);if(angleDiff>Math.PI)angleDiff=2*Math.PI-angleDiff;
  if(angleDiff>Math.PI/2)spd*=0.7;
  let nx=p.fx+dx*spd,ny=p.fy+dy*spd;
  if(canWalk(Math.floor(nx+(dx>0?0.4:-0.4)+0.5),fl(p.fy)))p.fx=nx;
  if(canWalk(fl(p.fx),Math.floor(ny+(dy>0?0.4:-0.4)+0.5)))p.fy=ny;
  p.fx=clamp(p.fx,0,MAP_W-1);p.fy=clamp(p.fy,0,MAP_H-1);
  p.x=fl(p.fx);p.y=fl(p.fy);
 }
 if(p.spitDebuff>0){p.spitDebuff--;p.hitSlowTimer=Math.max(p.hitSlowTimer,1)}
 let playerInside=isInBuilding(p.x,p.y);
 if(playerInside){
  let bld=getBuildingAt(p.x,p.y);
  if(bld&&!bld.searched){bld.searched=true;state.buildingsExplored++;addXP(p,5);addFloater(p.fx,p.fy,'+5 XP','#0f0')}
  if(bld&&!bld.zombieTriggered){
   if(!bld.triggerTimer)bld.triggerTimer=0;
   bld.triggerTimer++;
   if(bld.triggerTimer>=120){
    bld.zombieTriggered=true;
    for(let z of state.zombies){if(z.alive&&getBuildingAt(fl(z.fx),fl(z.fy))===bld){z.alerted=true;z.alertDelay=0}}
   }
  }
  for(let n of state.npcs){
   if(!n.alive||!n.isMadman)continue;
   if(getBuildingAt(fl(n.fx),fl(n.fy))===bld){
    if(!n.madmanHouseTrigger){n.madmanHouseTrigger=1;n.speech='DEGAGE DE MA MAISON!';n.speechTimer=180}
    else{n.madmanHouseTrigger++;if(n.madmanHouseTrigger>=600&&!n.enraged){n.enraged=true;n.speech='TU L\'AURAS VOULU!';n.speechTimer=180;addFloater(n.fx,n.fy-0.5,'ENRAGE!','#f00')}}
   }
  }
 }
}
function updatePlayerAttack(){
 let p=state.player,{keys}=state;
 if(p.chargedCooldown>0)p.chargedCooldown--;
 let sel=p.inventory[p.selectedSlot];
 let wep=getWeaponDef(sel);
 if(state.mouseDown&&wep&&wep.melee&&p.chargedCooldown<=0){p.chargeHold++}
 if(!state.mouseDown&&p.chargeHold>=40&&wep&&wep.melee&&p.chargedCooldown<=0){
  p.chargeHold=0;p.chargedCooldown=20*60;
  p.cooldown=wep.cooldown;p.swingTimer=wep.cooldown;p.swingDuration=wep.cooldown;
  playSound('bat');
  state.shakeTimer=10;state.shakeMaxTimer=10;state.shakeIntensity=0.3;
  let range=wep.range*1.2;
  let chargeArc=wep.arc*1.3||Math.PI;
  for(let z of state.zombies){
   if(!z.alive)continue;
   let d=distXY(p.fx,p.fy,z.fx,z.fy);
   if(d<range&&!isWallBetween(p.fx,p.fy,z.fx,z.fy)){
    let toZ=Math.atan2(z.fy-p.fy,z.fx-p.fx);
    let diff=Math.abs(toZ-p.angle);if(diff>Math.PI)diff=2*Math.PI-diff;
    if(diff<chargeArc/2){
     let dmg=Math.max(1,Math.floor((wep.dmg+p.atk+3)*2.5)-Math.floor(z.armor/3));
     z.hp-=dmg;z.alerted=true;z.alertDelay=0;z.hitSlowTimer=HIT_SLOW_DURATION;z.playerDamaged=true;
     let ka=Math.atan2(z.fy-p.fy,z.fx-p.fx);
     setKnockback(z,ka,z.isBoss?0.2:0.5);
     addFloater(z.fx,z.fy,'-'+dmg,'#f80');
     if(z.hp<=0){killZombie(z);addFloater(z.fx,z.fy-0.5,'KILL','#f44')}
    }
   }
  }
  for(let n of state.npcs){
   if(!n.alive)continue;
   let d=distXY(p.fx,p.fy,n.fx,n.fy);
   if(d<range&&!isWallBetween(p.fx,p.fy,n.fx,n.fy)){
    let toN=Math.atan2(n.fy-p.fy,n.fx-p.fx);
    let diff=Math.abs(toN-p.angle);if(diff>Math.PI)diff=2*Math.PI-diff;
    if(diff<chargeArc/2){
     let dmg=Math.max(1,Math.floor((wep.dmg+p.atk+3)*2.5));
     hitNPC(n,dmg);
    }
   }
  }
  for(let door of state.doors){
   if(!door.barricaded||door.open||!door.doorHp)continue;
   let d=distXY(p.fx,p.fy,door.x+0.5,door.y+0.5);
   if(d<range){
    let dmg=Math.max(1,Math.floor((wep.dmg+p.atk+3)*1.5));
    door.doorHp-=dmg;addFloater(door.x+0.5,door.y+0.5,'-'+dmg,'#a60');
    if(door.doorHp<=0){door.barricaded=false;door.open=true;playSound('door');msg('Porte defoncee!')}
   }
  }
  addFloater(p.fx,p.fy-0.5,'FRAPPE!','#f80');
 }
 if(!state.mouseDown&&p.chargeHold>0&&p.chargeHold<40){
  if(p.cooldown<=0){meleeAttack(p);p.swingTimer=p.cooldown;p.swingDuration=p.cooldown}
  p.chargeHold=0;
 }
 if(wep&&wep.name==='smg'){
  if(p.smgHeat>=SMG_OVERHEAT_THRESHOLD){
   if(!p.smgJammed){p.smgJammed=true;p.smgJamCooldown=60;msg('Surchauffe!');addFloater(p.fx,p.fy-0.5,'SURCHAUFFE!','#f44')}
  }
  if(p.smgJammed){
   if(!p.smgJamCooldown)p.smgJamCooldown=0;
   p.smgJamCooldown--;
   if(p.smgJamCooldown<=0&&p.smgHeat<SMG_OVERHEAT_THRESHOLD){p.smgJammed=false}
  }
  if(state.mouseDown&&p.cooldown<=0&&!p.smgJammed){
   if(p.ammo>0){shootAttack(p);p.ammo--;p.swingTimer=6;p.smgHeat=Math.min(1,p.smgHeat+SMG_HEAT_PER_SHOT)}
   else if(!state.attackPressed){state.attackPressed=true;msg('Plus de munitions!')}
  }
 }else{
  if(state.mouseDown&&!state.attackPressed&&p.cooldown<=0&&!(wep&&wep.melee&&p.chargeHold>0)){
   state.attackPressed=true;
   if(wep){
    if(wep.melee){meleeAttack(p);p.swingTimer=p.cooldown;p.swingDuration=p.cooldown}
    else{if(p.ammo>0){shootAttack(p);p.ammo--}else msg('Plus de munitions!')}
   }else msg('Selectionnez une arme (1-5)');
  }
 }
 if(!state.mouseDown)state.attackPressed=false;
 if(keys.KeyF&&!state.healCooldown){
  if(p.healSlot&&p.healSlot.qty>0&&p.hp<p.maxHp){
   let heal=Math.min(25,p.maxHp-p.hp);p.hp+=heal;p.healSlot.qty--;
   msg('Bandage! +'+heal+' PV');addFloater(p.fx,p.fy,'+'+heal,'#4f4');playSound('pickup');
   if(p.healSlot.qty<=0)p.healSlot=null;
   state.healCooldown=30;
  }else if(!p.healSlot||p.healSlot.qty<=0){msg('Pas de soins!')}
  else{msg('PV au max!')}
 }
 if(state.healCooldown>0)state.healCooldown--;
}
function updateInteraction(){
 let p=state.player,{keys}=state;
 if(keys.KeyE){
  if(!state.holdingE){
   state.holdingE=true;state.holdETimer=0;
   let didInteract=false;
   if(!didInteract){
    let door=state.doors.find(d=>distXY(d.x+0.5,d.y+0.5,p.fx,p.fy)<INTERACT_RANGE&&d.barricaded);
    if(door){
     if(door.doorType==='zombie'||door.doorType==='madman'){
      msg('Porte renforcee! Frappez-la pour la casser ('+door.doorHp+' PV)');didInteract=true;
     }else{
      door.open=!door.open;playSound('door');msg(door.open?'Porte ouverte':'Porte fermee');didInteract=true;
     }
    }
   }
   if(!didInteract){
    let found=findNearestInteractable(p);
    if(found&&found.kind==='item'){
     let it=found.item,idx=found.index;
     if(it.type==='weapon'){
      let existing=p.inventory.find(i=>i&&i.type==='weapon'&&i.name===it.name);
      if(existing){p.ammo+=10;msg('Munitions +10 (total:'+p.ammo+')');state.items.splice(idx,1);playSound('pickup');state.itemsFound++}
      else{let slot=p.inventory.findIndex(i=>i===null);
       if(slot>=0){p.inventory[slot]={type:'weapon',name:it.name,ammo:0};p.ammo+=10;msg((WEAPONS[it.name]?.label||it.name)+'! +10 munitions (slot '+(slot+1)+')');state.items.splice(idx,1);playSound('pickup');state.itemsFound++}
       else msg('Inventaire plein!')}
      didInteract=true;
     }else if(it.type==='ammo'){p.ammo+=20;msg('Munitions +20 (total:'+p.ammo+')');state.items.splice(idx,1);playSound('pickup');state.itemsFound++;didInteract=true}
     else if(it.type==='bandage'){
      if(!p.healSlot){p.healSlot={type:'bandage',qty:1};msg('Bandage! (Q pour utiliser)');state.items.splice(idx,1);playSound('pickup');state.itemsFound++}
      else if(p.healSlot.qty<5){p.healSlot.qty++;msg('Bandage +1 ('+p.healSlot.qty+'/5)');state.items.splice(idx,1);playSound('pickup');state.itemsFound++}
      else msg('Soins pleins! (5/5)');didInteract=true;
     }else if(it.type==='coin'){
      addCoins(p,1000);msg('Coins +1000$ (total:'+p.coins+')');state.items.splice(idx,1);playSound('pickup');state.itemsFound++;didInteract=true;
     }else if(it.type==='coins'){
      addCoins(p,it.coins||50);msg('Coins +'+( it.coins||50)+'$ (total:'+p.coins+')');state.items.splice(idx,1);playSound('pickup');state.itemsFound++;didInteract=true;
     }
    }
   }
   if(!didInteract){
    let udoor=state.doors.find(d=>distXY(d.x+0.5,d.y+0.5,p.fx,p.fy)<INTERACT_RANGE&&!d.barricaded);
    if(udoor&&p.coins>=300){p.coins-=300;udoor.barricaded=true;udoor.open=false;msg('Porte reparee! (-300$)')}
    else if(udoor&&p.coins<300){msg('Il faut 300$ ('+p.coins+'$)')}
   }
   if(!didInteract){
    let injuredAlly=state.npcs.find(n=>n.alive&&n.isAlly&&n.isInjured&&!n.recruited&&distXY(n.fx,n.fy,p.fx,p.fy)<INTERACT_RANGE);
    if(injuredAlly){
     if(p.healSlot&&p.healSlot.qty>0&&p.coins>=2000){
      p.healSlot.qty--;if(p.healSlot.qty<=0)p.healSlot=null;
      p.coins-=2000;
      injuredAlly.isInjured=false;injuredAlly.recruited=true;
      injuredAlly.hp=injuredAlly.maxHp;injuredAlly.followTarget='player';
      state.allies.push(injuredAlly);
      msg('Allie recrute! (-1 bandage, -2000$)');playSound('pickup');
      addFloater(injuredAlly.fx,injuredAlly.fy,'RECRUTE!','#0f0');
      didInteract=true;
     }else{
      let missing=[];
      if(!p.healSlot||p.healSlot.qty<=0)missing.push('bandage');
      if(p.coins<2000)missing.push('2000$ ('+p.coins+'$)');
      msg('Il faut: '+missing.join(' + '));didInteract=true;
     }
    }
   }
   if(state.baseEvent&&!state.baseEventActive&&!state.baseRewardGiven&&!didInteract){
    let chef=state.npcs.find(n=>n.alive&&n.isLeader&&distXY(n.fx,n.fy,p.fx,p.fy)<INTERACT_RANGE);
    if(chef){
     chef.speech='DEFENDONS LA BASE!';chef.speechTimer=180;
     startBaseAssault();didInteract=true;
    }
   }
   if(!state.baseEvent||!state.baseEventActive){
    if(state.exitNext.x>=0&&distXY(p.fx,p.fy,state.exitNext.x+0.5,state.exitNext.y+0.5)<INTERACT_RANGE){nextMap();return true}
    if(state.exitPrev.x>=0&&distXY(p.fx,p.fy,state.exitPrev.x+0.5,state.exitPrev.y+0.5)<INTERACT_RANGE){prevMap();return true}
   }
   let bld=getBuildingAt(p.x,p.y);if(bld)bld.searched=true;
  }
  state.holdETimer++;
  if(state.holdETimer>10){
   if(!state.draggingBarrel){
    let nearest=null,nd=Infinity;
    for(let b of state.barrels){if(!b.alive)continue;let d=distXY(p.fx,p.fy,b.fx,b.fy);if(d<INTERACT_RANGE&&d<nd){nearest=b;nd=d}}
    for(let b of state.barricades){let d=distXY(p.fx,p.fy,b.fx,b.fy);if(d<INTERACT_RANGE&&d<nd){nearest=b;nd=d}}
    if(nearest)state.draggingBarrel=nearest;
   }
   if(state.draggingBarrel&&(state.draggingBarrel.alive!==false)){
    let b=state.draggingBarrel;
    let tx=p.fx+Math.cos(p.angle)*1.5,ty=p.fy+Math.sin(p.angle)*1.5;
    let bdx=tx-b.fx,bdy=ty-b.fy,blen=Math.hypot(bdx,bdy)||1;
    let nbx=b.fx+bdx/blen*0.05,nby=b.fy+bdy/blen*0.05;
    let oldX=b.x,oldY=b.y;state.barricadeMap.delete(tileKey(oldX,oldY));b.x=-1;b.y=-1;
    if(canWalk(fl(nbx),fl(nby))){b.fx=nbx;b.fy=nby;b.x=fl(nbx);b.y=fl(nby)}
    else{b.x=oldX;b.y=oldY}
    if(b.x>=0)state.barricadeMap.set(tileKey(b.x,b.y),b);
   }
  }
 }else{if(state.holdingE){state.holdingE=false;state.holdETimer=0;state.draggingBarrel=null}}
 return false;
}
function updateZombies(){
 let p=state.player;
 let targets=[{x:p.fx,y:p.fy,fx:p.fx,fy:p.fy,isPlayer:true,hp:p.hp}];
 for(let n of state.npcs){if(n.alive)targets.push({x:n.fx,y:n.fy,fx:n.fx,fy:n.fy,isNPC:true,npc:n,hp:n.hp,isLeader:n.isLeader})}
 for(let z of state.zombies){
  if(!z.alive)continue;
  if(!canWalk(fl(z.fx),fl(z.fy))){
   for(let r=1;r<=2;r++)for(let ddx=-r;ddx<=r;ddx++)for(let ddy=-r;ddy<=r;ddy++){
    let tx=fl(z.fx)+ddx,ty=fl(z.fy)+ddy;
    if(canWalk(tx,ty)){z.fx=tx;z.fy=ty;z.x=tx;z.y=ty;r=3;break}
   }
  }
  if(z.cooldown>0)z.cooldown--;
  if(z.hitSlowTimer>0)z.hitSlowTimer--;
  if(z.postAttackSlow>0)z.postAttackSlow--;
  applyKnockback(z);
  if(z.speechTimer>0)z.speechTimer--;else{z.speech=null;if(prng()<0.001){z.speech=ZOMBIE_GROANS[rand(0,ZOMBIE_GROANS.length-1)];z.speechTimer=90}}
  if(z.atkTimer>0){z.atkTimer--;z.isAttacking=true}
  else{if(z.isAttacking){z.postAttackSlow=POST_ATTACK_SLOW_DURATION}z.isAttacking=false}
  let bestTarget=null,bestDist=Infinity;
  for(let t of targets){
   let d=distXY(z.fx,z.fy,t.x,t.y);
   let weight=t.isNPC?0.6:1;
   if(t.isLeader)weight=0.4;
   if(d*weight<bestDist){bestTarget=t;bestDist=d*weight}
  }
  let actualDist=bestTarget?distXY(z.fx,z.fy,bestTarget.x,bestTarget.y):Infinity;
  if(!z.alerted&&actualDist<=SIGHT_RADIUS){
   if(!isWallBetween(z.fx,z.fy,bestTarget.fx,bestTarget.fy)){z.alerted=true;z.alertDelay=60;z.jumpAnim=20;playSound('zombie_alert')}
  }
  if(z.alertDelay>0){z.alertDelay--;z.jumpAnim=Math.max(0,z.jumpAnim-1)}
  if(!z.alerted){
   if(z.investigateTimer>0){
    z.investigateTimer--;
    let ispd=0.01;
    let idx=z.investigateX-z.fx,idy=z.investigateY-z.fy,ilen=Math.hypot(idx,idy)||1;
    let inx=z.fx+idx/ilen*ispd,iny=z.fy+idy/ilen*ispd;
    if(canWalk(fl(inx),fl(z.fy))&&zombieCanEnter(fl(inx),fl(z.fy)))z.fx=inx;
    if(canWalk(fl(z.fx),fl(iny))&&zombieCanEnter(fl(z.fx),fl(iny)))z.fy=iny;
    z.x=fl(z.fx);z.y=fl(z.fy);
    z.angle=Math.atan2(idy,idx);
   }else if(z.wanderTimer!==undefined){
    z.wanderTimer--;
    if(z.wanderTimer<=0){z.wanderAngle=prng()*Math.PI*2;z.wanderTimer=rand(60,180)}
    let wspd=0.015;
    let wnx=z.fx+Math.cos(z.wanderAngle)*wspd,wny=z.fy+Math.sin(z.wanderAngle)*wspd;
    let wCanW=canWalk(fl(wnx),fl(wny))&&zombieCanEnter(fl(wnx),fl(wny));
    if(wCanW){z.fx=wnx;z.fy=wny}
    else{
     let slideA=z.wanderAngle+Math.PI/2,slideB=z.wanderAngle-Math.PI/2;
     let sa=z.fx+Math.cos(slideA)*wspd,sb=z.fy+Math.sin(slideA)*wspd;
     let sCanA=canWalk(fl(sa),fl(sb))&&zombieCanEnter(fl(sa),fl(sb));
     if(sCanA){z.fx=sa;z.fy=sb;z.wanderAngle=slideA}
     else{let sc=z.fx+Math.cos(slideB)*wspd,sd=z.fy+Math.sin(slideB)*wspd;
      let sCanB=canWalk(fl(sc),fl(sd))&&zombieCanEnter(fl(sc),fl(sd));
      if(sCanB){z.fx=sc;z.fy=sd;z.wanderAngle=slideB}
      else{z.wanderAngle=prng()*Math.PI*2}
     }
    }
    z.x=fl(z.fx);z.y=fl(z.fy);
    z.angle=z.wanderAngle;
   }
  }
  if(z.alerted&&z.alertDelay<=0&&bestTarget&&actualDist<(z.isHorde?999:30)){
   z.angle=Math.atan2(bestTarget.fy-z.fy,bestTarget.fx-z.fx);
   let zspd=(0.02+z.speed*0.008)*getSpeedMult(z);
   let adx=bestTarget.fx-z.fx,ady=bestTarget.fy-z.fy,len=Math.hypot(adx,ady)||1;
   let zst=updateStuck(z,adx,ady,len,bestTarget.fx,bestTarget.fy,(tx,ty)=>zombieCanEnter(tx,ty,true));adx=zst.dx;ady=zst.dy;len=zst.len;
   let nx=z.fx+adx/len*zspd,ny=z.fy+ady/len*zspd;
   let canX=canWalk(fl(nx),fl(z.fy))&&zombieCanEnter(fl(nx),fl(z.fy),true);
   let canY=canWalk(fl(z.fx),fl(ny))&&zombieCanEnter(fl(z.fx),fl(ny),true);
   if(canX)z.fx=nx;
   if(canY)z.fy=ny;
   if(!canX&&!canY){
    let perpX=z.fx+ady/len*zspd,perpX2=z.fx-ady/len*zspd;
    let perpY=z.fy+adx/len*zspd,perpY2=z.fy-adx/len*zspd;
    let cA=canWalk(fl(perpX),fl(perpY))&&zombieCanEnter(fl(perpX),fl(perpY),true);
    let cB=canWalk(fl(perpX2),fl(perpY2))&&zombieCanEnter(fl(perpX2),fl(perpY2),true);
    if(cA&&cB){
     let dA=Math.hypot(perpX-bestTarget.fx,perpY-bestTarget.fy);
     let dB=Math.hypot(perpX2-bestTarget.fx,perpY2-bestTarget.fy);
     if(dA<=dB){z.fx=perpX;z.fy=perpY}else{z.fx=perpX2;z.fy=perpY2}
    }else if(cA){z.fx=perpX;z.fy=perpY}
    else if(cB){z.fx=perpX2;z.fy=perpY2}
   }else if(!canX){
    let slideUp=z.fy-zspd,slideDown=z.fy+zspd;
    let sU=canWalk(fl(nx),fl(slideUp))&&zombieCanEnter(fl(nx),fl(slideUp),true);
    let sD=canWalk(fl(nx),fl(slideDown))&&zombieCanEnter(fl(nx),fl(slideDown),true);
    if(sU&&sD){if(Math.abs(bestTarget.fy-slideUp)<Math.abs(bestTarget.fy-slideDown))z.fy=slideUp;else z.fy=slideDown}
    else if(sU)z.fy=slideUp;else if(sD)z.fy=slideDown;
   }else if(!canY){
    let slideLeft=z.fx-zspd,slideRight=z.fx+zspd;
    let sL=canWalk(fl(slideLeft),fl(ny))&&zombieCanEnter(fl(slideLeft),fl(ny),true);
    let sR=canWalk(fl(slideRight),fl(ny))&&zombieCanEnter(fl(slideRight),fl(ny),true);
    if(sL&&sR){if(Math.abs(bestTarget.fx-slideLeft)<Math.abs(bestTarget.fx-slideRight))z.fx=slideLeft;else z.fx=slideRight}
    else if(sL)z.fx=slideLeft;else if(sR)z.fx=slideRight;
   }
   if(!canX||!canY){
    let checkX=fl(nx),checkY=fl(ny);
    let blockedDoor=null;
    if(!canX){blockedDoor=doorAt(checkX,fl(z.fy))}
    if(!blockedDoor&&!canY){blockedDoor=doorAt(fl(z.fx),checkY)}
    if(blockedDoor&&blockedDoor.barricaded&&!blockedDoor.open&&z.cooldown<=0){
     z.cooldown=z.atkCooldown;z.atkTimer=z.atkDuration;
     if(blockedDoor.doorHp!==undefined){
      blockedDoor.doorHp--;
      addFloater(blockedDoor.x,blockedDoor.y,'-1','#a60');
      if(blockedDoor.doorHp<=0){blockedDoor.barricaded=false;blockedDoor.open=true;msg('Une porte a ete defoncee!')}
     }else{blockedDoor.barricaded=false;blockedDoor.open=true}
    }
    if(!blockedDoor&&z.cooldown<=0){
     let brc=null;
     if(!canX)brc=barricadeAt(fl(nx),fl(z.fy));
     if(!brc&&!canY)brc=barricadeAt(fl(z.fx),fl(ny));
     if(brc){z.cooldown=z.atkCooldown;z.atkTimer=z.atkDuration;brc.hp-=2;addFloater(brc.fx,brc.fy,'-2','#a60');
      if(brc.hp<=0){let bi=state.barricades.indexOf(brc);if(bi>=0)state.barricades.splice(bi,1);state.barricadeMap.delete(tileKey(brc.x,brc.y));msg('Barricade detruite!')}
     }
    }
   }
   z.x=fl(z.fx);z.y=fl(z.fy);
   if(z.isSpitter&&z.cooldown<=0&&actualDist<22&&actualDist>2&&!isWallBetween(z.fx,z.fy,bestTarget.fx,bestTarget.fy)){
    z.cooldown=z.atkCooldown;z.atkTimer=z.atkDuration;z.angle=Math.atan2(bestTarget.fy-z.fy,bestTarget.fx-z.fx);
    state.spits.push({fx:z.fx,fy:z.fy,tx:bestTarget.fx,ty:bestTarget.fy,speed:0.12,dmg:5,timer:180});
   }
   if(actualDist<ZOMBIE_ATK_RANGE&&z.cooldown<=0&&(actualDist<1||!isWallBetween(z.fx,z.fy,bestTarget.fx,bestTarget.fy))){
    z.cooldown=z.atkCooldown;z.atkTimer=z.atkDuration;playSound('zombie_hit');
    if(actualDist<0.8||prng()*10<z.precision){
     let dmg=Math.max(1,BASE_DMG_ZOMBIE+Math.floor(z.atk/3));
     let ka=Math.atan2(bestTarget.y-z.fy,bestTarget.x-z.fx),kb=z.isBoss?0.6:0.35;
     if(bestTarget.isPlayer){
      if(state.iFrames<=0){
       dmg=Math.max(1,dmg-Math.floor(p.armor/2));
       p.hp-=dmg;p.hitSlowTimer=HIT_SLOW_DURATION;
       state.iFrames=20;state.shakeTimer=12;state.shakeMaxTimer=12;state.shakeIntensity=0.3;state.dmgVignetteTimer=20;
       setKnockback(p,ka,kb);
       addFloater(p.fx,p.fy,'-'+dmg,'#f44');
       if(p.hp<=0)killPlayer()
      }
     }else if(bestTarget.isNPC){
      let n=bestTarget.npc;
      n.hp-=dmg;
      setKnockback(n,ka,kb);
      addFloater(n.fx,n.fy,'-'+dmg,'#f44');
      setGroupHostile(n,'zombie');
      if(n.isMadman&&!n.enraged){n.enraged=true;n.speech='ON M\'ATTAQUE!';n.speechTimer=120}
      if(n.hp<=0)killNPC(n);
     }
    }
   }
  }
  if(z.isNecromancer&&z.alive){
   if(z.resurrectionCooldown>0)z.resurrectionCooldown--;
   if(z.resurrectionCooldown<=0){
    let resR=6,resCount=0;
    for(let dz of state.zombies){
     if(dz.alive||dz.isNecromancer||dz.isBoss||resCount>=3)continue;
     if(distXY(z.fx,z.fy,dz.fx,dz.fy)<resR){
      dz.alive=true;dz.hp=Math.ceil(dz.maxHp*0.5);dz.alerted=true;dz.alertDelay=30;dz.jumpAnim=15;
      dz.playerDamaged=false;
      addFloater(dz.fx,dz.fy,'RESURRECTE!','#a040ff');resCount++;
     }
    }
    if(resCount>0){
     z.resurrectionCooldown=600;z.atkTimer=z.atkDuration;
     playSound('zombie_alert');addFloater(z.fx,z.fy,'NECROMANCIE!','#a040ff');
     state.explosions.push({fx:z.fx,fy:z.fy,timer:15,maxTimer:15});
    }else{z.resurrectionCooldown=120}
   }
  }
  if(z.isBoss&&z.alive){
   if(z.throwCooldown>0)z.throwCooldown--;
   if(z.meleeCooldown>0)z.meleeCooldown--;
   if(z.throwCooldown<=0&&actualDist<20){
    let rockTarget=state.npcs.find(n=>n.alive&&n.isLeader)||{fx:p.fx,fy:p.fy};
    bossThrowRock(z,rockTarget);
   }else if(z.throwCooldown>0&&z.meleeCooldown<=0&&actualDist<2.5){
    z.meleeCooldown=90;z.atkTimer=z.atkDuration;
    let aoeDmg=Math.max(1,BASE_DMG_ZOMBIE+Math.floor(z.atk/2)),aoeR=2.5;
    playSound('zombie_hit');
    state.shakeTimer=8;state.shakeMaxTimer=8;state.shakeIntensity=0.25;
    let pd=distXY(z.fx,z.fy,p.fx,p.fy);
    if(pd<aoeR&&state.iFrames<=0){
     let dm=Math.max(1,aoeDmg-Math.floor(p.armor/2));
     p.hp-=dm;p.hitSlowTimer=HIT_SLOW_DURATION;
     state.iFrames=30;state.shakeTimer=12;state.shakeMaxTimer=12;state.shakeIntensity=0.4;state.dmgVignetteTimer=20;
     let ka=Math.atan2(p.fy-z.fy,p.fx-z.fx);setKnockback(p,ka,0.8);
     addFloater(p.fx,p.fy,'-'+dm,'#f44');
     if(p.hp<=0)killPlayer()
    }
    for(let n of state.npcs){
     if(!n.alive)continue;
     let nd2=distXY(z.fx,z.fy,n.fx,n.fy);
     if(nd2<aoeR){
      n.hp-=aoeDmg;
      let ka=Math.atan2(n.fy-z.fy,n.fx-z.fx);setKnockback(n,ka,0.8);
      addFloater(n.fx,n.fy,'-'+aoeDmg,'#f44');
      if(n.hp<=0)killNPC(n);
     }
    }
    state.explosions.push({fx:z.fx,fy:z.fy,timer:15});
   }
  }
 }
 if(state.tick%ZOMBIE_CLEANUP_INTERVAL===0){
  let necro=state.zombies.find(z=>z.alive&&z.isNecromancer);
  if(necro)state.zombies=state.zombies.filter(z=>z.alive||distXY(z.fx,z.fy,necro.fx,necro.fy)<8);
  else state.zombies=state.zombies.filter(z=>z.alive);
 }
}
function updateAllNPCs(){
 let p=state.player;
 if(state.baseEvent){
  for(let n of state.npcs){
   if(!n.alive)continue;
   if(n.speechTimer>0)n.speechTimer--;else{n.speech=null;if(prng()<0.0008){n.speech=NPC_DIALOGUES[rand(0,NPC_DIALOGUES.length-1)];n.speechTimer=150}}
   if(!state.baseEventActive&&n.patrolGroup!==undefined){
    let nearestZ=null,nd=Infinity;
    for(let z of state.zombies){if(!z.alive)continue;let d=distXY(n.fx,n.fy,z.fx,z.fy);if(d<SIGHT_RADIUS&&d<nd){nearestZ=z;nd=d}}
    if(nearestZ){updateNPC(n)}
    else{
     n.wanderTimer--;
     if(n.wanderTimer<=0){n.wanderAngle=prng()*Math.PI*2;n.wanderTimer=rand(60,160)}
     let wspd=0.018;
     let wnx=n.fx+Math.cos(n.wanderAngle)*wspd,wny=n.fy+Math.sin(n.wanderAngle)*wspd;
     let dToCenter=Math.hypot(wnx-n.patrolCenterX,wny-n.patrolCenterY);
     if(dToCenter>18){n.wanderAngle=Math.atan2(n.patrolCenterY-n.fy,n.patrolCenterX-n.fx)+((prng()-0.5)*1)}
     if(canWalk(fl(wnx),fl(wny))){n.fx=wnx;n.fy=wny;n._moving=true}
     else{n.wanderAngle=prng()*Math.PI*2;n._moving=false}
     n.x=fl(n.fx);n.y=fl(n.fy);
     n.angle=n.wanderAngle;
    }
   }else{
    let nearestZ=null,nd=Infinity;
    for(let z of state.zombies){if(!z.alive)continue;let d=distXY(n.fx,n.fy,z.fx,z.fy);if(d<SIGHT_RADIUS*1.2&&d<nd){nearestZ=z;nd=d}}
    if(nearestZ){updateNPC(n)}
    else if(n.defenseX!==undefined){
     let targetX=n.defenseX,targetY=n.defenseY;
     if(n.exiting){targetX=n.exitX;targetY=n.exitY}
     let dPost=distXY(n.fx,n.fy,targetX,targetY);
     if(dPost>0.5){
      let spd=0.02+n.speed*0.005;
      let adx=targetX-n.fx,ady=targetY-n.fy,len=Math.hypot(adx,ady)||1;
      let nst=updateStuck(n,adx,ady,len,targetX,targetY);adx=nst.dx;ady=nst.dy;len=nst.len;
      let nx2=n.fx+adx/len*spd,ny2=n.fy+ady/len*spd;
      let dCanX=canWalk(fl(nx2),fl(n.fy)),dCanY=canWalk(fl(n.fx),fl(ny2));
      if(dCanX)n.fx=nx2;
      if(dCanY)n.fy=ny2;
      if(!dCanX){let bd=doorAt(fl(nx2),fl(n.fy));if(bd&&!bd.open)bd.open=true}
      if(!dCanY){let bd=doorAt(fl(n.fx),fl(ny2));if(bd&&!bd.open)bd.open=true}
      n.x=fl(n.fx);n.y=fl(n.fy);n._moving=true;
      n.angle=Math.atan2(ady,adx);
     }else{
      if(n.exiting){
       let stillInside=getBuildingAt(fl(n.fx),fl(n.fy));
       if(!stillInside){
        n.exiting=false;
        let nBld2=getBuildingOwner(fl(n.exitX),fl(n.exitY))||getBuildingAt(fl(n.exitX),fl(n.exitY));
        if(!nBld2){
         for(let d of state.doors){
          if(d.building&&d.open&&d.barricaded){
           let anyInside=false;
           for(let n2 of state.npcs){if(n2.alive&&n2.exiting&&getBuildingAt(fl(n2.fx),fl(n2.fy))===d.building){anyInside=true;break}}
           if(!anyInside)d.open=false;
          }
         }
        }
       }
       else{
        let spd=0.02+n.speed*0.005;
        let adx=targetX-n.fx,ady=targetY-n.fy,len=Math.hypot(adx,ady)||1;
        n.fx+=adx/len*spd;n.fy+=ady/len*spd;
        n.x=fl(n.fx);n.y=fl(n.fy);n._moving=true;
       }
      }
      else{n._moving=false;n.defenseReached=true}
     }
    }else{n._moving=false}
   }
  }
 }
 for(let n of state.npcs){
  if(!n.alive||!n.isMadman)continue;
  applyKnockback(n);
  if(n.speechTimer>0)n.speechTimer--;else{n.speech=null;if(prng()<0.003){n.speech=MADMAN_LINES[rand(0,MADMAN_LINES.length-1)];n.speechTimer=120}}
  if(n.boostCooldown>0)n.boostCooldown--;
  if(n.boostTimer>0){
   n.boostTimer--;
   if(n.boostTimer<=0){n.atk=n.baseAtk;n.speed=n.baseSpeed;n.precision=n.basePrecision;n.armor=n.baseArmor}
  }
  let nearestZ=null,nd=Infinity;
  for(let z of state.zombies){if(!z.alive)continue;let d=distXY(n.fx,n.fy,z.fx,z.fy);if(d<nd){nearestZ=z;nd=d}}
  if(nearestZ&&nd<10&&n.boostCooldown<=0&&n.boostTimer<=0){
   n.boostCooldown=45*60;n.boostTimer=20*60;
   n.atk=Math.ceil(n.baseAtk*1.1);n.speed=Math.ceil(n.baseSpeed*1.1);
   n.precision=Math.ceil(n.basePrecision*1.1);n.armor=Math.ceil(n.baseArmor*1.1);
   n.speech='JE SUIS INARRETABLE!';n.speechTimer=120;
   addFloater(n.fx,n.fy-0.5,'BOOST!','#f44');
  }
  let attackTarget=nearestZ;
  if(n.enraged){
   let pd=distXY(n.fx,n.fy,p.fx,p.fy);
   if(pd<nd||!nearestZ){attackTarget={fx:p.fx,fy:p.fy,x:fl(p.fx),y:fl(p.fy),alive:true};nd=pd}
  }
  if(attackTarget&&nd<12){
   if(n.enraged&&attackTarget.fx===p.fx&&attackTarget.fy===p.fy){
    n.angle=Math.atan2(p.fy-n.fy,p.fx-n.fx);
    let wep=WEAPONS[n.weapon],range=wep?wep.range:2;
    if(nd>range*0.7){
     let spd=0.03+n.speed*0.006;
     let adx=p.fx-n.fx,ady=p.fy-n.fy,len=Math.hypot(adx,ady)||1;
     let wnx=n.fx+adx/len*spd,wny=n.fy+ady/len*spd;
     if(canWalk(fl(wnx),fl(n.fy)))n.fx=wnx;
     if(canWalk(fl(n.fx),fl(wny)))n.fy=wny;
     n._moving=true;
    }else if(n.cooldown<=0){
     n.cooldown=n.atkCooldown;
     let wepDmg=wep?wep.dmg:5;
     let dmg=Math.max(1,Math.floor((wepDmg+n.atk)*0.5));
     if(prng()*10<n.precision+2){
      p.hp-=dmg;p.hitSlowTimer=HIT_SLOW_DURATION;
      state.iFrames=15;state.dmgVignetteTimer=10;
      addFloater(p.fx,p.fy,'-'+dmg,'#f44');
      if(p.hp<=0)killPlayer()
     }
    }
    n.x=fl(n.fx);n.y=fl(n.fy);
   }else{
    updateNPC(n);
   }
   if(nd<3&&prng()<0.02&&!n.speech){n.speech=MADMAN_LINES[rand(0,MADMAN_LINES.length-1)];n.speechTimer=80}
  }else{
   if(!n.wanderTarget||distXY(n.fx,n.fy,n.wanderTarget.x,n.wanderTarget.y)<2){
    for(let t=0;t<20;t++){
     let rx=rand(3,MAP_W-4),ry=rand(3,MAP_H-4);
     if(canWalk(rx,ry)){n.wanderTarget={x:rx,y:ry};break}
    }
   }
   if(n.wanderTarget){
    let dx=n.wanderTarget.x-n.fx,dy=n.wanderTarget.y-n.fy,dl=Math.hypot(dx,dy);
    let wspd=0.03+n.speed*0.006;
    if(dl>0.5){
     let wnx=n.fx+dx/dl*wspd,wny=n.fy+dy/dl*wspd;
     if(canWalk(fl(wnx),fl(n.fy)))n.fx=wnx; else{let perpX=n.fx+dy/dl*wspd;if(canWalk(fl(perpX),fl(n.fy)))n.fx=perpX}
     if(canWalk(fl(n.fx),fl(wny)))n.fy=wny; else{let perpY=n.fy-dx/dl*wspd;if(canWalk(fl(n.fx),fl(perpY)))n.fy=perpY}
     n._moving=true;n.angle=Math.atan2(dy,dx);
    }
   }
   n.x=fl(n.fx);n.y=fl(n.fy);
  }
  if(n.cooldown>0)n.cooldown--;
  clampToMap(n);
 }
 for(let n of state.npcs){
  if(!n.alive||n.isMadman)continue;
  if(!state.baseEvent){
   if(n.speechTimer>0)n.speechTimer--;else{n.speech=null;if(prng()<0.0008){n.speech=NPC_DIALOGUES[rand(0,NPC_DIALOGUES.length-1)];n.speechTimer=150}}
   if(n.abilityCooldown>0)n.abilityCooldown--;
   if(n.rallyCooldown>0)n.rallyCooldown--;
   if(!n.healMode){
    let inCombat=false;
    if(n.hostileTo==='player'){
     let pd=distXY(n.fx,n.fy,state.player.fx,state.player.fy);
     if(pd<SIGHT_RADIUS*1.5)inCombat=true;
    }
    if(!inCombat){for(let z of state.zombies){if(!z.alive)continue;if(distXY(n.fx,n.fy,z.fx,z.fy)<SIGHT_RADIUS){inCombat=true;break}}}
    if(inCombat){updateNPC(n)}
    else{
     n.notFightingTimer++;
     if(!n.wanderAngle)n.wanderAngle=prng()*Math.PI*2;
     if(!n.wanderTimer)n.wanderTimer=rand(60,160);
     n.wanderTimer--;
     if(n.wanderTimer<=0){n.wanderAngle=prng()*Math.PI*2;n.wanderTimer=rand(60,160)}
     let wspd=0.015;
     let wnx=n.fx+Math.cos(n.wanderAngle)*wspd,wny=n.fy+Math.sin(n.wanderAngle)*wspd;
     if(n.homeBase){
      let cx=n.homeBase.x+n.homeBase.w/2,cy=n.homeBase.y+n.homeBase.h/2;
      let dToBase=Math.hypot(wnx-cx,wny-cy);
      if(dToBase>12){n.wanderAngle=Math.atan2(cy-n.fy,cx-n.fx)+((prng()-0.5)*1)}
     }
     if(canWalk(fl(wnx),fl(wny))){n.fx=wnx;n.fy=wny;n._moving=true}
     else{n.wanderAngle=prng()*Math.PI*2;n._moving=false}
     n.x=fl(n.fx);n.y=fl(n.fy);n.angle=n.wanderAngle;
    }
   }
  }else{
   let nearestZ=null,nd=Infinity;
   for(let z of state.zombies){if(!z.alive)continue;let d=distXY(n.fx,n.fy,z.fx,z.fy);if(d<SIGHT_RADIUS&&d<nd){nearestZ=z;nd=d}}
   if(!nearestZ)n.notFightingTimer++;
  }
  if(n.homeBase&&n.notFightingTimer>=600&&n.hp<n.maxHp&&!n.healMode){
   n.healMode=true;n.healAmount=0;
   for(let d of state.doors){if(d.building===n.homeBase&&d.barricaded&&!d.open)d.open=true}
  }
  if(n.healMode&&n.homeBase){
   let cx=n.homeBase.x+n.homeBase.w/2,cy=n.homeBase.y+n.homeBase.h/2;
   let dToCenter=distXY(n.fx,n.fy,cx,cy);
   if(dToCenter>1.5){
    let spd=0.03+n.speed*0.005;
    let adx=cx-n.fx,ady=cy-n.fy,len=Math.hypot(adx,ady)||1;
    let hnx=n.fx+adx/len*spd,hny=n.fy+ady/len*spd;
    if(canWalk(fl(hnx),fl(n.fy)))n.fx=hnx;
    if(canWalk(fl(n.fx),fl(hny)))n.fy=hny;
    if(!canWalk(fl(hnx),fl(n.fy))){let bd=doorAt(fl(hnx),fl(n.fy));if(bd&&bd.barricaded&&!bd.open)bd.open=true}
    if(!canWalk(fl(n.fx),fl(hny))){let bd=doorAt(fl(n.fx),fl(hny));if(bd&&bd.barricaded&&!bd.open)bd.open=true}
    n.x=fl(n.fx);n.y=fl(n.fy);n._moving=true;n.angle=Math.atan2(ady,adx);
   }else{
    n._moving=false;
    if(!n.healTick)n.healTick=0;
    n.healTick++;
    if(n.healTick>=300){
     n.healTick=0;
     let heal=Math.min(10,n.maxHp-n.hp);
     n.hp+=heal;n.healAmount+=heal;
     addFloater(n.fx,n.fy,'+'+heal+' PV','#0f0');
    }
    if(n.healAmount>=100||n.hp>=n.maxHp){
     n.healMode=false;n.healTick=0;n.healAmount=0;n.notFightingTimer=0;
     let pos=spawnOutsideBuilding(n.homeBase);
     n.wanderTarget={x:pos.x,y:pos.y};
     for(let d of state.doors){if(d.building===n.homeBase&&d.barricaded&&d.open)d.open=false}
    }
   }
  }
 }
}
function updateAllies(){
 let p=state.player;
 for(let a of state.allies){
  if(!a.alive||!a.recruited)continue;
  applyKnockback(a);
  if(a.cooldown>0)a.cooldown--;
  if(a.speechTimer>0)a.speechTimer--;else a.speech=null;
  // Check for nearby zombies
  let nearZ=null,nd=Infinity;
  for(let z of state.zombies){if(!z.alive)continue;let d=distXY(a.fx,a.fy,z.fx,z.fy);if(d<nd){nearZ=z;nd=d}}
  if(nearZ&&nd<SIGHT_RADIUS){
   // Fight zombie
   a.hostileTo=null;
   updateNPC(a);
  }else{
   // Follow player
   let dp=distXY(a.fx,a.fy,p.fx,p.fy);
   if(dp>2.5){
    a._moving=true;
    let spd=0.03+a.speed*0.006;
    let adx=p.fx-a.fx,ady=p.fy-a.fy,len=Math.hypot(adx,ady)||1;
    let st=updateStuck(a,adx,ady,len,p.fx,p.fy);adx=st.dx;ady=st.dy;len=st.len;
    let nx=a.fx+adx/len*spd,ny=a.fy+ady/len*spd;
    if(canWalk(fl(nx),fl(a.fy)))a.fx=nx;
    if(canWalk(fl(a.fx),fl(ny)))a.fy=ny;
    a.x=fl(a.fx);a.y=fl(a.fy);
    a.angle=Math.atan2(ady,adx);
    // Open doors in the way
    if(!canWalk(fl(nx),fl(a.fy))){let bd=doorAt(fl(nx),fl(a.fy));if(bd&&bd.barricaded&&!bd.open)bd.open=true}
    if(!canWalk(fl(a.fx),fl(ny))){let bd=doorAt(fl(a.fx),fl(ny));if(bd&&bd.barricaded&&!bd.open)bd.open=true}
   }else{a._moving=false;a.angle=Math.atan2(p.fy-a.fy,p.fx-a.fx)}
  }
  clampToMap(a);
 }
}
function updateBaseEvent(){
 let p=state.player;
 if(state.baseEventActive){
  let aliveZ=0;for(let z of state.zombies)if(z.alive&&z.isHorde)aliveZ++;
  state.hordeAlive=aliveZ;
  if(aliveZ===0&&state.currentWave<HORDE_WAVES){
   state.baseWaveTimer++;
   if(state.baseWaveTimer>120){
    state.baseWaveTimer=0;
    spawnAssaultWave();
    if(state.currentWave<HORDE_WAVES){
     msg('Vague '+state.currentWave+'/'+HORDE_WAVES+'!',2000);
    }else{
     msg('Derniere vague! BOSS!',3000);
    }
   }
  }
  if(state.baseBoss&&!state.baseBoss.alive&&aliveZ===0&&!state.baseRewardGiven){
   state.baseRewardGiven=true;
   let survivors=0;for(let n of state.npcs)if(n.alive)survivors++;
   let confColors=['#f44','#4f4','#44f','#ff0','#f0f','#0ff','#fa0'];
   for(let i=0;i<80;i++){
    state.confetti.push({x:p.fx,y:p.fy,vx:(prng()-0.5)*0.15,vy:-prng()*0.12-0.03,
     color:confColors[rand(0,6)],life:120+rand(0,60)});
   }
   for(let n of state.npcs){if(n.alive){n.speech=n.isLeader?'Tout est sous controle':'Victoire!!';n.speechTimer=300}}
   if(survivors>0){
    let rx=fl(p.fx),ry=fl(p.fy);
    let dropNear=(item)=>{for(let dr=1;dr<=3;dr++)for(let ddx=-dr;ddx<=dr;ddx++)for(let ddy=-dr;ddy<=dr;ddy++){
     let tx=rx+ddx,ty=ry+ddy;let t=tx>=0&&ty>=0&&tx<MAP_W&&ty<MAP_H?state.map[ty][tx]:-1;
     if((t===0||t===2)&&!state.items.find(it=>it.x===tx&&it.y===ty)){state.items.push({...item,x:tx,y:ty});return}}};
    dropNear({type:'weapon',name:prng()<0.5?'shotgun':'smg'});
    dropNear({type:'ammo'});
    msg('Base sauvee! '+survivors+' survivant(s)! Recompense au sol!',4000);
   }else{
    msg('Tous les survivants sont morts... Base perdue.',4000);
   }
   if(state.exitNext.x<0){
    let ex,ey,tries=0;
    do{ex=rand(0,MAP_W-1);ey=rand(0,MAP_H-1);tries++}while(state.map[ey][ex]!==0&&tries<200);
    state.exitNext={x:ex,y:ey};state.escapeZone=state.exitNext;state.map[ey][ex]=4;
   }
   state.baseEventActive=false;
   for(let n of state.npcs){if(n.alive&&n.patrolGroup!==undefined){n.patrolCenterX=n.fx;n.patrolCenterY=n.fy}}
  }
 }
}
export function update(){
 if(state.keys.Escape&&!state.pausePressed){state.pausePressed=true;if(state.shopOpen){state.shopOpen=false}else{state.paused=!state.paused}emitChange()}
 if(!state.keys.Escape)state.pausePressed=false;
 if(state.keys.KeyB&&!state.shopPressed){state.shopPressed=true;state.shopOpen=!state.shopOpen;if(state.shopOpen)state.showStats=false;emitChange()}
 if(!state.keys.KeyB)state.shopPressed=false;
 if(state.paused||state.gameOver)return;
 state.tick++;
 if(state.iFrames>0)state.iFrames--;
 if(state.shakeTimer>0)state.shakeTimer--;
 if(state.dmgVignetteTimer>0)state.dmgVignetteTimer--;
 let p=state.player;
 if(p.hitSlowTimer>0)p.hitSlowTimer--;
 if(state.playerRallyBuff>0){state.playerRallyBuff--;if(state.playerRallyBuff<=0)state.playerRallyDmgMult=1}
 updateGrenades();
 updatePlayerMovement();
 updatePlayerAttack();
 if(updateInteraction())return;
 updateBullets();
 updateSpits();
 updateAcidPools();
 updateZombies();
 resolveCollisions();
 updateRocks();
 updateAllNPCs();
 updateAllies();
 updateBaseEvent();
 state.showStats=!!state.keys.Tab;
 if(state.keys.Tab&&state.shopOpen){state.shopOpen=false}
 if(state.firstGame&&!state.skipIntro&&state.tick<120)state.showControls=true;
 else if(!state.keys.Tab)state.showControls=false;
 if(state.keys.Tab)state.showControls=true;
 emitChange();
}
const WALL_SIDES={
 tl:[[0,0,1,.4],[0,0,.4,1]],tr:[[0,0,1,.4],[.6,0,.4,1]],
 bl:[[0,.6,1,.4],[0,0,.4,1]],br:[[0,.6,1,.4],[.6,0,.4,1]],
 top:[[0,0,1,.4]],bottom:[[0,.6,1,.4]],left:[[0,0,.4,1]],right:[[.6,0,.4,1]]
};
const WALL_EDGES={
 tl:[[0,0,1,.06],[0,0,.06,1]],tr:[[0,0,1,.06],[.94,0,.06,1]],
 bl:[[0,.94,1,.06],[0,0,.06,1]],br:[[0,.94,1,.06],[.94,0,.06,1]],
 top:[[0,0,1,.06]],bottom:[[0,.94,1,.06]],left:[[0,0,.06,1]],right:[[.94,0,.06,1]]
};
const WALL_INNER={
 tl:[[.85,.4,.15,.6],[.4,.85,.6,.15]],tr:[[0,.4,.15,.6],[0,.85,.6,.15]],
 bl:[[.85,0,.15,.6],[.4,0,.6,.15]],br:[[0,0,.15,.6],[0,0,.6,.15]],
 top:[[0,.85,1,.15]],bottom:[[0,0,1,.15]],left:[[.85,0,.15,1]],right:[[0,0,.15,1]]
};
const WIN_GLASS={top:[.2,.12,.6,.55],bottom:[.2,.3,.6,.55],left:[.12,.2,.55,.6],right:[.3,.2,.55,.6]};
const WIN_LINE={top:[[.5,.12],[.5,.67]],bottom:[[.5,.3],[.5,.85]],left:[[.12,.5],[.67,.5]],right:[[.3,.5],[.85,.5]]};
function drawWallSide(ctx,s,x,y,side){
 let px=x*s,py=y*s;
 let tops=WALL_SIDES[side],edges=WALL_EDGES[side],inners=WALL_INNER[side];
 if(tops)for(let r of tops){ctx.fillStyle=COLORS.wallTop;ctx.fillRect(px+s*r[0],py+s*r[1],s*r[2],s*r[3])}
 if(edges)for(let r of edges){ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(px+s*r[0],py+s*r[1],s*r[2],s*r[3])}
 if(inners)for(let r of inners){ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(px+s*r[0],py+s*r[1],s*r[2],s*r[3])}
}
function drawStaticTile(ctx,s,x,y,t){
 let px=x*s,py=y*s;
 if(t===0){
  let h=(x*2654435761+y*2246822519)>>>0;
  ctx.fillStyle=((x+y)%2===0)?COLORS.grass:COLORS.grassAlt;ctx.fillRect(px,py,s,s);
  if(h%17===0){ctx.fillStyle='#1a2e18';ctx.fillRect(px,py,s,s)}
  if(h%23===0){ctx.fillStyle='#2a1e12';let pw=(h%3+1)*0.15;ctx.fillRect(px+s*0.2,py+s*0.3,s*pw,s*pw*0.6)}
  let g1=(h>>>4)%7;
  if(g1<4){
   let gd=[[.3,.4,.08,.2],[.6,.2,.06,.15],[.15,.65,.1,.18],[.4,.1,.12,.25]][g1];
   ctx.fillStyle=g1<3?COLORS.grassDetail:'#2a4a22';ctx.fillRect(px+s*gd[0],py+s*gd[1],s*gd[2],s*gd[3]);
   if(g1===2)ctx.fillRect(px+s*0.7,py+s*0.55,s*0.07,s*0.22);
  }
  let h8=(h>>>8)%13;
  if(h8===0){ctx.fillStyle='#e8d040';ctx.fillRect(px+s*0.45,py+s*0.35,s*0.08,s*0.08)}
  if(h8===1){ctx.fillStyle='#d04040';ctx.fillRect(px+s*0.55,py+s*0.6,s*0.07,s*0.07)}
  if((h>>>12)%11===0){ctx.fillStyle='#555';let rx=((h>>>16)%40)/100,ry=((h>>>20)%40)/100;ctx.fillRect(px+s*rx+s*0.1,py+s*ry+s*0.2,s*0.12,s*0.08)}
 }else if(t===1){
  let bld=getBuildingOwner(x,y),side=bld?getWallSide(bld,x,y):null;
  ctx.fillStyle=COLORS.wallInner;ctx.fillRect(px,py,s,s);
  if(side&&WALL_SIDES[side])drawWallSide(ctx,s,x,y,side);
  else{ctx.fillStyle=COLORS.wall;ctx.fillRect(px,py,s,s);ctx.fillStyle=COLORS.wallTop;ctx.fillRect(px,py,s,s*0.3)}
  let hw=(x*374761393+y*668265263)>>>0;
  ctx.fillStyle='rgba(0,0,0,0.06)';ctx.fillRect(px,py+s*0.5,s*0.5,s*0.02);ctx.fillRect(px+s*0.25,py+s*0.7,s*0.5,s*0.02);
  if(hw%13===0){ctx.strokeStyle='rgba(0,0,0,0.12)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+s*0.3,py+s*0.2);ctx.lineTo(px+s*0.5,py+s*0.6);ctx.stroke()}
  if(hw%17===0){ctx.fillStyle='rgba(0,0,0,0.08)';ctx.beginPath();ctx.arc(px+s*0.6,py+s*0.4,s*0.1,0,Math.PI*2);ctx.fill()}
 }else if(t===5){
  let h5=(x*982451653+y*452930477)>>>0;
  let cw=state.cityWallMap.get(tileKey(x,y)),cwH=cw?cw.horiz:true;
  ctx.fillStyle=(h5%4===0)?'#3a3836':COLORS.cityWall;ctx.fillRect(px,py,s,s);
  let isH=cwH;
  ctx.fillStyle=COLORS.cityWallTop;ctx.fillRect(px+(isH?0:0),py+(isH?0:0),isH?s:s*0.3,isH?s*0.3:s);
  ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(isH?px:px+s*0.95,isH?py+s*0.95:py,isH?s:s*0.05,isH?s*0.05:s);
  ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(isH?px:px+s*0.5,isH?py+s*0.5:py);ctx.lineTo(isH?px+s:px+s*0.5,isH?py+s*0.5:py+s);ctx.stroke();
  if((isH?x:y)%2===0){ctx.beginPath();ctx.moveTo(isH?px+s*0.5:px+s*0.3,isH?py+s*0.3:py+s*0.5);ctx.lineTo(px+s*0.5,py+s*0.5);ctx.stroke()}
  if(h5%9===0){ctx.fillStyle='rgba(40,60,30,0.25)';let mx=((h5>>4)%60)/100,my=((h5>>8)%60)/100;ctx.fillRect(px+s*mx,py+s*my,s*0.2,s*0.15)}
 }else if(t===6){
  let wBld=getBuildingOwner(x,y),wSide=wBld?getWallSide(wBld,x,y):null;
  ctx.fillStyle=COLORS.wallInner;ctx.fillRect(px,py,s,s);
  if(wSide&&WALL_SIDES[wSide]){
   drawWallSide(ctx,s,x,y,wSide);
   let gl=WIN_GLASS[wSide];
   if(gl){
    ctx.fillStyle='rgba(100,160,220,0.3)';ctx.fillRect(px+s*gl[0],py+s*gl[1],s*gl[2],s*gl[3]);
    ctx.strokeStyle='rgba(150,200,255,0.35)';ctx.lineWidth=1;ctx.strokeRect(px+s*gl[0],py+s*gl[1],s*gl[2],s*gl[3]);
    let ln=WIN_LINE[wSide];ctx.beginPath();ctx.moveTo(px+s*ln[0][0],py+s*ln[0][1]);ctx.lineTo(px+s*ln[1][0],py+s*ln[1][1]);ctx.stroke();
   }
  }else{ctx.fillStyle=COLORS.wall;ctx.fillRect(px,py,s,s);ctx.fillStyle=COLORS.wallTop;ctx.fillRect(px,py,s,s*0.3)}
 }
}
function buildTerrainCache(){
 let c=document.createElement('canvas');
 c.width=MAP_W*TILE;c.height=MAP_H*TILE;
 let tc=c.getContext('2d');tc.imageSmoothingEnabled=false;
 for(let y=0;y<MAP_H;y++)for(let x=0;x<MAP_W;x++){
  let t=state.map[y][x];
  if(t===0||t===1||t===5||t===6)drawStaticTile(tc,TILE,x,y,t);
 }
 state.terrainCanvas=c;state.terrainCacheReady=true;
}
function drawTerrain(ctx,s,cam,x0,x1,y0,y1){
 if(state.terrainCacheReady){
  let sx=x0*TILE,sy=y0*TILE,sw=(x1-x0)*TILE,sh=(y1-y0)*TILE;
  ctx.drawImage(state.terrainCanvas,sx,sy,sw,sh,x0*s,y0*s,(x1-x0)*s,(y1-y0)*s);
 }
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  let t=state.map[y][x];
  if(t===0||t===1||t===5||t===6){if(state.terrainCacheReady)continue;drawStaticTile(ctx,s,x,y,t);continue}
  if(t===2){
   let bld=getBuildingAt(x,y);
   if(bld&&!bld.searched){ctx.fillStyle='#252525';ctx.fillRect(x*s,y*s,s,s);continue}
   let h2=(x*1597334677+y*3812015801)>>>0;
   ctx.fillStyle=(h2%3===0)?'#2b2722':'#302c28';ctx.fillRect(x*s,y*s,s,s);
   ctx.strokeStyle='rgba(255,255,255,0.03)';ctx.lineWidth=1;ctx.strokeRect(x*s+1,y*s+1,s-2,s-2);
   if(h2%11===0){ctx.fillStyle='rgba(0,0,0,0.12)';let cx2=((h2>>>4)%50)/100,cy2=((h2>>>8)%50)/100;ctx.beginPath();ctx.arc(x*s+s*cx2+s*0.25,y*s+s*cy2+s*0.25,s*0.12,0,Math.PI*2);ctx.fill()}
   if(h2%19===0){ctx.strokeStyle='rgba(0,0,0,0.15)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x*s+s*0.2,y*s+s*0.3);ctx.lineTo(x*s+s*0.7,y*s+s*0.6);ctx.stroke()}
   if(h2%15===0){ctx.strokeStyle='rgba(0,0,0,0.1)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x*s+s*0.6,y*s+s*0.1);ctx.lineTo(x*s+s*0.4,y*s+s*0.8);ctx.stroke()}
  }else if(t===3){
   let door=doorAt(x,y);
   let dBld=door?door.building:null;
   let dSide=dBld?getWallSide(dBld,x,y):null;
   let isHoriz=(dSide==='top'||dSide==='bottom');
   if(door&&door.barricaded&&!door.open){
    ctx.fillStyle=COLORS.doorArmored;ctx.fillRect(x*s,y*s,s,s);
    if(isHoriz){
     ctx.fillStyle=COLORS.doorArmoredTop;ctx.fillRect(x*s,y*s,s,s*0.15);ctx.fillRect(x*s,y*s+s*0.85,s,s*0.15);
     ctx.fillStyle='rgba(255,255,255,0.07)';
     ctx.fillRect(x*s+s*0.15,y*s+s*0.35,s*0.7,s*0.04);
     ctx.fillRect(x*s+s*0.15,y*s+s*0.6,s*0.7,s*0.04);
     ctx.fillStyle='#8a7a5a';ctx.fillRect(x*s+s*0.45,y*s+s*0.42,s*0.1,s*0.16);
    }else{
     ctx.fillStyle=COLORS.doorArmoredTop;ctx.fillRect(x*s,y*s,s*0.15,s);ctx.fillRect(x*s+s*0.85,y*s,s*0.15,s);
     ctx.fillStyle='rgba(255,255,255,0.07)';
     ctx.fillRect(x*s+s*0.35,y*s+s*0.15,s*0.04,s*0.7);
     ctx.fillRect(x*s+s*0.6,y*s+s*0.15,s*0.04,s*0.7);
     ctx.fillStyle='#8a7a5a';ctx.fillRect(x*s+s*0.42,y*s+s*0.45,s*0.16,s*0.1);
    }
   }else if(door&&door.barricaded&&door.open){
    ctx.fillStyle=COLORS.floor;ctx.fillRect(x*s,y*s,s,s);
    if(isHoriz){
     ctx.fillStyle=COLORS.doorArmored;ctx.fillRect(x*s,y*s,s*0.2,s);
     ctx.fillStyle=COLORS.doorArmoredTop;ctx.fillRect(x*s,y*s,s*0.2,s*0.15);
    }else{
     ctx.fillStyle=COLORS.doorArmored;ctx.fillRect(x*s,y*s,s,s*0.2);
     ctx.fillStyle=COLORS.doorArmoredTop;ctx.fillRect(x*s,y*s,s*0.15,s*0.2);
    }
   }else{
    ctx.fillStyle=COLORS.floor;ctx.fillRect(x*s,y*s,s,s);
    if(isHoriz){
     ctx.fillStyle=COLORS.doorBroken;ctx.fillRect(x*s+s*0.05,y*s+s*0.1,s*0.35,s*0.8);
     ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(x*s+s*0.05,y*s+s*0.1,s*0.35,s*0.8);
     ctx.strokeStyle='rgba(0,0,0,0.3)';ctx.lineWidth=1;
     ctx.beginPath();ctx.moveTo(x*s+s*0.15,y*s+s*0.15);ctx.lineTo(x*s+s*0.25,y*s+s*0.5);ctx.lineTo(x*s+s*0.18,y*s+s*0.85);ctx.stroke();
     ctx.fillStyle='#555';ctx.fillRect(x*s+s*0.02,y*s+s*0.2,s*0.06,s*0.08);ctx.fillRect(x*s+s*0.02,y*s+s*0.7,s*0.06,s*0.08);
    }else{
     ctx.fillStyle=COLORS.doorBroken;ctx.fillRect(x*s+s*0.1,y*s+s*0.05,s*0.8,s*0.35);
     ctx.fillStyle='rgba(0,0,0,0.15)';ctx.fillRect(x*s+s*0.1,y*s+s*0.05,s*0.8,s*0.35);
     ctx.strokeStyle='rgba(0,0,0,0.3)';ctx.lineWidth=1;
     ctx.beginPath();ctx.moveTo(x*s+s*0.15,y*s+s*0.15);ctx.lineTo(x*s+s*0.5,y*s+s*0.25);ctx.lineTo(x*s+s*0.85,y*s+s*0.18);ctx.stroke();
     ctx.fillStyle='#555';ctx.fillRect(x*s+s*0.2,y*s+s*0.02,s*0.08,s*0.06);ctx.fillRect(x*s+s*0.7,y*s+s*0.02,s*0.08,s*0.06);
    }
   }
  }else{
   let isPrev=state.exitPrev.x===x&&state.exitPrev.y===y;
   ctx.fillStyle=isPrev?'#1a0a00':'#0a1a2a';ctx.fillRect(x*s,y*s,s,s);
   ctx.globalAlpha=0.3+0.2*Math.sin(state.tick*0.08);
   ctx.fillStyle=isPrev?'#fa0':COLORS.escape;ctx.fillRect(x*s+2,y*s+2,s-4,s-4);
   ctx.globalAlpha=1;
   ctx.fillStyle='#fff';ctx.font=Math.floor(s*0.5)+'px sans-serif';ctx.textAlign='center';
   ctx.globalAlpha=0.4+0.2*Math.sin(state.tick*0.06);
   ctx.fillText(isPrev?'\u2190':'\u2192',x*s+s/2,y*s+s*0.65);ctx.globalAlpha=1;
  }
 }
 for(let b of state.buildings){
  if(!b.searched){
   ctx.fillStyle='rgba(20,20,20,0.9)';ctx.fillRect((b.x+1)*s,(b.y+1)*s,(b.w-2)*s,(b.h-2)*s);
   ctx.fillStyle='rgba(255,255,255,0.08)';ctx.font='bold '+Math.floor(s*0.5)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText('?',(b.x+b.w/2)*s,(b.y+b.h/2)*s+s*0.15);
  }
 }
}
function drawItems(ctx,s,x0,x1,y0,y1){
 for(let it of state.items){
  if(it.x<x0||it.x>=x1||it.y<y0||it.y>=y1)continue;
  let bld=getBuildingAt(it.x,it.y);if(bld&&!bld.searched)continue;
  let ix=it.x*s+s/2,iy=it.y*s+s/2;
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(ix,iy+s*0.3,s*0.2,s*0.08,0,0,Math.PI*2);ctx.fill();
  let bob=Math.sin(state.tick*0.06+it.x*3)*s*0.04;
  if(it.type==='weapon'){
   let u=s/32;
   ctx.save();ctx.translate(ix,iy+bob);
   if(it.name==='bat'){
    ctx.rotate(-0.4);
    ctx.fillStyle='#888';ctx.fillRect(-s*0.25,-u*1.5,s*0.4,u*3);
    ctx.fillStyle='#aaa';ctx.fillRect(s*0.1,-u*2.5,s*0.15,u*5);
    ctx.fillStyle='#666';ctx.fillRect(-s*0.25,-u*1,s*0.08,u*2);
   }else if(it.name==='gun'){
    ctx.rotate(-0.3);
    ctx.fillStyle='#2a2a2a';ctx.fillRect(-s*0.18,-u*2,s*0.36,u*4);
    ctx.fillStyle='#1a1a1a';ctx.fillRect(-s*0.12,u*1,s*0.12,u*4);
    ctx.fillStyle='#333';ctx.fillRect(s*0.14,-u*1,u*3,u*2);
   }else if(it.name==='shotgun'){
    ctx.rotate(-0.3);
    ctx.fillStyle='#3a2a1a';ctx.fillRect(-s*0.3,-u*2,s*0.5,u*4);
    ctx.fillStyle='#2a2a2a';ctx.fillRect(s*0.15,-u*2.5,u*4,u*5);
    ctx.fillStyle='#555';ctx.fillRect(s*0.15,-u*1,u*5,u*2);
    ctx.fillStyle='#1a1a1a';ctx.fillRect(-s*0.15,u*1,s*0.1,u*3);
   }else if(it.name==='smg'){
    ctx.rotate(-0.3);
    ctx.fillStyle='#222';ctx.fillRect(-s*0.2,-u*1.5,s*0.35,u*3);
    ctx.fillStyle='#1a1a1a';ctx.fillRect(-s*0.12,u*1.5,u*4,u*3);
    ctx.fillStyle='#333';ctx.fillRect(s*0.02,u*1.5,u*3,u*4);
    ctx.fillStyle='#2a2a2a';ctx.fillRect(s*0.12,-u*1,u*3,u*2);
   }
   ctx.restore();
  }else{
   let col='#cc0',label='$';
   if(it.type==='ammo'){col='#b80';label='\u2022\u2022'}
   else if(it.type==='bandage'){col='#2a6a2a';label='+'}
   ctx.fillStyle=col;ctx.beginPath();ctx.arc(ix,iy-s*0.05+bob,s*0.18,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#fff';ctx.font='bold '+Math.floor(s*0.22)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText(label,ix,iy+s*0.03+bob);
  }
 }
}
function drawEntities(ctx,s,cam,playerBld){
 let p=state.player;
 if(!playerBld){
  let viewTiles=[];
  for(let d of state.doors){if(distXY(d.x+0.5,d.y+0.5,p.fx,p.fy)<3)viewTiles.push(d)}
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){
   let wx=p.x+dx,wy=p.y+dy;
   if(wx>=0&&wy>=0&&wx<MAP_W&&wy<MAP_H&&state.map[wy][wx]===6){
    if(distXY(wx+0.5,wy+0.5,p.fx,p.fy)<3)viewTiles.push({x:wx,y:wy})
   }
  }
  for(let vt of viewTiles){
   let vtBld=getBuildingOwner(vt.x,vt.y);if(!vtBld)continue;
   let side=getWallSide(vtBld,vt.x,vt.y);if(!side||side.length===2)continue;
   let inAngle;
   if(side==='top')inAngle=Math.PI/2;
   else if(side==='bottom')inAngle=-Math.PI/2;
   else if(side==='left')inAngle=0;
   else inAngle=Math.PI;
   let cx=(vt.x+0.5)*s,cy=(vt.y+0.5)*s;
   let coneLen=Math.min(vtBld.w,vtBld.h)*s*0.6;
   let coneArc=Math.PI/3;
   ctx.fillStyle='rgba(255,255,200,0.06)';
   ctx.beginPath();ctx.moveTo(cx,cy);
   ctx.arc(cx,cy,coneLen,inAngle-coneArc/2,inAngle+coneArc/2);
   ctx.closePath();ctx.fill();
   for(let z of state.zombies){
    if(!z.alive)continue;
    let zb=getBuildingAt(z.x,z.y);if(zb!==vtBld)continue;
    let toZ=Math.atan2(z.fy-vt.y-0.5,z.fx-vt.x-0.5);
    let diff=Math.abs(toZ-inAngle);if(diff>Math.PI)diff=2*Math.PI-diff;
    if(diff<coneArc/2&&distXY(vt.x+0.5,vt.y+0.5,z.fx,z.fy)<coneLen/s){
     let zx=z.fx*s+s/2,zy=z.fy*s+s/2;
     ctx.globalAlpha=0.5;ctx.fillStyle='#c44';ctx.beginPath();ctx.arc(zx,zy,s*0.25,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    }
   }
   for(let it of state.items){
    if(it.x<vtBld.x||it.x>=vtBld.x+vtBld.w||it.y<vtBld.y||it.y>=vtBld.y+vtBld.h)continue;
    let toI=Math.atan2(it.y+0.5-vt.y-0.5,it.x+0.5-vt.x-0.5);
    let diff=Math.abs(toI-inAngle);if(diff>Math.PI)diff=2*Math.PI-diff;
    if(diff<coneArc/2&&distXY(vt.x+0.5,vt.y+0.5,it.x+0.5,it.y+0.5)<coneLen/s){
     let ix=it.x*s+s/2,iy=it.y*s+s/2;
     ctx.globalAlpha=0.5;ctx.fillStyle='#ff0';ctx.beginPath();ctx.arc(ix,iy,s*0.15,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    }
   }
  }
 }
 for(let ap of state.acidPools){
  let ax=ap.fx*s+s/2,ay=ap.fy*s+s/2,ar=ap.radius*s;
  let alpha=Math.min(0.4,ap.timer/300);
  ctx.globalAlpha=alpha;ctx.fillStyle='#2a8a00';ctx.beginPath();ctx.arc(ax,ay,ar,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#4aff00';ctx.beginPath();ctx.arc(ax,ay,ar*0.5,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 }
 for(let b of state.barrels){
  if(!b.alive)continue;
  let bx=b.fx*s+s/2,by=b.fy*s+s/2;
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(bx,by+s*0.35,s*0.28,s*0.1,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#555';ctx.fillRect(bx-s*0.22,by-s*0.3,s*0.44,s*0.6);
  ctx.fillStyle='#cc2200';ctx.fillRect(bx-s*0.22,by-s*0.2,s*0.44,s*0.08);ctx.fillRect(bx-s*0.22,by+s*0.08,s*0.44,s*0.08);
  ctx.fillStyle='#666';ctx.fillRect(bx-s*0.24,by-s*0.32,s*0.48,s*0.05);ctx.fillRect(bx-s*0.24,by+s*0.27,s*0.48,s*0.05);
  ctx.fillStyle='#ff0';ctx.font='bold '+Math.floor(s*0.22)+'px sans-serif';ctx.textAlign='center';ctx.fillText('\u26A0',bx,by+s*0.02);
  if(b.hp<20){let bw=s*0.5;ctx.fillStyle='#400';ctx.fillRect(bx-bw/2,by-s*0.4,bw,s*0.06);ctx.fillStyle='#f80';ctx.fillRect(bx-bw/2,by-s*0.4,bw*(b.hp/20),s*0.06)}
 }
 for(let b of state.barricades){
  let bx=b.fx*s+s/2,by=b.fy*s+s/2;
  ctx.fillStyle='rgba(0,0,0,0.25)';ctx.beginPath();ctx.ellipse(bx,by+s*0.35,s*0.3,s*0.1,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#8B6914';ctx.fillRect(bx-s*0.3,by-s*0.25,s*0.6,s*0.5);
  ctx.strokeStyle='#5a4010';ctx.lineWidth=2;ctx.strokeRect(bx-s*0.3,by-s*0.25,s*0.6,s*0.5);
  ctx.fillStyle='#6B4C12';ctx.fillRect(bx-s*0.3,by-s*0.05,s*0.6,s*0.06);ctx.fillRect(bx-s*0.3,by+s*0.12,s*0.6,s*0.06);
  if(b.hp<b.maxHp){let bw=s*0.5;ctx.fillStyle='#400';ctx.fillRect(bx-bw/2,by-s*0.35,bw,s*0.06);ctx.fillStyle='#4a4';ctx.fillRect(bx-bw/2,by-s*0.35,bw*(b.hp/b.maxHp),s*0.06)}
 }
 for(let g of state.grenades){
  let gx=(g.cx||g.fx)*s+s/2,gy=(g.cy||g.fy)*s+s/2;
  let prog=1-g.timer/40,arc=Math.sin(prog*Math.PI)*s*1.5;
  ctx.fillStyle='#5a6a3a';ctx.beginPath();ctx.arc(gx,gy-arc,s*0.15,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,100,0,0.3)';ctx.beginPath();ctx.arc(gx,gy-arc,s*0.08,0,Math.PI*2);ctx.fill();
 }
 for(let sp of state.spits){
  let sx=sp.fx*s+s/2,sy=sp.fy*s+s/2;
  ctx.fillStyle='#4aff00';ctx.beginPath();ctx.arc(sx,sy,s*0.12,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#2a8a00';ctx.beginPath();ctx.arc(sx,sy,s*0.07,0,Math.PI*2);ctx.fill();
 }
 for(let e of state.explosions){
  let ex=e.fx*s+s/2,ey=e.fy*s+s/2,progress=1-e.timer/(e.maxTimer||20),radius=(e.maxTimer?2.5:BARREL_EXPLOSION_RADIUS)*s*progress;
  ctx.globalAlpha=0.6*(1-progress);ctx.fillStyle='#ff4400';ctx.beginPath();ctx.arc(ex,ey,radius,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffaa00';ctx.beginPath();ctx.arc(ex,ey,radius*0.4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 }
 for(let w of state.rockWarnings){
  let wx=w.fx*s+s/2,wy=w.fy*s+s/2;
  let blink=Math.sin(w.timer*0.4)>0?0.6:0.2;
  ctx.strokeStyle='rgba(255,100,0,'+blink+')';ctx.lineWidth=3*state.scale;ctx.setLineDash([s*0.15,s*0.1]);
  ctx.beginPath();ctx.moveTo(wx,wy);ctx.lineTo(wx+Math.cos(w.angle)*s*8,wy+Math.sin(w.angle)*s*8);ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle='rgba(255,80,0,'+blink+')';ctx.font='bold '+Math.floor(s*0.35)+'px sans-serif';ctx.textAlign='center';
  ctx.fillText('!',wx+Math.cos(w.angle)*s*2,wy+Math.sin(w.angle)*s*2);
 }
 for(let r of state.rocks){
  let rx=r.fx*s+s/2,ry=r.fy*s+s/2;
  ctx.fillStyle='#888';ctx.beginPath();ctx.arc(rx,ry,s*0.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#666';ctx.beginPath();ctx.arc(rx-s*0.05,ry-s*0.05,s*0.12,0,Math.PI*2);ctx.fill();
 }
 for(let n of state.npcs){
  if(!n.alive)continue;
  let nBld=getBuildingAt(fl(n.fx),fl(n.fy));
  if(nBld&&nBld!==playerBld&&!nBld.searched)continue;
  let nsx=n.fx*s+s/2,nsy=n.fy*s+s/2;
  if(nsx<cam.x-s*2||nsx>cam.x+state.W+s*2||nsy<cam.y-s*2||nsy>cam.y+state.H+s*2)continue;
  drawNPC(ctx,nsx,nsy,s,n.angle,n);
  if(n.npcType==='medic'){
   let mx=nsx,my=nsy-s*0.7;
   ctx.fillStyle='rgba(200,50,50,0.7)';
   ctx.fillRect(mx-s*0.04,my-s*0.12,s*0.08,s*0.24);
   ctx.fillRect(mx-s*0.12,my-s*0.04,s*0.24,s*0.08);
   if(n.abilityCooldown>44*60){
    let ha=0.15+0.1*Math.sin(state.tick*0.15);
    ctx.strokeStyle='rgba(0,255,100,'+ha+')';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(nsx,nsy,6*s,0,Math.PI*2);ctx.stroke();
   }
  }
  if(n.isLeader&&!n.isMadman){
   let sx2=nsx,sy2=nsy-s*0.75;
   ctx.fillStyle='rgba(255,200,0,0.7)';ctx.font='bold '+Math.floor(s*0.25)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText('\u2605',sx2,sy2+s*0.08);
   if(n.rallyCooldown>44*60){
    let ra=0.12+0.08*Math.sin(state.tick*0.12);
    ctx.strokeStyle='rgba(255,200,0,'+ra+')';ctx.lineWidth=2;
    ctx.beginPath();ctx.arc(nsx,nsy,8*s,0,Math.PI*2);ctx.stroke();
   }
  }
  if(n.npcType==='grenadier'){
   let gx=nsx+s*0.25,gy=nsy-s*0.6;
   ctx.fillStyle='rgba(90,106,58,0.7)';ctx.beginPath();ctx.arc(gx,gy,s*0.08,0,Math.PI*2);ctx.fill();
  }
  if(n.npcType==='scout'){
   ctx.fillStyle='rgba(100,100,255,0.6)';ctx.font=Math.floor(s*0.2)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText('\u25C9',nsx,nsy-s*0.65);
  }
  if(n.rallyBuff>0){
   let ba=0.15+0.1*Math.sin(state.tick*0.15);
   ctx.strokeStyle='rgba(255,200,0,'+ba+')';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.arc(nsx,nsy,s*0.55,0,Math.PI*2);ctx.stroke();
  }
  let bw=s*0.7;
  ctx.fillStyle='#024';ctx.fillRect(n.fx*s+s*0.15,n.fy*s-s*0.22,bw,s*0.08);
  ctx.fillStyle='#0af';ctx.fillRect(n.fx*s+s*0.15,n.fy*s-s*0.22,bw*(n.hp/n.maxHp),s*0.08);
  let nLabel=n.isAlly?(n.isInjured?'Blesse':'Allie'):n.isMadman?'Fou':n.isLeader?'Chef':n.npcType==='medic'?'Medic':n.npcType==='grenadier'?'Grenadier':n.npcType==='scout'?'Scout':'PNJ';
  let nColor=n.isAlly?(n.isInjured?'#fa0':'#4f4'):n.isMadman?'#f44':n.isLeader?'#fa0':n.npcType==='medic'?'#f44':n.npcType==='grenadier'?'#4a4':n.npcType==='scout'?'#88f':'#0af';
  ctx.fillStyle=nColor;ctx.font='bold '+Math.floor(s*0.22)+'px sans-serif';ctx.textAlign='center';
  ctx.fillText(nLabel,n.fx*s+s/2,n.fy*s-s*0.55);
  if(n.isAlly&&n.isInjured&&!n.recruited){
   let qx=n.fx*s+s/2,qy=n.fy*s-s*1.1;
   let qa=0.6+0.4*Math.sin(state.tick*0.1);
   ctx.fillStyle='rgba(0,255,100,'+qa+')';ctx.font='bold '+Math.floor(s*0.45)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText('+',qx,qy);
  }
  if(state.baseEvent&&!state.baseEventActive&&!state.baseRewardGiven&&n.isLeader){
   let qx=n.fx*s+s/2,qy=n.fy*s-s*1.1;
   let qa=0.6+0.4*Math.sin(state.tick*0.1);
   ctx.fillStyle='rgba(255,230,0,'+qa+')';ctx.font='bold '+Math.floor(s*0.45)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText('!',qx,qy);
  }
  if(n.speech){
   let sx=n.fx*s+s/2,sy=n.fy*s-s*0.85;
   ctx.font=Math.floor(s*0.2)+'px sans-serif';ctx.textAlign='center';
   let tw=ctx.measureText(n.speech).width+s*0.3;
   ctx.fillStyle='rgba(255,255,255,0.85)';
   ctx.beginPath();ctx.roundRect(sx-tw/2,sy-s*0.15,tw,s*0.3,s*0.08);ctx.fill();
   ctx.fillStyle='#222';ctx.fillText(n.speech,sx,sy+s*0.06);
  }
 }
 let sortedZ=[];for(let z of state.zombies){if(!z.alive)continue;let zsx=z.fx*s,zsy=z.fy*s;if(zsx<cam.x-s*3||zsx>cam.x+state.W+s*3||zsy<cam.y-s*3||zsy>cam.y+state.H+s*3)continue;sortedZ.push(z)}sortedZ.sort((a,b)=>a.fy-b.fy);
 for(let z of sortedZ){
  let zBld=getBuildingAt(z.x,z.y);
  if(zBld&&zBld!==playerBld&&!zBld.searched)continue;
  let atkAnim=z.atkTimer>0?(z.atkTimer/z.atkDuration):0;
  let jumpOff=z.jumpAnim>0?Math.sin(z.jumpAnim/20*Math.PI)*s*0.5:0;
  drawZombie(ctx,z.fx*s+s/2,z.fy*s+s/2-jumpOff,s,z.angle,z.variant,atkAnim,z.isBoss,z.alerted,z.isSpitter,z.isRunner,z.isNecromancer);
  let bw=s*(z.isBoss?1:0.7);
  let ox=z.isBoss?s*-0.02:s*0.15;
  ctx.fillStyle='#200';ctx.fillRect(z.fx*s+ox,z.fy*s-s*(z.isBoss?0.4:0.22),bw,s*0.08);
  ctx.fillStyle=z.isBoss?'#f80':'#c00';ctx.fillRect(z.fx*s+ox,z.fy*s-s*(z.isBoss?0.4:0.22),bw*(z.hp/z.maxHp),s*0.08);
  if(z.alerted){ctx.fillStyle='#f44';ctx.font='bold '+Math.floor(s*0.28)+'px sans-serif';ctx.textAlign='center';ctx.fillText('!',z.fx*s+s/2,z.fy*s-s*(z.isBoss?0.55:0.32))}
  if(z.isBoss){ctx.fillStyle='#fa0';ctx.font='bold '+Math.floor(s*0.24)+'px sans-serif';ctx.textAlign='center';ctx.fillText('BOSS',z.fx*s+s/2,z.fy*s-s*0.65)}
  if(z.isRunner){ctx.fillStyle='#f8f';ctx.font='bold '+Math.floor(s*0.18)+'px sans-serif';ctx.textAlign='center';ctx.fillText('RAPIDE',z.fx*s+s/2,z.fy*s-s*0.38)}
  if(z.isSpitter){ctx.fillStyle='#0f0';ctx.font='bold '+Math.floor(s*0.18)+'px sans-serif';ctx.textAlign='center';ctx.fillText('CRACHEUR',z.fx*s+s/2,z.fy*s-s*0.38)}
  if(z.isNecromancer){ctx.fillStyle='#a040ff';ctx.font='bold '+Math.floor(s*0.18)+'px sans-serif';ctx.textAlign='center';ctx.fillText('NECROMANCIEN',z.fx*s+s/2,z.fy*s-s*0.38)}
  if(z.hitSlowTimer>HIT_SLOW_DURATION-4){ctx.globalAlpha=0.3;ctx.fillStyle='#fff';ctx.fillRect(z.fx*s+s*0.1,z.fy*s+s*0.1,s*0.8,s*0.8);ctx.globalAlpha=1}
  if(z.speech){
   let sx=z.fx*s+s/2,sy=z.fy*s-s*(z.isBoss?0.8:0.5);
   ctx.font='italic '+Math.floor(s*0.18)+'px sans-serif';ctx.textAlign='center';
   ctx.globalAlpha=0.7;ctx.fillStyle='#c44';ctx.fillText(z.speech,sx,sy);ctx.globalAlpha=1;
  }
 }
 for(let b of state.bullets){
  let bx=b.x*s+s/2,by=b.y*s+s/2;
  ctx.strokeStyle='rgba(255,230,100,'+(b.life/8)*0.9+')';ctx.lineWidth=2*state.scale;
  let drawDist=(b.hitDist||b.maxDist)*s;
  ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+Math.cos(b.angle)*drawDist,by+Math.sin(b.angle)*drawDist);ctx.stroke();
 }
}
function drawUI(ctx,s,cam,playerBld){
 let p=state.player;
 let swProg=p.swingTimer>0?(1-p.swingTimer/p.swingDuration):0;
 drawPlayer(ctx,p.fx*s+s/2,p.fy*s+s/2,s,p.angle,swProg,p);
 if(p.hitSlowTimer>HIT_SLOW_DURATION-4){ctx.globalAlpha=0.3;ctx.fillStyle='#f00';ctx.fillRect(p.fx*s+s*0.05,p.fy*s+s*0.05,s*0.9,s*0.9);ctx.globalAlpha=1}
 let selW=p.inventory[p.selectedSlot];
 let wepDef=getWeaponDef(selW);
 if(wepDef){
  let range=wepDef.range;
  let pcx=p.fx*s+s/2,pcy=p.fy*s+s/2;
  if(wepDef.melee){
   let arc=wepDef.arc||Math.PI/2,r=range*s/2;
   ctx.strokeStyle='rgba(200,150,100,0.2)';ctx.lineWidth=1;ctx.setLineDash([s*0.06,s*0.06]);
   ctx.beginPath();ctx.moveTo(pcx,pcy);
   ctx.lineTo(pcx+Math.cos(p.angle-arc/2)*r,pcy+Math.sin(p.angle-arc/2)*r);
   ctx.stroke();
   ctx.beginPath();ctx.moveTo(pcx,pcy);
   ctx.lineTo(pcx+Math.cos(p.angle+arc/2)*r,pcy+Math.sin(p.angle+arc/2)*r);
   ctx.stroke();
   ctx.beginPath();ctx.arc(pcx,pcy,r,p.angle-arc/2,p.angle+arc/2);ctx.stroke();
   ctx.setLineDash([]);
   ctx.fillStyle='rgba(200,150,100,0.04)';ctx.beginPath();ctx.moveTo(pcx,pcy);
   ctx.arc(pcx,pcy,r,p.angle-arc/2,p.angle+arc/2);
   ctx.closePath();ctx.fill();
  }else{
   let mxW=state.mouseX+cam.x,myW=state.mouseY+cam.y;
   let mdx=mxW-pcx,mdy=myW-pcy;
   let mDistPx=Math.hypot(mdx,mdy);
   let maxPx=range*s;
   let clampedDist=Math.min(mDistPx,maxPx);
   let clampedTiles=clampedDist/s;
   let retAngle=Math.atan2(mdy,mdx);
   let retX=pcx+Math.cos(retAngle)*clampedDist;
   let retY=pcy+Math.sin(retAngle)*clampedDist;
   let spreadRad=getSpreadAtDist(wepDef,p.precision,clampedTiles);
   if(wepDef.name==='smg')spreadRad=Math.min(spreadRad+p.smgHeat*SMG_HEAT_SPREAD_MULT,wepDef.baseSpread*1.5+DIST_SPREAD_FACTOR*clampedTiles);
   let coneLen=clampedDist;
   let coneAngle=Math.max(spreadRad,0.02);
   ctx.save();
   ctx.globalAlpha=0.12;
   ctx.fillStyle='rgba(255,80,80,1)';
   ctx.beginPath();ctx.moveTo(pcx,pcy);
   ctx.arc(pcx,pcy,coneLen,retAngle-coneAngle,retAngle+coneAngle);
   ctx.closePath();ctx.fill();
   ctx.globalAlpha=0.35;
   ctx.strokeStyle='rgba(255,80,80,1)';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(pcx,pcy);
   ctx.lineTo(pcx+Math.cos(retAngle-coneAngle)*coneLen,pcy+Math.sin(retAngle-coneAngle)*coneLen);ctx.stroke();
   ctx.beginPath();ctx.moveTo(pcx,pcy);
   ctx.lineTo(pcx+Math.cos(retAngle+coneAngle)*coneLen,pcy+Math.sin(retAngle+coneAngle)*coneLen);ctx.stroke();
   ctx.globalAlpha=0.25;
   ctx.strokeStyle='rgba(255,80,80,1)';ctx.lineWidth=1;
   ctx.beginPath();ctx.arc(pcx,pcy,coneLen,retAngle-coneAngle,retAngle+coneAngle);ctx.stroke();
   ctx.restore();
   let circleRadius=Math.max(s*0.12,Math.tan(spreadRad)*clampedDist);
   ctx.strokeStyle='rgba(255,80,80,0.4)';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.arc(retX,retY,circleRadius,0,Math.PI*2);ctx.stroke();
   let ch=Math.max(3,circleRadius*0.35);
   ctx.strokeStyle='rgba(255,80,80,0.55)';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(retX-ch,retY);ctx.lineTo(retX+ch,retY);ctx.stroke();
   ctx.beginPath();ctx.moveTo(retX,retY-ch);ctx.lineTo(retX,retY+ch);ctx.stroke();
  }
 }
 if(p.swingTimer>0&&wepDef&&wepDef.melee){
  let progress=1-p.swingTimer/p.swingDuration,arc=wepDef.arc||Math.PI/2;
  ctx.save();ctx.translate(p.fx*s+s/2,p.fy*s+s/2);ctx.rotate(p.angle);
  ctx.strokeStyle='rgba(255,255,255,'+(0.35*(1-progress))+')';ctx.lineWidth=2*state.scale;
  ctx.beginPath();ctx.arc(0,0,wepDef.range*s/2,-arc/2,-arc/2+progress*arc);ctx.stroke();ctx.restore();
 }
 let aimRange=wepDef?wepDef.range:6;
 ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;ctx.setLineDash([s*0.12,s*0.08]);
 ctx.beginPath();ctx.moveTo(p.fx*s+s/2,p.fy*s+s/2);
 ctx.lineTo(p.fx*s+s/2+Math.cos(p.angle)*s*aimRange/2,p.fy*s+s/2+Math.sin(p.angle)*s*aimRange/2);ctx.stroke();ctx.setLineDash([]);
 if(state.draggingBarrel){ctx.strokeStyle='rgba(255,200,0,0.4)';ctx.lineWidth=2;let db=state.draggingBarrel;ctx.beginPath();ctx.arc(db.fx*s+s/2,db.fy*s+s/2,s*0.4,0,Math.PI*2);ctx.stroke()}
 let interact=getNearestInteraction(p);
 if(interact){
  let label='[E]';
  if(interact.type==='item'){
   let it=interact.item;
   if(it.type==='weapon')label='[E] '+(WEAPONS[it.name]?.label||it.name);
   else if(it.type==='ammo')label='[E] Munitions';
   else if(it.type==='bandage')label='[E] Bandage';
   else if(it.type==='coin'||it.type==='coins')label='[E] Coins';
  }else if(interact.type==='door')label='[E] '+interact.label;
  else if(interact.type==='repair')label='[E] Reparer (300$)';
  else if(interact.type==='escape')label='[E] '+(interact.label||'Fuir');
  else if(interact.type==='ally')label='[E] '+interact.label;
  else if(interact.type==='leader')label='[E] Parler';
  ctx.fillStyle='rgba(255,230,0,0.85)';ctx.font='bold '+Math.floor(s*0.3)+'px sans-serif';ctx.textAlign='center';
  ctx.fillText(label,p.fx*s+s/2,p.fy*s+s*1.3);
 }
 if(!playerBld){
  for(let door of state.doors){
   let dd=distXY(door.x+0.5,door.y+0.5,p.fx,p.fy);
   if(dd<3&&door.building){
    let bld=door.building;
    let zInside=0;for(let z of state.zombies){if(z.alive&&getBuildingAt(fl(z.fx),fl(z.fy))===bld)zInside++}
    let hasItems=state.items.some(it=>it.x>=bld.x+1&&it.x<=bld.x+bld.w-2&&it.y>=bld.y+1&&it.y<=bld.y+bld.h-2);
    let dx=door.x*s+s/2,dy=door.y*s-s*0.5;
    ctx.fillStyle='rgba(0,0,0,0.7)';
    let tw=s*4;
    ctx.fillRect(dx-tw/2,dy-s*0.6,tw,s*0.55);
    ctx.fillStyle='#fff';ctx.font=Math.floor(s*0.18)+'px sans-serif';ctx.textAlign='center';
    let info='';
    if(bld.baseType){
     let baseLabel=bld.baseType==='military'?'Base militaire':bld.baseType==='zombie_base'?'Base zombie':'Base du Fou';
     info=baseLabel;
     if(door.doorHp>0&&door.barricaded)info+=' | Porte: '+door.doorHp+'/'+door.maxDoorHp+' PV';
    }else{
     info=zInside>0?zInside+' zombie'+(zInside>1?'s':''):bld.searched?'Explore':'Inconnu';
     if(hasItems)info+=' | Butin';
    }
    ctx.fillText(info,dx,dy-s*0.35);
    break;
   }
  }
 }
 function drawExitArrow(exit,color,label){
  if(!exit||exit.x<0)return;
  let ezx=exit.x*s+s/2,ezy=exit.y*s+s/2;
  let onScreen=ezx>cam.x&&ezx<cam.x+state.W&&ezy>cam.y&&ezy<cam.y+state.H;
  if(!onScreen){
   let pcx2=p.fx*s+s/2,pcy2=p.fy*s+s/2;
   let ang=Math.atan2(ezy-pcy2,ezx-pcx2);
   let arrowDist=s*4;
   let ax=pcx2+Math.cos(ang)*arrowDist,ay=pcy2+Math.sin(ang)*arrowDist;
   ctx.save();ctx.translate(ax,ay);ctx.rotate(ang);
   ctx.globalAlpha=0.4+0.2*Math.sin(state.tick*0.06);
   ctx.fillStyle=color;
   ctx.beginPath();ctx.moveTo(s*0.4,0);ctx.lineTo(-s*0.2,-s*0.2);ctx.lineTo(-s*0.2,s*0.2);ctx.closePath();ctx.fill();
   ctx.globalAlpha=0.7;ctx.rotate(-ang);ctx.font='bold '+Math.floor(s*0.18)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText(label,0,s*0.4);
   ctx.globalAlpha=1;ctx.restore();
  }
 }
 drawExitArrow(state.exitNext,'#0af','Suivant >>');
 drawExitArrow(state.exitPrev,'#fa0','<< Retour');
}
function drawEffects(ctx,s){
 let p=state.player;
 let selW=p.inventory[p.selectedSlot];
 let wepDef=getWeaponDef(selW);
 for(let f of state.dmgFloaters){
  let fx=f.x*s+s/2,fy=f.y*s+s/2;
  let alpha=f.life/f.maxLife;
  ctx.globalAlpha=alpha;ctx.fillStyle=f.color;
  ctx.font='bold '+Math.floor(s*0.28)+'px sans-serif';ctx.textAlign='center';
  ctx.fillText(f.text,fx,fy);
  ctx.globalAlpha=1;
 }
 for(let c of state.confetti){
  let cx=c.x*s+s/2,cy=c.y*s+s/2;
  ctx.globalAlpha=Math.min(1,c.life/30);ctx.fillStyle=c.color;
  ctx.fillRect(cx-s*0.06,cy-s*0.06,s*0.12,s*0.12);ctx.globalAlpha=1;
 }
 if(wepDef&&wepDef.name==='smg'&&p.smgHeat>0.05){
  let pcx=p.fx*s+s/2,pcy=p.fy*s+s/2;
  let bw=s*0.8;
  ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(pcx-bw/2,pcy+s*0.8,bw,s*0.1);
  let hcol=p.smgHeat>0.7?'#f44':p.smgHeat>0.4?'#fa0':'#ff0';
  ctx.fillStyle=hcol;ctx.fillRect(pcx-bw/2,pcy+s*0.8,bw*p.smgHeat,s*0.1);
 }
 if(wepDef&&wepDef.melee){
  let pcx2=p.fx*s+s/2,pcy2=p.fy*s+s/2;
  if(p.chargedCooldown>0){
   let bw=s*0.8,prog=1-p.chargedCooldown/(20*60);
   ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(pcx2-bw/2,pcy2+s*0.95,bw,s*0.08);
   ctx.fillStyle='#f80';ctx.fillRect(pcx2-bw/2,pcy2+s*0.95,bw*prog,s*0.08);
   ctx.fillStyle='rgba(255,100,0,0.8)';ctx.font='bold '+Math.floor(s*0.18)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText('COOLDOWN',pcx2,pcy2+s*1.15);
  }else if(p.chargeHold>0){
   let bw=s*0.8,prog=Math.min(1,p.chargeHold/40);
   let full=p.chargeHold>=40;
   ctx.fillStyle='rgba(0,0,0,0.4)';ctx.fillRect(pcx2-bw/2,pcy2+s*0.95,bw,s*0.08);
   ctx.fillStyle=full?'#f80':'#ff0';ctx.fillRect(pcx2-bw/2,pcy2+s*0.95,bw*prog,s*0.08);
   ctx.fillStyle=full?'rgba(255,136,0,0.8)':'rgba(255,255,0,0.5)';ctx.font='bold '+Math.floor(s*0.18)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText(full?'RELACHEZ!':'CHARGE...',pcx2,pcy2+s*1.15);
   if(full){
    let wepD=getWeaponDef(p.inventory[p.selectedSlot]);
    let cRange=(wepD?wepD.range*1.2:3)*s;
    let cArc=(wepD?(wepD.arc||Math.PI/2)*1.3:Math.PI);
    let alpha=0.15+0.1*Math.sin(state.tick*0.12);
    ctx.save();
    ctx.strokeStyle='rgba(255,136,0,'+alpha+')';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(pcx2,pcy2);
    ctx.arc(pcx2,pcy2,cRange,p.angle-cArc/2,p.angle+cArc/2);
    ctx.closePath();ctx.stroke();
    ctx.fillStyle='rgba(255,136,0,0.06)';
    ctx.beginPath();ctx.moveTo(pcx2,pcy2);
    ctx.arc(pcx2,pcy2,cRange,p.angle-cArc/2,p.angle+cArc/2);
    ctx.closePath();ctx.fill();
    ctx.restore();
   }
  }else{
   let alpha=0.3+0.15*Math.sin(state.tick*0.08);
   ctx.fillStyle='rgba(255,136,0,'+alpha+')';ctx.font='bold '+Math.floor(s*0.16)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText('Maintenir pour charger',pcx2,pcy2+s*1.1);
  }
 }
 if(state.playerRallyBuff>0){
  let pcx2=p.fx*s+s/2,pcy2=p.fy*s+s/2;
  let alpha=0.4+0.3*Math.sin(state.tick*0.15);
  ctx.strokeStyle='rgba(255,200,0,'+alpha+')';ctx.lineWidth=2*state.scale;
  ctx.beginPath();ctx.arc(pcx2,pcy2,s*0.7,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='rgba(255,200,0,0.6)';ctx.font='bold '+Math.floor(s*0.16)+'px sans-serif';ctx.textAlign='center';
  ctx.fillText('DEGATS +10%',pcx2,pcy2-s*0.8);
 }
}
export function draw(){
 let{ctx,player:p,cam}=state;
 if(state.targetZoom&&Math.abs(state.zoomLevel-state.targetZoom)>0.005){
  state.zoomLevel+=(state.targetZoom-state.zoomLevel)*0.15;
  state.scale=state.zoomLevel;
 }else if(state.targetZoom){state.zoomLevel=state.targetZoom;state.scale=state.zoomLevel}
 let s=TILE*state.scale;
 ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,state.W,state.H);
 let camTX=p.fx*s-state.W/2+s/2,camTY=p.fy*s-state.H/2+s/2;
 if(!state.camInitialized){cam.x=camTX;cam.y=camTY;state.camInitialized=true}
 else{cam.x+=(camTX-cam.x)*0.12;cam.y+=(camTY-cam.y)*0.12}
 if(state.shakeTimer>0){
  let si=state.shakeIntensity*(state.shakeTimer/state.shakeMaxTimer);
  cam.x+=Math.sin(state.shakeTimer*1.5)*si*s;
  cam.y+=Math.cos(state.shakeTimer*2.1)*si*s;
 }
 ctx.save();ctx.translate(-cam.x,-cam.y);
 let x0=Math.max(0,Math.floor(cam.x/s)-1),x1=Math.min(MAP_W,Math.ceil((cam.x+state.W)/s)+1);
 let y0=Math.max(0,Math.floor(cam.y/s)-1),y1=Math.min(MAP_H,Math.ceil((cam.y+state.H)/s)+1);
 let playerBld=getBuildingAt(p.x,p.y);
 drawTerrain(ctx,s,cam,x0,x1,y0,y1);
 drawItems(ctx,s,x0,x1,y0,y1);
 drawEntities(ctx,s,cam,playerBld);
 drawUI(ctx,s,cam,playerBld);
 drawEffects(ctx,s);
 ctx.restore();
 if(state.dmgVignetteTimer>0){
  let va=0.3*(state.dmgVignetteTimer/20);
  let grd=ctx.createRadialGradient(state.W/2,state.H/2,state.W*0.3,state.W/2,state.H/2,state.W*0.7);
  grd.addColorStop(0,'rgba(255,0,0,0)');grd.addColorStop(1,'rgba(255,0,0,'+va+')');
  ctx.fillStyle=grd;ctx.fillRect(0,0,state.W,state.H);
 }
 if(state.iFrames>0&&state.iFrames%4<2){
  ctx.globalAlpha=0.1;ctx.fillStyle='#fff';ctx.fillRect(0,0,state.W,state.H);ctx.globalAlpha=1;
 }
 if(state.paused){
  ctx.fillStyle='rgba(0,0,0,0.5)';ctx.fillRect(0,0,state.W,state.H);
  ctx.fillStyle='#fff';ctx.font='bold 48px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.fillText('PAUSE',state.W/2,state.H/2);
  ctx.font='18px sans-serif';ctx.fillStyle='#aaa';
  ctx.fillText('Echap pour reprendre',state.W/2,state.H/2+40);
  ctx.textBaseline='alphabetic';
 }
}
export function resize(){
 state.W=window.innerWidth;state.H=window.innerHeight;
 if(!state.zoomLevel)state.zoomLevel=Math.max(1,Math.min(Math.floor(state.W/(MAP_W*TILE*0.4)),Math.floor(state.H/(MAP_H*TILE*0.4)),3));
 state.scale=state.zoomLevel;
 state.canvas.width=state.W;state.canvas.height=state.H;
 state.ctx.imageSmoothingEnabled=false;
}
export function zoom(delta){
 let t=state.targetZoom||state.zoomLevel||1;
 t+=delta>0?-0.25:0.25;
 state.targetZoom=Math.max(0.5,Math.min(t,4));
}
export function startGame(){
 initPlayer();
 state.player.x=Math.floor(MAP_W/2);state.player.y=Math.floor(MAP_H/2);
 state.player.fx=state.player.x;state.player.fy=state.player.y;
 state.gameOver=false;state.paused=false;state.mapIndex=0;state.mapCount=0;state.maxMapIndex=0;
 state.kills=0;state.itemsFound=0;state.buildingsExplored=0;state.hordeEncounters=0;
 state.savedMaps={};
 state.explosions=[];state.dmgFloaters=[];state.confetti=[];state.grenades=[];state.spits=[];state.acidPools=[];
 state.camInitialized=false;state.iFrames=0;state.shakeTimer=0;state.dmgVignetteTimer=0;state.shopOpen=false;
 state.mouseDown=false;state.player.chargeHold=0;state.player.cooldown=30;state.player.isAttacking=false;state.player.swingTimer=0;
 genMap();buildTerrainCache();spawnPlayerInBuilding();
 msg('Survivez! Fleches = sorties. E = interagir.',3000);
 if(state.firstGame)state.showControls=true;
 startMusic();
}
export function retryWithSamePlayer(){
 state.gameOver=false;state.paused=false;
 state.player.hp=state.player.maxHp;state.player.hitSlowTimer=0;state.player.postAttackSlow=0;state.player.smgHeat=0;
 state.player.chargeHold=0;state.player.cooldown=30;state.player.isAttacking=false;state.player.swingTimer=0;
 state.mouseDown=false;
 state.explosions=[];state.dmgFloaters=[];state.confetti=[];state.grenades=[];state.spits=[];state.acidPools=[];
 state.camInitialized=false;state.iFrames=0;state.shakeTimer=0;state.dmgVignetteTimer=0;
 if(loadMap(state.mapIndex)){
  buildTerrainCache();spawnPlayerInBuilding();
 }else{
  genMap();buildTerrainCache();spawnPlayerInBuilding();
 }
 startMusic();
 msg('Nouvelle tentative... Map #'+(state.mapIndex+1),3000);emitChange();
}
function goToMap(newIndex,fromDirection){
 let p=state.player;
 saveCurrentMap();
 state.mapIndex=newIndex;
 state.mapCount=Math.max(state.mapCount,newIndex);
 if(newIndex>state.maxMapIndex)state.maxMapIndex=newIndex;
 addXP(p,10);addFloater(p.fx,p.fy,'+10 XP','#0f0');
 p.hp=Math.min(p.maxHp,p.hp+Math.ceil(p.maxHp*0.3));
 state.camInitialized=false;state.iFrames=0;state.shakeTimer=0;state.dmgVignetteTimer=0;
 if(loadMap(newIndex)){
  buildTerrainCache();
  if(fromDirection==='next')spawnPlayerAtExit(state.exitPrev);
  else if(fromDirection==='prev')spawnPlayerAtExit(state.exitNext);
  else spawnPlayerInBuilding();
 }else{
  genMap();buildTerrainCache();
  if(fromDirection==='next')spawnPlayerAtExit(state.exitPrev);
  else if(fromDirection==='prev')spawnPlayerAtExit(state.exitNext);
  else spawnPlayerInBuilding();
 }
 // Re-add recruited allies near player
 for(let a of state.allies){
  if(a.alive&&a.recruited){
   a.fx=p.fx+((prng()-0.5)*2);a.fy=p.fy+((prng()-0.5)*2);
   a.x=fl(a.fx);a.y=fl(a.fy);clampToMap(a);
   if(!state.npcs.includes(a))state.npcs.push(a);
  }
 }
 msg('Zone '+(newIndex+1)+' | Nv.'+p.level+' | '+state.kills+' eliminations',3000);emitChange();
}
function nextMap(){goToMap(state.mapIndex+1,'next')}
function prevMap(){if(state.mapIndex>0)goToMap(state.mapIndex-1,'prev')}
export function initCanvas(canvas){
 state.canvas=canvas;state.ctx=canvas.getContext('2d');
}
export function setSelectedSlot(i){
 if(i>=0&&i<INV_SIZE)state.player.selectedSlot=i;
}
export const SHOP_ITEMS=[
 {id:'bandage',label:'Bandage',cost:500,desc:'+25 PV'},
 {id:'ammo',label:'Munitions x20',cost:800,desc:'+20 balles'},
 {id:'barrel',label:'Baril explosif',cost:2000,desc:'Placé devant vous'},
 {id:'barricade',label:'Barricade',cost:1500,desc:'Bloc deplacable'},
 {id:'gun',label:'Pistolet',cost:5000,desc:'Arme a feu'},
 {id:'shotgun',label:'Fusil',cost:15000,desc:'Degats zone'},
 {id:'smg',label:'SMG',cost:25000,desc:'Tir rapide'},
];
export function toggleShop(){state.shopOpen=!state.shopOpen;emitChange()}
export function buyItem(id){
 let p=state.player,item=SHOP_ITEMS.find(s=>s.id===id);
 if(!item||p.coins<item.cost)return false;
 if(id==='bandage'){
  if(!p.healSlot)p.healSlot={type:'bandage',qty:1};
  else if(p.healSlot.qty>=5){msg('Soins pleins!');return false}
  else p.healSlot.qty++;
 }else if(id==='ammo'){p.ammo+=20}
 else if(id==='barrel'){
  let bx=p.fx+Math.cos(p.angle)*1.5,by=p.fy+Math.sin(p.angle)*1.5;
  let tx=fl(bx),ty=fl(by);if(!canWalk(tx,ty)){msg('Pas de place!');return false}
  state.barrels.push({x:tx,y:ty,fx:tx+0.5,fy:ty+0.5,hp:20,alive:true});
 }else if(id==='barricade'){
  let bx=p.fx+Math.cos(p.angle)*1.5,by=p.fy+Math.sin(p.angle)*1.5;
  let tx=fl(bx),ty=fl(by);if(!canWalk(tx,ty)){msg('Pas de place!');return false}
  state.barricades=state.barricades||[];
  let brc={x:tx,y:ty,fx:tx+0.5,fy:ty+0.5,hp:80,maxHp:80};
  state.barricades.push(brc);state.barricadeMap.set(tileKey(tx,ty),brc);
 }else if(id==='gun'||id==='shotgun'||id==='smg'){
  let slot=p.inventory.findIndex(i=>i===null);
  if(slot<0){msg('Inventaire plein!');return false}
  p.inventory[slot]={type:'weapon',name:id,ammo:0};p.ammo+=10;
 }
 p.coins-=item.cost;msg(item.label+'! (-'+item.cost+'$)');playSound('pickup');emitChange();return true;
}
