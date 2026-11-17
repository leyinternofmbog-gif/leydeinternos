const crypto=require('node:crypto');
const nodemailer=require('nodemailer');
const {sign,verify,reply}=require('./_security');
const emails=()=>new Set((process.env.AUTHORIZED_EMAILS||'').split(/[,;|]/).map(x=>x.trim().toLowerCase()).filter(Boolean));
exports.handler=async(event)=>{
 if(event.httpMethod!=='POST')return reply(405,{error:'Método no permitido'});
 let body;try{body=JSON.parse(event.body||'{}')}catch{return reply(400,{error:'JSON inválido'})}
 const email=String(body.email||'').trim().toLowerCase();
 if(!emails().has(email))return reply(403,{error:'Correo no autorizado'});
 try{
  if(body.action==='request_code'){
   const code=crypto.randomInt(0,1000000).toString().padStart(6,'0');
   const challenge=sign({type:'otp',email,hash:crypto.createHash('sha256').update(email+':'+code+':'+process.env.OTP_SECRET_KEY).digest('hex'),exp:Date.now()+10*60*1000});
   const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||465),secure:Number(process.env.SMTP_PORT||465)===465,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}});
   await transport.sendMail({from:process.env.SMTP_FROM||process.env.SMTP_USER,to:email,subject:'Código de acceso UNAL RIM',text:`Tu código de acceso es ${code}. Expira en 10 minutos.`,html:`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto"><h2>Universidad Nacional de Colombia</h2><p>Código de acceso a UNAL RIM:</p><p style="font-size:30px;letter-spacing:6px"><strong>${code}</strong></p><p>Válido durante 10 minutos. Si no lo solicitaste, ignora este mensaje.</p></div>`});
   return reply(200,{message:'Código enviado',challenge});
  }
  if(body.action==='verify_code'){
   const p=verify(body.challenge);const code=String(body.code||'');
   if(!p||p.type!=='otp'||p.email!==email||!/^[0-9]{6}$/.test(code))return reply(401,{error:'Código inválido o expirado'});
   const hash=crypto.createHash('sha256').update(email+':'+code+':'+process.env.OTP_SECRET_KEY).digest('hex');
   if(!crypto.timingSafeEqual(Buffer.from(hash),Buffer.from(p.hash)))return reply(401,{error:'Código incorrecto'});
   return reply(200,{authenticated:true,token:sign({type:'session',email,exp:Date.now()+8*3600*1000}),expires_at:Math.floor(Date.now()/1000)+28800,email});
  }
  return reply(400,{error:'Acción no válida'});
 }catch(e){console.error('OTP error',e.message);return reply(500,{error:'Error de configuración o envío de correo'})}
};
