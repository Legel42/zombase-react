export const TILE=32,MAP_W=60,MAP_H=45,INV_SIZE=5;
const COLORS={
 floor:'#2e2a26',wall:'#4a4644',wallTop:'#3a3836',wallEdge:'#222',
 wallInner:'#3e3a38',wallInnerTop:'#333030',
 door:'#6a5030',doorBroken:'#4a3a28',grass:'#1e3a1e',grassAlt:'#1a331a',grassDetail:'#162e16',
 escape:'#0af',cityWall:'#3e3c3a',cityWallTop:'#2e2c2a',
 doorArmored:'#5a6a7a',doorArmoredTop:'#4a5a6a'
};
const SIGHT_RADIUS=7,GUNSHOT_ALERT_RADIUS=18,SAFE_SPAWN_RADIUS=14;
export const BASE_HP_PLAYER=25,BASE_HP_ZOMBIE=50,BASE_DMG_ZOMBIE=8;
const WEAPONS={
 bat:{name:'bat',type:'weapon',range:2.8,arc:Math.PI/1.5,dmg:13,cooldown:45,melee:true,label:'Batte'},
 gun:{name:'gun',type:'weapon',range:15,dmg:25,cooldown:20,melee:false,label:'Pistolet',baseSpread:0.03},
 shotgun:{name:'shotgun',type:'weapon',range:9,dmg:18,cooldown:28,melee:false,pellets:5,baseSpread:0.22,label:'Fusil a pompe'},
 smg:{name:'smg',type:'weapon',range:12,dmg:10,cooldown:10,melee:false,label:'Mitraillette',baseSpread:0.06}
};
export const WEAPON_DEFS=WEAPONS;
const ZOMBIE_ATK_RANGE=1.2;
const HIT_SLOW_DURATION=20;
const POST_ATTACK_SLOW_DURATION=60;
const INTERACT_RANGE=1.8;
const BARREL_EXPLOSION_RADIUS=3,BARREL_EXPLOSION_DMG=40,MAX_BARRELS=3;
const XP_PER_KILL=5,XP_BOSS_MULT=10;
const XP_PER_LEVEL=100;
const DIST_SPREAD_FACTOR=0.008;
const ZOMBIE_CLEANUP_INTERVAL=120;
const SMG_HEAT_PER_SHOT=0.12,SMG_HEAT_DECAY=0.015,SMG_HEAT_SPREAD_MULT=5;
const GUNSHOT_SPAWN_COOLDOWN=90*60; // 90 seconds in ticks (60fps)
const GUNSHOT_SPAWN_COUNT={gun:1,smg:2,shotgun:3};
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
const rand=(a,b)=>(Math.random()*(b-a+1)|0)+a;
const distXY=(x1,y1,x2,y2)=>Math.hypot(x1-x2,y1-y2);
const clamp=(v,lo,hi)=>v<lo?lo:v>hi?hi:v;
const tileKey=(x,y)=>y*MAP_W+x;
const fl=(v)=>v+0.5|0;
export const state={
 canvas:null,ctx:null,cam:{x:0,y:0},
 keys:{},mouseX:0,mouseY:0,mouseDown:false,
 gameOver:false,showStats:false,
 map:[],buildings:[],doors:[],items:[],zombies:[],bullets:[],barrels:[],cityWalls:[],
 npcs:[],rocks:[],rockWarnings:[],explosions:[],dmgFloaters:[],confetti:[],
 doorMap:new Map(),buildingGrid:null,wallGrid:null,
 escapeZone:{x:0,y:0},
 player:null,mapCount:0,tick:0,attackPressed:false,kills:0,lastGunSpawnTick:-99999,
 W:0,H:0,scale:1,
 message:'',msgTimer:null,
 onDeath:null,onStateChange:null,
 firstGame:true,showControls:false,
 holdingE:false,holdETimer:0,draggingBarrel:null,
 baseEvent:false,baseEventActive:false,baseWaveTimer:0,baseWavesLeft:0,
 baseBoss:null,baseRewardGiven:false,hordeAlive:0,
 paused:false,pausePressed:false,
 shakeTimer:0,shakeMaxTimer:0,shakeIntensity:0,
 camInitialized:false,iFrames:0,dmgVignetteTimer:0
};
export const TICK_RATE=1000/60;
// Audio system
const music=new Audio('sounds/music.mp3');
music.loop=true;music.volume=0.3;
const sfx={
 gun:new Audio('sounds/gun.mp3'),
 shotgun:new Audio('sounds/shotgun.mp3'),
 smg:new Audio('sounds/smg.mp3'),
 bat:new Audio('sounds/bat.mp3'),
 zombie_hit:new Audio('sounds/bat.mp3'),
 zombie_alert:new Audio('sounds/zombie_alert.mp3'),
 door:new Audio('sounds/door.mp3')
};
for(let k in sfx)sfx[k].volume=0.5;
const audioPool={};
function playSound(name){
 let s=sfx[name];if(!s)return;
 if(!audioPool[name])audioPool[name]=[];
 let pool=audioPool[name];
 for(let i=pool.length-1;i>=0;i--){if(pool[i].ended)pool.splice(i,1)}
 if(pool.length>=8)return;
 let c=s.cloneNode();c.volume=s.volume;c.play().catch(()=>{});
 pool.push(c);
}
let musicStarted=false;
function startMusic(){
 if(musicStarted)return;
 let tryPlay=()=>{music.play().then(()=>{musicStarted=true;document.removeEventListener('click',tryPlay);document.removeEventListener('keydown',tryPlay)}).catch(()=>{})};
 tryPlay();
 document.addEventListener('click',tryPlay);
 document.addEventListener('keydown',tryPlay);
}
function stopMusic(){music.pause();music.currentTime=0;musicStarted=false}
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
 if(alerted)return true;
 let bld=getBuildingAt(tx,ty);
 return !bld||isBuildingOccupied(bld);
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
  }
 }
 return false;
}
function getSpreadAtDist(wep,precision,d){
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
 let u=s/32;
 let sel=player.inventory[player.selectedSlot];
 if(sel&&sel.name==='bat'){
  let batLen=WEAPONS.bat.range*s/2*0.5;
  if(swingAnim>0){
   let swA=-WEAPONS.bat.arc/2+swingAnim*WEAPONS.bat.arc*1.2;
   ctx.save();ctx.rotate(swA);
   ctx.fillStyle='#888';ctx.fillRect(10*u,-1.5*u,batLen,3*u);
   ctx.fillStyle='#aaa';ctx.fillRect(10*u+batLen*0.7,-2.5*u,batLen*0.3,5*u);
   ctx.restore();
  }else{
   ctx.fillStyle='#888';ctx.fillRect(10*u,-1.5*u,batLen,3*u);
   ctx.fillStyle='#aaa';ctx.fillRect(10*u+batLen*0.7,-2.5*u,batLen*0.3,5*u);
  }
 }else if(sel&&sel.name==='gun'){
  ctx.fillStyle='#2a2a2a';ctx.fillRect(10*u,-2*u,14*u,4*u);
  ctx.fillStyle='#1a1a1a';ctx.fillRect(8*u,-3*u,6*u,6*u);
  ctx.fillStyle='#333';ctx.fillRect(22*u,-1*u,4*u,2*u);
 }else if(sel&&sel.name==='shotgun'){
  ctx.fillStyle='#3a2a1a';ctx.fillRect(10*u,-2*u,20*u,4*u);
  ctx.fillStyle='#1a1a1a';ctx.fillRect(8*u,-3*u,6*u,6*u);
  ctx.fillStyle='#2a2a2a';ctx.fillRect(28*u,-2.5*u,4*u,5*u);
  ctx.fillStyle='#555';ctx.fillRect(28*u,-1*u,5*u,2*u);
 }else if(sel&&sel.name==='smg'){
  ctx.fillStyle='#222';ctx.fillRect(10*u,-1.5*u,12*u,3*u);
  ctx.fillStyle='#1a1a1a';ctx.fillRect(8*u,-2.5*u,5*u,5*u);
  ctx.fillStyle='#333';ctx.fillRect(14*u,1.5*u,3*u,4*u);
  ctx.fillStyle='#2a2a2a';ctx.fillRect(20*u,-1*u,4*u,2*u);
 }
 ctx.restore();
}
function drawNPC(ctx,cx,cy,s,angle,npc){
 let wepName=npc.weapon;
 let walkPhase=npc._moving?(state.tick%24)/24:0;
 drawHumanoid(ctx,cx,cy,s,angle,{
  body:npc.isLeader?'#4a3a2a':'#3a3a4a',
  vest:npc.isLeader?'#5a4a3a':'#4a4a5a',
  pocket:npc.isLeader?'#3a2a1a':null,
  skin:'#d4a870',helmet:npc.isLeader?'#5a4a3a':'#3a3a4a',
  helmetRim:npc.isLeader?'#4a3a2a':'#2a2a3a',walkPhase
 });
 ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);
 let u=s/32;
 if(wepName==='bat'){
  ctx.fillStyle='#888';ctx.fillRect(10*u,-1.5*u,20*u,3*u);
  ctx.fillStyle='#aaa';ctx.fillRect(26*u,-2.5*u,6*u,5*u);
 }else if(wepName==='gun'){
  ctx.fillStyle='#2a2a2a';ctx.fillRect(10*u,-2*u,14*u,4*u);
  ctx.fillStyle='#1a1a1a';ctx.fillRect(8*u,-3*u,6*u,6*u);
 }else if(wepName==='shotgun'){
  ctx.fillStyle='#3a2a1a';ctx.fillRect(10*u,-2*u,20*u,4*u);
  ctx.fillStyle='#1a1a1a';ctx.fillRect(8*u,-3*u,6*u,6*u);
  ctx.fillStyle='#2a2a2a';ctx.fillRect(28*u,-2.5*u,4*u,5*u);
 }
 ctx.restore();
}
function drawZombie(ctx,cx,cy,s,angle,variant,atkAnim,isBoss,isMoving){
 let sc=isBoss?1.4:1;
 ctx.save();ctx.translate(cx,cy);
 if(isBoss)ctx.scale(sc,sc);
 ctx.rotate(angle);
 let u=s/32;
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
 ctx.restore();
}
function initPlayer(){
 let pvStat=5+rand(0,2);
 state.player={
  x:Math.floor(MAP_W/2),y:Math.floor(MAP_H/2),
  hp:BASE_HP_PLAYER+pvStat*5,maxHp:BASE_HP_PLAYER+pvStat*5,
  pvStat,atk:5+rand(0,2),armor:5+rand(0,2),precision:5+rand(0,2),speed:5+rand(0,2),
  inventory:[{type:'weapon',name:'bat',ammo:0},null,null,null,null],
  selectedSlot:0,cooldown:0,angle:0,
  fx:Math.floor(MAP_W/2),fy:Math.floor(MAP_H/2),
  swingTimer:0,swingDuration:25,hitSlowTimer:0,isAttacking:false,
  postAttackSlow:0,xp:0,level:1,ammo:0,smgHeat:0
 };
}
function getMaterials(p){let s=p.inventory.find(i=>i&&i.type==='material');return s?s.qty:0}
function addMaterial(p,n){
 let s=p.inventory.find(i=>i&&i.type==='material');
 if(s){s.qty+=n;return true}
 let idx=p.inventory.findIndex(i=>i===null);
 if(idx>=0){p.inventory[idx]={type:'material',qty:n};return true}
 return false;
}
function removeMaterial(p,n){
 let s=p.inventory.find(i=>i&&i.type==='material');
 if(s&&s.qty>=n){s.qty-=n;if(s.qty<=0){let idx=p.inventory.indexOf(s);p.inventory[idx]=null}return true}
 return false;
}
function addXP(p,amount){
 p.xp+=amount;
 while(p.xp>=XP_PER_LEVEL){p.xp-=XP_PER_LEVEL;p.level++;levelUp(p)}
}
function levelUp(p){
 let stats=['pvStat','atk','armor','precision','speed'];
 p.maxHp+=5;p.hp=Math.min(p.hp+5,p.maxHp);
 let parts=['+5 PV'];
 for(let s of stats){
  let boost=rand(0,3);
  if(boost>0){applyStat(p,s,boost);parts.push('+'+boost+' '+statName(s))}
 }
 msg('Level '+p.level+'! '+parts.join(', '),3000);
}
function applyStat(p,stat,amount){
 p[stat]+=amount;
 if(stat==='pvStat'){p.maxHp=BASE_HP_PLAYER+p.pvStat*5;p.hp=Math.min(p.hp+amount*5,p.maxHp)}
}
function statName(s){
 switch(s){case 'pvStat':return'PV';case 'atk':return'ATK';case 'armor':return'ARM';case 'precision':return'PRE';case 'speed':return'VIT'}return s;
}
function getZombieLevel(){
 let lv=1;
 if(state.mapCount>=5)lv+=Math.ceil((state.mapCount-4)/2);
 return lv;
}
function getBossLevel(){return getZombieLevel()+Math.floor((state.mapCount+1)/5)*5}
function getNPCLevel(){return 1+Math.floor((state.mapCount+1)/5)*3}
function makeZombie(x,y,level){
 let lv=level||getZombieLevel();
 let pvStat=rand(1,10)*lv;
 let hp=BASE_HP_ZOMBIE+pvStat*5;
 return{x,y,hp,maxHp:hp,atk:rand(1,10)*lv,armor:rand(1,5)+lv*2,precision:rand(1,8)+lv,
  speed:Math.max(1,rand(1,3)+Math.floor(lv/3)),fx:x,fy:y,
  cooldown:0,atkCooldown:Math.max(30,60-lv*3),atkTimer:0,atkDuration:15,
  alive:true,alerted:false,variant:rand(0,1),
  angle:Math.random()*Math.PI*2,hitSlowTimer:0,isAttacking:false,
  postAttackSlow:0,isBoss:false,speech:null,speechTimer:0,alertDelay:0,jumpAnim:0,
  stuckTimer:0,stuckOriginX:x,stuckOriginY:y,stuckPerp:0,stuckPerpTimer:0};
}
function makeBossZombie(x,y){
 let lv=getBossLevel();
 let hp=300+lv*50;
 return{x,y,hp,maxHp:hp,atk:20+lv*8,armor:15+lv*3,precision:8+lv,
  speed:2+Math.floor(lv/4),fx:x,fy:y,
  cooldown:0,atkCooldown:50,atkTimer:0,atkDuration:20,
  alive:true,alerted:true,variant:0,
  angle:0,hitSlowTimer:0,isAttacking:false,
  postAttackSlow:0,isBoss:true,throwCooldown:0,throwTimer:0};
}
function makeNPC(x,y,weapon,isLeader){
 let lv=getNPCLevel();
 let hp=(isLeader?105:60)+lv*10;
 return{x,y,fx:x,fy:y,hp,maxHp:hp,
  atk:(isLeader?5:2)+lv*2,armor:(isLeader?5:2)+lv,precision:(isLeader?6:3)+lv,speed:isLeader?3:2,
  weapon,isLeader,alive:true,angle:0,_moving:false,
  cooldown:0,atkCooldown:weapon==='bat'?30:25,speech:null,speechTimer:0,
  stuckTimer:0,stuckOriginX:x,stuckOriginY:y,stuckPerp:0,stuckPerpTimer:0,
  retreatTimer:0,retreatAngle:0};
}
function genMap(){
 state.map=Array.from({length:MAP_H},()=>Array(MAP_W).fill(0));
 state.buildings=[];state.doors=[];state.items=[];state.zombies=[];
 state.bullets=[];state.barrels=[];state.cityWalls=[];
 state.npcs=[];state.rocks=[];state.rockWarnings=[];state.explosions=[];state.dmgFloaters=[];state.confetti=[];
 state.baseBoss=null;state.baseEventActive=false;state.baseRewardGiven=false;state.hordeSpawned=0;
 let{map,buildings,doors,items,zombies,player}=state;
 let isBaseLevel=(state.mapCount+1)%5===0&&state.mapCount>0;
 state.baseEvent=isBaseLevel;
 let attempts=0,targetBuildings=isBaseLevel?rand(4,6):rand(6,10);
 if(isBaseLevel){
  let placed=false;
  for(let a=0;a<200&&!placed;a++){
   let w=rand(10,14),h=rand(8,11),bx=rand(2,MAP_W-w-2),by=rand(2,MAP_H-h-2);
   let ok=true;
   for(let b of buildings){if(bx<b.x+b.w+2&&bx+w+2>b.x&&by<b.y+b.h+2&&by+h+2>b.y){ok=false;break}}
   if(!ok)continue;
   for(let y=by;y<by+h;y++)for(let x=bx;x<bx+w;x++){
    map[y][x]=(y===by||y===by+h-1||x===bx||x===bx+w-1)?1:2;
   }
   let bld={x:bx,y:by,w,h,searched:false,isHQ:true};
   buildings.push(bld);
   let doorPositions=[
    {x:rand(bx+2,bx+w-3),y:by},
    {x:rand(bx+2,bx+w-3),y:by+h-1},
    {x:bx,y:rand(by+2,by+h-3)},
    {x:bx+w-1,y:rand(by+2,by+h-3)}
   ];
   for(let dp of doorPositions){
    map[dp.y][dp.x]=3;
    doors.push({x:dp.x,y:dp.y,barricaded:true,open:false,building:bld,doorHp:5,maxDoorHp:5});
   }
   placed=true;
  }
 }
 while(buildings.length<targetBuildings&&attempts<400){
  attempts++;
  let w=rand(5,9),h=rand(6,8),bx=rand(1,MAP_W-w-1),by=rand(1,MAP_H-h-1);
  let ok=true;
  for(let b of buildings){if(bx<b.x+b.w+2&&bx+w+2>b.x&&by<b.y+b.h+2&&by+h+2>b.y){ok=false;break}}
  if(!ok)continue;
  for(let y=by;y<by+h;y++)for(let x=bx;x<bx+w;x++){
   map[y][x]=(y===by||y===by+h-1||x===bx||x===bx+w-1)?1:2;
  }
  let doorSide=rand(0,3),doorPos;
  if(doorSide===0)doorPos={x:rand(bx+1,bx+w-2),y:by};
  else if(doorSide===1)doorPos={x:rand(bx+1,bx+w-2),y:by+h-1};
  else if(doorSide===2)doorPos={x:bx,y:rand(by+1,by+h-2)};
  else doorPos={x:bx+w-1,y:rand(by+1,by+h-2)};
  map[doorPos.y][doorPos.x]=3;
  let bld={x:bx,y:by,w,h,searched:false};
  buildings.push(bld);
  doors.push({x:doorPos.x,y:doorPos.y,barricaded:false,open:false,building:bld});
  let winSide=(doorSide+rand(1,3))%4,winPos;
  if(winSide===0)winPos={x:rand(bx+1,bx+w-2),y:by};
  else if(winSide===1)winPos={x:rand(bx+1,bx+w-2),y:by+h-1};
  else if(winSide===2)winPos={x:bx,y:rand(by+1,by+h-2)};
  else winPos={x:bx+w-1,y:rand(by+1,by+h-2)};
  if(map[winPos.y][winPos.x]===1){map[winPos.y][winPos.x]=6}
 }
 for(let i=0;i<rand(8,16);i++){
  let horizontal=Math.random()<0.5;
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
   map[cy][cx]=5;state.cityWalls.push({x:cx,y:cy});
  }
 }
 let gunCount=0;
 let usedPos=new Set();
 function itemPos(x,y){return y*MAP_W+x}
 function placeItem(item){if(!usedPos.has(itemPos(item.x,item.y))){usedPos.add(itemPos(item.x,item.y));items.push(item);return true}return false}
 for(let bi=0;bi<buildings.length;bi++){
  let b=buildings[bi];
  let ix=rand(b.x+1,b.x+b.w-2),iy=rand(b.y+1,b.y+b.h-2);
  if(gunCount<2&&(bi<2||Math.random()<0.3)){
   placeItem({x:ix,y:iy,type:'weapon',name:'gun'});gunCount++;
  }
  if(Math.random()<0.05){
   let sx=rand(b.x+1,b.x+b.w-2),sy=rand(b.y+1,b.y+b.h-2);
   placeItem({x:sx,y:sy,type:'weapon',name:Math.random()<0.5?'shotgun':'smg'});
  }
  let lx=rand(b.x+1,b.x+b.w-2),ly=rand(b.y+1,b.y+b.h-2);
  if(usedPos.has(itemPos(lx,ly))){lx=clamp(lx+1,b.x+1,b.x+b.w-2)}
  placeItem({x:lx,y:ly,type:Math.random()<0.5?'ammo':'bandage'});
 }
 for(let i=0;i<rand(10,20);i++){
  let x,y,tries=0;
  do{x=rand(0,MAP_W-1);y=rand(0,MAP_H-1);tries++}while(map[y][x]!==0&&tries<100);
  if(tries<100)placeItem({x,y,type:'material'});
 }
 let baseZCount=rand(6,12);
 let zombieCount=baseZCount+state.mapCount;
 if(!isBaseLevel){
  let groupCount=Math.floor(zombieCount/2);
  let spawned=0;
  while(spawned<groupCount){
   let groupSize=rand(2,5);
   let cx,cy,tries=0;
   do{cx=rand(2,MAP_W-3);cy=rand(2,MAP_H-3);tries++}while((map[cy][cx]!==0||distXY(cx,cy,player.fx,player.fy)<SAFE_SPAWN_RADIUS)&&tries<100);
   if(tries>=100)break;
   let groupId=Math.random();
   for(let g=0;g<groupSize&&spawned<groupCount;g++){
    let gx=cx+rand(-2,2),gy=cy+rand(-2,2);
    gx=Math.max(0,Math.min(MAP_W-1,gx));gy=Math.max(0,Math.min(MAP_H-1,gy));
    if(map[gy][gx]!==0)continue;
    let z=makeZombie(gx,gy);
    z.wanderGroup=groupId;z.wanderAngle=Math.random()*Math.PI*2;z.wanderTimer=rand(60,180);
    zombies.push(z);spawned++;
   }
  }
  let soloCount=zombieCount-spawned;
  let spawnBuildings=buildings.filter((b,i)=>i>0);
  for(let i=0;i<soloCount;i++){
   let x,y,tries=0;
   if(spawnBuildings.length>0){
    let b=spawnBuildings[rand(0,spawnBuildings.length-1)];
    do{
     if(Math.random()<0.4){
      x=rand(b.x+1,b.x+b.w-2);y=rand(b.y+1,b.y+b.h-2);
     }else{
      x=rand(b.x-2,b.x+b.w+1);y=rand(b.y-2,b.y+b.h+1);
     }
     tries++;
    }while((x<0||y<0||x>=MAP_W||y>=MAP_H||map[y][x]===1||map[y][x]===5||distXY(x,y,player.fx,player.fy)<SAFE_SPAWN_RADIUS)&&tries<50);
   }else{
    do{x=rand(0,MAP_W-1);y=rand(0,MAP_H-1);tries++}while((map[y][x]!==0||distXY(x,y,player.fx,player.fy)<SAFE_SPAWN_RADIUS)&&tries<100);
   }
   if(tries<100)zombies.push(makeZombie(x,y));
  }
  for(let i=0;i<rand(1,MAX_BARRELS);i++){
   let x,y,tries=0;
   do{x=rand(1,MAP_W-2);y=rand(1,MAP_H-2);tries++}while((map[y][x]!==0||distXY(x,y,player.fx,player.fy)<SAFE_SPAWN_RADIUS)&&tries<50);
   if(tries<50)state.barrels.push({x,y,fx:x,fy:y,hp:20,alive:true});
  }
  let ex,ey,tries=0;
  do{ex=rand(0,MAP_W-1);ey=rand(0,MAP_H-1);tries++}while((map[ey][ex]!==0||distXY(ex,ey,player.fx,player.fy)<15)&&tries<200);
  state.escapeZone={x:ex,y:ey};map[ey][ex]=4;
 }else{
  state.escapeZone={x:-10,y:-10};
  let baseBld=buildings[0]; // HQ is always first building
  let npcCount=rand(5,8);
  let insideCount=Math.ceil(npcCount*0.6);
  let outsideCount=npcCount-insideCount;
  for(let i=0;i<insideCount;i++){
   let nx=baseBld.x+rand(1,baseBld.w-2),ny=baseBld.y+rand(1,baseBld.h-2);
   state.npcs.push(makeNPC(nx,ny,'gun',false));
  }
  let lx=baseBld.x+Math.floor(baseBld.w/2),ly=baseBld.y+Math.floor(baseBld.h/2);
  let leader=makeNPC(lx,ly,'shotgun',true);
  state.npcs.push(leader);
  for(let i=0;i<outsideCount;i+=2){
   let px,py,tries=0;
   do{px=baseBld.x+rand(-4,baseBld.w+3);py=baseBld.y+rand(-4,baseBld.h+3);tries++}
   while((px<0||py<0||px>=MAP_W||py>=MAP_H||map[py][px]!==0||isInBuilding(px,py))&&tries<50);
   if(tries>=50)continue;
   let patrolId=Math.random();
   for(let g=0;g<2&&i+g<outsideCount;g++){
    let ox=px+rand(-1,1),oy=py+rand(-1,1);
    ox=Math.max(0,Math.min(MAP_W-1,ox));oy=Math.max(0,Math.min(MAP_H-1,oy));
    if(map[oy][ox]===1||map[oy][ox]===5){ox=px;oy=py}
    let npc=makeNPC(ox,oy,'gun',false);
    npc.patrolGroup=patrolId;npc.wanderAngle=Math.random()*Math.PI*2;npc.wanderTimer=rand(60,180);
    npc.patrolCenterX=baseBld.x+baseBld.w/2;npc.patrolCenterY=baseBld.y+baseBld.h/2;
    state.npcs.push(npc);
   }
  }
  let borderZ=rand(8,14);
  for(let i=0;i<borderZ;i++){
   let side=rand(0,3),x,y;
   if(side===0){x=rand(0,MAP_W-1);y=rand(0,2)}
   else if(side===1){x=rand(0,MAP_W-1);y=rand(MAP_H-3,MAP_H-1)}
   else if(side===2){x=rand(0,2);y=rand(0,MAP_H-1)}
   else{x=rand(MAP_W-3,MAP_W-1);y=rand(0,MAP_H-1)}
   if(map[y][x]===0){
    let z=makeZombie(x,y);
    z.wanderAngle=Math.random()*Math.PI*2;z.wanderTimer=rand(60,180);
    zombies.push(z);
   }
  }
  for(let i=0;i<rand(1,2);i++){
   let x,y,tries=0;
   do{x=rand(1,MAP_W-2);y=rand(1,MAP_H-2);tries++}while((map[y][x]!==0)&&tries<50);
   if(tries<50)state.barrels.push({x,y,fx:x,fy:y,hp:20,alive:true});
  }
 }
 rebuildSpatialMaps();
}
function spawnPlayerInBuilding(){
 if(!state.buildings.length)return;
 let b=state.buildings[0],p=state.player;
 p.x=b.x+Math.floor(b.w/2);p.y=b.y+Math.floor(b.h/2);
 p.fx=p.x;p.fy=p.y;b.searched=true;
}
function alertZombiesNear(px,py,radius){
 let playerInside=isInBuilding(fl(px),fl(py));
 for(let z of state.zombies){
  if(!z.alive||z.alerted)continue;
  if(distXY(px,py,z.fx,z.fy)>radius)continue;
  if(isWallBetween(px,py,z.fx,z.fy))continue;
  if(playerInside&&!isInBuilding(z.x,z.y))continue;
  z.alerted=true;z.alertDelay=60;z.jumpAnim=20;playSound('zombie_alert');
 }
}
function gunShotSpawnZombies(weaponName){
 if(state.tick-state.lastGunSpawnTick<GUNSHOT_SPAWN_COOLDOWN)return;
 let count=GUNSHOT_SPAWN_COUNT[weaponName]||0;
 if(count<=0)return;
 state.lastGunSpawnTick=state.tick;
 let cam=state.cam,s=TILE*state.scale;
 let camLeft=cam.x/s,camTop=cam.y/s;
 let camRight=camLeft+state.W/s,camBot=camTop+state.H/s;
 for(let i=0;i<count;i++){
  let side=rand(0,3),x,y;
  if(side===0){x=rand(Math.floor(camLeft),Math.floor(camRight));y=Math.max(0,Math.floor(camTop)-1)}
  else if(side===1){x=rand(Math.floor(camLeft),Math.floor(camRight));y=Math.min(MAP_H-1,Math.floor(camBot)+1)}
  else if(side===2){x=Math.max(0,Math.floor(camLeft)-1);y=rand(Math.floor(camTop),Math.floor(camBot))}
  else{x=Math.min(MAP_W-1,Math.floor(camRight)+1);y=rand(Math.floor(camTop),Math.floor(camBot))}
  x=Math.max(0,Math.min(MAP_W-1,x));y=Math.max(0,Math.min(MAP_H-1,y));
  let z=makeZombie(x,y);z.alerted=true;
  state.zombies.push(z);
 }
}
function getSpeedMult(entity){
 let m=1;
 if(entity.isAttacking)m*=0.05;
 if(entity.hitSlowTimer>0)m*=0.5;
 if(entity.postAttackSlow>0)m*=0.6;
 return m;
}
function zombieDrop(x,y){
 if(Math.random()<0.05){state.items.push({x,y,type:'weapon',name:Math.random()<0.5?'shotgun':'smg'});return}
 if(Math.random()>0.25)return;
 state.items.push({x,y,type:Math.random()<0.5?'bandage':'ammo'});
}
function canWalk(tx,ty){
 if(tx<0||ty<0||tx>=MAP_W||ty>=MAP_H)return false;
 let t=state.map[ty][tx];
 if(t===1||t===5||t===6)return false;
 if(t===3){let door=doorAt(tx,ty);if(door&&door.barricaded&&!door.open)return false}
 return true;
}
function explodeBarrel(barrel){
 let queue=[barrel];
 while(queue.length>0){
  let b=queue.shift();
  if(!b.alive)continue;
  b.alive=false;
  let bx=b.fx,by=b.fy;
  for(let z of state.zombies){
   if(!z.alive)continue;
   let d=distXY(bx,by,z.fx,z.fy);
   if(d<BARREL_EXPLOSION_RADIUS){
    let dmg=Math.max(1,Math.floor(BARREL_EXPLOSION_DMG*(1-d/BARREL_EXPLOSION_RADIUS)));
    z.hp-=dmg;z.alerted=true;z.alertDelay=0;z.hitSlowTimer=HIT_SLOW_DURATION;
    addFloater(z.fx,z.fy,'-'+dmg,'#f80');
    if(z.hp<=0){z.alive=false;zombieDrop(z.x,z.y);addXP(state.player,XP_PER_KILL);state.kills++}
   }
  }
  let pd=distXY(bx,by,state.player.fx,state.player.fy);
  if(pd<BARREL_EXPLOSION_RADIUS){
   let dmg=Math.max(1,Math.floor(BARREL_EXPLOSION_DMG*(1-pd/BARREL_EXPLOSION_RADIUS)));
   state.player.hp-=dmg;state.player.hitSlowTimer=HIT_SLOW_DURATION;
   addFloater(state.player.fx,state.player.fy,'-'+dmg,'#f44');
   if(state.player.hp<=0){state.gameOver=true;stopMusic();state.onDeath?.();emitChange()}
  }
  for(let ob of state.barrels){
   if(!ob.alive||ob===b)continue;
   if(distXY(bx,by,ob.fx,ob.fy)<BARREL_EXPLOSION_RADIUS)queue.push(ob);
  }
  alertZombiesNear(bx,by,GUNSHOT_ALERT_RADIUS);
  state.explosions.push({x:bx,y:by,timer:20});
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
 // Find closest zombie in arc
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
  if(Math.random()<hitChance){
   let dmg=Math.max(1,wep.dmg+p.atk+3-Math.floor(z.armor/3));
   z.hp-=dmg;z.alerted=true;z.alertDelay=0;z.hitSlowTimer=HIT_SLOW_DURATION;
   let ka=Math.atan2(z.fy-p.fy,z.fx-p.fx),kb=z.isBoss?0.2:0.5;
   let kx=z.fx+Math.cos(ka)*kb,ky=z.fy+Math.sin(ka)*kb;
   if(canWalk(fl(kx),fl(z.fy)))z.fx=kx;
   if(canWalk(fl(z.fx),fl(ky)))z.fy=ky;
   z.x=fl(z.fx);z.y=fl(z.fy);
   addFloater(z.fx,z.fy,'-'+dmg,'#fc0');
   if(z.hp<=0){
    z.alive=false;zombieDrop(z.x,z.y);state.kills++;
    addXP(p,z.isBoss?XP_PER_KILL*XP_BOSS_MULT:XP_PER_KILL);
    addFloater(z.fx,z.fy-0.5,'KILL','#f44');
   }
  }else{addFloater(z.fx,z.fy,'Rate','#888')}
 }
 for(let b of state.barrels){
  if(!b.alive)continue;
  let d=distXY(p.fx,p.fy,b.fx,b.fy);
  if(d<range){
   let toB=Math.atan2(b.fy-p.fy,b.fx-p.fx);
   let diff=Math.abs(toB-p.angle);if(diff>Math.PI)diff=2*Math.PI-diff;
   if(diff<arc/2){b.hp-=5;if(b.hp<=0)explodeBarrel(b)}
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
  if(t===3){let door=doorAt(sx,sy);if(door&&door.barricaded&&!door.open){bullet.hitDist=rd;break}}
  let px2=p.fx+0.5+adx*rd,py2=p.fy+0.5+ady*rd;
  let hitBarrel=state.barrels.find(b=>b.alive&&distXY(b.fx,b.fy,px2,py2)<0.8);
  if(hitBarrel){bullet.hitDist=rd;hitBarrel.hp-=10;if(hitBarrel.hp<=0)explodeBarrel(hitBarrel);return true}
  let hit=state.zombies.find(z=>z.alive&&distXY(z.fx,z.fy,px2,py2)<0.8);
  if(hit){
   bullet.hitDist=rd;
   let dmg=Math.max(1,wep.dmg+p.atk-Math.floor(hit.armor/3));
   hit.hp-=dmg;hit.hitSlowTimer=HIT_SLOW_DURATION;hit.alerted=true;
   addFloater(hit.fx,hit.fy,'-'+dmg,'#fc0');
   if(hit.hp<=0){
    hit.alive=false;zombieDrop(hit.x,hit.y);state.kills++;
    addXP(p,hit.isBoss?XP_PER_KILL*XP_BOSS_MULT:XP_PER_KILL);
    addFloater(hit.fx,hit.fy-0.5,'KILL','#f44');
   }
   return true;
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
   let spread=(Math.random()-0.5)*2*spreadAtDist;
   if(shootOneBullet(p,wep,p.angle+spread))anyHit=true;
  }
  if(!anyHit)addFloater(p.fx+Math.cos(p.angle)*2,p.fy+Math.sin(p.angle)*2,'Rate','#888');
 }else{
  let spread=(Math.random()-0.5)*2*spreadAtDist;
  if(!shootOneBullet(p,wep,p.angle+spread))addFloater(p.fx+Math.cos(p.angle)*2,p.fy+Math.sin(p.angle)*2,'Rate','#888');
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
 if(state.baseEvent&&!state.baseEventActive&&!state.baseRewardGiven){
  let leader=state.npcs.find(n=>n.alive&&n.isLeader);
  if(leader){let d=distXY(p.fx,p.fy,leader.fx,leader.fy);if(d<INTERACT_RANGE)candidates.push({type:'leader',dist:d})}
 }
 for(let door of state.doors){
  let d=distXY(door.x+0.5,door.y+0.5,p.fx,p.fy);
  if(d<INTERACT_RANGE&&door.barricaded)candidates.push({type:'door',label:door.open?'Fermer':'Ouvrir',dist:d});
  else if(d<INTERACT_RANGE&&!door.barricaded)candidates.push({type:'repair',mats:getMaterials(p),dist:d});
 }
 let item=findNearestInteractable(p);
 if(item)candidates.push({type:'item',item:item.item,dist:distXY(p.fx,p.fy,item.item.x+0.5,item.item.y+0.5)});
 if(!state.baseEvent||!state.baseEventActive){
  let d=distXY(p.fx,p.fy,state.escapeZone.x+0.5,state.escapeZone.y+0.5);
  if(d<INTERACT_RANGE)candidates.push({type:'escape',dist:d});
 }
 if(candidates.length===0)return null;
 candidates.sort((a,b)=>a.dist-b.dist);
 return candidates[0];
}
function updateNPC(npc){
 if(!npc.alive)return;
 // Retreat phase: run backward and shoot
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
  // Try to shoot while retreating
  let wep=WEAPONS[npc.weapon];
  if(wep&&!wep.melee&&npc.cooldown<=0){
   let nearZ=null,nnd=Infinity;
   for(let z of state.zombies){if(!z.alive)continue;let d=distXY(npc.fx,npc.fy,z.fx,z.fy);if(d<nnd){nearZ=z;nnd=d}}
   if(nearZ&&nnd<wep.range&&!isWallBetween(npc.fx,npc.fy,nearZ.fx,nearZ.fy)){
    npc.angle=Math.atan2(nearZ.fy-npc.fy,nearZ.fx-npc.fx);
    npc.cooldown=wep.cooldown;playSound(wep.name);
    let adx=Math.cos(npc.angle),ady=Math.sin(npc.angle);
    let npcBullet={x:npc.fx,y:npc.fy,angle:npc.angle,maxDist:wep.range,hitDist:wep.range,life:6};
    state.bullets.push(npcBullet);
    for(let i=1;i<wep.range;i++){
     let sx=Math.floor(npc.fx+0.5+adx*i),sy=Math.floor(npc.fy+0.5+ady*i);
     if(sx<0||sy<0||sx>=MAP_W||sy>=MAP_H){npcBullet.hitDist=i;break}
     let t=state.map[sy][sx];if(t===1||t===5||t===6){npcBullet.hitDist=i;break}
     let hit=state.zombies.find(z=>z.alive&&distXY(z.fx,z.fy,npc.fx+0.5+adx*i,npc.fy+0.5+ady*i)<0.9);
     if(hit){npcBullet.hitDist=i;let dmg=Math.max(1,wep.dmg+npc.atk);hit.hp-=dmg;hit.hitSlowTimer=HIT_SLOW_DURATION;hit.alerted=true;
      if(hit.hp<=0){hit.alive=false;zombieDrop(hit.x,hit.y);addXP(state.player,XP_PER_KILL);state.kills++}break}
    }
   }
  }
  if(npc.cooldown>0)npc.cooldown--;
  return;
 }
 let nearestZ=null,nd=Infinity;
 for(let z of state.zombies){
  if(!z.alive)continue;
  let d=distXY(npc.fx,npc.fy,z.fx,z.fy);
  if(d<nd){nearestZ=z;nd=d}
 }
 if(!nearestZ){npc._moving=false;return}
 npc.angle=Math.atan2(nearestZ.fy-npc.fy,nearestZ.fx-npc.fx);
 let wep=WEAPONS[npc.weapon];
 let range=wep?wep.range:2;
 if(nd>range*0.7){
  npc._moving=true;
  let spd=0.02+npc.speed*0.005;
  let adx=nearestZ.fx-npc.fx,ady=nearestZ.fy-npc.fy,len=Math.hypot(adx,ady)||1;
  npc.stuckTimer++;
  if(npc.stuckPerp===0&&npc.stuckTimer>=90){
   let movedDist=Math.hypot(npc.fx-npc.stuckOriginX,npc.fy-npc.stuckOriginY);
   if(movedDist<0.3){
    let pA={x:-ady/len,y:adx/len},pB={x:ady/len,y:-adx/len};
    let dA=Math.hypot(npc.fx+pA.x*2-nearestZ.fx,npc.fy+pA.y*2-nearestZ.fy);
    let dB=Math.hypot(npc.fx+pB.x*2-nearestZ.fx,npc.fy+pB.y*2-nearestZ.fy);
    npc.stuckPerp=dA<=dB?1:-1;npc.stuckPerpTimer=120;
   }
   npc.stuckOriginX=npc.fx;npc.stuckOriginY=npc.fy;npc.stuckTimer=0;
  }
  if(npc.stuckPerp!==0){
   npc.stuckPerpTimer--;
   if(npc.stuckPerpTimer<=0){
    let testX=npc.fx+adx/len*0.5,testY=npc.fy+ady/len*0.5;
    if(canWalk(fl(testX),fl(testY))){npc.stuckPerp=0}
    else{npc.stuckPerpTimer=60}
   }
   if(npc.stuckPerp!==0){let dx0=adx/len,dy0=ady/len;adx=-dy0*npc.stuckPerp;ady=dx0*npc.stuckPerp;len=1}
  }
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
  // NPC opens barricaded doors in the way
  if(!nCanX||!nCanY){
   let checkTx=fl(nx),checkTy=fl(ny);
   if(!nCanX){let bd=doorAt(checkTx,fl(npc.fy));if(bd&&bd.barricaded&&!bd.open){bd.open=true}}
   if(!nCanY){let bd=doorAt(fl(npc.fx),checkTy);if(bd&&bd.barricaded&&!bd.open){bd.open=true}}
  }
  npc.x=fl(npc.fx);npc.y=fl(npc.fy);
 }else{npc._moving=false}
 if(npc.cooldown>0){npc.cooldown--;return}
 if(nd<1.5&&!isWallBetween(npc.fx,npc.fy,nearestZ.fx,nearestZ.fy)){
  npc.cooldown=20;
  if(Math.random()*10<npc.precision+2){
   let dmg=Math.max(1,3+npc.atk);
   nearestZ.hp-=dmg;nearestZ.alerted=true;nearestZ.hitSlowTimer=HIT_SLOW_DURATION;
   addFloater(nearestZ.fx,nearestZ.fy,'-'+dmg,'#0af');
   // Knockback zombie
   let ka=Math.atan2(nearestZ.fy-npc.fy,nearestZ.fx-npc.fx),kb=0.4;
   let kx=nearestZ.fx+Math.cos(ka)*kb,ky=nearestZ.fy+Math.sin(ka)*kb;
   if(canWalk(fl(kx),fl(nearestZ.fy)))nearestZ.fx=kx;
   if(canWalk(fl(nearestZ.fx),fl(ky)))nearestZ.fy=ky;
   nearestZ.x=fl(nearestZ.fx);nearestZ.y=fl(nearestZ.fy);
   if(nearestZ.hp<=0){nearestZ.alive=false;zombieDrop(nearestZ.x,nearestZ.y);addXP(state.player,XP_PER_KILL);state.kills++}
  }
  // NPC retreats after melee hit
  npc.retreatAngle=Math.atan2(npc.fy-nearestZ.fy,npc.fx-nearestZ.fx);
  npc.retreatTimer=60;
 }else if(wep&&wep.melee&&nd<wep.range&&!isWallBetween(npc.fx,npc.fy,nearestZ.fx,nearestZ.fy)){
  npc.cooldown=wep.cooldown;
  if(Math.random()*10<npc.precision+2){
   let dmg=Math.max(1,wep.dmg+npc.atk);
   nearestZ.hp-=dmg;nearestZ.alerted=true;nearestZ.hitSlowTimer=HIT_SLOW_DURATION;
   let ka=Math.atan2(nearestZ.fy-npc.fy,nearestZ.fx-npc.fx),kb=0.5;
   let kx=nearestZ.fx+Math.cos(ka)*kb,ky=nearestZ.fy+Math.sin(ka)*kb;
   if(canWalk(fl(kx),fl(nearestZ.fy)))nearestZ.fx=kx;
   if(canWalk(fl(nearestZ.fx),fl(ky)))nearestZ.fy=ky;
   nearestZ.x=fl(nearestZ.fx);nearestZ.y=fl(nearestZ.fy);
   if(nearestZ.hp<=0){nearestZ.alive=false;zombieDrop(nearestZ.x,nearestZ.y);addXP(state.player,XP_PER_KILL);state.kills++}
  }
  npc.retreatAngle=Math.atan2(npc.fy-nearestZ.fy,npc.fx-nearestZ.fx);
  npc.retreatTimer=60;
 }else if(wep&&!wep.melee&&nd<wep.range&&!isWallBetween(npc.fx,npc.fy,nearestZ.fx,nearestZ.fy)){
  npc.cooldown=wep.cooldown;playSound(wep.name);
  let adx=Math.cos(npc.angle),ady=Math.sin(npc.angle);
  let npcBullet={x:npc.fx,y:npc.fy,angle:npc.angle,maxDist:wep.range,hitDist:wep.range,life:6};
  state.bullets.push(npcBullet);
  for(let i=1;i<wep.range;i++){
   let sx=Math.floor(npc.fx+0.5+adx*i),sy=Math.floor(npc.fy+0.5+ady*i);
   if(sx<0||sy<0||sx>=MAP_W||sy>=MAP_H){npcBullet.hitDist=i;break}
   let t=state.map[sy][sx];if(t===1||t===5||t===6){npcBullet.hitDist=i;break}
   let hit=state.zombies.find(z=>z.alive&&distXY(z.fx,z.fy,npc.fx+0.5+adx*i,npc.fy+0.5+ady*i)<0.9);
   if(hit){
    npcBullet.hitDist=i;
    let dmg=Math.max(1,wep.dmg+npc.atk);
    hit.hp-=dmg;hit.hitSlowTimer=HIT_SLOW_DURATION;hit.alerted=true;
    if(hit.hp<=0){hit.alive=false;zombieDrop(hit.x,hit.y);addXP(state.player,XP_PER_KILL);state.kills++}
    break;
   }
  }
 }
}
function bossThrowRock(boss,target){
 boss.throwCooldown=180;
 let angle=Math.atan2(target.fy-boss.fy,target.fx-boss.fx);
 state.rockWarnings.push({fx:boss.fx,fy:boss.fy,angle,timer:45,boss});
}
function launchRock(w){
 let lv=getBossLevel();
 state.rocks.push({fx:w.fx,fy:w.fy,angle:w.angle,spd:0.25,dmg:30+lv*5+rand(0,15),life:80,active:true});
}
const HORDE_TOTAL=50,HORDE_WAVES=4;
function startBaseAssault(){
 state.baseEventActive=true;
 state.baseWavesLeft=HORDE_WAVES;
 state.baseWaveTimer=0;
 state.hordeSpawned=0;
 // Assign defense posts around base (outside, spread out)
 let b=state.buildings[0];
 let baseDoors=state.doors.filter(d=>d.building===b);
 let posts=[];
 let cx=b.x+b.w/2,cy=b.y+b.h/2;
 // Posts outside each door (3-5 tiles out)
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
 // Spread remaining posts around the perimeter
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
 for(let i=0;i<state.npcs.length;i++){
  let n=state.npcs[i];
  n.defenseX=posts[i%posts.length].x;n.defenseY=posts[i%posts.length].y;n.defenseReached=false;
 }
 // Open all base doors so NPCs can move freely
 for(let d of baseDoors){if(d.barricaded)d.open=true}
 msg('ALERTE! Les zombies attaquent la base!',3000);
 spawnAssaultWave();
}
function spawnAssaultWave(){
 let remaining=HORDE_TOTAL-state.hordeSpawned;
 let isLastWave=state.baseWavesLeft<=1;
 let count=isLastWave?remaining:Math.ceil(remaining/state.baseWavesLeft)+rand(-2,2);
 count=Math.max(5,Math.min(count,remaining));
 for(let i=0;i<count;i++){
  let side=rand(0,3);
  let x,y;
  if(side===0){x=rand(0,MAP_W-1);y=0}
  else if(side===1){x=rand(0,MAP_W-1);y=MAP_H-1}
  else if(side===2){x=0;y=rand(0,MAP_H-1)}
  else{x=MAP_W-1;y=rand(0,MAP_H-1)}
  let z=makeZombie(x,y);z.alerted=true;
  state.zombies.push(z);
 }
 state.hordeSpawned+=count;
 if(isLastWave){
  let side=rand(0,3);
  let bx,by;
  if(side===0){bx=rand(5,MAP_W-5);by=0}
  else if(side===1){bx=rand(5,MAP_W-5);by=MAP_H-1}
  else if(side===2){bx=0;by=rand(5,MAP_H-5)}
  else{bx=MAP_W-1;by=rand(5,MAP_H-5)}
  let boss=makeBossZombie(bx,by);
  state.zombies.push(boss);
  state.baseBoss=boss;
  msg('BOSS ZOMBIE approche!',3000);
 }
}
export function update(){
 if(state.gameOver)return;
 state.tick++;
 let p=state.player,{keys}=state;
 if(p.hitSlowTimer>0)p.hitSlowTimer--;
 if(p.postAttackSlow>0)p.postAttackSlow--;
 if(p.swingTimer>0)p.swingTimer--;
 if(p.cooldown>0){p.cooldown--;p.isAttacking=true}
 else{p.isAttacking=false}
 if(p.smgHeat>0)p.smgHeat=Math.max(0,p.smgHeat-SMG_HEAT_DECAY);
 let s=TILE*state.scale;
 let pwx=p.fx*s-state.cam.x,pwy=p.fy*s-state.cam.y;
 p.angle=Math.atan2(state.mouseY-pwy-s/2,state.mouseX-pwx-s/2);
 let dx=0,dy=0;
 if(keys.ArrowUp||keys.KeyW||keys.KeyZ)dy=-1;
 if(keys.ArrowDown||keys.KeyS)dy=1;
 if(keys.ArrowLeft||keys.KeyA||keys.KeyQ)dx=-1;
 if(keys.ArrowRight||keys.KeyD)dx=1;
 if(dx||dy){
  let rawSpd=Math.min(p.speed,20);
  let spd=(0.05+rawSpd*0.01)*getSpeedMult(p);
  // -25% speed when not looking in movement direction
  let moveAngle=Math.atan2(dy,dx);
  let angleDiff=Math.abs(moveAngle-p.angle);if(angleDiff>Math.PI)angleDiff=2*Math.PI-angleDiff;
  if(angleDiff>Math.PI/2)spd*=0.5;
  let nx=p.fx+dx*spd,ny=p.fy+dy*spd;
  if(canWalk(Math.floor(nx+(dx>0?0.4:-0.4)+0.5),fl(p.fy)))p.fx=nx;
  if(canWalk(fl(p.fx),Math.floor(ny+(dy>0?0.4:-0.4)+0.5)))p.fy=ny;
  p.fx=clamp(p.fx,0,MAP_W-1);p.fy=clamp(p.fy,0,MAP_H-1);
  p.x=fl(p.fx);p.y=fl(p.fy);
 }
 let sel=p.inventory[p.selectedSlot];
 let wep=getWeaponDef(sel);
 if(wep&&wep.name==='smg'){
  if(state.mouseDown&&p.cooldown<=0){
   if(p.ammo>0){shootAttack(p);p.ammo--;p.swingTimer=6;p.smgHeat=Math.min(1,p.smgHeat+SMG_HEAT_PER_SHOT)}
   else msg('Plus de munitions!');
  }
 }else{
  if(state.mouseDown&&!state.attackPressed&&p.cooldown<=0){
   state.attackPressed=true;
   if(wep){
    if(wep.melee){meleeAttack(p);p.swingTimer=p.cooldown;p.swingDuration=p.cooldown}
    else{if(p.ammo>0){shootAttack(p);p.ammo--}else msg('Plus de munitions!')}
   }else msg('Selectionnez une arme (1-5)');
  }
 }
 if(!state.mouseDown)state.attackPressed=false;
 if(keys.KeyE){
  if(!state.holdingE){
   state.holdingE=true;state.holdETimer=0;
   let didInteract=false;
   if(state.baseEvent&&!state.baseEventActive&&!state.baseRewardGiven){
    let leader=state.npcs.find(n=>n.alive&&n.isLeader);
    if(leader&&distXY(p.fx,p.fy,leader.fx,leader.fy)<INTERACT_RANGE){
     startBaseAssault();didInteract=true;
    }
   }
   if(!didInteract){
    let door=state.doors.find(d=>distXY(d.x+0.5,d.y+0.5,p.fx,p.fy)<INTERACT_RANGE&&d.barricaded);
    if(door){door.open=!door.open;playSound('door');msg(door.open?'Porte ouverte':'Porte fermee');didInteract=true}
   }
   if(!didInteract){
    let found=findNearestInteractable(p);
    if(found&&found.kind==='item'){
     let it=found.item,idx=found.index;
     if(it.type==='weapon'){
      let existing=p.inventory.find(i=>i&&i.type==='weapon'&&i.name===it.name);
      if(existing){p.ammo+=10;msg('Munitions +10 (total:'+p.ammo+')');state.items.splice(idx,1)}
      else{let slot=p.inventory.findIndex(i=>i===null);
       if(slot>=0){p.inventory[slot]={type:'weapon',name:it.name,ammo:0};msg((WEAPONS[it.name]?.label||it.name)+'! (slot '+(slot+1)+')');state.items.splice(idx,1)}
       else msg('Inventaire plein!')}
      didInteract=true;
     }else if(it.type==='ammo'){p.ammo+=20;msg('Munitions +20 (total:'+p.ammo+')');state.items.splice(idx,1);didInteract=true}
     else if(it.type==='bandage'){
      if(p.hp<p.maxHp){let heal=Math.min(15,p.maxHp-p.hp);p.hp+=heal;msg('Bandage! +'+heal+' PV');addFloater(p.fx,p.fy,'+'+heal,'#4f4');state.items.splice(idx,1)}
      else msg('PV au max!');didInteract=true;
     }else if(it.type==='material'){
      if(addMaterial(p,1)){msg('Materiaux +1 (total:'+getMaterials(p)+')');state.items.splice(idx,1)}
      else msg('Inventaire plein!');didInteract=true;
     }
    }
   }
   if(!didInteract){
    let udoor=state.doors.find(d=>distXY(d.x+0.5,d.y+0.5,p.fx,p.fy)<INTERACT_RANGE&&!d.barricaded);
    if(udoor&&getMaterials(p)>=3){removeMaterial(p,3);udoor.barricaded=true;udoor.open=false;msg('Porte reparee! (E pour ouvrir/fermer)')}
    else if(udoor&&getMaterials(p)<3){msg('Il faut 3 materiaux ('+getMaterials(p)+'/3)')}
   }
   if(!state.baseEvent||!state.baseEventActive){
    if(distXY(p.fx,p.fy,state.escapeZone.x+0.5,state.escapeZone.y+0.5)<INTERACT_RANGE){nextMap();return}
   }
   let bld=getBuildingAt(p.x,p.y);if(bld)bld.searched=true;
  }
  state.holdETimer++;
  if(state.holdETimer>10){
   if(!state.draggingBarrel){
    let nearest=null,nd=Infinity;
    for(let b of state.barrels){if(!b.alive)continue;let d=distXY(p.fx,p.fy,b.fx,b.fy);if(d<INTERACT_RANGE&&d<nd){nearest=b;nd=d}}
    if(nearest)state.draggingBarrel=nearest;
   }
   if(state.draggingBarrel&&state.draggingBarrel.alive){
    let b=state.draggingBarrel;
    let tx=p.fx+Math.cos(p.angle)*1.5,ty=p.fy+Math.sin(p.angle)*1.5;
    let bdx=tx-b.fx,bdy=ty-b.fy,blen=Math.hypot(bdx,bdy)||1;
    let nbx=b.fx+bdx/blen*0.05,nby=b.fy+bdy/blen*0.05;
    if(canWalk(fl(nbx),fl(nby))){b.fx=nbx;b.fy=nby;b.x=fl(nbx);b.y=fl(nby)}
   }
  }
 }else{if(state.holdingE){state.holdingE=false;state.holdETimer=0;state.draggingBarrel=null}}
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
 let playerInside=isInBuilding(p.x,p.y);
 if(playerInside){let bld=getBuildingAt(p.x,p.y);if(bld&&!bld.searched){bld.searched=true;addXP(p,5);addFloater(p.fx,p.fy,'+5 XP','#0f0')}}
 let targets=[{x:p.fx,y:p.fy,fx:p.fx,fy:p.fy,isPlayer:true,hp:p.hp}];
 for(let n of state.npcs){if(n.alive)targets.push({x:n.fx,y:n.fy,fx:n.fx,fy:n.fy,isNPC:true,npc:n,hp:n.hp,isLeader:n.isLeader})}
 for(let z of state.zombies){
  if(!z.alive)continue;
  // Fix wall clip: push zombie out if stuck in unwalkable tile
  if(!canWalk(fl(z.fx),fl(z.fy))){
   for(let r=1;r<=2;r++)for(let ddx=-r;ddx<=r;ddx++)for(let ddy=-r;ddy<=r;ddy++){
    let tx=fl(z.fx)+ddx,ty=fl(z.fy)+ddy;
    if(canWalk(tx,ty)){z.fx=tx;z.fy=ty;z.x=tx;z.y=ty;r=3;break}
   }
  }
  if(z.cooldown>0)z.cooldown--;
  if(z.hitSlowTimer>0)z.hitSlowTimer--;
  if(z.postAttackSlow>0)z.postAttackSlow--;
  if(z.speechTimer>0)z.speechTimer--;else{z.speech=null;if(Math.random()<0.001){z.speech=ZOMBIE_GROANS[rand(0,ZOMBIE_GROANS.length-1)];z.speechTimer=90}}
  if(z.atkTimer>0){z.atkTimer--;z.isAttacking=true}
  else{if(z.isAttacking){z.postAttackSlow=POST_ATTACK_SLOW_DURATION}z.isAttacking=false}
  let bestTarget=null,bestDist=Infinity;
  for(let t of targets){
   let d=distXY(z.fx,z.fy,t.x,t.y);
   let weight=t.isLeader?0.5:1;
   if(d*weight<bestDist){bestTarget=t;bestDist=d*weight}
  }
  let actualDist=bestTarget?distXY(z.fx,z.fy,bestTarget.x,bestTarget.y):Infinity;
  if(!z.alerted&&actualDist<=SIGHT_RADIUS){
   if(!isWallBetween(z.fx,z.fy,bestTarget.fx,bestTarget.fy)){z.alerted=true;z.alertDelay=60;z.jumpAnim=20;playSound('zombie_alert')}
  }
  if(z.alertDelay>0){z.alertDelay--;z.jumpAnim=Math.max(0,z.jumpAnim-1)}
  if(!z.alerted){
   if(z.wanderTimer!==undefined){
    z.wanderTimer--;
    if(z.wanderTimer<=0){z.wanderAngle=Math.random()*Math.PI*2;z.wanderTimer=rand(60,180)}
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
      else{z.wanderAngle=Math.random()*Math.PI*2}
     }
    }
    z.x=fl(z.fx);z.y=fl(z.fy);
    z.angle=z.wanderAngle;
   }
  }
  if(z.alerted&&z.alertDelay<=0&&bestTarget&&actualDist<30){
   z.angle=Math.atan2(bestTarget.fy-z.fy,bestTarget.fx-z.fx);
   let zspd=(0.02+z.speed*0.008)*getSpeedMult(z);
   let adx=bestTarget.fx-z.fx,ady=bestTarget.fy-z.fy,len=Math.hypot(adx,ady)||1;
   z.stuckTimer++;
   if(z.stuckPerp===0&&z.stuckTimer>=90){
    let movedDist=Math.hypot(z.fx-z.stuckOriginX,z.fy-z.stuckOriginY);
    if(movedDist<0.3){
     let pA={x:-ady/len,y:adx/len},pB={x:ady/len,y:-adx/len};
     let tA=z.fx+pA.x*2,tAy=z.fy+pA.y*2,tB=z.fx+pB.x*2,tBy=z.fy+pB.y*2;
     let dA=Math.hypot(tA-bestTarget.fx,tAy-bestTarget.fy);
     let dB=Math.hypot(tB-bestTarget.fx,tBy-bestTarget.fy);
     z.stuckPerp=dA<=dB?1:-1;z.stuckPerpTimer=120;
    }
    z.stuckOriginX=z.fx;z.stuckOriginY=z.fy;z.stuckTimer=0;
   }
   if(z.stuckPerp!==0){
    z.stuckPerpTimer--;
    if(z.stuckPerpTimer<=0){
     let testX=z.fx+adx/len*0.5,testY=z.fy+ady/len*0.5;
     if(canWalk(fl(testX),fl(testY))&&zombieCanEnter(fl(testX),fl(testY),true)){z.stuckPerp=0}
     else{z.stuckPerpTimer=60}
    }
    if(z.stuckPerp!==0){let dx0=adx/len,dy0=ady/len;adx=-dy0*z.stuckPerp;ady=dx0*z.stuckPerp;len=1}
   }
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
   }
   z.x=fl(z.fx);z.y=fl(z.fy);
   if(actualDist<ZOMBIE_ATK_RANGE&&z.cooldown<=0&&!isWallBetween(z.fx,z.fy,bestTarget.fx,bestTarget.fy)){
    z.cooldown=z.atkCooldown;z.atkTimer=z.atkDuration;playSound('zombie_hit');
    if(Math.random()*10<z.precision){
     let dmg=Math.max(1,BASE_DMG_ZOMBIE+Math.floor(z.atk/3));
     let ka=Math.atan2(bestTarget.y-z.fy,bestTarget.x-z.fx),kb=z.isBoss?0.6:0.35;
     if(bestTarget.isPlayer){
      dmg=Math.max(1,dmg-Math.floor(p.armor/2));
      p.hp-=dmg;p.hitSlowTimer=HIT_SLOW_DURATION;
      let kx=p.fx+Math.cos(ka)*kb,ky=p.fy+Math.sin(ka)*kb;
      if(canWalk(fl(kx),fl(p.fy)))p.fx=kx;
      if(canWalk(fl(p.fx),fl(ky)))p.fy=ky;
      p.x=fl(p.fx);p.y=fl(p.fy);
      addFloater(p.fx,p.fy,'-'+dmg,'#f44');
      if(p.hp<=0){state.gameOver=true;stopMusic();state.onDeath?.();emitChange()}
     }else if(bestTarget.isNPC){
      let n=bestTarget.npc;
      n.hp-=dmg;
      let kx=n.fx+Math.cos(ka)*kb,ky=n.fy+Math.sin(ka)*kb;
      if(canWalk(fl(kx),fl(n.fy)))n.fx=kx;
      if(canWalk(fl(n.fx),fl(ky)))n.fy=ky;
      n.x=fl(n.fx);n.y=fl(n.fy);
      addFloater(n.fx,n.fy,'-'+dmg,'#f44');
      if(n.hp<=0){n.alive=false;msg(n.isLeader?'Le chef est mort!':'Un survivant est mort!')}
     }
    }
   }
  }
  if(z.isBoss&&z.alive){
   if(z.throwCooldown>0)z.throwCooldown--;
   if(z.throwCooldown<=0&&actualDist<20){
    let rockTarget=state.npcs.find(n=>n.alive&&n.isLeader)||{fx:p.fx,fy:p.fy};
    bossThrowRock(z,rockTarget);
   }
  }
 }
 if(state.tick%ZOMBIE_CLEANUP_INTERVAL===0){
  state.zombies=state.zombies.filter(z=>z.alive);
 }
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
   state.explosions.push({x:r.fx,y:r.fy,timer:10});state.rocks.splice(i,1);continue;
  }
  let blockedDoor=doorAt(tx,ty);
  if(blockedDoor&&blockedDoor.barricaded&&!blockedDoor.open){
   if(blockedDoor.doorHp!==undefined){blockedDoor.doorHp--;if(blockedDoor.doorHp<=0){blockedDoor.barricaded=false;blockedDoor.open=true;msg('Une porte a ete defoncee!')}}
   state.explosions.push({x:r.fx,y:r.fy,timer:10});state.rocks.splice(i,1);continue;
  }
  r.fx=nx;r.fy=ny;
  if(distXY(r.fx,r.fy,p.fx,p.fy)<0.8){
   let dmg=Math.max(1,r.dmg-Math.floor(p.armor/3));p.hp-=dmg;p.hitSlowTimer=HIT_SLOW_DURATION;
   addFloater(p.fx,p.fy,'-'+dmg,'#f80');
   if(p.hp<=0){state.gameOver=true;stopMusic();state.onDeath?.();emitChange()}
   state.explosions.push({x:r.fx,y:r.fy,timer:10});state.rocks.splice(i,1);continue;
  }
  for(let n of state.npcs){
   if(!n.alive)continue;
   if(distXY(r.fx,r.fy,n.fx,n.fy)<0.8){
    n.hp-=r.dmg;if(n.hp<=0){n.alive=false;msg(n.isLeader?'Le chef est touche!':'Survivant touche!')}
    addFloater(n.fx,n.fy,'-'+r.dmg,'#f80');
    state.explosions.push({x:r.fx,y:r.fy,timer:10});state.rocks.splice(i,1);break;
   }
  }
 }
 if(state.baseEvent){
  for(let n of state.npcs){
   if(!n.alive)continue;
   if(n.speechTimer>0)n.speechTimer--;else{n.speech=null;if(Math.random()<0.0008){n.speech=NPC_DIALOGUES[rand(0,NPC_DIALOGUES.length-1)];n.speechTimer=150}}
   if(!state.baseEventActive&&n.patrolGroup!==undefined){
    let nearestZ=null,nd=Infinity;
    for(let z of state.zombies){if(!z.alive)continue;let d=distXY(n.fx,n.fy,z.fx,z.fy);if(d<SIGHT_RADIUS&&d<nd){nearestZ=z;nd=d}}
    if(nearestZ){updateNPC(n)}
    else{
     n.wanderTimer--;
     if(n.wanderTimer<=0){n.wanderAngle=Math.random()*Math.PI*2;n.wanderTimer=rand(60,160)}
     let wspd=0.018;
     let wnx=n.fx+Math.cos(n.wanderAngle)*wspd,wny=n.fy+Math.sin(n.wanderAngle)*wspd;
     let dToCenter=Math.hypot(wnx-n.patrolCenterX,wny-n.patrolCenterY);
     if(dToCenter>18){n.wanderAngle=Math.atan2(n.patrolCenterY-n.fy,n.patrolCenterX-n.fx)+((Math.random()-0.5)*1)}
     if(canWalk(fl(wnx),fl(wny))){n.fx=wnx;n.fy=wny;n._moving=true}
     else{n.wanderAngle=Math.random()*Math.PI*2;n._moving=false}
     n.x=fl(n.fx);n.y=fl(n.fy);
     n.angle=n.wanderAngle;
    }
   }else{
    // Horde active: NPCs go to defense post, fight only if zombie nearby
    let nearestZ=null,nd=Infinity;
    for(let z of state.zombies){if(!z.alive)continue;let d=distXY(n.fx,n.fy,z.fx,z.fy);if(d<SIGHT_RADIUS*1.2&&d<nd){nearestZ=z;nd=d}}
    if(nearestZ){updateNPC(n)}
    else if(n.defenseX!==undefined){
     let dPost=distXY(n.fx,n.fy,n.defenseX,n.defenseY);
     if(dPost>0.5){
      let spd=0.02+n.speed*0.005;
      let adx=n.defenseX-n.fx,ady=n.defenseY-n.fy,len=Math.hypot(adx,ady)||1;
      let nx2=n.fx+adx/len*spd,ny2=n.fy+ady/len*spd;
      let dCanX=canWalk(fl(nx2),fl(n.fy)),dCanY=canWalk(fl(n.fx),fl(ny2));
      if(dCanX)n.fx=nx2;
      if(dCanY)n.fy=ny2;
      if(!dCanX){let bd=doorAt(fl(nx2),fl(n.fy));if(bd&&bd.barricaded&&!bd.open)bd.open=true}
      if(!dCanY){let bd=doorAt(fl(n.fx),fl(ny2));if(bd&&bd.barricaded&&!bd.open)bd.open=true}
      n.x=fl(n.fx);n.y=fl(n.fy);n._moving=true;
      n.angle=Math.atan2(ady,adx);
     }else{n._moving=false;n.defenseReached=true}
    }else{n._moving=false}
   }
  }
 }
 if(state.baseEventActive){
  let aliveZ=0;for(let z of state.zombies)if(z.alive)aliveZ++;
  state.hordeAlive=aliveZ;
  if(aliveZ===0&&state.baseWavesLeft>0){
   state.baseWaveTimer++;
   if(state.baseWaveTimer>120){
    state.baseWavesLeft--;state.baseWaveTimer=0;
    if(state.baseWavesLeft>0){
     spawnAssaultWave();
     let waveNum=HORDE_WAVES-state.baseWavesLeft;
     msg('Vague '+waveNum+'/'+HORDE_WAVES+'! ('+state.hordeSpawned+'/'+HORDE_TOTAL+')',2000);
    }else{
     spawnAssaultWave();msg('Derniere vague! BOSS!',3000);
    }
   }
  }
  if(state.baseBoss&&!state.baseBoss.alive&&!state.baseRewardGiven){
   for(let z of state.zombies){if(z.alive&&!z.isBoss){z.alive=false;state.kills++}}
   state.baseWavesLeft=0;
  }
  if(state.baseWavesLeft<=0&&(aliveZ===0||(state.baseBoss&&!state.baseBoss.alive))&&!state.baseRewardGiven){
   state.baseRewardGiven=true;
   let survivors=0;for(let n of state.npcs)if(n.alive)survivors++;
   let confColors=['#f44','#4f4','#44f','#ff0','#f0f','#0ff','#fa0'];
   for(let i=0;i<80;i++){
    state.confetti.push({x:p.fx,y:p.fy,vx:(Math.random()-0.5)*0.15,vy:-Math.random()*0.12-0.03,
     color:confColors[rand(0,6)],life:120+rand(0,60)});
   }
   for(let n of state.npcs){if(n.alive){n.speech=n.isLeader?'Tout est sous controle':'Victoire!!';n.speechTimer=300}}
   if(survivors>0){
    let rx=fl(p.fx),ry=fl(p.fy);
    let dropNear=(item)=>{for(let dr=1;dr<=3;dr++)for(let ddx=-dr;ddx<=dr;ddx++)for(let ddy=-dr;ddy<=dr;ddy++){
     let tx=rx+ddx,ty=ry+ddy;let t=tx>=0&&ty>=0&&tx<MAP_W&&ty<MAP_H?state.map[ty][tx]:-1;
     if((t===0||t===2)&&!state.items.find(it=>it.x===tx&&it.y===ty)){state.items.push({...item,x:tx,y:ty});return}}};
    dropNear({type:'weapon',name:Math.random()<0.5?'shotgun':'smg'});
    dropNear({type:'ammo'});
    msg('Base sauvee! '+survivors+' survivant(s)! Recompense au sol!',4000);
   }else{
    msg('Tous les survivants sont morts... Base perdue.',4000);
   }
   let ex,ey,tries=0;
   do{ex=rand(0,MAP_W-1);ey=rand(0,MAP_H-1);tries++}while(state.map[ey][ex]!==0&&tries<200);
   state.escapeZone={x:ex,y:ey};state.map[ey][ex]=4;
   state.baseEventActive=false;
   // NPCs stay where they are after horde
   for(let n of state.npcs){if(n.alive&&n.patrolGroup!==undefined){n.patrolCenterX=n.fx;n.patrolCenterY=n.fy}}
  }
 }
 state.showStats=!!keys.Tab;
 if(state.firstGame&&state.tick<300)state.showControls=true;
 else if(!keys.Tab)state.showControls=false;
 if(keys.Tab)state.showControls=true;
 emitChange();
}
export function draw(){
 let{ctx,player:p,cam}=state;
 let s=TILE*state.scale;
 ctx.fillStyle='#0a0a0a';ctx.fillRect(0,0,state.W,state.H);
 cam.x=p.fx*s-state.W/2+s/2;cam.y=p.fy*s-state.H/2+s/2;
 ctx.save();ctx.translate(-cam.x,-cam.y);
 let x0=Math.max(0,Math.floor(cam.x/s)-1),x1=Math.min(MAP_W,Math.ceil((cam.x+state.W)/s)+1);
 let y0=Math.max(0,Math.floor(cam.y/s)-1),y1=Math.min(MAP_H,Math.ceil((cam.y+state.H)/s)+1);
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  let t=state.map[y][x];
  if(t===0){
   ctx.fillStyle=((x+y)%2===0)?COLORS.grass:COLORS.grassAlt;ctx.fillRect(x*s,y*s,s,s);
   if((x*7+y*13)%5===0){ctx.fillStyle=COLORS.grassDetail;ctx.fillRect(x*s+s*0.3,y*s+s*0.4,s*0.08,s*0.2)}
   if((x*11+y*3)%7===0){ctx.fillStyle=COLORS.grassDetail;ctx.fillRect(x*s+s*0.6,y*s+s*0.2,s*0.06,s*0.15)}
  }
  else if(t===1){
   let bld=getBuildingOwner(x,y);
   let side=bld?getWallSide(bld,x,y):null;
   ctx.fillStyle=COLORS.wallInner;ctx.fillRect(x*s,y*s,s,s);
   if(side==='tl'){
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s,s,s*0.4);
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s,s*0.4,s);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s,s,s*0.06);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s,s*0.06,s);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s+s*0.85,y*s+s*0.4,s*0.15,s*0.6);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s+s*0.4,y*s+s*0.85,s*0.6,s*0.15);
   }else if(side==='tr'){
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s,s,s*0.4);
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s+s*0.6,y*s,s*0.4,s);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s,s,s*0.06);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s+s*0.94,y*s,s*0.06,s);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s,y*s+s*0.4,s*0.15,s*0.6);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s,y*s+s*0.85,s*0.6,s*0.15);
   }else if(side==='bl'){
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s+s*0.6,s,s*0.4);
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s,s*0.4,s);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s+s*0.94,s,s*0.06);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s,s*0.06,s);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s+s*0.85,y*s,s*0.15,s*0.6);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s+s*0.4,y*s,s*0.6,s*0.15);
   }else if(side==='br'){
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s+s*0.6,s,s*0.4);
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s+s*0.6,y*s,s*0.4,s);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s+s*0.94,s,s*0.06);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s+s*0.94,y*s,s*0.06,s);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s,y*s,s*0.15,s*0.6);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s,y*s,s*0.6,s*0.15);
   }else if(side==='top'){
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s,s,s*0.4);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s,s,s*0.06);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s,y*s+s*0.85,s,s*0.15);
   }else if(side==='bottom'){
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s+s*0.6,s,s*0.4);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s+s*0.94,s,s*0.06);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s,y*s,s,s*0.15);
   }else if(side==='left'){
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s,s*0.4,s);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s,s*0.06,s);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s+s*0.85,y*s,s*0.15,s);
   }else if(side==='right'){
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s+s*0.6,y*s,s*0.4,s);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s+s*0.94,y*s,s*0.06,s);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s,y*s,s*0.15,s);
   }else{
    ctx.fillStyle=COLORS.wall;ctx.fillRect(x*s,y*s,s,s);
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s,s,s*0.3);
   }
   ctx.fillStyle='rgba(0,0,0,0.06)';
   ctx.fillRect(x*s,y*s+s*0.5,s*0.5,s*0.02);
   ctx.fillRect(x*s+s*0.25,y*s+s*0.7,s*0.5,s*0.02);
   continue;
  }else if(t===2){
   let bld=getBuildingAt(x,y);
   if(bld&&!bld.searched){ctx.fillStyle='#252525';ctx.fillRect(x*s,y*s,s,s);continue}
   ctx.fillStyle=COLORS.floor;ctx.fillRect(x*s,y*s,s,s);
   ctx.strokeStyle='rgba(255,255,255,0.03)';ctx.lineWidth=1;ctx.strokeRect(x*s+1,y*s+1,s-2,s-2);
   continue;
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
   continue;
  }else if(t===5){
   ctx.fillStyle=COLORS.cityWall;ctx.fillRect(x*s,y*s,s,s);
   ctx.fillStyle=COLORS.cityWallTop;ctx.fillRect(x*s,y*s,s,s*0.3);
   ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(x*s,y*s+s*0.95,s,s*0.05);
   ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(x*s,y*s+s*0.5);ctx.lineTo(x*s+s,y*s+s*0.5);ctx.stroke();
   continue;
  }else if(t===6){
   let wBld=getBuildingOwner(x,y);
   let wSide=wBld?getWallSide(wBld,x,y):null;
   ctx.fillStyle=COLORS.wallInner;ctx.fillRect(x*s,y*s,s,s);
   if(wSide==='top'){
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s,s,s*0.4);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s,s,s*0.06);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s,y*s+s*0.85,s,s*0.15);
    ctx.fillStyle='rgba(100,160,220,0.3)';ctx.fillRect(x*s+s*0.2,y*s+s*0.12,s*0.6,s*0.55);
    ctx.strokeStyle='rgba(150,200,255,0.35)';ctx.lineWidth=1;ctx.strokeRect(x*s+s*0.2,y*s+s*0.12,s*0.6,s*0.55);
    ctx.beginPath();ctx.moveTo(x*s+s*0.5,y*s+s*0.12);ctx.lineTo(x*s+s*0.5,y*s+s*0.67);ctx.stroke();
   }else if(wSide==='bottom'){
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s+s*0.6,s,s*0.4);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s+s*0.94,s,s*0.06);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s,y*s,s,s*0.15);
    ctx.fillStyle='rgba(100,160,220,0.3)';ctx.fillRect(x*s+s*0.2,y*s+s*0.3,s*0.6,s*0.55);
    ctx.strokeStyle='rgba(150,200,255,0.35)';ctx.lineWidth=1;ctx.strokeRect(x*s+s*0.2,y*s+s*0.3,s*0.6,s*0.55);
    ctx.beginPath();ctx.moveTo(x*s+s*0.5,y*s+s*0.3);ctx.lineTo(x*s+s*0.5,y*s+s*0.85);ctx.stroke();
   }else if(wSide==='left'){
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s,s*0.4,s);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s,s*0.06,s);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s+s*0.85,y*s,s*0.15,s);
    ctx.fillStyle='rgba(100,160,220,0.3)';ctx.fillRect(x*s+s*0.12,y*s+s*0.2,s*0.55,s*0.6);
    ctx.strokeStyle='rgba(150,200,255,0.35)';ctx.lineWidth=1;ctx.strokeRect(x*s+s*0.12,y*s+s*0.2,s*0.55,s*0.6);
    ctx.beginPath();ctx.moveTo(x*s+s*0.12,y*s+s*0.5);ctx.lineTo(x*s+s*0.67,y*s+s*0.5);ctx.stroke();
   }else if(wSide==='right'){
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s+s*0.6,y*s,s*0.4,s);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s+s*0.94,y*s,s*0.06,s);
    ctx.fillStyle=COLORS.wallInnerTop;ctx.fillRect(x*s,y*s,s*0.15,s);
    ctx.fillStyle='rgba(100,160,220,0.3)';ctx.fillRect(x*s+s*0.3,y*s+s*0.2,s*0.55,s*0.6);
    ctx.strokeStyle='rgba(150,200,255,0.35)';ctx.lineWidth=1;ctx.strokeRect(x*s+s*0.3,y*s+s*0.2,s*0.55,s*0.6);
    ctx.beginPath();ctx.moveTo(x*s+s*0.3,y*s+s*0.5);ctx.lineTo(x*s+s*0.85,y*s+s*0.5);ctx.stroke();
   }else{
    ctx.fillStyle=COLORS.wall;ctx.fillRect(x*s,y*s,s,s);
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s,s,s*0.3);
   }
   continue;
  }else{
   ctx.fillStyle='#0a1a2a';ctx.fillRect(x*s,y*s,s,s);
   ctx.globalAlpha=0.3+0.2*Math.sin(state.tick*0.08);
   ctx.fillStyle=COLORS.escape;ctx.fillRect(x*s+2,y*s+2,s-4,s-4);
   ctx.globalAlpha=1;
   ctx.fillStyle='#fff';ctx.font=Math.floor(s*0.5)+'px sans-serif';ctx.textAlign='center';
   ctx.globalAlpha=0.4+0.2*Math.sin(state.tick*0.06);
   ctx.fillText('\u2192',x*s+s/2,y*s+s*0.65);ctx.globalAlpha=1;
  }
 }
 for(let b of state.buildings){
  if(!b.searched){
   ctx.fillStyle='rgba(20,20,20,0.9)';ctx.fillRect((b.x+1)*s,(b.y+1)*s,(b.w-2)*s,(b.h-2)*s);
   ctx.fillStyle='rgba(255,255,255,0.08)';ctx.font='bold '+Math.floor(s*0.5)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText('?',(b.x+b.w/2)*s,(b.y+b.h/2)*s+s*0.15);
  }
 }
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
   let col='#cc0',label='M';
   if(it.type==='ammo'){col='#b80';label='\u2022\u2022'}
   else if(it.type==='bandage'){col='#2a6a2a';label='+'}
   ctx.fillStyle=col;ctx.beginPath();ctx.arc(ix,iy-s*0.05+bob,s*0.18,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#fff';ctx.font='bold '+Math.floor(s*0.22)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText(label,ix,iy+s*0.03+bob);
  }
 }
 let playerBld=getBuildingAt(p.x,p.y);
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
 for(let e of state.explosions){
  let ex=e.x*s+s/2,ey=e.y*s+s/2,progress=1-e.timer/20,radius=BARREL_EXPLOSION_RADIUS*s*progress;
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
  drawNPC(ctx,n.fx*s+s/2,n.fy*s+s/2,s,n.angle,n);
  let bw=s*0.7;
  ctx.fillStyle='#024';ctx.fillRect(n.fx*s+s*0.15,n.fy*s-s*0.22,bw,s*0.08);
  ctx.fillStyle='#0af';ctx.fillRect(n.fx*s+s*0.15,n.fy*s-s*0.22,bw*(n.hp/n.maxHp),s*0.08);
  if(n.isLeader&&state.baseEvent&&!state.baseEventActive&&!state.baseRewardGiven){
   ctx.fillStyle='#ff0';ctx.font='bold '+Math.floor(s*0.4)+'px sans-serif';ctx.textAlign='center';
   let bounce=Math.sin(state.tick*0.08)*s*0.1;
   ctx.fillText('!',n.fx*s+s/2,n.fy*s-s*0.4+bounce);
  }
  ctx.fillStyle=n.isLeader?'#fa0':'#0af';ctx.font='bold '+Math.floor(s*0.22)+'px sans-serif';ctx.textAlign='center';
  ctx.fillText(n.isLeader?'Chef':'PNJ',n.fx*s+s/2,n.fy*s-s*0.55);
  if(n.speech){
   let sx=n.fx*s+s/2,sy=n.fy*s-s*0.85;
   ctx.font=Math.floor(s*0.2)+'px sans-serif';ctx.textAlign='center';
   let tw=ctx.measureText(n.speech).width+s*0.3;
   ctx.fillStyle='rgba(255,255,255,0.85)';
   ctx.beginPath();ctx.roundRect(sx-tw/2,sy-s*0.15,tw,s*0.3,s*0.08);ctx.fill();
   ctx.fillStyle='#222';ctx.fillText(n.speech,sx,sy+s*0.06);
  }
 }
 let sortedZ=[];for(let z of state.zombies)if(z.alive)sortedZ.push(z);sortedZ.sort((a,b)=>a.fy-b.fy);
 for(let z of sortedZ){
  let zBld=getBuildingAt(z.x,z.y);
  if(zBld&&zBld!==playerBld)continue;
  let atkAnim=z.atkTimer>0?(z.atkTimer/z.atkDuration):0;
  let jumpOff=z.jumpAnim>0?Math.sin(z.jumpAnim/20*Math.PI)*s*0.5:0;
  drawZombie(ctx,z.fx*s+s/2,z.fy*s+s/2-jumpOff,s,z.angle,z.variant,atkAnim,z.isBoss,z.alerted);
  let bw=s*(z.isBoss?1:0.7);
  let ox=z.isBoss?s*-0.02:s*0.15;
  ctx.fillStyle='#200';ctx.fillRect(z.fx*s+ox,z.fy*s-s*(z.isBoss?0.4:0.22),bw,s*0.08);
  ctx.fillStyle=z.isBoss?'#f80':'#c00';ctx.fillRect(z.fx*s+ox,z.fy*s-s*(z.isBoss?0.4:0.22),bw*(z.hp/z.maxHp),s*0.08);
  if(z.alerted){ctx.fillStyle='#f44';ctx.font='bold '+Math.floor(s*0.28)+'px sans-serif';ctx.textAlign='center';ctx.fillText('!',z.fx*s+s/2,z.fy*s-s*(z.isBoss?0.55:0.32))}
  if(z.isBoss){ctx.fillStyle='#fa0';ctx.font='bold '+Math.floor(s*0.24)+'px sans-serif';ctx.textAlign='center';ctx.fillText('BOSS',z.fx*s+s/2,z.fy*s-s*0.65)}
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
   let circleRadius=Math.max(s*0.12,Math.tan(spreadRad)*clampedDist);
   ctx.strokeStyle='rgba(255,80,80,0.12)';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(pcx,pcy);ctx.lineTo(retX,retY);ctx.stroke();
   ctx.strokeStyle='rgba(255,80,80,0.4)';ctx.lineWidth=1.5;
   ctx.beginPath();ctx.arc(retX,retY,circleRadius,0,Math.PI*2);ctx.stroke();
   let ch=Math.max(3,circleRadius*0.35);
   ctx.strokeStyle='rgba(255,80,80,0.55)';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(retX-ch,retY);ctx.lineTo(retX+ch,retY);ctx.stroke();
   ctx.beginPath();ctx.moveTo(retX,retY-ch);ctx.lineTo(retX,retY+ch);ctx.stroke();
   ctx.strokeStyle='rgba(255,80,80,0.05)';ctx.lineWidth=1;ctx.setLineDash([s*0.1,s*0.1]);
   ctx.beginPath();ctx.arc(pcx,pcy,maxPx,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
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
   else if(it.type==='material')label='[E] Materiaux';
  }else if(interact.type==='door')label='[E] '+interact.label;
  else if(interact.type==='repair')label='[E] Reparer (3 mat.)';
  else if(interact.type==='escape')label='[E] Fuir';
  else if(interact.type==='leader')label='[E] Parler';
  ctx.fillStyle='rgba(255,230,0,0.85)';ctx.font='bold '+Math.floor(s*0.3)+'px sans-serif';ctx.textAlign='center';
  ctx.fillText(label,p.fx*s+s/2,p.fy*s+s*1.3);
 }
 let ez=state.escapeZone;
 if(ez.x>=0&&ez.y>=0){
  let ezx=ez.x*s+s/2,ezy=ez.y*s+s/2;
  let onScreen=ezx>cam.x&&ezx<cam.x+state.W&&ezy>cam.y&&ezy<cam.y+state.H;
  if(!onScreen){
   let pcx=p.fx*s+s/2,pcy=p.fy*s+s/2;
   let ang=Math.atan2(ezy-pcy,ezx-pcx);
   let arrowDist=s*4;
   let ax=pcx+Math.cos(ang)*arrowDist,ay=pcy+Math.sin(ang)*arrowDist;
   ctx.save();ctx.translate(ax,ay);ctx.rotate(ang);
   ctx.globalAlpha=0.4+0.2*Math.sin(state.tick*0.06);
   ctx.fillStyle='#0af';
   ctx.beginPath();ctx.moveTo(s*0.4,0);ctx.lineTo(-s*0.2,-s*0.2);ctx.lineTo(-s*0.2,s*0.2);ctx.closePath();ctx.fill();
   ctx.globalAlpha=1;ctx.restore();
  }
 }
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
 ctx.restore();
}
export function resize(){
 state.W=window.innerWidth;state.H=window.innerHeight;
 state.scale=Math.max(1,Math.min(Math.floor(state.W/(MAP_W*TILE*0.4)),Math.floor(state.H/(MAP_H*TILE*0.4)),3));
 state.canvas.width=state.W;state.canvas.height=state.H;
 state.ctx.imageSmoothingEnabled=false;
}
export function startGame(){
 initPlayer();
 state.player.x=Math.floor(MAP_W/2);state.player.y=Math.floor(MAP_H/2);
 state.player.fx=state.player.x;state.player.fy=state.player.y;
 state.gameOver=false;state.mapCount=0;state.kills=0;state.explosions=[];state.dmgFloaters=[];state.confetti=[];
 genMap();spawnPlayerInBuilding();
 msg('Survivez! Zone bleue = sortie. E = interagir.',3000);
 if(state.firstGame)state.showControls=true;
 startMusic();
}
export function retryWithSamePlayer(){
 state.gameOver=false;
 state.player.hp=state.player.maxHp;state.player.hitSlowTimer=0;state.player.postAttackSlow=0;state.player.smgHeat=0;
 state.explosions=[];state.dmgFloaters=[];state.confetti=[];
 genMap();spawnPlayerInBuilding();state.mapCount++;
 msg('Nouvelle zone... Map #'+(state.mapCount+1),3000);emitChange();
}
function nextMap(){
 state.mapCount++;let p=state.player;
 p.hp=Math.min(p.maxHp,p.hp+Math.ceil(p.maxHp*0.3));
 p.hitSlowTimer=0;p.postAttackSlow=0;p.smgHeat=0;
 p.x=Math.floor(MAP_W/2);p.y=Math.floor(MAP_H/2);p.fx=p.x;p.fy=p.y;
 state.explosions=[];state.dmgFloaters=[];state.confetti=[];genMap();spawnPlayerInBuilding();
 msg('Zone '+(state.mapCount+1)+' | Nv.'+p.level+' | '+state.kills+' kills',3000);emitChange();
}
export function initCanvas(canvas){
 state.canvas=canvas;state.ctx=canvas.getContext('2d');
}
export function setSelectedSlot(i){
 if(i>=0&&i<INV_SIZE)state.player.selectedSlot=i;
}
