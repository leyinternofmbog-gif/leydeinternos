const crypto = require('node:crypto');
function secret() { const s=process.env.OTP_SECRET_KEY; if(!s || s.length<32) throw Error('Configure OTP_SECRET_KEY (mínimo 32 caracteres)'); return s; }
function sign(payload) { const data=Buffer.from(JSON.stringify(payload)).toString('base64url'); const mac=crypto.createHmac('sha256',secret()).update(data).digest('base64url'); return data+'.'+mac; }
function verify(token) { if(typeof token!=='string') return null; const parts=token.split('.'); if(parts.length!==2)return null; const expected=crypto.createHmac('sha256',secret()).update(parts[0]).digest('base64url'); const a=Buffer.from(expected),b=Buffer.from(parts[1]); if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null; let p; try{p=JSON.parse(Buffer.from(parts[0],'base64url').toString())}catch{return null} return p.exp>Date.now()?p:null; }
function reply(statusCode,data){return {statusCode,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'},body:JSON.stringify(data)}}
module.exports={sign,verify,reply};
