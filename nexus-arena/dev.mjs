import http from 'node:http';
import fs from 'node:fs';
import {createServer} from 'vite';
import director from './api/director.js';
import commander from './api/commander.js';
import {createEnvLoader} from './load-env.mjs';
const loadEnv=createEnvLoader();loadEnv();
fs.watchFile('.env',{interval:1000,persistent:false},loadEnv);
const vite=await createServer({server:{middlewareMode:true},appType:'spa'});
const server=http.createServer(async(req,res)=>{
  const route=req.url.split('?')[0];
  if(['/api/director','/api/commander'].includes(route)){
    const handler=route==='/api/commander'?commander:director,max=route==='/api/commander'?8192:2048;
    let body='';for await(const chunk of req){body+=chunk;if(body.length>max){res.writeHead(413);res.end();return;}}
    req.body=body;res.status=code=>{res.statusCode=code;return res;};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};return handler(req,res);
  }
  vite.middlewares(req,res);
});
server.listen(5173,'127.0.0.1',()=>console.log('NEXUS pronto: http://127.0.0.1:5173'));
