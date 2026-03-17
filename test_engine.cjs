global.window = { innerWidth: 800, innerHeight: 600, addEventListener: ()=>{} };
global.document = {
  createElement: (t) => {
    if(t==='canvas') return { width:0, height:0, getContext:()=>({imageSmoothingEnabled:false, fillStyle:'', fillRect:()=>{}, beginPath:()=>{}, arc:()=>{}, fill:()=>{}, stroke:()=>{}, moveTo:()=>{}, lineTo:()=>{}, closePath:()=>{}, setLineDash:()=>{}, strokeRect:()=>{}, save:()=>{}, restore:()=>{}, translate:()=>{}, rotate:()=>{}, scale:()=>{}, measureText:()=>({width:0}), drawImage:()=>{}, createRadialGradient:()=>({addColorStop:()=>{}}), fillText:()=>{}, globalAlpha:1, lineWidth:1, font:'', textAlign:'', textBaseline:'', roundRect:()=>{}, ellipse:()=>{} }) };
  },
  addEventListener: ()=>{}, removeEventListener: ()=>{}
};
global.Audio = class { constructor(){this.volume=0;this.loop=false;this.currentTime=0} play(){return Promise.resolve()} pause(){} cloneNode(){return new Audio()} };
global.setTimeout = (fn, ms) => 1;
global.clearTimeout = () => {};
global.performance = { now: () => Date.now() };

const fs = require('fs');
let code = fs.readFileSync('src/engine.js', 'utf-8');
code = code.replace(/^export /gm, '').replace(/export\{[^}]*\}/g,'');
code += `
;try{
  initCanvas({width:800,height:600,getContext:()=>document.createElement('canvas').getContext()});
  resize();
  startGame();
  console.log('startGame OK');
  for(let i=0;i<10;i++) update();
  console.log('update OK (10 ticks)');
  draw();
  console.log('draw OK');
}catch(e){
  console.error('CRASH:', e.message);
  console.error(e.stack?.split('\\n').slice(0,6).join('\\n'));
}
`;
eval(code);
