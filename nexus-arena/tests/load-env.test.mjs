import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createEnvLoader} from '../load-env.mjs';
test('pasted local keys are reloaded and deleted keys disappear; external env retains priority',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-env-')),file=path.join(folder,'.env');
  try{
    const env={TYPESAFE_MODEL:'externally-configured-model'};
    fs.writeFileSync(file,'TYPESAFE_MODEL=ignored\nTYPESAFE_API_KEY=placeholder\n');const reload=createEnvLoader(file,env);reload();
    fs.writeFileSync(file,'TYPESAFE_MODEL=also-ignored\nTYPESAFE_API_KEY=new-test-key\n');reload();
    assert.equal(env.TYPESAFE_API_KEY,'new-test-key');assert.equal(env.TYPESAFE_MODEL,'externally-configured-model');
    fs.writeFileSync(file,'TYPESAFE_MODEL=ignored\n');reload();assert.equal(env.TYPESAFE_API_KEY,undefined);
  }finally{fs.unlinkSync(file);fs.rmdirSync(folder);}
});
