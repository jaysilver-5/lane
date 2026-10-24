import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
const file=new URL('../content/review/ontario-g1.review-workbench.html',import.meta.url);
const port=4175;
createServer(async(req,res)=>{
 if(req.headers.host!==`127.0.0.1:${port}`||!['GET','HEAD'].includes(req.method)||req.url!=='/') {res.writeHead(404);res.end();return;}
 try{
  const body=await readFile(file);
  res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'; connect-src 'none'"});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(503);res.end('Run npm run content:prepare first.');}
}).listen(port,'127.0.0.1',()=>console.log(`FirstLane internal question review: http://127.0.0.1:${port}/`));
