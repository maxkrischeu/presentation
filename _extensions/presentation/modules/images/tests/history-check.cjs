const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context={Presentation:{}};vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../history.js'),'utf8'),context);
const clone=x=>JSON.parse(JSON.stringify(x));
let state={slide:[{_id:'a',asset:'same',rotation:0},{_id:'b',asset:'same',rotation:0}]};
const history=context.Presentation.createImageHistory();
function edit(id,rotation){const before=clone(state);state.slide.find(x=>x._id===id).rotation=rotation;history.record(before,state);}
edit('a',20);edit('b',45);edit('a',90);
history.undo(state,'a');assert.equal(state.slide[0].rotation,20);assert.equal(state.slide[1].rotation,45);
history.undo(state,'a');assert.equal(state.slide[0].rotation,0);assert.equal(state.slide[1].rotation,45);assert.equal(history.canUndo('a'),false);
history.redo(state,'a');assert.equal(state.slide[0].rotation,20);
history.undo(state,null);assert.equal(state.slide[0].rotation,0);assert.equal(state.slide[1].rotation,45);
history.undo(state,null);assert.equal(state.slide[1].rotation,0);
history.redo(state,null);assert.equal(state.slide[1].rotation,45);
const before=clone(state);state.slide.push({_id:'c',asset:'same',rotation:0});history.record(before,state);
assert.equal(history.canUndo('c'),false);history.undo(state,null);assert.equal(state.slide.length,2);history.redo(state,null);assert.equal(state.slide.length,3);
// Deleting an earlier object must not confuse the remaining object's identity.
const previous=clone(state);state.slide.splice(0,1);history.record(previous,state);
history.undo(state,'b');assert.equal(state.slide.find(x=>x._id==='b').rotation,0);assert.equal(state.slide.some(x=>x._id==='a'),false);
history.undo(state,null);assert.equal(state.slide[0]._id,'a');assert.equal(state.slide.find(x=>x._id==='b').rotation,0);
console.log('PASS: scoped/global undo-redo, identical assets, insertion and deletion identity.');
