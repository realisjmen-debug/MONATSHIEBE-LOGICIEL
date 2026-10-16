import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "jsr:@supabase/supabase-js@2/cors";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...corsHeaders,"Content-Type":"application/json"}});
const classLabel=(c:any)=>{const name=String(c?.name||"Classe").trim(),section=String(c?.section_name||"").trim(),option=String(c?.option_name||"").trim();const lower=name.toLocaleLowerCase("fr"),sectionLower=section.toLocaleLowerCase("fr"),sectionCore=sectionLower.replace(/s$/,""),optionLower=option.toLocaleLowerCase("fr");const parts=[name];if(section&& !lower.includes(sectionLower)&&!lower.includes(sectionCore)&&!sectionLower.includes(lower))parts.push(section);if(option&&!lower.includes(optionLower))parts.push(option);return [...new Set(parts)].join(" — ");};
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:corsHeaders});
 try{
  const body=await req.json(),code=String(body.code||"").trim().toUpperCase(),action=String(body.action||"login");
  const url=Deno.env.get("SUPABASE_URL")||"",service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!url||!service)return json({error:"Configuration serveur Supabase incomplète."},500);
  const db=createClient(url,service),slug=String(body.school_slug||"").trim().toLowerCase();
  const {data:school}=await db.from("schools").select("id,name,slug,logo_url,logo_path,primary_color,secondary_color").eq("slug",slug).eq("status","active").maybeSingle();
  if(!school)return json({error:"Établissement introuvable ou suspendu."},404);
  if(action==="branding"){
   let logoUrl=school.logo_url||null;
   if(school.logo_path){const {data:x}=await db.storage.from("school-assets").createSignedUrl(school.logo_path,3600);logoUrl=x?.signedUrl||logoUrl}
   return json({success:true,school:{name:school.name,slug:school.slug,logo_url:logoUrl,primary_color:school.primary_color,secondary_color:school.secondary_color}});
  }
  if(!/^T-[A-Z0-9]{8,20}$/.test(code))return json({error:"Code enseignant invalide."},400);
  const {data:teacher,error:te}=await db.from("teachers").select("id,school_id,matricule,last_name,first_name,post_name,email,phone,photo_url,access_code").eq("school_id",school.id).eq("access_code",code).eq("active",true).maybeSingle();
  if(te)return json({error:"Lecture impossible: "+te.message},500);
  if(!teacher)return json({error:"Code enseignant invalide ou désactivé."},404);
  const {data:assignments}=await db.from("teacher_subject_assignments").select("id,class_id,subject_id,academic_year_id,classes(id,name,section_name,option_name),subjects(id,name,coefficient)").eq("school_id",school.id).eq("teacher_id",teacher.id).eq("active",true);
  if(action==="login"){
   const classIds=[...new Set((assignments||[]).map((a:any)=>a.class_id).filter(Boolean))];
   const [{data:timetable,error:timeError},{data:enrollmentRows,error:enrollError}]=await Promise.all([
    db.from("schedules").select("id,weekday,start_time,end_time,room,class_id,subject_id,classes(name,section_name,option_name),subjects(name)").eq("school_id",school.id).eq("teacher_id",teacher.id).order("weekday").order("start_time"),
    classIds.length?db.from("enrollments").select("student_id,class_id,status").eq("school_id",school.id).in("status",["active","enrolled","confirmed"]).in("class_id",classIds):Promise.resolve({data:[],error:null})
   ]);
   if(timeError)return json({error:"Chargement de l'emploi du temps impossible: "+timeError.message},500);
   if(enrollError)return json({error:"Chargement des inscriptions des élèves impossible: "+enrollError.message},500);
   const studentIds=[...new Set((enrollmentRows||[]).map((x:any)=>x.student_id).filter(Boolean))];
   const {data:studentRows,error:studentError}=studentIds.length?await db.from("students").select("id,matricule,last_name,first_name").eq("school_id",school.id).in("id",studentIds):{data:[],error:null};
   if(studentError)return json({error:"Chargement des fiches élèves impossible: "+studentError.message},500);
   const studentById=new Map((studentRows||[]).map((x:any)=>[x.id,x]));
   const studentsByClass=classIds.map((classId:string)=>{const assignment=(assignments||[]).find((a:any)=>a.class_id===classId);const rows=(enrollmentRows||[]).filter((x:any)=>x.class_id===classId).map((x:any)=>studentById.get(x.student_id)).filter(Boolean);return {class_id:classId,class_name:classLabel(assignment?.classes),student_count:rows.length,students:rows.sort((a:any,b:any)=>(a.last_name||"").localeCompare(b.last_name||""))};});
   const enrichedAssignments=(assignments||[]).map((a:any)=>({...a,classes:a.classes?{...a.classes,display_name:classLabel(a.classes)}:a.classes}));
   const enrichedTimetable=(timetable||[]).map((t:any)=>({...t,classes:t.classes?{...t.classes,display_name:classLabel(t.classes)}:t.classes}));
   return json({success:true,school,teacher:{id:teacher.id,matricule:teacher.matricule,last_name:teacher.last_name,first_name:teacher.first_name,post_name:teacher.post_name},assignments:enrichedAssignments,timetable:enrichedTimetable,students_by_class:studentsByClass});
  }
  if(action==="create_assessment"){
   const classId=String(body.class_id||""),subjectId=String(body.subject_id||"");
   if(!(assignments||[]).some((a:any)=>a.class_id===classId&&a.subject_id===subjectId))return json({error:"Cette classe et cette matière ne sont pas affectées à votre compte."},403);
   if(!String(body.title||"").trim())return json({error:"Le titre de l'évaluation est obligatoire."},400);
   const {data,error}=await db.from("assessments").insert({school_id:school.id,class_id:classId,subject_id:subjectId,title:String(body.title).trim(),assessment_date:body.assessment_date||null,max_score:Number(body.max_score||20),term:String(body.term||"Trimestre 1"),assessment_type:String(body.assessment_type||"devoir"),created_by:null,created_by_teacher_id:teacher.id}).select("id,title,assessment_date,max_score,term,assessment_type,class_id,subject_id,created_by_teacher_id").single();
   if(error)return json({error:error.message},400);
   return json({success:true,assessment:data});
  }
  if(action==="list_assessments"){
   const pairs=(assignments||[]).map((a:any)=>({class_id:a.class_id,subject_id:a.subject_id,className:classLabel(a.classes),subjectName:a.subjects?.name}));
   const {data}=await db.from("assessments").select("id,title,assessment_date,max_score,term,assessment_type,class_id,subject_id").eq("school_id",school.id).order("assessment_date",{ascending:false}).limit(100);
   return json({success:true,assessments:(data||[]).filter((a:any)=>pairs.some((p:any)=>p.class_id===a.class_id&&p.subject_id===a.subject_id)).map((a:any)=>({...a,...(pairs.find((p:any)=>p.class_id===a.class_id&&p.subject_id===a.subject_id)||{})}))});
  }
  if(action==="get_grades"){
   const assessmentId=String(body.assessment_id||"");
   const {data:a}=await db.from("assessments").select("id,class_id,subject_id,title,max_score").eq("id",assessmentId).eq("school_id",school.id).maybeSingle();
   if(!a)return json({error:"Évaluation introuvable."},404);
   if(!(assignments||[]).some((x:any)=>x.class_id===a.class_id&&x.subject_id===a.subject_id))return json({error:"Accès refusé."},403);
   const {data:enrollmentRows,error:enrollmentError}=await db.from("enrollments").select("student_id,status").eq("school_id",school.id).eq("class_id",a.class_id).in("status",["active","enrolled","confirmed"]);
   if(enrollmentError)return json({error:"Chargement des élèves impossible: "+enrollmentError.message},500);
   const studentIds=[...new Set((enrollmentRows||[]).map((x:any)=>x.student_id).filter(Boolean))];
   const [{data:studentRows,error:studentError},{data:g,error:gradeError},{data:historyRows,error:historyError}]=await Promise.all([
    studentIds.length?db.from("students").select("id,matricule,last_name,first_name").eq("school_id",school.id).in("id",studentIds):Promise.resolve({data:[],error:null}),
    db.from("grades").select("student_id,score,comment").eq("assessment_id",a.id),
    studentIds.length?db.from("grades").select("id,student_id,score,comment,graded_at,assessments!inner(title,assessment_date,max_score,term,school_id,subjects(name))").in("student_id",studentIds).eq("assessments.school_id",school.id).order("graded_at",{ascending:false}).limit(1000):Promise.resolve({data:[],error:null})
   ]);
   if(studentError)return json({error:"Lecture des fiches élèves impossible: "+studentError.message},500);
   if(gradeError)return json({error:"Lecture des notes de l'évaluation impossible: "+gradeError.message},500);
   if(historyError)return json({error:"Chargement de l'historique des notes impossible: "+historyError.message},500);
   const studentById=new Map((studentRows||[]).map((x:any)=>[x.id,x]));
   const gm=new Map((g||[]).map((x:any)=>[x.student_id,x]));
   const historyByStudent=new Map<string,any[]>();
   (historyRows||[]).forEach((row:any)=>{const arr=historyByStudent.get(row.student_id)||[];arr.push(row);historyByStudent.set(row.student_id,arr)});
   const students=studentIds.map((studentId:string)=>{const current:any=gm.get(studentId);return {student_id:studentId,student:studentById.get(studentId)||null,score:current?.score??"",comment:current?.comment||"",history:historyByStudent.get(studentId)||[]}}).filter((x:any)=>x.student).sort((x:any,y:any)=>String(x.student.last_name||"").localeCompare(String(y.student.last_name||"")));
   return json({success:true,assessment:a,students});
  }
  if(action==="save_grades"){
   const assessmentId=String(body.assessment_id||""),grades=Array.isArray(body.grades)?body.grades:[];
   const {data:a,error:assessmentError}=await db.from("assessments").select("id,class_id,subject_id,school_id,max_score,term").eq("id",assessmentId).eq("school_id",school.id).maybeSingle();
   if(assessmentError)return json({error:assessmentError.message},500);
   if(!a||!(assignments||[]).some((x:any)=>x.class_id===a.class_id&&x.subject_id===a.subject_id))return json({error:"Évaluation introuvable ou non autorisée."},403);
   const {data:enrollments,error:enrollmentError}=await db.from("enrollments").select("student_id").eq("school_id",school.id).eq("class_id",a.class_id).eq("status","active");
   if(enrollmentError)return json({error:enrollmentError.message},500);
   const allowedStudents=new Set((enrollments||[]).map((x:any)=>x.student_id));
   const clean=grades.filter((g:any)=>g.score!==""&&g.score!==null&&g.score!==undefined);
   for(const g of clean){
    const score=Number(g.score);
    if(!allowedStudents.has(g.student_id))return json({error:"Un élève envoyé n'appartient pas à cette classe."},403);
    if(!Number.isFinite(score)||score<0||score>Number(a.max_score))return json({error:"Chaque note doit être comprise entre 0 et "+a.max_score+"."},400);
   }
   let saved=0;
   for(const g of clean){
    const values={score:Number(g.score),comment:g.comment?String(g.comment):null,graded_at:new Date().toISOString()};
    const {data:existing,error:findError}=await db.from("grades").select("id").eq("assessment_id",a.id).eq("student_id",g.student_id).maybeSingle();
    if(findError)return json({error:"Recherche d'une note impossible: "+findError.message,saved},500);
    const result=existing
     ?await db.from("grades").update(values).eq("id",existing.id)
     :await db.from("grades").insert({...values,assessment_id:a.id,student_id:g.student_id});
    if(result.error)return json({error:"Enregistrement interrompu après "+saved+" note(s): "+result.error.message,saved},400);
    saved++;
   }
   let reportCardsSynced=0;
   const changedStudents=[...new Set(clean.map((g:any)=>g.student_id))];
   for(const studentId of changedStudents){
    const {data:enrollment}=await db.from("enrollments").select("academic_year_id").eq("school_id",school.id).eq("student_id",studentId).eq("status","active").not("academic_year_id","is",null).limit(1).maybeSingle();
    if(!enrollment?.academic_year_id)continue;
    const {data:studentGrades,error:gradeError}=await db.from("grades").select("score,assessments!inner(subject_id,max_score,term,school_id,subjects(coefficient))").eq("student_id",studentId).eq("assessments.school_id",school.id).eq("assessments.term",a.term);
    if(gradeError)return json({error:"Les notes ont été enregistrées, mais le calcul du relevé a échoué: "+gradeError.message,saved,reportCardsSynced},500);
    const bySubject=new Map<string,{sum:number,count:number,coefficient:number}>();
    for(const row of studentGrades||[]){
     const assessment=(row as any).assessments;
     const max=Number(assessment?.max_score||0),score=Number(row.score);
     if(!assessment?.subject_id||max<=0||!Number.isFinite(score))continue;
     const current=bySubject.get(assessment.subject_id)||{sum:0,count:0,coefficient:Number(assessment.subjects?.coefficient||1)};
     current.sum+=(score/max)*20;current.count++;current.coefficient=Number(assessment.subjects?.coefficient||current.coefficient||1);
     bySubject.set(assessment.subject_id,current);
    }
    const subjectAverages=[...bySubject.entries()].map(([subject_id,v])=>({subject_id,average:Number((v.sum/v.count).toFixed(2)),coefficient:v.coefficient>0?v.coefficient:1}));
    if(!subjectAverages.length)continue;
    const weightTotal=subjectAverages.reduce((sum,x)=>sum+x.coefficient,0);
    const generalAverage=Number((subjectAverages.reduce((sum,x)=>sum+x.average*x.coefficient,0)/weightTotal).toFixed(2));
    const {data:card,error:cardError}=await db.from("report_cards").upsert({school_id:school.id,student_id:studentId,academic_year_id:enrollment.academic_year_id,term:a.term||"Trimestre 1",average:generalAverage,status:"draft",validated_by:null,validated_at:null,updated_at:new Date().toISOString()},{onConflict:"student_id,academic_year_id,term"}).select("id").single();
    if(cardError)return json({error:"Notes enregistrées, mais synchronisation du relevé impossible: "+cardError.message,saved,reportCardsSynced},500);
    const {data:existingResults,error:resultError}=await db.from("report_card_results").select("id,subject_id").eq("report_card_id",card.id);
    if(resultError)return json({error:"Moyenne générale calculée, mais détail par matière indisponible: "+resultError.message,saved,reportCardsSynced},500);
    for(const subject of subjectAverages){
     const existing=(existingResults||[]).find((x:any)=>x.subject_id===subject.subject_id);
     const values={coefficient:subject.coefficient,average:subject.average};
     const result=existing?await db.from("report_card_results").update(values).eq("id",existing.id):await db.from("report_card_results").insert({report_card_id:card.id,subject_id:subject.subject_id,...values});
     if(result.error)return json({error:"Moyenne enregistrée, mais synchronisation d'une matière échouée: "+result.error.message,saved,reportCardsSynced},500);
    }
    reportCardsSynced++;
   }
   return json({success:true,count:saved,report_cards_synced:reportCardsSynced,message:"Notes enregistrées et relevés de cote recalculés en brouillon."});
  }
  return json({error:"Action non reconnue."},400);
 }catch(e){return json({error:e instanceof Error?e.message:"Erreur serveur."},500)}
});