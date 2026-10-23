import fs from 'node:fs';
import {parseEnv} from 'node:util';
// External environment variables retain priority over the editable local file.
export function createEnvLoader(file='.env',env=process.env){
  const external=new Set(Object.keys(env));
  let loaded=new Set();
  return ()=>{
    let parsed;try{parsed=parseEnv(fs.readFileSync(file,'utf8'));}catch{return;}
    for(const key of loaded)if(!external.has(key)&&!(key in parsed))delete env[key];
    for(const [key,value] of Object.entries(parsed))if(!external.has(key))env[key]=value;
    loaded=new Set(Object.keys(parsed));
  };
}
