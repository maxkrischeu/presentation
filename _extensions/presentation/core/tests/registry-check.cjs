const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../registry.js'),'utf8');
function runtime(){const c={queueMicrotask,URLSearchParams,location:{search:''},document:{documentElement:{classList:{contains:()=>false}}}};c.window=c;vm.createContext(c);vm.runInContext(source,c);const p=c.Presentation;Object.assign(p,{t:x=>x,session:{saved:()=>null},mountModes(){},mountMenu(){},mountDock(){},mountHelp(){}});return p;}
(async()=>{
 let p=runtime(),order=[];p.register({id:'second',requires:['first'],setup:()=>{order.push('second');return{commands:[{id:'test',key:'X'}]}}});p.register({id:'first',setup:()=>{order.push('first');return{}}});await p.start({});assert.deepEqual(order,['first','second']);assert.ok(p.commands.has('test'));assert.throws(()=>p.register({id:'late'}),/before/);
 p=runtime();p.register({id:'a',setup:()=>({})});assert.throws(()=>p.register({id:'a'}),/Duplicate/);
 p=runtime();p.register({id:'a',requires:['absent'],setup:()=>({})});await assert.rejects(p.start({}),/Missing/);
 p=runtime();p.register({id:'a',requires:['b'],setup:()=>({})});p.register({id:'b',requires:['a'],setup:()=>({})});await assert.rejects(p.start({}),/Circular/);
 p=runtime();p.register({id:'a',setup:()=>({commands:[{id:'same'}]})});p.register({id:'b',setup:()=>({commands:[{id:'same'}]})});await assert.rejects(p.start({}),/Duplicate/);
 console.log('PASS: dependency ordering, unknown/cyclic dependencies, duplicate registrations and late registration guards.');
})().catch(e=>{console.error(e);process.exitCode=1;});
