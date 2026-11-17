const {verify,reply}=require('./_security');
async function fetchRecords(token){
 if(!token||!process.env.REDCAP_API_URL)throw Error('Falta configuración REDCap');
 const params=new URLSearchParams({token,content:'record',format:'json',type:'flat',rawOrLabel:'raw',exportCheckboxLabel:'false'});
 const res=await fetch(process.env.REDCAP_API_URL,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:params});
 if(!res.ok)throw Error('REDCap HTTP '+res.status);
 const data=await res.json();if(!Array.isArray(data))throw Error('Respuesta REDCap inesperada');return data;
}
const clean=v=>Number(String(v||'').replace(/[^0-9]/g,''))||0;
const month=v=>String(v||'').padStart(2,'0');
function months(start,end){if(!/^\d{4}-\d{2}/.test(start||''))return [];const now=new Date();const limit=now.getUTCFullYear()*12+now.getUTCMonth();let a=Number(start.slice(0,4))*12+Number(start.slice(5,7))-1;let b=/^\d{4}-\d{2}/.test(end||'')?Number(end.slice(0,4))*12+Number(end.slice(5,7))-1:limit;b=Math.min(b,limit);const out=[];while(a<=b&&out.length<240){out.push(`${Math.floor(a/12)}-${month(a%12+1)}`);a++}return out}
function values(){const map={};for(const item of (process.env.VALOR_PLANILLA_POR_ANIO||'').split('|')){const [y,v]=item.split(':');if(/^\d{4}$/.test(y||'')&&v)map[y]=clean(v)}return map}
exports.handler=async(event)=>{
 if(event.httpMethod!=='GET')return reply(405,{error:'Método no permitido'});
 try{
  const auth=event.headers.authorization||event.headers.Authorization||'';const session=verify(auth.replace(/^Bearer\s+/i,''));
  if(!session||session.type!=='session')return reply(401,{error:'Inicia sesión para consultar el tablero'});
  const [encuestas,maestra]=await Promise.all([fetchRecords(process.env.REDCAP_TOKEN_ENCUESTA),fetchRecords(process.env.REDCAP_TOKEN_MAESTRA)]);
  const grouped=new Map();const ideal=values();
  for(const r of encuestas){const doc=String(r.documento||'').trim();if(!doc)continue;const year=String(r.ano_cotizacion||r.anio_reporte||'').trim(),m=month(r.mes_cotizacion||r.mes_reporte);const periodo=/^\d{4}$/.test(year)&&/^(0[1-9]|1[0-2])$/.test(m)?`${year}-${m}`:'';const amount=clean(r.valor_planilla);const expected=ideal[year];const alerts=[];
   if(!r.pdf_planilla)alerts.push('Sin PDF adjunto');
   if(expected!==undefined&&amount!==expected)alerts.push('Valor distinto al configurado');
   if(String(r.giro_mes_anterior)==='0')alerts.push('Reporta no haber recibido giro');
   if(String(r.renuncia_giro)==='1')alerts.push('Renuncia al estímulo');
   const record={record_id:r.record_id,periodo,fecha_cargue:'',fecha_pago:r.fecha_pago||'',numero_planilla:String(r.numero_planilla||''),valor_planilla:amount,valor_esperado:expected??null,valor_diferente:expected!==undefined&&amount!==expected,sin_giro:String(r.giro_mes_anterior)==='0',pdf_nombre:r.pdf_planilla?'Archivo adjunto en REDCap':'',nombre_pdf_esperado:periodo?`${periodo}-${doc}.pdf`:'',cumple_estandar_pdf:null,recomendacion_pdf:null,renuncio:String(r.renuncia_giro)==='1',alertas:alerts};
   if(!grouped.has(doc))grouped.set(doc,[]);grouped.get(doc).push(record);
  }
  const estudiantes=maestra.map(e=>{const doc=String(e.numero_identificacion||'').trim();const regs=grouped.get(doc)||[];const byMonth=new Map(),byNumber=new Map();for(const r of regs){if(r.periodo){byMonth.set(r.periodo,(byMonth.get(r.periodo)||0)+1)}if(r.numero_planilla){if(!byNumber.has(r.numero_planilla))byNumber.set(r.numero_planilla,new Set());byNumber.get(r.numero_planilla).add(r.periodo)}}for(const r of regs){if(r.periodo&&(byMonth.get(r.periodo)||0)>1)r.alertas.push('Múltiples cargues del mismo mes');if(r.numero_planilla&&(byNumber.get(r.numero_planilla)?.size||0)>1)r.alertas.push('N° planilla repetido en meses distintos')}
   const name=[e.primer_nombre,e.segundo_nombre,e.primer_apellido,e.segundo_apellido].filter(Boolean).join(' ');return {documento:doc,nombre:name,ips:e.nombre_entidad_reporta||'',inicio_practica:e.fecha_inicio_practica||'',fin_practica:e.fecha_fin_practica||'',meses_faltantes:months(e.fecha_inicio_practica,e.fecha_fin_practica).filter(x=>!byMonth.has(x)),meses_exentos:[],total_reportes:regs.length,historico:regs.sort((a,b)=>b.periodo.localeCompare(a.periodo))}});
  return reply(200,{estudiantes,avisos:['Los meses faltantes son preliminares: no se dispone de un campo estructurado de meses exentos.','Los nombres de los PDF no pueden validarse desde la exportación de registros de REDCap.']});
 }catch(e){console.error('Audit error',e.message);return reply(500,{error:'No se pudo completar la consulta de auditoría'})}
};
