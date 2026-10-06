const test=require('node:test');
const assert=require('node:assert/strict');
const {AutomaticLocator}=require('../public/assets/js/live-location.js');
const tick=()=>new Promise(r=>setImmediate(r));
function setup(t,changes={}){
  t.mock.timers.enable({apis:['setTimeout','setInterval','Date'],now:1700000000000});
  const result={pins:[],areas:[],states:[],ipCalls:0};
  const geo={watchPosition(success,error,options){result.receive=success;result.fail=error;result.primary=options;return 4;},clearWatch(){result.cleared=true;},getCurrentPosition(success,error,options){result.network=success;result.networkOptions=options;}};
  const locator=new AutomaticLocator({geolocation:geo,secure:true,onPosition:p=>result.pins.push(p),onApproximate:a=>result.areas.push(a),onState:s=>result.states.push(s),lookupIpArea:async()=>{result.ipCalls++;return {latitude:10.3,longitude:123.9,accuracy:20000};},...changes});
  t.after(()=>locator.stop());locator.start();
  return {...result,get ipCalls(){return result.ipCalls;},locator,reading:accuracy=>({timestamp:Date.now(),coords:{latitude:10.28,longitude:123.88,accuracy}}),source:result};
}
test('automatic capture finishes with a ready state after a precise fix without an IP request',t=>{
  const f=setup(t);assert.equal(f.primary.enableHighAccuracy,true);f.receive(f.reading(9));
  assert.equal(f.pins.length,1);assert.equal(f.locator.active,false);assert.equal(f.ipCalls,0);
  assert.equal(f.states.at(-1).state,'ready');
});
test('device network positioning is attempted before IP and preserves precise coordinates',t=>{
  const f=setup(t);t.mock.timers.tick(15000);assert.equal(f.source.networkOptions.enableHighAccuracy,false);
  f.source.network(f.reading(45));t.mock.timers.tick(15000);
  assert.equal(f.pins.length,1);assert.equal(f.pins[0].coords.accuracy,45);assert.equal(f.ipCalls,0);
  assert.equal(f.states.at(-1).state,'ready');assert.equal(f.locator.active,false);
});
test('denied device permission falls back automatically without inventing a report pin',async t=>{
  const f=setup(t);f.fail({code:1});await tick();assert.equal(f.ipCalls,1);assert.equal(f.areas.length,1);assert.equal(f.pins.length,0);assert.equal(f.locator.active,false);
  assert.equal(f.states.at(-1).state,'approximate');assert.match(f.states.at(-1).message,/Allow location/);
});
test('retry starts a fresh device request after failure and accepts a recovered location',async t=>{
  const f=setup(t,{lookupIpArea:async()=>{throw new Error('offline');}});
  f.fail({code:1});await tick();assert.equal(f.states.at(-1).state,'unavailable');
  const oldReceive=f.receive;f.locator.start();
  oldReceive(f.reading(1));assert.equal(f.pins.length,0);
  f.source.receive(f.reading(8));assert.equal(f.pins.length,1);assert.equal(f.states.at(-1).state,'ready');
});
test('a usable coarse device estimate is preferred to IP and remains approximate',async t=>{
  const f=setup(t);t.mock.timers.tick(20000);
  const coords=Object.create(Object.defineProperties({}, {latitude:{get:()=>10.28},longitude:{get:()=>123.88},accuracy:{get:()=>400}}));
  f.receive({timestamp:Date.now(),coords});t.mock.timers.tick(10000);await tick();
  assert.equal(f.ipCalls,0);assert.deepEqual(f.areas[0],{latitude:10.28,longitude:123.88,accuracy:400,label:''});assert.equal(f.pins.length,0);
});
test('late fallback responses cannot replace a manual selection or a new capture',async t=>{
  let resolve;const f=setup(t,{lookupIpArea:()=>new Promise(r=>resolve=r)});f.fail({code:1});
  f.locator.stop();f.locator.start();resolve({latitude:0,longitude:0,accuracy:5000});await tick();
  assert.equal(f.areas.length,0);assert.equal(f.pins.length,0);
});
