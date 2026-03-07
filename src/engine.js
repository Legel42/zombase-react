// Game engine - all game logic and canvas rendering
export const TILE=32,MAP_W=60,MAP_H=45,INV_SIZE=5;
const COLORS={
 floor:'#2e2a26',wall:'#4a4644',wallTop:'#3a3836',wallEdge:'#222',
 wallInner:'#3e3a38',wallInnerTop:'#333030',
 door:'#6a5030',doorBroken:'#4a3a28',grass:'#1e3a1e',grassAlt:'#1a331a',grassDetail:'#162e16',
 escape:'#0af',cityWall:'#3e3c3a',cityWallTop:'#2e2c2a',
 doorArmored:'#5a6a7a',doorArmoredTop:'#4a5a6a'
};
const SIGHT_RADIUS=7,GUNSHOT_ALERT_RADIUS=18,SAFE_SPAWN_RADIUS=14;
export const BASE_HP_PLAYER=25,BASE_HP_ZOMBIE=50,BASE_DMG_ZOMBIE=5;
const WEAPONS={
 bat:{name:'bat',type:'weapon',range:2.8,arc:Math.PI/2.5,dmg:13,cooldown:25,melee:true,label:'Batte'},
 gun:{name:'gun',type:'weapon',range:15,dmg:25,cooldown:20,melee:false,label:'Pistolet',baseSpread:0.03},
 shotgun:{name:'shotgun',type:'weapon',range:8,dmg:12,cooldown:40,melee:false,pellets:5,baseSpread:0.15,label:'Fusil a pompe'},
 smg:{name:'smg',type:'weapon',range:12,dmg:10,cooldown:6,melee:false,label:'Mitraillette',baseSpread:0.06}
};
export const WEAPON_DEFS=WEAPONS;
const ZOMBIE_ATK_RANGE=1.2;
const HIT_SLOW_DURATION=20;
const POST_ATTACK_SLOW_DURATION=60;
const INTERACT_RANGE=2.0;
const BARREL_EXPLOSION_RADIUS=3,BARREL_EXPLOSION_DMG=40,MAX_BARRELS=3;
const XP_PER_KILL=5,XP_PER_LEVEL=100;
// Distance-based spread: spread = baseSpread + distFactor * distance
const DIST_SPREAD_FACTOR=0.008;

const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

export const state={
 canvas:null,ctx:null,cam:{x:0,y:0},
 keys:{},mouseX:0,mouseY:0,mouseDown:false,
 gameOver:false,showStats:false,
 map:[],buildings:[],doors:[],items:[],zombies:[],bullets:[],barrels:[],cityWalls:[],
 npcs:[],rockWarnings:[],rocks:[],
 escapeZone:{x:0,y:0},
 player:null,mapCount:0,tick:0,attackPressed:false,
 W:0,H:0,scale:1,
 message:'',msgTimer:null,
 onDeath:null,onMessage:null,onStateChange:null,
 firstGame:true,showControls:false,
 holdingE:false,holdETimer:0,draggingBarrel:null,
 // Base defense event
 baseEvent:false,baseEventActive:false,baseWaveTimer:0,baseWavesLeft:0,
 baseBoss:null,baseRewardGiven:false
};

function emitChange(){state.onStateChange?.()}
function msg(t,d=2000){
 state.message=t;clearTimeout(state.msgTimer);
 state.msgTimer=setTimeout(()=>{state.message='';emitChange()},d);emitChange();
}

function isInBuilding(tx,ty){
 for(let b of state.buildings)if(tx>b.x&&tx<b.x+b.w-1&&ty>b.y&&ty<b.y+b.h-1)return true;
 return false;
}
function getBuildingAt(tx,ty){
 for(let b of state.buildings)if(tx>b.x&&tx<b.x+b.w-1&&ty>b.y&&ty<b.y+b.h-1)return b;
 return null;
}
// Determine which side of building a wall tile is on
function getWallSide(bld,x,y){
 if(y===bld.y)return 'top';
 if(y===bld.y+bld.h-1)return 'bottom';
 if(x===bld.x)return 'left';
 if(x===bld.x+bld.w-1)return 'right';
 return null;
}

function isWallBetween(x1,y1,x2,y2){
 let dx=x2-x1,dy=y2-y1;
 let steps=Math.max(Math.abs(dx),Math.abs(dy))*2;
 if(steps===0)return false;
 let sx=dx/steps,sy=dy/steps;
 for(let i=1;i<steps;i++){
  let cx=Math.floor(x1+sx*i+0.5),cy=Math.floor(y1+sy*i+0.5);
  if(cx>=0&&cy>=0&&cx<MAP_W&&cy<MAP_H){
   let t=state.map[cy][cx];
   if(t===1||t===5)return true;
  }
 }
 return false;
}

// Get spread at a given distance for a weapon
function getSpreadAtDist(wep,precision,d){
 let base=(wep.baseSpread||0.05)*(6-precision)/5;
 return base+DIST_SPREAD_FACTOR*d;
}

