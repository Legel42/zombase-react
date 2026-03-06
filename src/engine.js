// Game engine - all game logic and canvas rendering
export const TILE=32,MAP_W=40,MAP_H=30,INV_SIZE=4;
const COLORS={floor:'#3a3530',wall:'#6b6260',wallTop:'#555050',door:'#8B5e13',grass:'#2a4a2a',grassAlt:'#254525',escape:'#0af'};
const SIGHT_RADIUS=7,GUNSHOT_ALERT_RADIUS=18,SAFE_SPAWN_RADIUS=14;
export const BASE_HP_PLAYER=25,BASE_HP_ZOMBIE=50,BASE_DMG_GUN=20,BASE_DMG_ZOMBIE=5;
const BAT_RANGE=2.8,BAT_ARC=Math.PI/2.5;
const HIT_SLOW_DURATION=20;

const rand=(a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

// Game state - mutable singleton
export const state={
 canvas:null,ctx:null,cam:{x:0,y:0},
 keys:{},mouseX:0,mouseY:0,mouseDown:false,
 gameOver:false,showStats:false,
 map:[],buildings:[],doors:[],items:[],zombies:[],bullets:[],
 escapeZone:{x:0,y:0},
 player:null,mapCount:0,tick:0,attackPressed:false,
 W:0,H:0,scale:1,
 message:'',msgTimer:null,
 onDeath:null,onMessage:null,onStateChange:null
};

function emitChange(){state.onStateChange?.()}
function msg(t,d=2000){
 state.message=t;
 clearTimeout(state.msgTimer);
 state.msgTimer=setTimeout(()=>{state.message='';emitChange()},d);
 emitChange();
}

function isInBuilding(tx,ty){
 for(let b of state.buildings){
  if(tx>b.x&&tx<b.x+b.w-1&&ty>b.y&&ty<b.y+b.h-1)return true;
 }
 return false;
}

// -- Sprites --
function drawPlayer(ctx,cx,cy,s,angle,swingAnim,player){
 ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);
 let u=s/32;
 ctx.fillStyle='rgba(0,0,0,0.3)';
 ctx.beginPath();ctx.ellipse(0,2*u,10*u,6*u,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#2d5a1e';ctx.fillRect(-7*u,-8*u,14*u,16*u);
 ctx.fillStyle='#3a7a28';ctx.fillRect(-7*u,-10*u,14*u,4*u);
 ctx.fillStyle='#2d5a1e';
 ctx.fillRect(6*u,-10*u,4*u,12*u);ctx.fillRect(-10*u,-10*u,4*u,12*u);
 ctx.fillStyle='#e8c090';ctx.fillRect(6*u,-12*u,4*u,4*u);ctx.fillRect(-10*u,-12*u,4*u,4*u);
 ctx.fillStyle='#e8c090';ctx.fillRect(-5*u,-15*u,10*u,9*u);
 ctx.fillStyle='#d4a870';ctx.fillRect(-5*u,-8*u,10*u,2*u);
 ctx.fillStyle='#222';ctx.fillRect(3*u,-13*u,2*u,3*u);ctx.fillRect(3*u,-9*u,2*u,2*u);
 let sel=player.inventory[player.selectedSlot];
 if(sel&&sel.name==='bat'){
  if(swingAnim>0){
   let swA=-BAT_ARC/2+swingAnim*BAT_ARC*1.2;
   ctx.save();ctx.rotate(swA);
   ctx.fillStyle='#c49a6c';ctx.fillRect(10*u,-2*u,16*u,3*u);
   ctx.fillStyle='#a07848';ctx.fillRect(22*u,-3*u,6*u,5*u);
   ctx.restore();
  }else{
   ctx.fillStyle='#c49a6c';ctx.fillRect(10*u,-2*u,16*u,3*u);
   ctx.fillStyle='#a07848';ctx.fillRect(22*u,-3*u,6*u,5*u);
  }
 }else if(sel&&sel.name==='gun'){
  ctx.fillStyle='#555';ctx.fillRect(10*u,-2*u,16*u,3*u);
  ctx.fillStyle='#333';ctx.fillRect(8*u,-3*u,6*u,5*u);
 }
 ctx.restore();
}

function drawZombie(ctx,cx,cy,s,angle,variant,atkAnim){
 ctx.save();ctx.translate(cx,cy);ctx.rotate(angle);
 let u=s/32;
 ctx.fillStyle='rgba(0,0,0,0.3)';
 ctx.beginPath();ctx.ellipse(0,2*u,10*u,6*u,0,0,Math.PI*2);ctx.fill();
 let bc=variant===0?'#5a3030':'#4a4030';
 let bc2=variant===0?'#7a4040':'#6a5a40';
 ctx.fillStyle=bc;ctx.fillRect(-7*u,-8*u,14*u,16*u);
 ctx.fillStyle=bc2;ctx.fillRect(-7*u,-10*u,14*u,4*u);
 let armExtend=atkAnim>0?8*u*atkAnim:0;
 ctx.fillStyle='#6a8a60';
 ctx.fillRect(6*u,-10*u-armExtend,4*u,12*u+armExtend);
 ctx.fillRect(-10*u,-10*u-armExtend,4*u,12*u+armExtend);
 ctx.fillStyle='#7a9a70';
 ctx.fillRect(6*u,-12*u-armExtend,4*u,4*u);
 ctx.fillRect(-10*u,-12*u-armExtend,4*u,4*u);
 ctx.fillStyle='#7a9a70';ctx.fillRect(-5*u,-15*u,10*u,9*u);
 ctx.fillStyle='#6a8a60';ctx.fillRect(-5*u,-8*u,10*u,2*u);
 ctx.fillStyle='#f33';ctx.fillRect(3*u,-13*u,2*u,3*u);ctx.fillRect(3*u,-9*u,2*u,2*u);
 if(atkAnim>0){ctx.fillStyle='#300';ctx.fillRect(2*u,-7*u,3*u,3*u)}
 ctx.restore();
}

// -- Player --
function initPlayer(){
 let pvStat=rand(1,5);
 state.player={
  x:Math.floor(MAP_W/2),y:Math.floor(MAP_H/2),
  hp:BASE_HP_PLAYER+pvStat*5,maxHp:BASE_HP_PLAYER+pvStat*5,
  pvStat,atk:rand(1,5),armor:rand(1,5),precision:rand(1,5),speed:rand(1,5),
  inventory:[{type:'weapon',name:'bat'},null,null,null],
  selectedSlot:0,cooldown:0,angle:0,
  fx:Math.floor(MAP_W/2),fy:Math.floor(MAP_H/2),
  swingTimer:0,swingDuration:15,hitSlowTimer:0,isAttacking:false
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

function makeZombie(x,y){
 let pvStat=rand(1,10);
 let hp=BASE_HP_ZOMBIE+pvStat*5;
 return{x,y,hp,maxHp:hp,atk:rand(1,10),armor:rand(1,10),precision:rand(1,10),
  speed:Math.max(1,rand(1,3)),fx:x,fy:y,
  cooldown:0,atkCooldown:60,atkTimer:0,atkDuration:15,
  alive:true,alerted:false,variant:rand(0,1),
  angle:Math.random()*Math.PI*2,hitSlowTimer:0,isAttacking:false};
}

function genMap(){
 state.map=Array.from({length:MAP_H},()=>Array(MAP_W).fill(0));
 state.buildings=[];state.doors=[];state.items=[];state.zombies=[];state.bullets=[];
 let{map,buildings,doors,items,zombies,player}=state;

 let attempts=0;
 while(buildings.length<rand(5,8)&&attempts<200){
  attempts++;
  let w=rand(4,7),h=rand(4,6),bx=rand(1,MAP_W-w-1),by=rand(1,MAP_H-h-1);
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
  buildings.push({x:bx,y:by,w,h,secured:false});
  doors.push({x:doorPos.x,y:doorPos.y,barricaded:false,building:buildings[buildings.length-1]});
 }

 let gunCount=0;
 for(let bi=0;bi<buildings.length;bi++){
  let b=buildings[bi];
  let ix=rand(b.x+1,b.x+b.w-2),iy=rand(b.y+1,b.y+b.h-2);
  if(gunCount<2&&(bi<2||Math.random()<0.3)){
   items.push({x:ix,y:iy,type:'gun',ammo:10});gunCount++;
  }
  let lx=rand(b.x+1,b.x+b.w-2),ly=rand(b.y+1,b.y+b.h-2);
  if(lx===ix&&ly===iy)lx=clamp(lx+1,b.x+1,b.x+b.w-2);
  items.push({x:lx,y:ly,type:Math.random()<0.5?'ammo':'bandage'});
 }
 for(let i=0;i<rand(8,15);i++){
  let x,y;do{x=rand(0,MAP_W-1);y=rand(0,MAP_H-1)}while(map[y][x]!==0);
  items.push({x,y,type:'material'});
 }
 for(let i=0;i<rand(10,18);i++){
  let x,y;do{x=rand(0,MAP_W-1);y=rand(0,MAP_H-1)}while(map[y][x]!==0||dist({x,y},player)<SAFE_SPAWN_RADIUS);
  zombies.push(makeZombie(x,y));
 }
 let ex,ey;
 do{ex=rand(0,MAP_W-1);ey=rand(0,MAP_H-1)}while(map[ey][ex]!==0||dist({x:ex,y:ey},player)<15);
 state.escapeZone={x:ex,y:ey};map[ey][ex]=4;
}

function spawnPlayerInBuilding(){
 if(!state.buildings.length)return;
 let b=state.buildings[0],p=state.player;
 p.x=b.x+Math.floor(b.w/2);p.y=b.y+Math.floor(b.h/2);
 p.fx=p.x;p.fy=p.y;
}

function alertZombiesNear(px,py,radius){
 let playerInside=isInBuilding(Math.floor(px+0.5),Math.floor(py+0.5));
 for(let z of state.zombies){
  if(!z.alive||z.alerted)continue;
  if(dist({x:px,y:py},{x:z.fx,y:z.fy})>radius)continue;
  if(playerInside&&!isInBuilding(z.x,z.y))continue;
  z.alerted=true;
 }
}

function getSpeedMult(entity){
 let m=1;
 if(entity.isAttacking)m*=0.75;
 if(entity.hitSlowTimer>0)m*=0.5;
 return m;
}

function zombieDrop(x,y){
 if(Math.random()>0.25)return;
 state.items.push({x,y,type:Math.random()<0.5?'bandage':'ammo'});
}

function canWalk(tx,ty){
 if(tx<0||ty<0||tx>=MAP_W||ty>=MAP_H)return false;
 return state.map[ty][tx]!==1;
}

function meleeAttack(p){
 p.cooldown=Math.max(15,35-p.speed*3);
 for(let z of state.zombies){
  if(!z.alive)continue;
  let d=dist({x:p.fx,y:p.fy},{x:z.fx,y:z.fy});
  if(d<BAT_RANGE){
   let toZ=Math.atan2(z.fy-p.fy,z.fx-p.fx);
   let diff=Math.abs(toZ-p.angle);if(diff>Math.PI)diff=2*Math.PI-diff;
   if(diff<BAT_ARC/2){
    if(Math.random()*10<p.precision+3){
     let dmg=Math.max(1,p.atk+3-Math.floor(z.armor/4));
     z.hp-=dmg;z.alerted=true;z.hitSlowTimer=HIT_SLOW_DURATION;
     msg('Touche! -'+dmg+' PV');
     if(z.hp<=0){z.alive=false;zombieDrop(z.x,z.y);msg('Zombie elimine!')}
    }else msg('Rate!');
   }
  }
 }
}

function shootAttack(p){
 p.cooldown=20;
 let maxSpread=(6-p.precision)*0.05;
 let spread=(Math.random()-0.5)*2*maxSpread;
 let shotAngle=p.angle+spread;
 let adx=Math.cos(shotAngle),ady=Math.sin(shotAngle);
 alertZombiesNear(p.fx,p.fy,GUNSHOT_ALERT_RADIUS);
 state.bullets.push({x:p.fx,y:p.fy,angle:shotAngle,maxDist:15,life:8});
 for(let i=1;i<15;i++){
  let sx=Math.floor(p.fx+0.5+adx*i),sy=Math.floor(p.fy+0.5+ady*i);
  if(sx<0||sy<0||sx>=MAP_W||sy>=MAP_H||state.map[sy][sx]===1)break;
  let hit=state.zombies.find(z=>z.alive&&dist({x:z.fx,y:z.fy},{x:p.fx+0.5+adx*i,y:p.fy+0.5+ady*i})<0.8);
  if(hit){
   let dmg=Math.max(1,BASE_DMG_GUN+p.atk-Math.floor(hit.armor/3));
   hit.hp-=dmg;hit.hitSlowTimer=HIT_SLOW_DURATION;hit.alerted=true;
   msg('Tir touche! -'+dmg);
   if(hit.hp<=0){hit.alive=false;zombieDrop(hit.x,hit.y);msg('Zombie abattu!')}
   return;
  }
 }
 msg('Tir rate!');
}

// -- Public API --
export function update(){
 if(state.gameOver)return;
 state.tick++;
 let p=state.player,{keys}=state;

 if(p.hitSlowTimer>0)p.hitSlowTimer--;
 if(p.swingTimer>0)p.swingTimer--;
 if(p.cooldown>0){p.cooldown--;p.isAttacking=true}else{p.isAttacking=false}

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

 if(state.mouseDown&&!state.attackPressed&&p.cooldown<=0){
  state.attackPressed=true;
  let sel=p.inventory[p.selectedSlot];
  if(sel&&sel.type==='weapon'){
   if(sel.name==='bat'){meleeAttack(p);p.swingTimer=p.swingDuration}
   else if(sel.name==='gun'){
    if(sel.ammo>0){shootAttack(p);sel.ammo--}
    else msg('Plus de munitions!');
   }
  }else msg('Selectionnez une arme (1-4)');
 }
 if(!state.mouseDown)state.attackPressed=false;

 if(keys.KeyE){
  keys.KeyE=false;
  let idx=state.items.findIndex(i=>i.x===p.x&&i.y===p.y);
  if(idx>=0){
   let it=state.items[idx];
   if(it.type==='gun'){
    let existing=p.inventory.find(i=>i&&i.name==='gun');
    if(existing){existing.ammo+=(it.ammo||10);msg('Munitions +'+(it.ammo||10));state.items.splice(idx,1)}
    else{
     let slot=p.inventory.findIndex(i=>i===null);
     if(slot>=0){p.inventory[slot]={type:'weapon',name:'gun',ammo:it.ammo||10};msg('Pistolet! (slot '+(slot+1)+')');state.items.splice(idx,1)}
     else msg('Inventaire plein!');
    }
   }else if(it.type==='ammo'){
    let gun=p.inventory.find(i=>i&&i.name==='gun');
    if(gun){gun.ammo+=20;msg('Munitions +20');state.items.splice(idx,1)}
    else msg('Pas de pistolet!');
   }else if(it.type==='bandage'){
    if(p.hp<p.maxHp){let heal=Math.min(15,p.maxHp-p.hp);p.hp+=heal;msg('Bandage! +'+heal+' PV');state.items.splice(idx,1)}
    else msg('PV au max!');
   }else if(it.type==='material'){
    if(addMaterial(p,1)){msg('Materiaux +1 (total:'+getMaterials(p)+')');state.items.splice(idx,1)}
    else msg('Inventaire plein!');
   }
  }
  let door=state.doors.find(d=>d.x===p.x&&d.y===p.y&&!d.barricaded);
  if(door&&getMaterials(p)>=3){
   removeMaterial(p,3);door.barricaded=true;door.building.secured=true;
   state.map[door.y][door.x]=1;msg('Porte barricadee!');
  }else if(door&&getMaterials(p)<3){msg('Il faut 3 materiaux ('+getMaterials(p)+'/3)')}
  if(p.x===state.escapeZone.x&&p.y===state.escapeZone.y){nextMap();return}
 }

 for(let i=state.bullets.length-1;i>=0;i--){
  state.bullets[i].life--;
  if(state.bullets[i].life<=0)state.bullets.splice(i,1);
 }

 let playerInside=isInBuilding(p.x,p.y);
 for(let z of state.zombies){
  if(!z.alive)continue;
  if(z.cooldown>0)z.cooldown--;
  if(z.hitSlowTimer>0)z.hitSlowTimer--;
  if(z.atkTimer>0){z.atkTimer--;z.isAttacking=true}else{z.isAttacking=false}
  let d=dist({x:z.fx,y:z.fy},{x:p.fx,y:p.fy});
  if(!z.alerted&&d<=SIGHT_RADIUS){
   if(!playerInside||isInBuilding(z.x,z.y))z.alerted=true;
  }
  if(z.alerted&&d<25){
   z.angle=Math.atan2(p.fy-z.fy,p.fx-z.fx);
   let zspd=(0.02+z.speed*0.008)*getSpeedMult(z);
   let adx=p.fx-z.fx,ady=p.fy-z.fy,len=Math.hypot(adx,ady)||1;
   let nx=z.fx+adx/len*zspd,ny=z.fy+ady/len*zspd;
   if(canWalk(Math.floor(nx+0.5),Math.floor(z.fy+0.5)))z.fx=nx;
   if(canWalk(Math.floor(z.fx+0.5),Math.floor(ny+0.5)))z.fy=ny;
   z.x=Math.floor(z.fx+0.5);z.y=Math.floor(z.fy+0.5);
   if(d<1.2&&z.cooldown<=0){
    z.cooldown=z.atkCooldown;z.atkTimer=z.atkDuration;
    if(Math.random()*10<z.precision){
     let dmg=Math.max(1,BASE_DMG_ZOMBIE+Math.floor(z.atk/3)-Math.floor(p.armor/2));
     p.hp-=dmg;p.hitSlowTimer=HIT_SLOW_DURATION;
     msg('Zombie frappe! -'+dmg+' PV');
     if(p.hp<=0){state.gameOver=true;state.onDeath?.();emitChange()}
    }
   }
  }
 }

 state.showStats=!!keys.Tab;
 emitChange();
}

export function draw(){
 let{ctx,player:p,cam}=state;
 let s=TILE*state.scale;
 ctx.fillStyle='#111';ctx.fillRect(0,0,state.W,state.H);
 cam.x=p.fx*s-state.W/2+s/2;cam.y=p.fy*s-state.H/2+s/2;

 ctx.save();ctx.translate(-cam.x,-cam.y);
 let x0=Math.max(0,Math.floor(cam.x/s)-1),x1=Math.min(MAP_W,Math.ceil((cam.x+state.W)/s)+1);
 let y0=Math.max(0,Math.floor(cam.y/s)-1),y1=Math.min(MAP_H,Math.ceil((cam.y+state.H)/s)+1);

 // Tiles
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
  let t=state.map[y][x];
  if(t===0){ctx.fillStyle=((x+y)%2===0)?COLORS.grass:COLORS.grassAlt}
  else if(t===1){
   ctx.fillStyle=COLORS.wall;ctx.fillRect(x*s,y*s,s,s);
   ctx.fillStyle=COLORS.wallTop;ctx.fillRect(x*s,y*s,s,s*0.35);
   continue;
  }else if(t===2){ctx.fillStyle=COLORS.floor}
  else if(t===3){ctx.fillStyle=COLORS.door}
  else{ctx.fillStyle=COLORS.escape}
  ctx.fillRect(x*s,y*s,s,s);
  if(t===4){
   ctx.globalAlpha=0.3+0.2*Math.sin(state.tick*0.08);
   ctx.fillStyle='#fff';ctx.fillRect(x*s+4,y*s+4,s-8,s-8);
   ctx.globalAlpha=1;
  }
 }

 // Items
 for(let it of state.items){
  if(it.x<x0||it.x>=x1||it.y<y0||it.y>=y1)continue;
  let ix=it.x*s+s/2,iy=it.y*s+s/2;
  ctx.fillStyle='rgba(0,0,0,0.3)';
  ctx.beginPath();ctx.ellipse(ix,iy+s*0.3,s*0.2,s*0.08,0,0,Math.PI*2);ctx.fill();
  let bob=Math.sin(state.tick*0.06+it.x*3)*s*0.04;
  let col='#cc0',label='M';
  if(it.type==='gun'){col='#c44';label='G'}
  else if(it.type==='ammo'){col='#fa0';label='A'}
  else if(it.type==='bandage'){col='#4c4';label='+'}
  ctx.fillStyle=col;
  ctx.fillRect(ix-s*0.2,iy-s*0.2+bob,s*0.4,s*0.35);
  ctx.fillStyle='#000';ctx.font=Math.floor(s*0.28)+'px monospace';ctx.textAlign='center';
  ctx.fillText(label,ix,iy+s*0.08+bob);
 }

 // Zombies
 let sortedZ=state.zombies.filter(z=>z.alive).sort((a,b)=>a.fy-b.fy);
 for(let z of sortedZ){
  let atkAnim=z.atkTimer>0?(z.atkTimer/z.atkDuration):0;
  drawZombie(ctx,z.fx*s+s/2,z.fy*s+s/2,s,z.angle,z.variant,atkAnim);
  let bw=s*0.8;
  ctx.fillStyle='#400';ctx.fillRect(z.fx*s+s*0.1,z.fy*s-s*0.25,bw,s*0.1);
  ctx.fillStyle='#f00';ctx.fillRect(z.fx*s+s*0.1,z.fy*s-s*0.25,bw*(z.hp/z.maxHp),s*0.1);
  if(z.alerted){ctx.fillStyle='#f55';ctx.font=Math.floor(s*0.3)+'px monospace';ctx.textAlign='center';ctx.fillText('!',z.fx*s+s/2,z.fy*s-s*0.35)}
  if(z.hitSlowTimer>HIT_SLOW_DURATION-4){ctx.globalAlpha=0.4;ctx.fillStyle='#fff';ctx.fillRect(z.fx*s+s*0.1,z.fy*s+s*0.1,s*0.8,s*0.8);ctx.globalAlpha=1}
 }

 // Bullets
 for(let b of state.bullets){
  let bx=b.x*s+s/2,by=b.y*s+s/2;
  ctx.strokeStyle='rgba(255,255,100,'+(b.life/8)*0.8+')';
  ctx.lineWidth=2*state.scale;
  ctx.beginPath();ctx.moveTo(bx,by);
  ctx.lineTo(bx+Math.cos(b.angle)*b.maxDist*s,by+Math.sin(b.angle)*b.maxDist*s);ctx.stroke();
 }

 // Player
 let swProg=p.swingTimer>0?(1-p.swingTimer/p.swingDuration):0;
 drawPlayer(ctx,p.fx*s+s/2,p.fy*s+s/2,s,p.angle,swProg,p);
 if(p.hitSlowTimer>HIT_SLOW_DURATION-4){ctx.globalAlpha=0.3;ctx.fillStyle='#f00';ctx.fillRect(p.fx*s+s*0.05,p.fy*s+s*0.05,s*0.9,s*0.9);ctx.globalAlpha=1}

 // Swing arc
 if(p.swingTimer>0){
  let progress=1-p.swingTimer/p.swingDuration;
  ctx.save();ctx.translate(p.fx*s+s/2,p.fy*s+s/2);ctx.rotate(p.angle);
  ctx.strokeStyle='rgba(255,255,255,'+(0.4*(1-progress))+')';
  ctx.lineWidth=2*state.scale;
  ctx.beginPath();ctx.arc(0,0,BAT_RANGE*s/2,-BAT_ARC/2,-BAT_ARC/2+progress*BAT_ARC);ctx.stroke();
  ctx.restore();
 }

 // Aim line
 ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1;
 ctx.setLineDash([s*0.15,s*0.1]);
 ctx.beginPath();ctx.moveTo(p.fx*s+s/2,p.fy*s+s/2);
 ctx.lineTo(p.fx*s+s/2+Math.cos(p.angle)*s*6,p.fy*s+s/2+Math.sin(p.angle)*s*6);ctx.stroke();
 ctx.setLineDash([]);
 ctx.restore();
}

export function resize(){
 state.W=window.innerWidth;state.H=window.innerHeight;
 state.scale=Math.max(1,Math.min(Math.floor(state.W/(MAP_W*TILE*0.5)),Math.floor(state.H/(MAP_H*TILE*0.5)),3));
 state.canvas.width=state.W;state.canvas.height=state.H;
 state.ctx.imageSmoothingEnabled=false;
}

export function startGame(){
 initPlayer();
 state.player.x=Math.floor(MAP_W/2);state.player.y=Math.floor(MAP_H/2);
 state.player.fx=state.player.x;state.player.fy=state.player.y;
 state.gameOver=false;state.mapCount=0;
 genMap();spawnPlayerInBuilding();
 msg('Survivez! Zone bleue = sortie. E = interagir.',3000);
}

export function retryWithSamePlayer(){
 state.gameOver=false;
 state.player.hp=state.player.maxHp;state.player.hitSlowTimer=0;
 genMap();spawnPlayerInBuilding();state.mapCount++;
 msg('Nouvelle zone... Map #'+(state.mapCount+1),3000);
 emitChange();
}

function nextMap(){
 state.mapCount++;
 let p=state.player;
 p.hp=Math.min(p.maxHp,p.hp+Math.ceil(p.maxHp*0.3));
 p.hitSlowTimer=0;p.x=Math.floor(MAP_W/2);p.y=Math.floor(MAP_H/2);
 p.fx=p.x;p.fy=p.y;
 genMap();spawnPlayerInBuilding();
 msg('Zone '+(state.mapCount+1)+'...',3000);
}

export function initCanvas(canvas){
 state.canvas=canvas;
 state.ctx=canvas.getContext('2d');
}

export function setSelectedSlot(i){state.player.selectedSlot=i}
