import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PauseState} from '../pause-state.js';
test('returning from the chat: a movement key resumes the automatic focus pause',()=>{
  const changes=[];const state=new PauseState((...args)=>changes.push(args));
  state.pause(true);state.movementPressed();
  assert.equal(state.paused,false);assert.deepEqual(changes,[[true,true],[false,false]]);
});
test('changing windows while manually paused never makes movement resume the game',()=>{
  const changes=[];const state=new PauseState((...args)=>changes.push(args));
  state.pause();state.pause(true);state.movementPressed();
  assert.equal(state.paused,true);assert.equal(state.automatic,false);assert.equal(changes.length,1);
  state.resume();assert.equal(state.paused,false);
});
test('blur and visibility events do not toggle a paused game back on',()=>{
  const changes=[];const state=new PauseState((...args)=>changes.push(args));
  state.pause(true);state.pause(true);assert.equal(state.paused,true);assert.equal(changes.length,1);
  state.reset();state.movementPressed();assert.equal(state.paused,false);assert.equal(changes.length,1);
});