// -- Sprites --
function drawHumanoid(ctx,cx,cy,s,angle,opts){
 ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);
 let u=s/32;
 let walk=opts.walkPhase||0; // 0..1 cycle
 let legOff=Math.sin(walk*Math.PI*2)*3*u;
 ctx.fillStyle='rgba(0,0,0,0.35)';
 ctx.beginPath();ctx.ellipse(0,3*u,11*u,5*u,0,0,Math.PI*2);ctx.fill();
 // Legs (animated)
 ctx.fillStyle=opts.legs||'#2a2a2a';
 ctx.fillRect(-3*u,2*u+legOff,4*u,8*u);ctx.fillRect(1*u,2*u-legOff,4*u,8*u);
 ctx.fillStyle=opts.boots||'#1a1a1a';
 ctx.fillRect(-3*u,8*u+legOff,4*u,3*u);ctx.fillRect(1*u,8*u-legOff,4*u,3*u);
 // Body (slight bob)
 let bodyBob=Math.abs(Math.sin(walk*Math.PI*2))*1.5*u;
 ctx.fillStyle=opts.body;ctx.fillRect(-7*u,-7*u-bodyBob,14*u,14*u);
 if(opts.vest){ctx.fillStyle=opts.vest;ctx.fillRect(-7*u,-7*u-bodyBob,3*u,14*u);ctx.fillRect(4*u,-7*u-bodyBob,3*u,14*u)}
 if(opts.pocket){ctx.fillStyle=opts.pocket;ctx.fillRect(-2*u,-4*u-bodyBob,4*u,6*u)}
 // Arms
 ctx.fillStyle=opts.arms||opts.body;
 let armExt=opts.armExtend||0;
 let armSwing=Math.sin(walk*Math.PI*2)*2*u;
 ctx.fillRect(7*u,-5*u-bodyBob+armSwing,4*u+armExt,10*u);ctx.fillRect(-11*u,-5*u-bodyBob-armSwing,4*u,10*u);
 ctx.fillStyle=opts.gloves||opts.skin||'#1a1a1a';
 ctx.fillRect(7*u+armExt,3*u-bodyBob+armSwing,4*u,4*u);ctx.fillRect(-11*u,3*u-bodyBob-armSwing,4*u,4*u);
 // Head
 ctx.fillStyle=opts.skin||'#d4a870';ctx.fillRect(-5*u,-14*u-bodyBob,10*u,9*u);
 if(opts.helmet){ctx.fillStyle=opts.helmet;ctx.fillRect(-6*u,-16*u-bodyBob,12*u,5*u);ctx.fillStyle=opts.helmetRim||opts.helmet;ctx.fillRect(-6*u,-12*u-bodyBob,12*u,2*u)}
 // Eye
 ctx.fillStyle=opts.eyeColor||'#111';ctx.fillRect(3*u,-13*u-bodyBob,2*u,2*u);
 ctx.fillStyle=opts.skin||'#d4a870';ctx.fillRect(2*u,-9*u-bodyBob,3*u,1*u);
 // Scale indicator (boss)
 if(opts.scale&&opts.scale>1){
  ctx.fillStyle='rgba(255,0,0,0.15)';ctx.beginPath();ctx.arc(0,0,14*u,0,Math.PI*2);ctx.fill();
 }
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
 // Weapon on top
 ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);
 let u=s/32;
 let sel=player.inventory[player.selectedSlot];
 if(sel&&sel.name==='bat'){
  let batLen=WEAPONS.bat.range*s/2*0.9;
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
 // Weapon
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
 // Legs
 let legCol=variant===0?'#3a3030':'#2a3a30';
 ctx.fillStyle=legCol;
 ctx.fillRect(-3*u,2*u+legOff,4*u,8*u);ctx.fillRect(1*u,2*u-legOff,4*u,8*u);
 // Body
 let bc=variant===0?'#4a3030':'#3a4030';
 let bc2=variant===0?'#5a3838':'#4a5038';
 ctx.fillStyle=bc;ctx.fillRect(-7*u,-8*u-bodyBob,14*u,14*u);
 ctx.fillStyle=bc2;ctx.fillRect(-7*u,-8*u-bodyBob,14*u,3*u);
 ctx.fillStyle=variant===0?'#3a2020':'#2a3020';
 ctx.fillRect(-2*u,-3*u-bodyBob,6*u,4*u);
 // Arms - attack animation: both arms lunge forward + spread
 let armReach=atkAnim>0?ZOMBIE_ATK_RANGE*s/2*atkAnim:0;
 let armSpread=atkAnim>0?atkAnim*3*u:0;
 let armSwing=isMoving&&atkAnim<=0?Math.sin(walk*Math.PI*2)*2*u:0;
 ctx.fillStyle='#5a7a50';
 ctx.fillRect(7*u,-4*u-bodyBob-armSpread+armSwing,4*u+armReach,8*u);
 ctx.fillRect(-11*u,-4*u-bodyBob+armSpread-armSwing,4*u+(atkAnim>0?armReach*0.6:0),8*u);
 // Claws
 ctx.fillStyle='#4a6a40';
 ctx.fillRect(9*u+armReach,-5*u-bodyBob-armSpread,5*u,3*u);ctx.fillRect(9*u+armReach,2*u-bodyBob-armSpread,5*u,3*u);
 if(atkAnim>0){
  // Second arm claws too
  ctx.fillRect(-11*u+armReach*0.6,-5*u-bodyBob+armSpread,5*u,3*u);
  ctx.fillRect(-11*u+armReach*0.6,2*u-bodyBob+armSpread,5*u,3*u);
 }else{
  ctx.fillRect(-11*u,-5*u-bodyBob,3*u,3*u);
 }
 // Head
 ctx.fillStyle=isBoss?'#5a6a50':'#6a8a60';ctx.fillRect(-5*u,-15*u-bodyBob,10*u,9*u);
 ctx.fillStyle='#5a7a50';ctx.fillRect(-5*u,-8*u-bodyBob,10*u,2*u);
 ctx.fillStyle='#4a6a40';ctx.fillRect(-3*u,-14*u-bodyBob,3*u,3*u);
 ctx.fillStyle=isBoss?'#ff0':'#f22';ctx.fillRect(2*u,-13*u-bodyBob,3*u,3*u);
 // Attack face: open jaw + teeth + blood drool
 if(atkAnim>0){
  let jawOpen=atkAnim*4*u;
  ctx.fillStyle='#300';ctx.fillRect(0*u,-8*u-bodyBob,5*u,3*u+jawOpen);
  ctx.fillStyle='#fff';
  ctx.fillRect(1*u,-8*u-bodyBob,1*u,1.5*u);ctx.fillRect(3*u,-8*u-bodyBob,1*u,1.5*u);
  ctx.fillRect(1*u,-6*u-bodyBob+jawOpen,1*u,1.5*u);ctx.fillRect(3*u,-6*u-bodyBob+jawOpen,1*u,1.5*u);
  // Blood drool
  ctx.fillStyle='rgba(180,0,0,0.6)';ctx.fillRect(2*u,-5*u-bodyBob+jawOpen,1*u,2*u+atkAnim*2*u);
 }
 if(isBoss){
  ctx.fillStyle='#aa6600';
  ctx.fillRect(-4*u,-18*u-bodyBob,2*u,4*u);ctx.fillRect(2*u,-18*u-bodyBob,2*u,4*u);
 }
 ctx.restore();
}

