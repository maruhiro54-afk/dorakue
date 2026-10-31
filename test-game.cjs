const fs=require('fs'),vm=require('vm'),assert=require('assert');
const code=fs.readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>/)[1];
function game(saved=null,reduced=false,initialRandom=.99){let now=1000,random=initialRandom,timers=[],store;const math=Object.create(Math);math.random=()=>random;const ctx=new Proxy({}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>(o[k]=v,true)});const els={};const el=()=>({textContent:'',children:[],replaceChildren(){this.children=[]},append(b){this.children.push(b)},getContext:()=>ctx});const box={Math:math,performance:{now:()=>now},matchMedia:()=>({matches:reduced}),document:{querySelector:k=>els[k]??=el(),querySelectorAll:()=>[],createElement:el,addEventListener(){}},localStorage:{getItem:()=>saved?JSON.stringify(saved):null,setItem:(k,v)=>store=v},setTimeout:f=>timers.push(f),requestAnimationFrame(){},confirm:()=>false};vm.createContext(box);vm.runInContext(code,box);return {run:s=>vm.runInContext(s,box),random:r=>random=r,tick:()=>{now+=200;vm.runInContext('animate(performance.now())',box)},timers,els,saved:()=>JSON.parse(store)}}
for(const reduced of [false,true]){const g=game(null,reduced),r=g.run;
// All stairs, the boss, and every searchable floor tile must be reachable.
for(let floor=0;floor<4;floor++){const map=r('maps['+floor+']'),start=floor?{x:3,y:3}:{x:3,y:9},seen=new Set(),q=[start];while(q.length){const {x,y}=q.shift(),key=x+','+y;if(seen.has(key)||!map[y]?.[x]||'#THN'.includes(map[y][x]))continue;seen.add(key);for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]])q.push({x:x+dx,y:y+dy})}for(let y=0;y<26;y++)for(let x=0;x<40;x++)if(!'#THN'.includes(map[y][x]))assert(seen.has(x+','+y),'unreachable floor '+floor+' tile '+x+','+y)}
r("p.x=33;p.y=5;idle()");assert(g.els['#actions'].children.some(b=>b.textContent.includes('降りる')));
for(let f=1;f<=3;f++){r("constDown=stairPoint(p.floor,'>');p.x=constDown.x;p.y=constDown.y;useStairs(1)");assert.equal(r('p.floor'),f);assert.equal(r('map[p.y][p.x]'),'<');r('animate(performance.now())');assert(g.els['#actions'].children.some(b=>b.textContent.includes('上る')))}
r('useStairs(1)');assert.equal(r('p.floor'),3);
for(let f=2;f>=0;f--){r("constUp=stairPoint(p.floor,'<');p.x=constUp.x;p.y=constUp.y;useStairs(-1)");assert.equal(r('p.floor'),f);assert.equal(r('map[p.y][p.x]'),'>')}
r('p.x=12;p.y=6;motion.start=-1000');g.random(0);r('move(1,0)');assert.equal(r('p.chests.length'),0);g.tick();r('search()');assert.equal(r('p.chests.length'),1);assert.equal(r('p.chests[0].floor'),0);r('openChest()');assert.equal(r('p.chests.length'),0);r('search()');assert.equal(r('p.chests.length'),0);
for(const [value,result]of [[.1,'p.herbs>3'],[.3,'p.gold>0'],[.6,'p.poison===8'],[.9,'enemy!==null']]){g.random(value);r('enemy=null;busy=false;p.chests=[{x:p.x,y:p.y,floor:p.floor}];openChest()');assert(r(result))}
r('enemy=null;p.floor=1;map=maps[1];p.x=3;p.y=3;p.chests=[{x:3,y:3,floor:0}];idle()');assert(!r('nearbyChest()'));r('p.poison=8;heal()');assert.equal(r('p.poison'),0);
r('p.floor=3;map=maps[3];p.x=34;p.y=21;motion.start=-1000;p.hasKey=false;p.won=false');r('openGoal()');assert(!r('p.won'));r('p.hasKey=true;openGoal()');assert(r('p.won'));r('encounter();p.hp=1;retaliate()');g.timers.shift()();assert.equal(r('p.floor'),0);assert.equal(r('p.x'),3);assert.equal(r('motion.x'),96);
r('stats()');assert.equal(g.saved().floor,0);console.log('PASS: connected 4 expanded maps, stairs roundtrip/buttons, search-only treasure, no repeated farming, all loot outcomes, floor isolation, poison cure, locked goal and clear condition, defeat return; reduced='+reduced)}
const old=game({x:3,y:9,hp:20,level:4,gold:42,chests:[{x:12,y:5}]});assert.equal(old.run('p.level'),4);assert.equal(old.run('p.gold'),42);assert.equal(old.run('p.floor'),0);assert.equal(old.run('p.chests.length'),0);console.log('PASS: legacy save migration');

