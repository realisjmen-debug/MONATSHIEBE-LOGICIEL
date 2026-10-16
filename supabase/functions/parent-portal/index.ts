import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 try{
  const body=await req.json(),code=String(body.code||"").trim().toUpperCase(),slug=String(body.school_slug||"").trim().toLowerCase(),action=String(body.action||"login");
  if(!slug)return json({error:"Le lien de l'établissement est requis."},400);
  const url=Deno.env.get("SUPABASE_URL")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!service)return json({error:"Configuration serveur Supabase incomplète."},500);
  const db=createClient(url,service);
  const {data:school,error:se}=await db.from("schools").select("id,name,slug,logo_url,logo_path,primary_color,secondary_color,city,phone,address").eq("slug",slug).eq("status","active").maybeSingle();
  if(se)return json({error:"Lecture de l'établissement impossible: "+se.message},500);
  if(!school)return json({error:"Établissement introuvable ou suspendu."},404);
  if(action==="branding"){let logoUrl=school.logo_url||null;if(school.logo_path){const {data:x}=await db.storage.from("school-assets").createSignedUrl(school.logo_path,3600);logoUrl=x?.signedUrl||logoUrl}return json({success:true,school:{name:school.name,slug:school.slug,logo_url:logoUrl,primary_color:school.primary_color,secondary_color:school.secondary_color}});}
  if(!/^P-[A-Z0-9]{8,20}$/.test(code))return json({error:"Code parent invalide."},400);
  const {data:s,error:e}=await db.from("students").select("id,school_id,matricule,last_name,first_name,post_name,sex,date_of_birth,photo_url,photo_path,parent_access_code").eq("school_id",school.id).eq("parent_access_code",code).eq("active",true).maybeSingle();
  if(e)return json({error:"Lecture impossible: "+e.message},500);
  if(!s)return json({error:"Code invalide pour cet établissement."},404);
  let logoUrl=school.logo_url||null,photoUrl=s.photo_url||null;
  if(school.logo_path){const {data:x}=await db.storage.from("school-assets").createSignedUrl(school.logo_path,3600);logoUrl=x?.signedUrl||logoUrl}
  if(s.photo_path){const {data:x}=await db.storage.from("school-assets").createSignedUrl(s.photo_path,3600);photoUrl=x?.signedUrl||photoUrl}
  const [{data:enrollments},{data:payments},{data:studentFees},{data:feeInstallments},{data:parents},{data:announcements},{data:attendance},{data:grades},{data:reportCards},{data:notifications}]=await Promise.all([
   db.from("enrollments").select("registration_number,status,registered_at,classes(name),academic_years(name,is_current)").eq("student_id",s.id).order("registered_at",{ascending:false}).limit(5),
   db.from("payments").select("id,receipt_number,amount,currency,method,status,paid_at,note,student_fee_id,payment_items(id,description,amount,currency,fee_id,installment_id)").eq("student_id",s.id).order("paid_at",{ascending:false}).limit(100),
   db.from("student_fees").select("id,fee_id,amount_due,discount,currency,fees(name,frequency,currency)").eq("school_id",s.school_id).eq("student_id",s.id).order("id",{ascending:false}).limit(100),
   db.from("fee_installments").select("id,fee_id,name,installment_number,due_date,amount,currency").eq("school_id",s.school_id).eq("active",true).order("installment_number"),
   db.from("student_parents").select("relationship,is_primary,parents(first_name,last_name,phone,email)").eq("student_id",s.id).order("is_primary",{ascending:false}),
   db.from("announcements").select("id,title,content,created_at,audience").eq("school_id",s.school_id).eq("published",true).in("audience",["parents","all"]).order("created_at",{ascending:false}).limit(20),
   db.from("attendance").select("attendance_date,status,note").eq("student_id",s.id).eq("school_id",s.school_id).order("attendance_date",{ascending:false}).limit(60),
   db.from("grades").select("score,comment,assessments(title,assessment_date,max_score,term,assessment_type,subjects(name))").eq("student_id",s.id).order("graded_at",{ascending:false}).limit(100),
   db.from("report_cards").select("id,term,status,average,rank,appreciation,academic_years(name),report_card_results(subject_id,coefficient,average,rank,teacher_comment,subjects(name))").eq("student_id",s.id).eq("school_id",s.school_id).eq("status","published").order("created_at",{ascending:false}).limit(10),
   db.from("parent_notifications").select("id,notification_type,title,message,created_at,read_at").eq("student_id",s.id).eq("school_id",s.school_id).order("created_at",{ascending:false}).limit(50)
  ]);
  const installmentsByFee=new Map<string,any[]>();
  (feeInstallments||[]).forEach((row:any)=>{const list=installmentsByFee.get(row.fee_id)||[];list.push(row);installmentsByFee.set(row.fee_id,list)});
  const enrichedStudentFees=(studentFees||[]).map((row:any)=>{const installments=installmentsByFee.get(row.fee_id)||[];return {...row,fee_installments:installments[0]||null,installments}});
  const paidRows=(payments||[]).filter((p:any)=>p.status==="validated");
  const fcPaid=paidRows.filter((p:any)=>p.currency!=="USD").reduce((a:number,p:any)=>a+Number(p.amount||0),0);
  const usdPaid=paidRows.filter((p:any)=>p.currency==="USD").reduce((a:number,p:any)=>a+Number(p.amount||0),0);
  const fcDue=enrichedStudentFees.filter((f:any)=>String(f.currency||f.fees?.currency||"FC").toUpperCase()!=="USD").reduce((a:number,f:any)=>a+Math.max(0,Number(f.amount_due||0)-Number(f.discount||0)),0);
  const usdDue=enrichedStudentFees.filter((f:any)=>String(f.currency||f.fees?.currency||"FC").toUpperCase()==="USD").reduce((a:number,f:any)=>a+Math.max(0,Number(f.amount_due||0)-Number(f.discount||0)),0);
  return json({success:true,school:{...school,logo_url:logoUrl},student:{id:s.id,matricule:s.matricule,last_name:s.last_name,first_name:s.first_name,post_name:s.post_name,sex:s.sex,date_of_birth:s.date_of_birth,photo_url:photoUrl},access_code:code,enrollments:enrollments||[],parents:(parents||[]).map((x:any)=>({relationship:x.relationship,is_primary:x.is_primary,parent:x.parents})),finances:{fc_due:fcDue,usd_due:usdDue,fc_paid:fcPaid,usd_paid:usdPaid,fc_balance:Math.max(0,fcDue-fcPaid),usd_balance:Math.max(0,usdDue-usdPaid),payments:paidRows,fees:enrichedStudentFees},attendance:attendance||[],grades:grades||[],report_cards:reportCards||[],announcements:announcements||[],notifications:notifications||[]});
 }catch(e){return json({error:e instanceof Error?e.message:"Erreur serveur."},500)}
});