// -- Player --
function initPlayer(){
 let pvStat=rand(1,5);
 state.player={
  x:Math.floor(MAP_W/2),y:Math.floor(MAP_H/2),
  hp:BASE_HP_PLAYER+pvStat*5,maxHp:BASE_HP_PLAYER+pvStat*5,
  pvStat,atk:rand(1,5),armor:rand(1,5),precision:rand(1,5),speed:rand(1,5),
  inventory:[{type:'weapon',name:'bat',ammo:0},null,null,null],
  selectedSlot:0,cooldown:0,angle:0,
  fx:Math.floor(MAP_W/2),fy:Math.floor(MAP_H/2),
  swingTimer:0,swingDuration:15,hitSlowTimer:0,isAttacking:false,
  postAttackSlow:0,xp:0,level:1,ammo:0
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
 let totalPoints=rand(1,3);
 let stats=['pvStat','atk','armor','precision','speed'];
 if(totalPoints===1){
  let s=stats[rand(0,stats.length-1)];applyStat(p,s,1);
  msg('Level '+p.level+'! +1 '+statName(s));
 }else{
  let first=rand(0,stats.length-1),second;
  do{second=rand(0,stats.length-1)}while(second===first);
  let distribution=new Array(stats.length).fill(0);
  distribution[first]++;distribution[second]++;
  let remaining=totalPoints-2;
  while(remaining>0){distribution[[first,second][rand(0,1)]]++;remaining--}
  let parts=[];
  for(let i=0;i<stats.length;i++){
   if(distribution[i]>0){applyStat(p,stats[i],distribution[i]);parts.push('+'+distribution[i]+' '+statName(stats[i]))}
  }
  msg('Level '+p.level+'! '+parts.join(', '),3000);
 }
}
function applyStat(p,stat,amount){
 p[stat]+=amount;
 if(stat==='pvStat'){p.maxHp=BASE_HP_PLAYER+p.pvStat*5;p.hp=Math.min(p.hp+amount*5,p.maxHp)}
}
function statName(s){
 switch(s){case 'pvStat':return'PV';case 'atk':return'ATK';case 'armor':return'ARM';case 'precision':return'PRE';case 'speed':return'VIT'}return s;
}

function makeZombie(x,y,level){
 let lv=level||1;
 let pvStat=rand(1,10)*lv;
 let hp=BASE_HP_ZOMBIE+pvStat*5;
 return{x,y,hp,maxHp:hp,atk:rand(1,10)*lv,armor:rand(1,10),precision:rand(1,10),
  speed:Math.max(1,rand(1,3)),fx:x,fy:y,
  cooldown:0,atkCooldown:60,atkTimer:0,atkDuration:15,
  alive:true,alerted:false,variant:rand(0,1),
  angle:Math.random()*Math.PI*2,hitSlowTimer:0,isAttacking:false,
  postAttackSlow:0,isBoss:false};
}

function makeBossZombie(x,y){
 let hp=400;
 return{x,y,hp,maxHp:hp,atk:30,armor:20,precision:8,
  speed:2,fx:x,fy:y,
  cooldown:0,atkCooldown:50,atkTimer:0,atkDuration:20,
  alive:true,alerted:true,variant:0,
  angle:0,hitSlowTimer:0,isAttacking:false,
  postAttackSlow:0,isBoss:true,throwCooldown:0,throwTimer:0};
}

function makeNPC(x,y,weapon,isLeader){
 let hp=isLeader?80:40;
 return{x,y,fx:x,fy:y,hp,maxHp:hp,
  atk:isLeader?5:2,armor:isLeader?5:2,precision:isLeader?6:3,speed:isLeader?3:2,
  weapon,isLeader,alive:true,angle:0,
  cooldown:0,atkCooldown:weapon==='bat'?30:25,
  level:isLeader?3:1,questActive:false};
}

function genMap(){
 state.map=Array.from({length:MAP_H},()=>Array(MAP_W).fill(0));
 state.buildings=[];state.doors=[];state.items=[];state.zombies=[];
 state.bullets=[];state.barrels=[];state.cityWalls=[];
 state.npcs=[];state.rockWarnings=[];state.rocks=[];
 state.baseBoss=null;state.baseEventActive=false;state.baseRewardGiven=false;
 let{map,buildings,doors,items,zombies,player}=state;

 // Is this a base defense level?
 let isBaseLevel=player.level>1&&(player.level%5===0);
 state.baseEvent=isBaseLevel;

 let attempts=0,targetBuildings=isBaseLevel?rand(3,4):rand(6,10);
 while(buildings.length<targetBuildings&&attempts<400){
  attempts++;
  let w=rand(4,8),h=rand(4,7),bx=rand(1,MAP_W-w-1),by=rand(1,MAP_H-h-1);
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
  buildings.push({x:bx,y:by,w,h,secured:false,searched:false});
  doors.push({x:doorPos.x,y:doorPos.y,barricaded:false,open:false,building:buildings[buildings.length-1]});
 }

 // City walls
 for(let i=0;i<rand(8,16);i++){
  let horizontal=Math.random()<0.5;
  let len=rand(3,8);
  let wx=rand(1,MAP_W-len-1),wy=rand(1,MAP_H-len-1);
  let valid=true;
  for(let j=0;j<len;j++){
   let cx=horizontal?wx+j:wx,cy=horizontal?wy:wy+j;
   if(map[cy][cx]!==0){valid=false;break}
  }
  if(!valid)continue;
  for(let j=0;j<len;j++){
   let cx=horizontal?wx+j:wx,cy=horizontal?wy:wy+j;
   map[cy][cx]=5;state.cityWalls.push({x:cx,y:cy});
  }
 }

 // Items
 let gunCount=0;
 for(let bi=0;bi<buildings.length;bi++){
  let b=buildings[bi];
  let ix=rand(b.x+1,b.x+b.w-2),iy=rand(b.y+1,b.y+b.h-2);
  if(gunCount<2&&(bi<2||Math.random()<0.3)){
   items.push({x:ix,y:iy,type:'weapon',name:'gun'});gunCount++;
  }
  let lx=rand(b.x+1,b.x+b.w-2),ly=rand(b.y+1,b.y+b.h-2);
  if(lx===ix&&ly===iy)lx=clamp(lx+1,b.x+1,b.x+b.w-2);
  items.push({x:lx,y:ly,type:Math.random()<0.5?'ammo':'bandage'});
 }
 for(let i=0;i<rand(10,20);i++){
  let x,y;do{x=rand(0,MAP_W-1);y=rand(0,MAP_H-1)}while(map[y][x]!==0);
  items.push({x,y,type:'material'});
 }

 if(!isBaseLevel){
  // Normal map: zombies + escape
  for(let i=0;i<rand(12,24);i++){
   let x,y;do{x=rand(0,MAP_W-1);y=rand(0,MAP_H-1)}while(map[y][x]!==0||dist({x,y},player)<SAFE_SPAWN_RADIUS);
   zombies.push(makeZombie(x,y));
  }
  for(let i=0;i<rand(1,MAX_BARRELS);i++){
   let x,y,tries=0;
   do{x=rand(1,MAP_W-2);y=rand(1,MAP_H-2);tries++}while((map[y][x]!==0||dist({x,y},player)<SAFE_SPAWN_RADIUS)&&tries<50);
   if(tries<50)state.barrels.push({x,y,fx:x,fy:y,hp:20,alive:true});
  }
  let ex,ey;
  do{ex=rand(0,MAP_W-1);ey=rand(0,MAP_H-1)}while(map[ey][ex]!==0||dist({x:ex,y:ey},player)<15);
  state.escapeZone={x:ex,y:ey};map[ey][ex]=4;
 }else{
  // Base defense map: NPCs + leader, no escape until event done
  state.escapeZone={x:-10,y:-10}; // hidden
  let baseBld=buildings[0];
  // Spawn NPCs around the base building
  let npcCount=rand(3,5);
  for(let i=0;i<npcCount;i++){
   let nx=baseBld.x+rand(1,baseBld.w-2),ny=baseBld.y+rand(1,baseBld.h-2);
   let wpn=Math.random()<0.5?'bat':'gun';
   state.npcs.push(makeNPC(nx,ny,wpn,false));
  }
  // Leader
  let lx=baseBld.x+Math.floor(baseBld.w/2),ly=baseBld.y+Math.floor(baseBld.h/2);
  let leader=makeNPC(lx,ly,'shotgun',true);
  state.npcs.push(leader);
  // Some barrels
  for(let i=0;i<rand(1,2);i++){
   let x,y,tries=0;
   do{x=rand(1,MAP_W-2);y=rand(1,MAP_H-2);tries++}while((map[y][x]!==0)&&tries<50);
   if(tries<50)state.barrels.push({x,y,fx:x,fy:y,hp:20,alive:true});
  }
 }
}

function spawnPlayerInBuilding(){
 if(!state.buildings.length)return;
 let b=state.buildings[0],p=state.player;
 p.x=b.x+Math.floor(b.w/2);p.y=b.y+Math.floor(b.h/2);
 p.fx=p.x;p.fy=p.y;b.searched=true;
}

function alertZombiesNear(px,py,radius){
 let playerInside=isInBuilding(Math.floor(px+0.5),Math.floor(py+0.5));
 for(let z of state.zombies){
  if(!z.alive||z.alerted)continue;
  if(dist({x:px,y:py},{x:z.fx,y:z.fy})>radius)continue;
  if(isWallBetween(px,py,z.fx,z.fy))continue;
  if(playerInside&&!isInBuilding(z.x,z.y))continue;
  z.alerted=true;
 }
}
function getSpeedMult(entity){
 let m=1;
 if(entity.isAttacking)m*=0.75;
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
 let t=state.map[ty][tx];return t!==1&&t!==5;
}

function explodeBarrel(barrel){
 barrel.alive=false;
 let bx=barrel.fx,by=barrel.fy;
 for(let z of state.zombies){
  if(!z.alive)continue;
  let d=dist({x:bx,y:by},{x:z.fx,y:z.fy});
  if(d<BARREL_EXPLOSION_RADIUS){
   let dmg=Math.max(1,Math.floor(BARREL_EXPLOSION_DMG*(1-d/BARREL_EXPLOSION_RADIUS)));
   z.hp-=dmg;z.alerted=true;z.hitSlowTimer=HIT_SLOW_DURATION;
   if(z.hp<=0){z.alive=false;zombieDrop(z.x,z.y);addXP(state.player,XP_PER_KILL)}
  }
 }
 let pd=dist({x:bx,y:by},{x:state.player.fx,y:state.player.fy});
 if(pd<BARREL_EXPLOSION_RADIUS){
  let dmg=Math.max(1,Math.floor(BARREL_EXPLOSION_DMG*(1-pd/BARREL_EXPLOSION_RADIUS)));
  state.player.hp-=dmg;state.player.hitSlowTimer=HIT_SLOW_DURATION;
  msg('Explosion! -'+dmg+' PV');
  if(state.player.hp<=0){state.gameOver=true;state.onDeath?.();emitChange()}
 }
 for(let ob of state.barrels){
  if(!ob.alive||ob===barrel)continue;
  if(dist({x:bx,y:by},{x:ob.fx,y:ob.fy})<BARREL_EXPLOSION_RADIUS)explodeBarrel(ob);
 }
 alertZombiesNear(bx,by,GUNSHOT_ALERT_RADIUS);
 state.explosions=state.explosions||[];
 state.explosions.push({x:bx,y:by,timer:20});
}

function getWeaponDef(sel){
 if(!sel||sel.type!=='weapon')return null;
 return WEAPONS[sel.name]||null;
}

function meleeAttack(p){
 let wep=getWeaponDef(p.inventory[p.selectedSlot]);
 if(!wep)return;
 p.cooldown=Math.max(10,wep.cooldown-p.speed*2);
 let range=wep.range,arc=wep.arc||Math.PI/2;
 for(let z of state.zombies){
  if(!z.alive)continue;
  let d=dist({x:p.fx,y:p.fy},{x:z.fx,y:z.fy});
  if(d<range){
   let toZ=Math.atan2(z.fy-p.fy,z.fx-p.fx);
   let diff=Math.abs(toZ-p.angle);if(diff>Math.PI)diff=2*Math.PI-diff;
   if(diff<arc/2){
    if(Math.random()*10<p.precision+3){
     let dmg=Math.max(1,wep.dmg+p.atk+3-Math.floor(z.armor/4));
     z.hp-=dmg;z.alerted=true;z.hitSlowTimer=HIT_SLOW_DURATION;
     msg('Touche! -'+dmg+' PV');
     if(z.hp<=0){z.alive=false;zombieDrop(z.x,z.y);addXP(p,XP_PER_KILL);msg('Zombie elimine!')}
    }else msg('Rate!');
   }
  }
 }
 for(let b of state.barrels){
  if(!b.alive)continue;
  let d=dist({x:p.fx,y:p.fy},{x:b.fx,y:b.fy});
  if(d<range){
   let toB=Math.atan2(b.fy-p.fy,b.fx-p.fx);
   let diff=Math.abs(toB-p.angle);if(diff>Math.PI)diff=2*Math.PI-diff;
   if(diff<arc/2){b.hp-=5;if(b.hp<=0)explodeBarrel(b)}
  }
 }
}

function shootOneBullet(p,wep,shotAngle){
 let adx=Math.cos(shotAngle),ady=Math.sin(shotAngle),range=wep.range;
 state.bullets.push({x:p.fx,y:p.fy,angle:shotAngle,maxDist:range,life:8});
 for(let i=1;i<range;i++){
  let sx=Math.floor(p.fx+0.5+adx*i),sy=Math.floor(p.fy+0.5+ady*i);
  if(sx<0||sy<0||sx>=MAP_W||sy>=MAP_H)break;
  let t=state.map[sy][sx];if(t===1||t===5)break;
  let hitBarrel=state.barrels.find(b=>b.alive&&dist({x:b.fx,y:b.fy},{x:p.fx+0.5+adx*i,y:p.fy+0.5+ady*i})<0.8);
  if(hitBarrel){hitBarrel.hp-=10;if(hitBarrel.hp<=0)explodeBarrel(hitBarrel);return true}
  let hit=state.zombies.find(z=>z.alive&&dist({x:z.fx,y:z.fy},{x:p.fx+0.5+adx*i,y:p.fy+0.5+ady*i})<0.8);
  if(hit){
   let dmg=Math.max(1,wep.dmg+p.atk-Math.floor(hit.armor/3));
   hit.hp-=dmg;hit.hitSlowTimer=HIT_SLOW_DURATION;hit.alerted=true;
   msg('Tir touche! -'+dmg);
   if(hit.hp<=0){hit.alive=false;zombieDrop(hit.x,hit.y);addXP(p,XP_PER_KILL);msg('Zombie abattu!')}
   return true;
  }
 }
 return false;
}

function shootAttack(p){
 let sel=p.inventory[p.selectedSlot];
 let wep=getWeaponDef(sel);if(!wep)return;
 p.cooldown=Math.max(4,wep.cooldown-Math.floor(p.speed));
 alertZombiesNear(p.fx,p.fy,GUNSHOT_ALERT_RADIUS);
 // Calculate mouse distance for spread
 let s=TILE*state.scale;
 let pwx=p.fx*s-state.cam.x+s/2,pwy=p.fy*s-state.cam.y+s/2;
 let mouseDist=Math.hypot(state.mouseX-pwx,state.mouseY-pwy)/s;
 let spreadAtDist=getSpreadAtDist(wep,p.precision,mouseDist);

 if(wep.pellets){
  let anyHit=false;
  for(let pi=0;pi<wep.pellets;pi++){
   let spread=(Math.random()-0.5)*2*spreadAtDist;
   if(shootOneBullet(p,wep,p.angle+spread))anyHit=true;
  }
  if(!anyHit)msg('Tirs rates!');
 }else{
  let spread=(Math.random()-0.5)*2*spreadAtDist;
  if(!shootOneBullet(p,wep,p.angle+spread))msg('Tir rate!');
 }
}

function findNearestInteractable(p){
 let best=null,bd=Infinity;
 for(let i=0;i<state.items.length;i++){
  let it=state.items[i];
  let d=dist({x:p.fx,y:p.fy},{x:it.x+0.5,y:it.y+0.5});
  if(d<INTERACT_RANGE&&d<bd){best={kind:'item',index:i,item:it};bd=d}
 }
 return best;
}

// NPC AI
function updateNPC(npc){
 if(!npc.alive)return;
 // Find nearest zombie
 let nearestZ=null,nd=Infinity;
 for(let z of state.zombies){
  if(!z.alive)continue;
  let d=dist({x:npc.fx,y:npc.fy},{x:z.fx,y:z.fy});
  if(d<nd){nearestZ=z;nd=d}
 }
 if(!nearestZ)return;
 npc.angle=Math.atan2(nearestZ.fy-npc.fy,nearestZ.fx-npc.fx);

 let wep=WEAPONS[npc.weapon];
 let range=wep?wep.range:2;
 // Move toward zombie if too far
 if(nd>range*0.7){
  let spd=0.02+npc.speed*0.005;
  let adx=nearestZ.fx-npc.fx,ady=nearestZ.fy-npc.fy,len=Math.hypot(adx,ady)||1;
  let nx=npc.fx+adx/len*spd,ny=npc.fy+ady/len*spd;
  if(canWalk(Math.floor(nx+0.5),Math.floor(npc.fy+0.5)))npc.fx=nx;
  if(canWalk(Math.floor(npc.fx+0.5),Math.floor(ny+0.5)))npc.fy=ny;
  npc.x=Math.floor(npc.fx+0.5);npc.y=Math.floor(npc.fy+0.5);
 }

 // Attack
 if(npc.cooldown>0){npc.cooldown--;return}
 if(wep&&wep.melee&&nd<wep.range){
  npc.cooldown=wep.cooldown;
  if(Math.random()*10<npc.precision+2){
   let dmg=Math.max(1,wep.dmg+npc.atk);
   nearestZ.hp-=dmg;nearestZ.alerted=true;nearestZ.hitSlowTimer=HIT_SLOW_DURATION;
   if(nearestZ.hp<=0){nearestZ.alive=false;zombieDrop(nearestZ.x,nearestZ.y);addXP(state.player,XP_PER_KILL)}
  }
 }else if(wep&&!wep.melee&&nd<wep.range){
  npc.cooldown=wep.cooldown;
  // NPC shoots
  let adx=Math.cos(npc.angle),ady=Math.sin(npc.angle);
  state.bullets.push({x:npc.fx,y:npc.fy,angle:npc.angle,maxDist:wep.range,life:6});
  for(let i=1;i<wep.range;i++){
   let sx=Math.floor(npc.fx+0.5+adx*i),sy=Math.floor(npc.fy+0.5+ady*i);
   if(sx<0||sy<0||sx>=MAP_W||sy>=MAP_H)break;
   let t=state.map[sy][sx];if(t===1||t===5)break;
   let hit=state.zombies.find(z=>z.alive&&dist({x:z.fx,y:z.fy},{x:npc.fx+0.5+adx*i,y:npc.fy+0.5+ady*i})<0.9);
   if(hit){
    let dmg=Math.max(1,wep.dmg+npc.atk);
    hit.hp-=dmg;hit.hitSlowTimer=HIT_SLOW_DURATION;hit.alerted=true;
    if(hit.hp<=0){hit.alive=false;zombieDrop(hit.x,hit.y);addXP(state.player,XP_PER_KILL)}
    break;
   }
  }
 }
}

// Boss throws rock
function bossThrowRock(boss,target){
 boss.throwCooldown=180; // 3 sec
 let angle=Math.atan2(target.fy-boss.fy,target.fx-boss.fx);
 // Warning first
 let dirs=['N','NE','E','SE','S','SO','O','NO'];
 let di=Math.round(((angle+Math.PI)/(Math.PI*2))*8)%8;
 state.rockWarnings.push({
  x:target.fx,y:target.fy,timer:60,angle,
  fromDir:dirs[(di+4)%8]
 });
 // Rock spawns after warning
 state.rocks.push({
  sx:boss.fx,sy:boss.fy,tx:target.fx,ty:target.fy,
  timer:60,totalTime:60,active:false,
  dmg:15+rand(0,10)
 });
}

function startBaseAssault(){
 state.baseEventActive=true;
 state.baseWavesLeft=3;
 state.baseWaveTimer=0;
 msg('ALERTE! Les zombies attaquent la base!',3000);
}

function spawnAssaultWave(){
 let count=rand(6,10)+state.player.level;
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
 // Spawn boss on last wave
 if(state.baseWavesLeft===1){
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

// -- Public API --
export function update(){
 if(state.gameOver)return;
 state.tick++;
 let p=state.player,{keys}=state;

 if(p.hitSlowTimer>0)p.hitSlowTimer--;
 if(p.postAttackSlow>0)p.postAttackSlow--;
 if(p.swingTimer>0)p.swingTimer--;
 if(p.cooldown>0){p.cooldown--;p.isAttacking=true}
 else{if(p.isAttacking){p.postAttackSlow=POST_ATTACK_SLOW_DURATION}p.isAttacking=false}

 let s=TILE*state.scale;
 let pwx=p.fx*s-state.cam.x,pwy=p.fy*s-state.cam.y;
 p.angle=Math.atan2(state.mouseY-pwy-s/2,state.mouseX-pwx-s/2);

 let dx=0,dy=0;
 if(keys.ArrowUp||keys.KeyW||keys.KeyZ)dy=-1;
 if(keys.ArrowDown||keys.KeyS)dy=1;
 if(keys.ArrowLeft||keys.KeyA||keys.KeyQ)dx=-1;
 if(keys.ArrowRight||keys.KeyD)dx=1;
 if(dx||dy){
  let spd=(0.06+p.speed*0.015)*getSpeedMult(p);
  let nx=p.fx+dx*spd,ny=p.fy+dy*spd;
  if(canWalk(Math.floor(nx+(dx>0?0.4:-0.4)+0.5),Math.floor(p.fy+0.5)))p.fx=nx;
  if(canWalk(Math.floor(p.fx+0.5),Math.floor(ny+(dy>0?0.4:-0.4)+0.5)))p.fy=ny;
  p.fx=clamp(p.fx,0,MAP_W-1);p.fy=clamp(p.fy,0,MAP_H-1);
  p.x=Math.floor(p.fx+0.5);p.y=Math.floor(p.fy+0.5);
 }

 // Attack
 let sel=p.inventory[p.selectedSlot];
 let wep=getWeaponDef(sel);
 if(wep&&wep.name==='smg'){
  if(state.mouseDown&&p.cooldown<=0){
   if(p.ammo>0){shootAttack(p);p.ammo--;p.swingTimer=6}
   else msg('Plus de munitions!');
  }
 }else{
  if(state.mouseDown&&!state.attackPressed&&p.cooldown<=0){
   state.attackPressed=true;
   if(wep){
    if(wep.melee){meleeAttack(p);p.swingTimer=p.swingDuration}
    else{if(p.ammo>0){shootAttack(p);p.ammo--}else msg('Plus de munitions!')}
   }else msg('Selectionnez une arme (1-4)');
  }
 }
 if(!state.mouseDown)state.attackPressed=false;

 // E key
 if(keys.KeyE){
  if(!state.holdingE){
   state.holdingE=true;state.holdETimer=0;
   let didInteract=false;

   // Talk to NPC leader to start assault
   if(state.baseEvent&&!state.baseEventActive){
    let leader=state.npcs.find(n=>n.alive&&n.isLeader);
    if(leader&&dist({x:p.fx,y:p.fy},{x:leader.fx,y:leader.fy})<INTERACT_RANGE){
     startBaseAssault();didInteract=true;
    }
   }

   // Armored door
   if(!didInteract){
    let door=state.doors.find(d=>dist({x:d.x+0.5,y:d.y+0.5},{x:p.fx,y:p.fy})<INTERACT_RANGE&&d.barricaded);
    if(door){door.open=!door.open;state.map[door.y][door.x]=door.open?3:1;msg(door.open?'Porte blindee ouverte':'Porte blindee fermee');didInteract=true}
   }

   if(!didInteract){
    let found=findNearestInteractable(p);
    if(found&&found.kind==='item'){
     let it=found.item,idx=found.index;
     if(it.type==='weapon'){
      let existing=p.inventory.find(i=>i&&i.type==='weapon'&&i.name===it.name);
      if(existing){msg('Deja possede!')}
      else{let slot=p.inventory.findIndex(i=>i===null);
       if(slot>=0){p.inventory[slot]={type:'weapon',name:it.name,ammo:0};msg((WEAPONS[it.name]?.label||it.name)+'! (slot '+(slot+1)+')');state.items.splice(idx,1)}
       else msg('Inventaire plein!')}
      didInteract=true;
     }else if(it.type==='ammo'){p.ammo+=20;msg('Munitions +20 (total:'+p.ammo+')');state.items.splice(idx,1);didInteract=true}
     else if(it.type==='bandage'){
      if(p.hp<p.maxHp){let heal=Math.min(15,p.maxHp-p.hp);p.hp+=heal;msg('Bandage! +'+heal+' PV');state.items.splice(idx,1)}
      else msg('PV au max!');didInteract=true;
     }else if(it.type==='material'){
      if(addMaterial(p,1)){msg('Materiaux +1 (total:'+getMaterials(p)+')');state.items.splice(idx,1)}
      else msg('Inventaire plein!');didInteract=true;
     }
    }
   }

   if(!didInteract){
    let udoor=state.doors.find(d=>dist({x:d.x+0.5,y:d.y+0.5},{x:p.fx,y:p.fy})<INTERACT_RANGE&&!d.barricaded);
    if(udoor&&getMaterials(p)>=3){removeMaterial(p,3);udoor.barricaded=true;udoor.building.secured=true;state.map[udoor.y][udoor.x]=1;msg('Porte blindee! (E pour ouvrir/fermer)')}
    else if(udoor&&getMaterials(p)<3){msg('Il faut 3 materiaux ('+getMaterials(p)+'/3)')}
   }

   if(!state.baseEvent||!state.baseEventActive){
    if(dist({x:p.fx,y:p.fy},{x:state.escapeZone.x+0.5,y:state.escapeZone.y+0.5})<INTERACT_RANGE){nextMap();return}
   }

   let bld=getBuildingAt(p.x,p.y);if(bld)bld.searched=true;
  }

  state.holdETimer++;
  if(state.holdETimer>10){
   if(!state.draggingBarrel){
    let nearest=null,nd=Infinity;
    for(let b of state.barrels){if(!b.alive)continue;let d=dist({x:p.fx,y:p.fy},{x:b.fx,y:b.fy});if(d<INTERACT_RANGE&&d<nd){nearest=b;nd=d}}
    if(nearest)state.draggingBarrel=nearest;
   }
   if(state.draggingBarrel&&state.draggingBarrel.alive){
    let b=state.draggingBarrel;
    let tx=p.fx+Math.cos(p.angle)*1.5,ty=p.fy+Math.sin(p.angle)*1.5;
    let bdx=tx-b.fx,bdy=ty-b.fy,blen=Math.hypot(bdx,bdy)||1;
    let nbx=b.fx+bdx/blen*0.05,nby=b.fy+bdy/blen*0.05;
    if(canWalk(Math.floor(nbx+0.5),Math.floor(nby+0.5))){b.fx=nbx;b.fy=nby;b.x=Math.floor(nbx+0.5);b.y=Math.floor(nby+0.5)}
   }
  }
 }else{if(state.holdingE){state.holdingE=false;state.holdETimer=0;state.draggingBarrel=null}}

 for(let i=state.bullets.length-1;i>=0;i--){state.bullets[i].life--;if(state.bullets[i].life<=0)state.bullets.splice(i,1)}
 if(state.explosions){for(let i=state.explosions.length-1;i>=0;i--){state.explosions[i].timer--;if(state.explosions[i].timer<=0)state.explosions.splice(i,1)}}

 let playerInside=isInBuilding(p.x,p.y);
 if(playerInside){let bld=getBuildingAt(p.x,p.y);if(bld)bld.searched=true}

 // Zombies
 // Find all targets (player + NPCs)
 let targets=[{fx:p.fx,fy:p.fy,isPlayer:true,hp:p.hp}];
 for(let n of state.npcs){if(n.alive)targets.push({fx:n.fx,fy:n.fy,isNPC:true,npc:n,hp:n.hp,isLeader:n.isLeader})}

 for(let z of state.zombies){
  if(!z.alive)continue;
  if(z.cooldown>0)z.cooldown--;
  if(z.hitSlowTimer>0)z.hitSlowTimer--;
  if(z.postAttackSlow>0)z.postAttackSlow--;
  if(z.atkTimer>0){z.atkTimer--;z.isAttacking=true}
  else{if(z.isAttacking){z.postAttackSlow=POST_ATTACK_SLOW_DURATION}z.isAttacking=false}

  // Find nearest target (prefer leader)
  let bestTarget=null,bestDist=Infinity;
  for(let t of targets){
   let d=dist({x:z.fx,y:z.fy},t);
   let weight=t.isLeader?0.5:1; // Prefer leader
   if(d*weight<bestDist){bestTarget=t;bestDist=d*weight}
  }

  let actualDist=bestTarget?dist({x:z.fx,y:z.fy},bestTarget):Infinity;
  if(!z.alerted&&actualDist<=SIGHT_RADIUS){
   if(!isWallBetween(z.fx,z.fy,bestTarget.fx,bestTarget.fy)){
    z.alerted=true;
   }
  }
  if(z.alerted&&bestTarget&&actualDist<30){
   z.angle=Math.atan2(bestTarget.fy-z.fy,bestTarget.fx-z.fx);
   let zspd=(0.02+z.speed*0.008)*getSpeedMult(z);
   let adx=bestTarget.fx-z.fx,ady=bestTarget.fy-z.fy,len=Math.hypot(adx,ady)||1;
   let nx=z.fx+adx/len*zspd,ny=z.fy+ady/len*zspd;
   if(canWalk(Math.floor(nx+0.5),Math.floor(z.fy+0.5)))z.fx=nx;
   if(canWalk(Math.floor(z.fx+0.5),Math.floor(ny+0.5)))z.fy=ny;
   z.x=Math.floor(z.fx+0.5);z.y=Math.floor(z.fy+0.5);

   if(actualDist<ZOMBIE_ATK_RANGE&&z.cooldown<=0){
    z.cooldown=z.atkCooldown;z.atkTimer=z.atkDuration;
    if(Math.random()*10<z.precision){
     let dmg=Math.max(1,BASE_DMG_ZOMBIE+Math.floor(z.atk/3));
     if(bestTarget.isPlayer){
      dmg=Math.max(1,dmg-Math.floor(p.armor/2));
      p.hp-=dmg;p.hitSlowTimer=HIT_SLOW_DURATION;
      msg('Zombie frappe! -'+dmg+' PV');
      if(p.hp<=0){state.gameOver=true;state.onDeath?.();emitChange()}
     }else if(bestTarget.isNPC){
      bestTarget.npc.hp-=dmg;
      if(bestTarget.npc.hp<=0){bestTarget.npc.alive=false;msg(bestTarget.npc.isLeader?'Le chef est mort!':'Un survivant est mort!')}
     }
    }
   }
  }

  // Boss throws rocks
  if(z.isBoss&&z.alive){
   if(z.throwCooldown>0)z.throwCooldown--;
   if(z.throwCooldown<=0&&actualDist<20){
    // Prefer targeting the leader, else player
    let rockTarget=state.npcs.find(n=>n.alive&&n.isLeader)||{fx:p.fx,fy:p.fy};
    bossThrowRock(z,rockTarget);
   }
  }
 }

 // Update rock warnings & rocks
 for(let i=state.rockWarnings.length-1;i>=0;i--){
  state.rockWarnings[i].timer--;
  if(state.rockWarnings[i].timer<=0)state.rockWarnings.splice(i,1);
 }
 for(let i=state.rocks.length-1;i>=0;i--){
  let r=state.rocks[i];
  r.timer--;
  if(r.timer<=0&&!r.active){
   r.active=true;
   // Rock lands - damage in area
   let hitRadius=2;
   let pd=dist({x:r.tx,y:r.ty},{x:p.fx,y:p.fy});
   if(pd<hitRadius){let dmg=Math.max(1,r.dmg-Math.floor(p.armor/3));p.hp-=dmg;p.hitSlowTimer=HIT_SLOW_DURATION;msg('Touche par un rocher! -'+dmg+' PV');if(p.hp<=0){state.gameOver=true;state.onDeath?.();emitChange()}}
   for(let n of state.npcs){
    if(!n.alive)continue;
    if(dist({x:r.tx,y:r.ty},{x:n.fx,y:n.fy})<hitRadius){n.hp-=r.dmg;if(n.hp<=0){n.alive=false;msg(n.isLeader?'Le chef est touche!':'Survivant touche!')}}
   }
   state.explosions=state.explosions||[];
   state.explosions.push({x:r.tx,y:r.ty,timer:15});
   state.rocks.splice(i,1);
  }
 }

 // NPCs
 if(state.baseEventActive){
  for(let n of state.npcs){updateNPC(n)}
 }

 // Base defense wave logic
 if(state.baseEventActive){
  let aliveZ=state.zombies.filter(z=>z.alive).length;
  if(aliveZ===0&&state.baseWavesLeft>0){
   state.baseWaveTimer++;
   if(state.baseWaveTimer>120){
    state.baseWavesLeft--;state.baseWaveTimer=0;
    if(state.baseWavesLeft>0){spawnAssaultWave();msg('Vague '+(3-state.baseWavesLeft)+'/3!',2000)}
    else{spawnAssaultWave();msg('Derniere vague! BOSS!',3000)}
   }
  }
  // Check assault complete
  if(state.baseWavesLeft<=0&&aliveZ===0&&!state.baseRewardGiven){
   state.baseRewardGiven=true;
   let survivors=state.npcs.filter(n=>n.alive).length;
   if(survivors>0){
    // Reward
    let rewardWpn=Math.random()<0.5?'shotgun':'smg';
    let slot1=p.inventory.findIndex(i=>i===null);
    if(slot1>=0&&!p.inventory.find(i=>i&&i.name===rewardWpn)){
     p.inventory[slot1]={type:'weapon',name:rewardWpn,ammo:0};
    }
    p.ammo+=40;
    msg('Base sauvee! '+survivors+' survivant(s)! '+(WEAPONS[rewardWpn]?.label)+' + 40 munitions!',4000);
   }else{
    msg('Tous les survivants sont morts... Base perdue.',4000);
   }
   // Open escape
   let ex,ey;
   do{ex=rand(0,MAP_W-1);ey=rand(0,MAP_H-1)}while(state.map[ey][ex]!==0);
   state.escapeZone={x:ex,y:ey};state.map[ey][ex]=4;
   state.baseEventActive=false;
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

 // Tiles
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  let t=state.map[y][x];
  if(t===0){
   ctx.fillStyle=((x+y)%2===0)?COLORS.grass:COLORS.grassAlt;ctx.fillRect(x*s,y*s,s,s);
   if((x*7+y*13)%5===0){ctx.fillStyle=COLORS.grassDetail;ctx.fillRect(x*s+s*0.3,y*s+s*0.4,s*0.08,s*0.2)}
   if((x*11+y*3)%7===0){ctx.fillStyle=COLORS.grassDetail;ctx.fillRect(x*s+s*0.6,y*s+s*0.2,s*0.06,s*0.15)}
  }
  else if(t===1){
   // Determine wall orientation based on building
   let bld=null;
   for(let b of state.buildings){
    if(x>=b.x&&x<b.x+b.w&&y>=b.y&&y<b.y+b.h){bld=b;break}
   }
   let side=bld?getWallSide(bld,x,y):null;
   // Exterior face highlight
   ctx.fillStyle=COLORS.wall;ctx.fillRect(x*s,y*s,s,s);
   if(side==='top'){
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s,s,s*0.3);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s+s*0.95,s,s*0.05);
   }else if(side==='bottom'){
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s,s,s*0.05);
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s+s*0.7,s,s*0.3);
   }else if(side==='left'){
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s,s*0.3,s);
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s+s*0.95,y*s,s*0.05,s);
   }else if(side==='right'){
    ctx.fillStyle=COLORS.wallEdge;ctx.fillRect(x*s,y*s,s*0.05,s);
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s+s*0.7,y*s,s*0.3,s);
   }else{
    ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s,s,s*0.3);
   }
   // Brick
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
   let door=state.doors.find(d=>d.x===x&&d.y===y);
   if(door&&door.barricaded&&!door.open){
    ctx.fillStyle=COLORS.doorArmored;ctx.fillRect(x*s,y*s,s,s);
    ctx.fillStyle=COLORS.doorArmoredTop;ctx.fillRect(x*s,y*s,s,s*0.3);
    ctx.fillStyle='rgba(255,255,255,0.05)';
    ctx.fillRect(x*s+s*0.2,y*s+s*0.3,s*0.6,s*0.05);
    ctx.fillRect(x*s+s*0.2,y*s+s*0.6,s*0.6,s*0.05);
   }else if(door&&door.barricaded&&door.open){
    ctx.fillStyle=COLORS.floor;ctx.fillRect(x*s,y*s,s,s);
    ctx.fillStyle=COLORS.doorArmored;ctx.fillRect(x*s,y*s,s*0.25,s);
    ctx.fillStyle=COLORS.doorArmoredTop;ctx.fillRect(x*s,y*s,s*0.25,s*0.3);
   }else{
    // Broken door (not reinforced)
    ctx.fillStyle=COLORS.doorBroken;ctx.fillRect(x*s,y*s,s,s);
    ctx.fillStyle='rgba(0,0,0,0.2)';ctx.fillRect(x*s+s*0.1,y*s+s*0.05,s*0.8,s*0.9);
    // Cracks
    ctx.strokeStyle='rgba(0,0,0,0.3)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x*s+s*0.3,y*s+s*0.1);ctx.lineTo(x*s+s*0.5,y*s+s*0.5);ctx.lineTo(x*s+s*0.4,y*s+s*0.9);ctx.stroke();
    ctx.fillStyle='rgba(100,80,50,0.3)';ctx.fillRect(x*s+s*0.7,y*s+s*0.4,s*0.1,s*0.12);
   }
   continue;
  }else if(t===5){
   ctx.fillStyle=COLORS.cityWall;ctx.fillRect(x*s,y*s,s,s);
   ctx.fillStyle=COLORS.cityWallTop;ctx.fillRect(x*s,y*s,s,s*0.3);
   ctx.fillStyle='rgba(0,0,0,0.1)';ctx.fillRect(x*s,y*s+s*0.95,s,s*0.05);
   ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(x*s,y*s+s*0.5);ctx.lineTo(x*s+s,y*s+s*0.5);ctx.stroke();
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

 // Unsearched overlay
 for(let b of state.buildings){
  if(!b.searched){
   ctx.fillStyle='rgba(20,20,20,0.9)';ctx.fillRect((b.x+1)*s,(b.y+1)*s,(b.w-2)*s,(b.h-2)*s);
   ctx.fillStyle='rgba(255,255,255,0.08)';ctx.font='bold '+Math.floor(s*0.5)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText('?',(b.x+b.w/2)*s,(b.y+b.h/2)*s+s*0.15);
  }
 }

 // Items
 for(let it of state.items){
  if(it.x<x0||it.x>=x1||it.y<y0||it.y>=y1)continue;
  let bld=getBuildingAt(it.x,it.y);if(bld&&!bld.searched)continue;
  let ix=it.x*s+s/2,iy=it.y*s+s/2;
  ctx.fillStyle='rgba(0,0,0,0.3)';ctx.beginPath();ctx.ellipse(ix,iy+s*0.3,s*0.2,s*0.08,0,0,Math.PI*2);ctx.fill();
  let bob=Math.sin(state.tick*0.06+it.x*3)*s*0.04;
  if(it.type==='weapon'){
   let col=it.name==='gun'?'#556':it.name==='shotgun'?'#654':'#445';
   ctx.fillStyle=col;ctx.fillRect(ix-s*0.22,iy-s*0.15+bob,s*0.44,s*0.3);
   ctx.fillStyle='#fff';ctx.font='bold '+Math.floor(s*0.2)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText(it.name==='gun'?'P':it.name==='shotgun'?'FP':'SM',ix,iy+s*0.08+bob);
  }else{
   let col='#cc0',label='M';
   if(it.type==='ammo'){col='#b80';label='\u2022\u2022'}
   else if(it.type==='bandage'){col='#2a6a2a';label='+'}
   ctx.fillStyle=col;ctx.beginPath();ctx.arc(ix,iy-s*0.05+bob,s*0.18,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#fff';ctx.font='bold '+Math.floor(s*0.22)+'px sans-serif';ctx.textAlign='center';
   ctx.fillText(label,ix,iy+s*0.03+bob);
  }
 }

 // Barrels
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

 // Explosions
 if(state.explosions){for(let e of state.explosions){
  let ex=e.x*s+s/2,ey=e.y*s+s/2,progress=1-e.timer/20,radius=BARREL_EXPLOSION_RADIUS*s*progress;
  ctx.globalAlpha=0.6*(1-progress);ctx.fillStyle='#ff4400';ctx.beginPath();ctx.arc(ex,ey,radius,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#ffaa00';ctx.beginPath();ctx.arc(ex,ey,radius*0.4,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
 }}

 // Rock warnings
 for(let w of state.rockWarnings){
  let wx=w.x*s+s/2,wy=w.y*s+s/2;
  let alpha=0.3+0.3*Math.sin(state.tick*0.2);
  ctx.globalAlpha=alpha;ctx.strokeStyle='#f00';ctx.lineWidth=3*state.scale;
  ctx.beginPath();ctx.arc(wx,wy,s*1.5,0,Math.PI*2);ctx.stroke();
  ctx.fillStyle='#f00';ctx.font='bold '+Math.floor(s*0.35)+'px sans-serif';ctx.textAlign='center';
  ctx.fillText('\u26A0 '+w.fromDir,wx,wy-s*0.5);
  ctx.globalAlpha=1;
 }

 // NPCs
 for(let n of state.npcs){
  if(!n.alive)continue;
  drawNPC(ctx,n.fx*s+s/2,n.fy*s+s/2,s,n.angle,n);
  // HP bar
  let bw=s*0.7;
  ctx.fillStyle='#024';ctx.fillRect(n.fx*s+s*0.15,n.fy*s-s*0.22,bw,s*0.08);
  ctx.fillStyle='#0af';ctx.fillRect(n.fx*s+s*0.15,n.fy*s-s*0.22,bw*(n.hp/n.maxHp),s*0.08);
  // Leader quest marker
  if(n.isLeader&&state.baseEvent&&!state.baseEventActive){
   ctx.fillStyle='#ff0';ctx.font='bold '+Math.floor(s*0.4)+'px sans-serif';ctx.textAlign='center';
   let bounce=Math.sin(state.tick*0.08)*s*0.1;
   ctx.fillText('!',n.fx*s+s/2,n.fy*s-s*0.4+bounce);
  }
  // Label
  ctx.fillStyle=n.isLeader?'#fa0':'#0af';ctx.font='bold '+Math.floor(s*0.22)+'px sans-serif';ctx.textAlign='center';
  ctx.fillText(n.isLeader?'Chef':'PNJ',n.fx*s+s/2,n.fy*s-s*0.55);
 }

 // Zombies
 let sortedZ=state.zombies.filter(z=>z.alive).sort((a,b)=>a.fy-b.fy);
 for(let z of sortedZ){
  let atkAnim=z.atkTimer>0?(z.atkTimer/z.atkDuration):0;
  drawZombie(ctx,z.fx*s+s/2,z.fy*s+s/2,s,z.angle,z.variant,atkAnim,z.isBoss);
  let bw=s*(z.isBoss?1:0.7);
  let ox=z.isBoss?s*-0.02:s*0.15;
  ctx.fillStyle='#200';ctx.fillRect(z.fx*s+ox,z.fy*s-s*(z.isBoss?0.4:0.22),bw,s*0.08);
  ctx.fillStyle=z.isBoss?'#f80':'#c00';ctx.fillRect(z.fx*s+ox,z.fy*s-s*(z.isBoss?0.4:0.22),bw*(z.hp/z.maxHp),s*0.08);
  if(z.alerted){ctx.fillStyle='#f44';ctx.font='bold '+Math.floor(s*0.28)+'px sans-serif';ctx.textAlign='center';ctx.fillText('!',z.fx*s+s/2,z.fy*s-s*(z.isBoss?0.55:0.32))}
  if(z.isBoss){ctx.fillStyle='#fa0';ctx.font='bold '+Math.floor(s*0.24)+'px sans-serif';ctx.textAlign='center';ctx.fillText('BOSS',z.fx*s+s/2,z.fy*s-s*0.65)}
  if(z.hitSlowTimer>HIT_SLOW_DURATION-4){ctx.globalAlpha=0.3;ctx.fillStyle='#fff';ctx.fillRect(z.fx*s+s*0.1,z.fy*s+s*0.1,s*0.8,s*0.8);ctx.globalAlpha=1}
 }

 // Bullets
 for(let b of state.bullets){
  let bx=b.x*s+s/2,by=b.y*s+s/2;
  ctx.strokeStyle='rgba(255,230,100,'+(b.life/8)*0.9+')';ctx.lineWidth=2*state.scale;
  ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+Math.cos(b.angle)*b.maxDist*s,by+Math.sin(b.angle)*b.maxDist*s);ctx.stroke();
 }

 // Player
 let swProg=p.swingTimer>0?(1-p.swingTimer/p.swingDuration):0;
 drawPlayer(ctx,p.fx*s+s/2,p.fy*s+s/2,s,p.angle,swProg,p);
 if(p.hitSlowTimer>HIT_SLOW_DURATION-4){ctx.globalAlpha=0.3;ctx.fillStyle='#f00';ctx.fillRect(p.fx*s+s*0.05,p.fy*s+s*0.05,s*0.9,s*0.9);ctx.globalAlpha=1}

 ctx.fillStyle='#0af';ctx.font='bold '+Math.floor(s*0.26)+'px sans-serif';ctx.textAlign='center';
 ctx.fillText('Lv.'+p.level,p.fx*s+s/2,p.fy*s-s*0.5);

 // Weapon range + spread cone
 let selW=p.inventory[p.selectedSlot];
 let wepDef=getWeaponDef(selW);
 if(wepDef){
  let range=wepDef.range;
  let pcx=p.fx*s+s/2,pcy=p.fy*s+s/2;
  if(wepDef.melee){
   ctx.strokeStyle='rgba(200,150,100,0.12)';ctx.lineWidth=1;ctx.setLineDash([s*0.08,s*0.08]);
   ctx.beginPath();ctx.arc(pcx,pcy,range*s/2,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
   ctx.fillStyle='rgba(200,150,100,0.05)';ctx.beginPath();ctx.moveTo(pcx,pcy);
   ctx.arc(pcx,pcy,range*s/2,p.angle-(wepDef.arc||Math.PI/2)/2,p.angle+(wepDef.arc||Math.PI/2)/2);
   ctx.closePath();ctx.fill();
  }else{
   // Show spread cone that widens with distance
   let farSpread=getSpreadAtDist(wepDef,p.precision,range);
   // Draw cone
   ctx.fillStyle='rgba(255,80,80,0.04)';
   ctx.beginPath();ctx.moveTo(pcx,pcy);
   ctx.lineTo(pcx+Math.cos(p.angle-farSpread)*range*s/2,pcy+Math.sin(p.angle-farSpread)*range*s/2);
   ctx.arc(pcx,pcy,range*s/2,p.angle-farSpread,p.angle+farSpread);
   ctx.closePath();ctx.fill();
   // Cone edges
   ctx.strokeStyle='rgba(255,80,80,0.1)';ctx.lineWidth=1;ctx.setLineDash([s*0.1,s*0.08]);
   ctx.beginPath();ctx.moveTo(pcx,pcy);ctx.lineTo(pcx+Math.cos(p.angle-farSpread)*range*s/2,pcy+Math.sin(p.angle-farSpread)*range*s/2);ctx.stroke();
   ctx.beginPath();ctx.moveTo(pcx,pcy);ctx.lineTo(pcx+Math.cos(p.angle+farSpread)*range*s/2,pcy+Math.sin(p.angle+farSpread)*range*s/2);ctx.stroke();
   ctx.setLineDash([]);
   // Range circle
   ctx.strokeStyle='rgba(255,80,80,0.06)';ctx.lineWidth=1;ctx.setLineDash([s*0.1,s*0.1]);
   ctx.beginPath();ctx.arc(pcx,pcy,range*s/2,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
  }
 }

 // Swing arc
 if(p.swingTimer>0&&wepDef&&wepDef.melee){
  let progress=1-p.swingTimer/p.swingDuration,arc=wepDef.arc||Math.PI/2;
  ctx.save();ctx.translate(p.fx*s+s/2,p.fy*s+s/2);ctx.rotate(p.angle);
  ctx.strokeStyle='rgba(255,255,255,'+(0.35*(1-progress))+')';ctx.lineWidth=2*state.scale;
  ctx.beginPath();ctx.arc(0,0,wepDef.range*s/2,-arc/2,-arc/2+progress*arc);ctx.stroke();ctx.restore();
 }

 // Aim line
 let aimRange=wepDef?wepDef.range:6;
 ctx.strokeStyle='rgba(255,255,255,0.06)';ctx.lineWidth=1;ctx.setLineDash([s*0.12,s*0.08]);
 ctx.beginPath();ctx.moveTo(p.fx*s+s/2,p.fy*s+s/2);
 ctx.lineTo(p.fx*s+s/2+Math.cos(p.angle)*s*aimRange/2,p.fy*s+s/2+Math.sin(p.angle)*s*aimRange/2);ctx.stroke();ctx.setLineDash([]);

 if(state.draggingBarrel){ctx.strokeStyle='rgba(255,200,0,0.4)';ctx.lineWidth=2;let db=state.draggingBarrel;ctx.beginPath();ctx.arc(db.fx*s+s/2,db.fy*s+s/2,s*0.4,0,Math.PI*2);ctx.stroke()}

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
 state.gameOver=false;state.mapCount=0;state.explosions=[];
 genMap();spawnPlayerInBuilding();
 msg('Survivez! Zone bleue = sortie. E = interagir.',3000);
 if(state.firstGame)state.showControls=true;
}

export function retryWithSamePlayer(){
 state.gameOver=false;
 state.player.hp=state.player.maxHp;state.player.hitSlowTimer=0;state.player.postAttackSlow=0;
 state.explosions=[];
 genMap();spawnPlayerInBuilding();state.mapCount++;
 msg('Nouvelle zone... Map #'+(state.mapCount+1),3000);emitChange();
}

function nextMap(){
 state.mapCount++;let p=state.player;
 p.hp=Math.min(p.maxHp,p.hp+Math.ceil(p.maxHp*0.3));
 p.hitSlowTimer=0;p.postAttackSlow=0;
 p.x=Math.floor(MAP_W/2);p.y=Math.floor(MAP_H/2);p.fx=p.x;p.fy=p.y;
 state.explosions=[];genMap();spawnPlayerInBuilding();
 msg('Zone '+(state.mapCount+1)+'...',3000);
}

export function initCanvas(canvas){state.canvas=canvas;state.ctx=canvas.getContext('2d')}
export function setSelectedSlot(i){state.player.selectedSlot=i}