// Visible monsters take one turn per successful player move and never on blocked moves.
for(const reduced of [false,true]){
 const g=game(null,reduced),r=g.run;
 r("p.floor=1;map=maps[1];p.x=3;p.y=6;p.monsters=[{id:'test',floor:1,x:5,y:6,name:'こけ玉'},{id:'other',floor:2,x:5,y:6,name:'森のぷるり'}];motion.start=-1000");
 g.random(.99);r('move(1,0)');assert.equal(r('p.monsters[0].x'),5);assert.equal(r('p.monsters[0].y'),5);assert.equal(r('p.monsters[1].y'),6);assert(!r('enemy'));
 g.tick();r('p.x=1;p.y=6;motion.start=-1000');const before=r('JSON.stringify(p.monsters)');r('move(-1,0)');assert.equal(r('JSON.stringify(p.monsters)'),before);
 r("p.x=3;p.y=6;motion.start=-1000;p.monsters=[{id:'test',floor:1,x:5,y:6,name:'こけ玉'}]");g.random(0);r('move(1,0)');assert.equal(r('enemy.mapId'),'test');assert.equal(r('enemy.name'),'こけ玉');
 r('enemy.hp=1;attack(false)');assert(!r('p.won'));g.timers.shift()();assert.equal(r('p.monsters.length'),0);assert(!r('p.won'));
 r("p.monsters=[{id:'test',floor:1,x:p.x,y:p.y,name:'こけ玉'}];encounter(false,p.monsters[0]);flee()");assert(!r('enemy'));assert(r('Math.abs(p.monsters[0].x-p.x)+Math.abs(p.monsters[0].y-p.y)>=4'));
 // Contact initiated by player also starts a fight, no hidden random encounters.
 g.tick();r("p.x=3;p.y=6;motion.start=-1000;p.monsters=[{id:'test',floor:1,x:4,y:6,name:'こけ玉'}];move(1,0)");assert(r('enemy.mapId==="test"'));
 r('enemy=null;p.monsters=[];p.x=3;p.y=6;motion.start=-1000');for(let i=0;i<20;i++){g.tick();r(i%2?'move(-1,0)':'move(1,0)');assert(!r('enemy'))}
 // Key is picked up by walking onto it, then saved and restored unchanged.
 r('p.floor=p.key.floor;map=maps[p.floor];p.x=p.key.x;p.y=p.key.y;p.hasKey=false');assert(r('collectKey().length>0'));r('stats()');const restored=game(g.saved());assert(restored.run('p.hasKey'));assert.equal(restored.run('JSON.stringify(p.key)'),r('JSON.stringify(p.key)'));
 r('p.floor=3;map=maps[3];p.x=35;p.y=20;p.hasKey=true;p.won=false;search()');assert(r('p.won'));r('stats()');assert(game(g.saved()).run('p.won'));
 console.log('PASS: monster turn cadence/contact/defeat/flee, no random encounters, key pickup/persistence, keyed goal clear; reduced='+reduced)
}
const positions=new Set();for(const roll of [.01,.2,.4,.6,.8,.99]){const g=game(null,false,roll);positions.add(g.run('JSON.stringify(p.key)'));assert(g.run("p.key.floor<3 && maps[p.key.floor][p.key.y][p.key.x]==='.'"));assert(g.run('p.monsters.length===32'));assert(g.run('!p.monsters.some(m=>m.floor===p.key.floor&&m.x===p.key.x&&m.y===p.key.y)'))}assert(positions.size>=5);console.log('PASS: new adventure randomizes key and spawns valid map monsters');
