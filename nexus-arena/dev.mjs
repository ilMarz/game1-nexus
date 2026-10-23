import http from 'node:http';
import fs from 'node:fs';
import {createServer} from 'vite';
import director from './api/director.js';
import {createEnvLoader} from './load-env.mjs';
const loadEnv=createEnvLoader();loadEnv();
fs.watchFile('.env',{interval:1000,persistent:false},loadEnv);
const vite=await createServer({server:{middlewareMode:true},appType:'spa'});
const server=http.createServer(async(req,res)=>{
  if(req.url.split('?')[0]==='/api/director'){
    let body='';for await(const chunk of req){body+=chunk;if(body.length>2048){res.writeHead(413);res.end();return;}}
    req.body=body;res.status=code=>{res.statusCode=code;return res;};res.json=data=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(data));};return director(req,res);
  }
  vite.middlewares(req,res);
});
server.listen(5173,'127.0.0.1',()=>console.log('NEXUS pronto: http://127.0.0.1:5173'));
