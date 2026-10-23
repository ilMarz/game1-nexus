import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createEnvLoader} from '../load-env.mjs';
test('pasted local keys are reloaded and deleted keys disappear; external env retains priority',()=>{
  const folder=fs.mkdtempSync(path.join(os.tmpdir(),'nexus-env-')),file=path.join(folder,'.env');
  try{
    const env={HF_MODEL:'externally-configured-model'};
    fs.writeFileSync(file,'HF_MODEL=ignored\nTYPESAFE_API_KEY=placeholder\n');const reload=createEnvLoader(file,env);reload();
    fs.writeFileSync(file,'HF_MODEL=also-ignored\nTYPESAFE_API_KEY=new-test-key\n');reload();
    assert.equal(env.TYPESAFE_API_KEY,'new-test-key');assert.equal(env.HF_MODEL,'externally-configured-model');
    fs.writeFileSync(file,'HF_MODEL=ignored\n');reload();assert.equal(env.TYPESAFE_API_KEY,undefined);
  }finally{fs.unlinkSync(file);fs.rmdirSync(folder);}
});
