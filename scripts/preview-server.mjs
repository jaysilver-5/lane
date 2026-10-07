import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../preview/index.html',import.meta.url));const port=Number(process.env.PORT||8765);
createServer((req,res)=>{if(req.url!=='/'&&req.url!=='/index.html'){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'});res.end(html);}).listen(port,'127.0.0.1',()=>console.log(`FirstLane design preview: http://127.0.0.1:${port} — local only; not a native runtime.`));
