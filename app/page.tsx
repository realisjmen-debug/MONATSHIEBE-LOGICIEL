"use client";
import {useEffect,useMemo,useState} from "react";
import {schoolSupabase as supabase} from "../lib/supabase";
import LogisticsConsole from "../components/LogisticsConsole";
import StudentStaffModules from "../components/StudentStaffModules";
import SchoolOperationsModules from "../components/SchoolOperationsModules";
import StaffRegistry from "../components/StaffRegistry";
import {LayoutDashboard,Users,GraduationCap,Wallet,Settings,LogOut,Menu,X,Search,Plus,Printer,ShieldCheck,BookOpen,UserCog,Receipt,UserRound,School,Save,ClipboardList,CalendarCheck,BarChart3,HeartHandshake,FileText,MessageSquare,CheckCircle,AlertTriangle,CreditCard as CreditCardIcon,Boxes} from "lucide-react";

type P={id:string;school_id:string;full_name:string|null;role_id:string|null;active:boolean;permission_overrides?:Record<string,boolean>;roles?:{name:string;label:string}|null};
const money=(n:number,currency="FC")=>new Intl.NumberFormat("fr-FR",{maximumFractionDigits:0}).format(n)+" "+(currency==="USD"?"$":"FC");
const today=()=>new Date().toISOString().slice(0,10);
async function signedAsset(path:string|null|undefined){if(!path)return null;const {data}=await supabase.storage.from("school-assets").createSignedUrl(path,3600);return data?.signedUrl||null;}

export default function Home(){
 const [session,setSession]=useState<any>(null),[profile,setProfile]=useState<P|null>(null),[school,setSchool]=useState<any>(null),[subscription,setSubscription]=useState<any>(null),[enabledModules,setEnabledModules]=useState<Record<string,boolean>|null>(null),[requestedSlug,setRequestedSlug]=useState(""),[page,setPage]=useState("dashboard"),[loading,setLoading]=useState(true),[mobile,setMobile]=useState(false),[error,setError]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{if(typeof window!=="undefined"&&window.location.hash&&(window.location.hash.includes("type=recovery")||window.location.hash.includes("access_token="))){window.location.replace("/platform/reset-password"+window.location.hash);return}const entryParams=new URLSearchParams(window.location.search);if(window.location.pathname==="/"&&!entryParams.get("school")){window.location.replace("/platform/login");return}const params=new URLSearchParams(window.location.search);const pathMatch=window.location.pathname.match(/^\/ecole\/([^/]+)/);const slug=params.get("school")||pathMatch?.[1]||"";setRequestedSlug(slug);if(slug)supabase.from("schools").select("*").eq("slug",slug).maybeSingle().then(({data})=>{if(data)setSchool(data)});supabase.auth.getSession().then(({data})=>{setSession(data.session);if(data.session)loadUser(data.session.user.id,slug);else setLoading(false)});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{setSession(s);const currentParams=new URLSearchParams(window.location.search);const currentPathMatch=window.location.pathname.match(/^\/ecole\/([^/]+)/);const currentSlug=currentParams.get("school")||currentPathMatch?.[1]||"";setRequestedSlug(currentSlug);if(s)loadUser(s.user.id,currentSlug);else{setProfile(null);setLoading(false)}});return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(!profile)return;if(profile.roles?.name==="discipline")setPage("attendance");else if(profile.roles?.name==="surveillant")setPage("students")},[profile?.roles?.name]);
 useEffect(()=>{if(enabledModules&&enabledModules[page]===false&&!(profile?.roles?.name==="promoteur"&&page==="staff_payroll"))setPage("dashboard")},[enabledModules,page,profile?.roles?.name]);
 async function loadUser(uid:string,slug=""){
  setLoading(true);setError("");
  const {data:ctx,error:e}=await supabase.rpc("get_current_school_context");
  const p=ctx?.[0]||null;
  if(e){setProfile(null);setError(e.message);setLoading(false);return}
  if(!p){
   if(!slug){
    const {data:pa}=await supabase.from("platform_admins").select("user_id,active").eq("user_id",uid).eq("active",true).maybeSingle();
    if(pa?.active){window.location.href="/platform";return}
   }
   setProfile(null);setError("Votre compte est authentifié, mais aucun accès à un établissement ne lui est encore attribué. Le Super Administrateur doit d'abord créer l'école puis vous affecter un rôle.");setLoading(false);return
  }
  const normalized:any={id:p.id,school_id:p.school_id,full_name:p.full_name,role_id:p.role_id,active:p.active,roles:p.role_name?{name:p.role_name,label:p.role_label}:null,permission_overrides:p.permission_overrides||{}};
  if(slug){
    const {data:target,error:te}=await supabase.from("schools").select("*").eq("slug",slug).maybeSingle();
    if(te||!target){setProfile(null);setError("Établissement introuvable.");setLoading(false);return}
    if(target.id!==p.school_id){setProfile(null);setError("Ce compte n'est pas autorisé à accéder à cet établissement.");setLoading(false);return}
    setSchool(target)
  }
  setProfile(normalized);
  await loadSchool(p.school_id);
  setLoading(false)
 }
 async function loadSchool(id:string){const [{data},{data:sub},{data:mods}]=await Promise.all([supabase.from("schools").select("*").eq("id",id).single(),supabase.from("school_subscriptions").select("*,subscription_plans(name)").eq("school_id",id).order("created_at",{ascending:false}).limit(1).maybeSingle(),supabase.from("school_modules").select("module_key,enabled").eq("school_id",id)]);if(data?.logo_path){const url=await signedAsset(data.logo_path);if(url)data.logo_url=url}const enabled:Record<string,boolean>={};(mods||[]).forEach((m:any)=>{enabled[m.module_key]=m.enabled===true});setEnabledModules(enabled);setSchool(data);setSubscription(sub)}
 async function login(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setError(error.message);setBusy(false)}
 async function logout(){await supabase.auth.signOut()}
 if(loading)return <div className="center"><div className="loader"/><p>Chargement de MONATSHIEBE LOGICIEL…</p></div>;
 if(!session&&!requestedSlug)return <SoftwareLanding/>;
 if(!session)return <Login school={school} email={email} password={password} setEmail={setEmail} setPassword={setPassword} busy={busy} error={error} onSubmit={login}/>;
 if(!profile&&requestedSlug)return <Login school={school} email={email} password={password} setEmail={setEmail} setPassword={setPassword} busy={busy} error={error} onSubmit={login}/>;
 if(!profile)return <div className="center"><ShieldCheck size={42}/><h2>Compte en attente</h2><p>{error||"Compte authentifié sans profil scolaire actif."}</p><p style={{marginTop:8,fontSize:14,opacity:.75}}>Compte actuellement connecté : <b>{session?.user?.email||"inconnu"}</b></p><button className="btn" onClick={logout}>Changer de compte</button></div>;
 const role=profile?.roles?.name||"promoteur";
 if(role==="enseignant")return <div className="center"><BookOpen size={42}/><h2>Portail Enseignant</h2><p>Votre accès pédagogique se fait uniquement avec votre code enseignant.</p><a className="btn" href={school?.slug?"/ecole/"+encodeURIComponent(school.slug)+"/enseignant":"#"}>Ouvrir mon portail enseignant</a><button className="btn light" onClick={logout}>Se déconnecter</button></div>;
 const expired=subscription?.ends_at&&new Date(subscription.ends_at).getTime()<Date.now();
 const suspended=subscription && !["trial","active"].includes(subscription.status);
 if(suspended||expired)return <div className="center"><ShieldCheck size={42}/><h2>Accès à l’établissement suspendu</h2><p>L’abonnement de <b>{school?.name}</b> est {expired?"arrivé à expiration":"actuellement "+subscription.status}. Contactez le Super Administrateur pour réactiver l’accès.</p><button className="btn" onClick={logout}>Se déconnecter</button></div>;
 const secretaryVisible = new Set(["dashboard","students","parents","enrollments","attendance","sms_notifications","announcements","reportcards","studentFinance","schedule","studies","discipline","audit"]);
 const can=(feature:string,...allowedRoles:string[])=>{
  const ov=profile.permission_overrides||{};
  if(role==="promoteur") return ["staff","announcements","staff_payroll"].includes(feature);
  // Secretariat defaults take precedence over stale/old overrides so validated access is actually granted.
  if(role==="secretaire") return ["students","parents","enrollments","attendance","sms_notifications","announcements"].includes(feature);
  if(Object.prototype.hasOwnProperty.call(ov,feature)) return ov[feature]===true;
  return allowedRoles.includes(role);
 };
 const canView=(feature:string)=>{
  const ov=profile.permission_overrides||{};
  if(role==="promoteur")return ["dashboard","students","parents","attendance","schedule","staff","staff_registry","staff_attendance","staff_payroll","library","announcements","audit"].includes(feature);
  // Explicit validated secretariat profile wins over legacy per-user overrides.
  if(role==="secretaire")return secretaryVisible.has(feature);
  if(Object.prototype.hasOwnProperty.call(ov,feature))return ov[feature]===true;
  if(role==="discipline")return ["dashboard","students","attendance","discipline","schedule","audit"].includes(feature);
  if(role==="surveillant")return ["dashboard","students","parents","attendance","discipline","schedule","studentFinance"].includes(feature);
  if(role==="etudes")return ["dashboard","students","parents","studies","assignments","attendance","schedule","grades","reportcards","audit"].includes(feature);
  if(["finance","comptable"].includes(role))return ["dashboard","students","parents","enrollments","finance","studentFinance","audit"].includes(feature);
  if(role==="bibliothecaire")return ["dashboard","students","library"].includes(feature);
  if(role==="logisticien")return ["dashboard","inventory"].includes(feature);
  if(role==="transport")return ["dashboard","students","school_transport"].includes(feature);
  if(role==="rh")return ["dashboard","staff","staff_registry","staff_attendance","staff_payroll","audit"].includes(feature);
  if(["cantine","internat"].includes(role))return ["dashboard","students"].includes(feature);
  return ["directeur","administrateur","gestionnaire"].includes(role)||allowedFeatureFallback(feature,role);
 };
 function allowedFeatureFallback(feature:string, currentRole:string){return ["dashboard","students","parents","enrollments","studies","assignments","attendance","discipline","schedule","grades","reportcards","finance","studentFinance","staff","staff_registry","inventory","sms_notifications","school_transport","staff_attendance","staff_payroll","library","announcements","settings","audit"].includes(feature)&&["directeur","administrateur","gestionnaire"].includes(currentRole)}
 const nav:any[]=[
  ["dashboard","Tableau de bord",LayoutDashboard,!["discipline","surveillant","enseignant"].includes(role)],
  ["students","Élèves",Users,canView("students")],
  ["parents","Parents",HeartHandshake,canView("parents")],
  ["enrollments","Inscriptions",ClipboardList,canView("enrollments")],
  ["studies","Études",GraduationCap,canView("studies")],
  ["assignments","Affectations enseignants",UserCog,canView("assignments")],
  ["attendance","Présences",CalendarCheck,canView("attendance")],
  ["discipline","Discipline",ShieldCheck,canView("discipline")],
  ["schedule","Emploi du temps",CalendarCheck,canView("schedule")],
  ["grades","Notes & évaluations",BarChart3,canView("grades")],
  ["reportcards","Relevés de cote",FileText,canView("reportcards")],
  ["finance","Finances",Wallet,canView("finance")],
  ["studentFinance","Situation financière des élèves",Wallet,canView("studentFinance")],
  ["staff","Accès applicatifs",UserCog,canView("staff")],
  ["staff_registry","Engagements du personnel",Users,canView("staff")],
  ["inventory","Stocks et matériel",Boxes,canView("inventory")],
  ["sms_notifications","Notifications aux parents",MessageSquare,canView("sms_notifications")],
  ["school_transport","Transport scolaire",Boxes,canView("school_transport")],
  ["staff_attendance","Présences & congés du personnel",CalendarCheck,canView("staff_attendance")],
  ["staff_payroll","Salaires & paiements du personnel",Wallet,canView("staff_payroll")],
  ["library","Bibliothèque & emprunts",BookOpen,canView("library")],
  ["announcements","Communications",MessageSquare,canView("announcements")],
  ["settings","Paramètres",Settings,canView("settings")],["audit","Journal d’activité",ClipboardList,canView("audit")]
 ];
 return <div className="app" style={{"--school-primary":school?.primary_color||"#103b64","--school-secondary":school?.secondary_color||"#d4af37"} as React.CSSProperties}><aside className={mobile?"side open":"side"}><div className="brand"><div className="logo">{school?.logo_url?<img src={school.logo_url} alt=""/>:"SV"}</div><div><b>{school?.name||"COMPLEXE SCOLAIRE SAINT VICTOR"}</b><small>Savoir • Discipline • Réussite</small></div><button className="close" onClick={()=>setMobile(false)}><X/></button></div><nav>{nav.filter(n=>n[3]&&(!["student_portal","school_canteen","boarding_dormitory","extracurricular","electronic_payments","excel_import_export"].includes(n[0]))&&(role!=="promoteur"||n[0]!=="settings")&&(role==="promoteur"||role==="secretaire"||enabledModules===null||enabledModules[n[0]]!==false)).map(n=>{const I=n[2];return <button key={n[0]} className={page===n[0]?"navActive":""} onClick={()=>{setPage(n[0]);setMobile(false)}}><I size={19}/>{n[1]}</button>})}</nav><div className="sideBottom"><span>{profile.full_name||session.user.email}</span><small>{profile.roles?.label||role}</small><button className="logout" onClick={logout}><LogOut size={17}/> Déconnexion</button></div></aside><main className="main"><header className="top"><button className="menu" onClick={()=>setMobile(true)}><Menu/></button><div className="searchBox"><Search size={18}/><input placeholder="Rechercher dans l’établissement…"/></div><div className="topUser">{profile.roles?.label||role}</div></header><section className="content">{page==="dashboard"&&<Dashboard profile={profile} school={school} role={role}/>} {page==="students"&&<Students profile={profile} can={can}/>} {page==="parents"&&<Parents profile={profile} can={can}/>} {page==="enrollments"&&<Enrollments profile={profile} can={can}/>} {page==="studies"&&<Studies profile={profile} can={can}/>} {page==="assignments"&&<TeacherAssignments profile={profile} can={can}/>} {page==="attendance"&&<Attendance profile={profile} can={can}/>} {page==="discipline"&&<Discipline profile={profile} can={can}/>} {page==="schedule"&&<Schedule profile={profile} can={can}/>} {page==="grades"&&<Grades profile={profile} can={can}/>} {page==="reportcards"&&<ReportCards profile={profile} can={can}/>} {page==="finance"&&<><Finance profile={profile} can={can}/><FeeTracking profile={profile}/><FeeInstallmentManager profile={profile} can={can}/></>} {page==="studentFinance"&&<StudentFinance profile={profile} can={can}/>} {page==="staff"&&<Staff profile={profile} school={school} onPayroll={()=>setPage("staff_payroll")}/>}{page==="staff_registry"&&<StaffRegistry profile={profile}/>} {page==="inventory"&&<LogisticsConsole profile={profile} can={can}/>} {["student_portal","staff_attendance","staff_payroll","library","extracurricular"].includes(page)&&<StudentStaffModules profile={profile} can={can} activeModule={page}/>} {["sms_notifications","school_transport","school_canteen","boarding_dormitory"].includes(page)&&<SchoolOperationsModules profile={profile} can={can} activeModule={page}/>} {page==="announcements"&&<Announcements profile={profile} can={can}/>} {page==="settings"&&<SettingsPage school={school} profile={profile} reload={()=>loadSchool(profile.school_id)}/>} {page==="audit"&&<AuditLog profile={profile}/>}</section></main></div>;
}

function SoftwareLanding(){
 return <main className="login"><div className="loginCard softwareLanding">
  <div className="logo big">ML</div>
  <div className="eyebrow">MONATSHIEBE</div>
  <h1>MONATSHIEBE<br/>LOGICIEL</h1>
  <p className="landingLead">La solution professionnelle de gestion scolaire pour établissements, équipes pédagogiques et administration.</p>
  <div className="landingFeatures"><span>Gestion scolaire</span><span>Finance</span><span>Études</span><span>Présences</span><span>Relevés de cote</span></div>
  <p className="landingLead" style={{fontSize:13,opacity:.75}}>Chaque établissement dispose de son propre lien sécurisé, généré depuis l’administration de la plateforme.</p>
  <div className="landingActions"><a className="btn full" href="/platform/login">Administration de la plateforme</a></div>
  <small>Les établissements utilisent leur lien privé généré depuis l’administration.</small>
 </div></main>
}

function Login({school,email,password,setEmail,setPassword,busy,error,onSubmit}:any){
 const [branding,setBranding]=useState<any>(school||null);
 useEffect(()=>{const slug=typeof window!=="undefined"?(new URLSearchParams(window.location.search).get("school")||window.location.pathname.match(/^\/ecole\/([^/]+)/)?.[1]||""):"";if(!slug)return;(async()=>{const {data,error}=await supabase.functions.invoke("parent-portal",{body:{action:"branding",school_slug:slug}});if(!error&&!data?.error&&data?.school)setBranding(data.school)})()},[school]);
 const viewSchool=branding||school;
 return <div className="login" style={{"--school-primary":viewSchool?.primary_color||"#0b3151","--school-secondary":viewSchool?.secondary_color||"#176bb3"} as React.CSSProperties}><div className="loginCard">
  <div className="logo big">{viewSchool?.logo_url?<img src={viewSchool.logo_url} alt=""/>:"ML"}</div>
  <div className="eyebrow">{viewSchool?.name||"ÉTABLISSEMENT"}</div>
  <h1>Accès sécurisé</h1>
  <p>Accès sécurisé à l’espace de gestion de votre établissement.</p>
  <form onSubmit={onSubmit}>
   <label>Email<input type="email" required value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="administration@ecole.cd"/></label>
   <label>Mot de passe<input type="password" required value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••"/></label>
   {error&&<div className="error">{error}</div>}
   <button className="btn full" disabled={busy}>{busy?"Connexion…":"Se connecter"}</button>
  </form>
  <div className="schoolPortals"><b>Portails de l’établissement</b><div><a href={typeof window!=="undefined"&&((new URLSearchParams(window.location.search).get("school"))||window.location.pathname.match(/^\/ecole\/([^/]+)/)?.[1])?`/ecole/${encodeURIComponent((new URLSearchParams(window.location.search).get("school"))||window.location.pathname.match(/^\/ecole\/([^/]+)/)?.[1]!)}/parent`:"#"}>👨‍👩‍👧 Portail Parents</a><a href={typeof window!=="undefined"&&((new URLSearchParams(window.location.search).get("school"))||window.location.pathname.match(/^\/ecole\/([^/]+)/)?.[1])?`/ecole/${encodeURIComponent((new URLSearchParams(window.location.search).get("school"))||window.location.pathname.match(/^\/ecole\/([^/]+)/)?.[1]!)}/enseignant`:"#"}>👨‍🏫 Portail Enseignants</a></div></div>
  
 </div></div>
}

function Stat({title,value,icon}:any){return <div className="stat"><div className="icon">{icon}</div><small>{title}</small><b>{value}</b></div>}

function Dashboard({profile,school,role}:any){
 const [c,setC]=useState({students:0,teachers:0,classes:0,fcIncome:0,usdIncome:0,fcExpenses:0,usdExpenses:0});
 const [daily,setDaily]=useState({enrollments:0,present:0,absent:0,fcIncome:0,usdIncome:0,fcExpenses:0,usdExpenses:0,payrollFC:0,payrollUSD:0});
 const [year,setYear]=useState("Année scolaire");
 const [loaded,setLoaded]=useState(false);
 useEffect(()=>{(async()=>{
   const id=profile.school_id;
   const d=new Date();const date=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
   const start=date+"T00:00:00";const finish=date+"T23:59:59.999";
   const [s,t,k,p,e,y,en,pr,ab,dp,de,pa]=await Promise.all([
     supabase.from("students").select("id",{count:"exact",head:true}).eq("school_id",id),
     supabase.from("teachers").select("id",{count:"exact",head:true}).eq("school_id",id),
     supabase.from("classes").select("id",{count:"exact",head:true}).eq("school_id",id),
     supabase.from("payments").select("amount,currency").eq("school_id",id).eq("status","validated"),
     supabase.from("expenses").select("amount,currency").eq("school_id",id).eq("status","validated"),
     supabase.from("academic_years").select("name").eq("school_id",id).eq("is_current",true).maybeSingle(),
     supabase.from("enrollments").select("id",{count:"exact",head:true}).eq("school_id",id).gte("registered_at",start).lte("registered_at",finish),
     supabase.from("attendance").select("id",{count:"exact",head:true}).eq("school_id",id).eq("attendance_date",date).eq("status","present"),
     supabase.from("attendance").select("id",{count:"exact",head:true}).eq("school_id",id).eq("attendance_date",date).eq("status","absent"),
     supabase.from("payments").select("amount,currency").eq("school_id",id).eq("status","validated").gte("paid_at",start).lte("paid_at",finish),
     supabase.from("expenses").select("amount,currency").eq("school_id",id).eq("status","validated").gte("paid_at",start).lte("paid_at",finish),
     supabase.from("staff_payroll_items").select("net_salary,status,payment_date,staff_payroll_runs!inner(currency)").eq("school_id",id).eq("payment_date",date).in("status",["paid","validated"])
   ]);
   const sum=(rows:any[],currency:string,key="amount")=>(rows||[]).filter((x:any)=>currency==="USD"?x.currency==="USD":x.currency!=="USD").reduce((a:number,x:any)=>a+Number(x[key]||0),0);
   setC({students:s.count||0,teachers:t.count||0,classes:k.count||0,fcIncome:sum(p.data||[],"FC"),usdIncome:sum(p.data||[],"USD"),fcExpenses:sum(e.data||[],"FC"),usdExpenses:sum(e.data||[],"USD")});
   setDaily({enrollments:en.count||0,present:pr.count||0,absent:ab.count||0,fcIncome:sum(dp.data||[],"FC"),usdIncome:sum(dp.data||[],"USD"),fcExpenses:sum(de.data||[],"FC"),usdExpenses:sum(de.data||[],"USD"),payrollFC:(pa.data||[]).filter((x:any)=>x.staff_payroll_runs?.currency!=="USD").reduce((a:number,x:any)=>a+Number(x.net_salary||0),0),payrollUSD:(pa.data||[]).filter((x:any)=>x.staff_payroll_runs?.currency==="USD").reduce((a:number,x:any)=>a+Number(x.net_salary||0),0)});
   setYear(y.data?.name||"Année scolaire");setLoaded(true);
 })()},[profile.school_id]);
 const financialRoles=["promoteur","directeur","finance","comptable"].includes(role);
 return <div>
  <div className="head"><div><h1>Tableau de bord</h1><p>{school?.name} • {year} • Vue du jour : {new Date().toLocaleDateString("fr-FR")}</p></div></div>
  <div className="cards"><Stat title="Élèves inscrits" value={c.students} icon={<Users/>}/><Stat title="Enseignants" value={c.teachers} icon={<UserCog/>}/><Stat title="Classes" value={c.classes} icon={<BookOpen/>}/>{financialRoles&&<><Stat title="Encaissements FC (cumul)" value={money(c.fcIncome,"FC")} icon={<Wallet/>}/><Stat title="Encaissements USD (cumul)" value={money(c.usdIncome,"USD")} icon={<Wallet/>}/></>}</div>
  <div className="panel" style={{marginTop:18}}><h3>Activité quotidienne</h3><p style={{color:"#718096",fontSize:13,marginTop:-4}}>Chiffres calculés à partir des enregistrements du jour, sans données fictives.{!loaded?" Chargement des indicateurs…":""}</p>
   <div className="cards"><Stat title="Nouvelles inscriptions" value={daily.enrollments} icon={<ClipboardList/>}/><Stat title="Présents enregistrés" value={daily.present} icon={<CalendarCheck/>}/><Stat title="Absents enregistrés" value={daily.absent} icon={<AlertTriangle/>}/></div>
   {financialRoles&&<><h4 style={{marginTop:18}}>Finances du jour</h4><div className="financeSummary"><div><small>Encaissements FC</small><b>{money(daily.fcIncome,"FC")}</b></div><div><small>Dépenses FC</small><b>{money(daily.fcExpenses,"FC")}</b></div><div><small>Encaissements USD</small><b>{money(daily.usdIncome,"USD")}</b></div><div><small>Dépenses USD</small><b>{money(daily.usdExpenses,"USD")}</b></div><div><small>Paie du jour FC</small><b>{money(daily.payrollFC,"FC")}</b></div><div><small>Paie du jour USD</small><b>{money(daily.payrollUSD,"USD")}</b></div></div></>}
  </div>
  {financialRoles&&<div className="panel" style={{marginTop:18}}><h3>Situation financière cumulée</h3><div className="financeSummary"><div><small>Encaissements FC</small><b>{money(c.fcIncome,"FC")}</b></div><div><small>Dépenses FC</small><b>{money(c.fcExpenses,"FC")}</b></div><div><small>Encaissements USD</small><b>{money(c.usdIncome,"USD")}</b></div><div><small>Dépenses USD</small><b>{money(c.usdExpenses,"USD")}</b></div><div><small>Solde FC</small><b>{money(c.fcIncome-c.fcExpenses,"FC")}</b></div><div><small>Solde USD</small><b>{money(c.usdIncome-c.usdExpenses,"USD")}</b></div></div></div>}
  <div className="panel" style={{marginTop:18}}><h3>Compte connecté</h3><p><b>{profile.full_name||"Utilisateur"}</b><br/><span className="role">{profile.roles?.label}</span></p><span className="badge">Compte actif</span></div>
 </div>;
}

function Students({profile,can}:any){
 const [rows,setRows]=useState<any[]>([]),[q,setQ]=useState(""),[classId,setClassId]=useState("all"),[optionName,setOptionName]=useState("all"),[classes,setClasses]=useState<any[]>([]),[options,setOptions]=useState<any[]>([]),[card,setCard]=useState<any>(null),[photoBusy,setPhotoBusy]=useState<string|null>(null),[msg,setMsg]=useState(""),[loading,setLoading]=useState(true);
 async function load(){
  setLoading(true);setMsg("");
  const [{data:students,error:se},{data:enrollments,error:ee},{data:classRows,error:ce},{data:optionRows,error:oe}]=await Promise.all([
   supabase.from("students").select("*,student_parents(relationship,is_primary,parents(first_name,last_name,phone))").eq("school_id",profile.school_id),
   supabase.from("enrollments").select("student_id,class_id,option_name,status,classes(name,option_name,section_name)").eq("school_id",profile.school_id),
   supabase.from("classes").select("id,name,option_name,section_name").eq("school_id",profile.school_id).order("name"),
   supabase.from("school_options").select("name,active").eq("school_id",profile.school_id).eq("active",true).order("name"),
   supabase.from("fees").select("id,name,amount,currency,active,option_name,section_name").eq("school_id",profile.school_id).eq("active",true).order("name")
  ]);
  if(se||ee||ce||oe){setMsg("Chargement impossible : "+(se||ee||ce||oe)?.message);setLoading(false);return}
  const activeEnrollments=(enrollments||[]).filter((x:any)=>!x.status||["active","enrolled","confirmed"].includes(String(x.status).toLowerCase()));
  const enrollmentMap=new Map<string,any>();
  activeEnrollments.forEach((x:any)=>{if(!enrollmentMap.has(x.student_id))enrollmentMap.set(x.student_id,x)});
  setClasses(classRows||[]);
  const names=new Set<string>((optionRows||[]).filter((x:any)=>x.name).map((x:any)=>x.name.trim()));
  activeEnrollments.forEach((x:any)=>{const n=(x.option_name||x.classes?.option_name||"").trim();if(n)names.add(n)});
  (classRows||[]).forEach((x:any)=>{const n=(x.option_name||"").trim();if(n)names.add(n)});
  setOptions(Array.from(names).sort((a,b)=>a.localeCompare(b,"fr",{sensitivity:"base"})).map(name=>({name})));
  const prepared=await Promise.all((students||[]).map(async(s:any)=>{const en=enrollmentMap.get(s.id);return {...s,class_id:en?.class_id||"",class_name:en?.classes?.name||"Classe non attribuée",option_name:(en?.option_name||en?.classes?.option_name||s.option_name||"").trim()||"Sans filière",photo_url:s.photo_path?(await signedAsset(s.photo_path))||s.photo_url:s.photo_url}}));
  prepared.sort((a:any,b:any)=>a.class_name.localeCompare(b.class_name,"fr",{sensitivity:"base"})||a.option_name.localeCompare(b.option_name,"fr",{sensitivity:"base"})||a.last_name.localeCompare(b.last_name,"fr",{sensitivity:"base"})||a.first_name.localeCompare(b.first_name,"fr",{sensitivity:"base"}));
  setRows(prepared);setLoading(false);
 }
 useEffect(()=>{load()},[profile.school_id]);
 const filtered=useMemo(()=>rows.filter(x=>(classId==="all"||x.class_id===classId)&&(optionName==="all"||x.option_name===optionName)&&((x.matricule||"")+" "+(x.first_name||"")+" "+(x.last_name||"")+" "+(x.post_name||"")+" "+(x.phone||"")).toLowerCase().includes(q.toLowerCase())).sort((a:any,b:any)=>a.class_name.localeCompare(b.class_name,"fr",{sensitivity:"base"})||a.option_name.localeCompare(b.option_name,"fr",{sensitivity:"base"})||a.last_name.localeCompare(b.last_name,"fr",{sensitivity:"base"})||a.first_name.localeCompare(b.first_name,"fr",{sensitivity:"base"})),[rows,q,classId,optionName]);
 async function uploadPhoto(student:any,file:File){setPhotoBusy(student.id);setMsg("");const ext=(file.name.split(".").pop()||"jpg").toLowerCase();const path=`${profile.school_id}/students/${crypto.randomUUID()}.${ext}`;const {error:ue}=await supabase.storage.from("school-assets").upload(path,file,{upsert:false,contentType:file.type||"image/jpeg"});if(ue){setMsg("Photo non envoyée : "+ue.message);setPhotoBusy(null);return}const {error}=await supabase.from("students").update({photo_path:path,photo_url:null}).eq("id",student.id).eq("school_id",profile.school_id);if(error)setMsg("Photo envoyée mais dossier non mis à jour : "+error.message);else await load();setPhotoBusy(null)}
 return <><div className="head"><div><h1>Élèves</h1><p>Consultation des dossiers, filtres par classe et filière, et génération des cartes d’élève.</p></div>{msg&&<div className="notice">{msg}</div>}</div><div className="panel"><div className="toolbar" style={{flexWrap:"wrap"}}><div className="miniSearch"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Nom, prénom, matricule, téléphone…"/></div><label>Classe <select value={classId} onChange={e=>{setClassId(e.target.value);setOptionName("all")}}><option value="all">Toutes les classes</option>{classes.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Option / filière <select value={optionName} onChange={e=>setOptionName(e.target.value)}><option value="all">Toutes les filières</option>{options.map((x:any)=><option key={x.name} value={x.name}>{x.name}</option>)}</select></label><button className="btn light" onClick={()=>window.print()}><Printer size={17}/> Imprimer</button></div>{loading?<p>Chargement des élèves…</p>:<div className="tableWrap"><table><thead><tr><th>Classe</th><th>Option / filière</th><th>Matricule</th><th>Élève</th><th>Photo</th><th>Sexe</th><th>Téléphone élève</th><th>Parent / responsable</th><th>Téléphone parent</th><th>Code parent</th><th>Statut</th><th>Carte</th></tr></thead><tbody>{filtered.map((s:any)=><tr key={s.id}><td>{s.class_name}</td><td>{s.option_name}</td><td><b>{s.matricule||"—"}</b></td><td>{s.last_name} {s.first_name} {s.post_name||""}</td><td>{s.photo_url?<img src={s.photo_url} alt="" style={{width:38,height:48,objectFit:"cover",borderRadius:6}}/>:<span>—</span>}{can("enrollments","secretaire")&&<label className="btn light" style={{marginTop:5,fontSize:11,cursor:"pointer"}}>{photoBusy===s.id?"Envoi…":"Ajouter photo"}<input type="file" accept="image/*" capture="environment" hidden disabled={photoBusy!==null} onChange={e=>{const file=e.target.files?.[0];if(file)uploadPhoto(s,file)}}/></label>}</td><td>{s.sex||"—"}</td><td>{s.phone||"—"}</td><td>{(()=>{const p=(s.student_parents||[]).find((v:any)=>v.is_primary)?.parents||(s.student_parents||[])[0]?.parents;return p?`${p.first_name||""} ${p.last_name||""}`.trim()||"—":"—"})()}</td><td>{(()=>{const p=(s.student_parents||[]).find((v:any)=>v.is_primary)?.parents||(s.student_parents||[])[0]?.parents;return p?.phone||"—"})()}</td><td><code>{s.parent_access_code||"—"}</code></td><td><span className="badge">{s.active?"Actif":"Inactif"}</span></td><td><button className="btn light" onClick={()=>setCard(s)}><CreditCardIcon/> Carte</button></td></tr>)}{!filtered.length&&<tr><td colSpan={12} className="empty">Aucun élève trouvé pour ces critères.</td></tr>}</tbody></table></div>}<p className="notice">{filtered.length} élève(s) affiché(s). Tri : classe, filière, puis ordre alphabétique.</p></div>{card&&<StudentCard student={card} schoolId={profile.school_id} onClose={()=>setCard(null)}/>}</>
}
function DRCMark(){
 return <div className="drcMark" title="Drapeau officiel de la République démocratique du Congo" aria-label="Drapeau de la République démocratique du Congo">
  <svg viewBox="0 0 90 60" role="img" aria-hidden="true">
   <rect width="90" height="60" fill="#00A3E0"/>
   <path d="M-8 60 L82 -8 L98 8 L8 76 Z" fill="#F7D618"/>
   <path d="M-4 60 L86 -8 L94 0 L4 68 Z" fill="#CE1021"/>
   <polygon points="20,6 23.8,14 32.5,14.8 26,20.7 27.8,29.2 20,24.7 12.2,29.2 14,20.7 7.5,14.8 16.2,14" fill="#F7D618"/>
  </svg>
  <span>RDC</span>
 </div>
}

function StudentCard({student,schoolId,onClose}:any){
 const [school,setSchool]=useState<any>(null),[year,setYear]=useState("2026-2027");
 useEffect(()=>{
  Promise.all([
   supabase.from("schools").select("*").eq("id",schoolId).single(),
   supabase.from("academic_years").select("name").eq("school_id",schoolId).eq("is_current",true).maybeSingle()
  ]).then(async([s,y])=>{
   const schoolData=s.data;
   if(schoolData?.logo_path){
    schoolData.logo_url=await signedAsset(schoolData.logo_path)||schoolData.logo_url
   }
   if(student.photo_path){
    student.photo_url=await signedAsset(student.photo_path)||student.photo_url
   }
   setSchool(schoolData);
   setYear(y.data?.name||"2026-2027")
  })
 },[schoolId,student.id,student.photo_path]);

 const fullName=[student.last_name,student.first_name,student.post_name].filter(Boolean).join(" ");
 const birth=student.date_of_birth?new Date(student.date_of_birth).toLocaleDateString("fr-FR"):"—";

 return <div className="modalBackdrop" onClick={onClose}>
  <div className="panel cardModal" onClick={e=>e.stopPropagation()}>
   <div className="studentCardSheet" id="student-card-print">

    <div className="studentCardSide front">
     <div className="studentCardTop">
      <div className="schoolIdentity">
       <div className="schoolLogoFrame">
        {school?.logo_url?<img src={school.logo_url} alt="Logo de l'établissement"/>:<span>SV</span>}
       </div>
       <div className="schoolIdentityText">
        <b>{school?.name||"Établissement scolaire"}</b>
        <small>ÉTABLISSEMENT SCOLAIRE</small>
       </div>
      </div>
      <DRCMark/>
     </div>

     <div className="cardGoldLine"/>

     <div className="studentCardLabel">
      <span>DOCUMENT SCOLAIRE OFFICIEL</span>
      <strong>CARTE D'ÉLÈVE</strong>
      <small>Année scolaire {year}</small>
     </div>

     <div className="studentCardMain">
      <div className="studentPhoto premium">
       {student.photo_url?<img src={student.photo_url} alt={"Photo de "+fullName}/>:<div><span>PHOTO</span><small>ÉLÈVE</small></div>}
      </div>

      <div className="studentIdentity premium">
       <span className="studentName">{fullName||"Nom de l'élève"}</span>
       <div className="studentMetaGrid">
        <div><small>MATRICULE</small><b>{student.matricule||"—"}</b></div>
        <div><small>SEXE</small><b>{student.sex||"—"}</b></div>
        <div><small>DATE DE NAISSANCE</small><b>{birth}</b></div>
        <div><small>CODE PARENT</small><b>{student.parent_access_code||"—"}</b></div>
       </div>
      </div>
     </div>

     <div className="studentCardFooter">
      <div><small>Établissement</small><b>{school?.city||"Kinshasa"}</b></div>
      <div className="studentStatus"><span/> ÉLÈVE ACTIF</div>
      <div className="cardSerial">{student.matricule||"—"}</div>
     </div>
    </div>

    <div className="studentCardSide back">
     <div className="backBrand">
      <div className="schoolLogoFrame small">{school?.logo_url?<img src={school.logo_url} alt=""/>:<span>SV</span>}</div>
      <div><b>{school?.name||"Établissement scolaire"}</b><small>Savoir • Discipline • Réussite</small></div>
      <DRCMark/>
     </div>
     <div className="cardGoldLine"/>
     <div className="backTitle">INFORMATIONS & VALIDITÉ</div>

     <div className="backGrid">
      <div><small>ADRESSE</small><b>{school?.address||"Adresse de l’établissement"}</b></div>
      <div><small>CONTACT</small><b>{school?.phone||"—"}</b></div>
      <div><small>VILLE</small><b>{school?.city||"Kinshasa"}</b></div>
      <div><small>ANNÉE</small><b>{year}</b></div>
     </div>

     <div className="cardNotice">
      Cette carte est strictement personnelle. Elle doit être présentée sur demande et reste la propriété de l'établissement.
     </div>

     <div className="backSignatures">
      <div><span>Signature / Cachet</span><i/></div>
      <div><span>Matricule</span><b>{student.matricule||"—"}</b></div>
     </div>

     <div className="backFooter">
      <span>RÉPUBLIQUE DÉMOCRATIQUE DU CONGO</span>
      <b>CARTE SCOLAIRE</b>
     </div>
    </div>
   </div>

   <div className="cardActions">
    <button className="btn" onClick={()=>window.print()}><Printer size={16}/> Imprimer recto-verso</button>
    <button className="btn light" onClick={onClose}>Fermer</button>
   </div>
  </div>
 </div>
}
function Studies({profile,can}:any){
 const [tab,setTab]=useState("classes"),[rows,setRows]=useState<any[]>([]),[show,setShow]=useState(false),[editId,setEditId]=useState<string|null>(null),[msg,setMsg]=useState("");
 const [form,setForm]=useState<any>({name:"",room:"",capacity:"",section_name:"",option_name:"",first_name:"",last_name:"",phone:"",subject:"",code:"",coefficient:"1",section_group:"Humanités générales",stage:"",option_stage:"",room_type:"Classe"});
 const editable=can("studies","etudes");
 const tabs=[["classes","Classes"],["teachers","Enseignants"],["subjects","Matières"],["options","Options / filières"],["rooms","Salles"]];
 async function load(){const table=tab==="teachers"?"teachers":tab==="subjects"?"subjects":tab==="options"?"school_options":tab==="rooms"?"rooms":"classes";const query=supabase.from(table).select("*").eq("school_id",profile.school_id);const {data,error}=tab==="teachers"?await query.order("last_name").order("first_name"):await query.order("name");if(error){setMsg("Chargement impossible : "+error.message);return}setRows(data||[])}
 useEffect(()=>{load()},[profile.school_id,tab]);
 function reset(){setForm({name:"",room:"",capacity:"",section_name:"",option_name:"",first_name:"",last_name:"",phone:"",subject:"",code:"",coefficient:"1",section_group:"Humanités générales",stage:"",option_stage:"",room_type:"Classe"});setEditId(null);setShow(false)}
 function begin(x:any){setEditId(x.id);setShow(true);setMsg("");setForm({...form,...x,coefficient:String(x.coefficient??1),option_stage:x.stage||"",room_type:x.type||"Classe"})}
 async function remove(id:string){if(!confirm("Supprimer définitivement cet élément ?"))return;const table=tab==="teachers"?"teachers":tab==="subjects"?"subjects":tab==="options"?"school_options":tab==="rooms"?"rooms":"classes";const {error}=await supabase.from(table).delete().eq("id",id).eq("school_id",profile.school_id);if(error)setMsg(error.message);else load()}
 async function save(ev:React.FormEvent){ev.preventDefault();setMsg("");let table=tab==="teachers"?"teachers":tab==="subjects"?"subjects":tab==="options"?"school_options":tab==="rooms"?"rooms":"classes";let data:any={school_id:profile.school_id};
 if(tab==="classes")data={...data,name:form.name,room:form.room||null,capacity:form.capacity?Number(form.capacity):null,section_name:form.section_name||null,option_name:form.option_name||null};
 if(tab==="teachers")data={...data,first_name:form.first_name,last_name:form.last_name,phone:form.phone||null,subject:form.subject||null,active:true,...(!editId?{matricule:null,access_code:"T-"+crypto.randomUUID().replaceAll("-","").slice(0,10).toUpperCase()}:{})};
 if(tab==="subjects")data={...data,name:form.name,code:form.code||null,coefficient:Number(form.coefficient||1),section_group:form.section_group||null,stage:form.stage||null,active:true};
 if(tab==="options")data={...data,name:form.name,code:form.code||null,stage:form.option_stage||null,section_group:form.section_group||"Humanités générales",active:true};
 if(tab==="rooms")data={...data,name:form.name,code:form.code||null,capacity:form.capacity?Number(form.capacity):null,type:form.room_type||"Classe",active:true,updated_at:new Date().toISOString()};
 const q=editId?supabase.from(table).update(data).eq("id",editId).eq("school_id",profile.school_id):supabase.from(table).insert(data);const {error}=await q;if(error)setMsg(error.message);else{setMsg(editId?"Modification enregistrée.":"Ajout enregistré.");reset();load()}}
 return <><div className="head"><div><h1>Études & référentiels</h1><p>Classes, enseignants, matières, options et salles : tout est modifiable depuis le panneau.</p></div>{editable&&<button className="btn" onClick={()=>{setEditId(null);setShow(!show);setMsg("")}}><Plus size={17}/> {show?"Fermer":"Ajouter"}</button>}</div>
 <div className="tabs">{tabs.map(x=><button key={x[0]} className={tab===x[0]?"tab active":"tab"} onClick={()=>{setTab(x[0]);reset()}}>{x[1]}</button>)}</div>
 {show&&editable&&<form className="panel formGrid" onSubmit={save}>
 {tab==="teachers"?<><label>Nom<input required value={form.last_name} onChange={e=>setForm({...form,last_name:e.target.value})}/></label><label>Prénom<input required value={form.first_name} onChange={e=>setForm({...form,first_name:e.target.value})}/></label><label>Téléphone<input value={form.phone||""} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Matière principale<input value={form.subject||""} onChange={e=>setForm({...form,subject:e.target.value})}/></label></>
 :tab==="subjects"?<><label>Matière<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Code<input value={form.code||""} onChange={e=>setForm({...form,code:e.target.value})}/></label><label>Coefficient<input type="number" step="0.5" min="0" value={form.coefficient} onChange={e=>setForm({...form,coefficient:e.target.value})}/></label><label>Domaine<select value={form.section_group||""} onChange={e=>setForm({...form,section_group:e.target.value})}><option value="">Commun</option><option>Primaire</option><option>Éducation de base — 7e-8e</option><option>Humanités générales</option><option>Humanités techniques</option><option>Humanités professionnelles</option></select></label><label>Niveau<select value={form.stage||""} onChange={e=>setForm({...form,stage:e.target.value})}><option value="">Tous</option><option>Préscolaire</option><option>Primaire</option><option>7e-8e</option><option>Humanités</option></select></label></>
 :tab==="options"?<><label>Option / filière<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Groupe<select value={form.section_group} onChange={e=>setForm({...form,section_group:e.target.value})}><option>Humanités générales</option><option>Humanités techniques commerciales</option><option>Humanités techniques industrielles</option><option>Humanités techniques agricoles</option><option>Humanités techniques sociales</option><option>Humanités professionnelles</option></select></label><label>Code<input value={form.code||""} onChange={e=>setForm({...form,code:e.target.value})}/></label></>
 :tab==="rooms"?<><label>Nom de la salle<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Salle 01"/></label><label>Code<input value={form.code||""} onChange={e=>setForm({...form,code:e.target.value})}/></label><label>Capacité<input type="number" min="1" value={form.capacity||""} onChange={e=>setForm({...form,capacity:e.target.value})}/></label><label>Type<select value={form.room_type||"Classe"} onChange={e=>setForm({...form,room_type:e.target.value})}><option>Classe</option><option>Laboratoire</option><option>Atelier</option><option>Salle informatique</option><option>Bibliothèque</option><option>Bureau</option><option>Autre</option></select></label></>
 :<><label>Nom de la classe<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Section<select value={form.section_name||""} onChange={e=>setForm({...form,section_name:e.target.value})}><option value="">Choisir…</option><option>Maternelle</option><option>Primaire</option><option>Élémentaire — 7e-8e</option><option>Humanités</option></select></label><label>Option / filière<input value={form.option_name||""} onChange={e=>setForm({...form,option_name:e.target.value})}/></label><label>Salle<input value={form.room||""} onChange={e=>setForm({...form,room:e.target.value})}/></label><label>Capacité<input type="number" value={form.capacity||""} onChange={e=>setForm({...form,capacity:e.target.value})}/></label></>}
 {msg&&<div className="error">{msg}</div>}<button className="btn"><Save size={16}/> {editId?"Enregistrer les modifications":"Enregistrer"}</button></form>}
 <div className="panel tableWrap"><table><thead><tr>{tab==="classes"?<><th>Classe</th><th>Section</th><th>Option</th><th>Salle</th><th>Capacité</th></>:tab==="teachers"?<><th>Enseignant</th><th>Matière</th><th>Téléphone</th><th>Code portail</th></>:tab==="subjects"?<><th>Code</th><th>Matière</th><th>Domaine</th><th>Coefficient</th></>:tab==="options"?<><th>Option / filière</th><th>Groupe</th><th>Code</th></>:<><th>Salle</th><th>Code</th><th>Type</th><th>Capacité</th></>}{editable&&<th>Actions</th>}</tr></thead><tbody>{rows.map(x=><tr key={x.id}>{tab==="classes"?<><td>{x.name}</td><td>{x.section_name||"—"}</td><td>{x.option_name||"—"}</td><td>{x.room||"—"}</td><td>{x.capacity||"—"}</td></>:tab==="teachers"?<><td>{x.last_name} {x.first_name}</td><td>{x.subject||"—"}</td><td>{x.phone||"—"}</td><td><code>{x.access_code||"—"}</code></td></>:tab==="subjects"?<><td>{x.code||"—"}</td><td>{x.name}</td><td>{x.section_group||"Commun"}</td><td>{x.coefficient}</td></>:tab==="options"?<><td>{x.name}</td><td>{x.section_group||"—"}</td><td>{x.code||"—"}</td></>:<><td>{x.name}</td><td>{x.code||"—"}</td><td>{x.type||"Classe"}</td><td>{x.capacity||"—"}</td></>}{editable&&<td><button className="btn light" onClick={()=>begin(x)}>Modifier</button> <button className="btn light" onClick={()=>remove(x.id)}>Supprimer</button></td>}</tr>)}</tbody></table>{!rows.length&&<p className="empty">Aucune donnée enregistrée.</p>}</div></>}

function Discipline({profile,can}:any){
 const editable=can("attendance","discipline");
 const [rows,setRows]=useState<any[]>([]),[students,setStudents]=useState<any[]>([]),[studentId,setStudentId]=useState(""),[msg,setMsg]=useState("");
 const [form,setForm]=useState<any>({record_date:today(),sanction_type:"Observation",reason:"",action_taken:"",parent_contacted:false,parent_contact_note:""});
 async function load(){const [{data:s},{data:r}]=await Promise.all([
  supabase.from("students").select("id,matricule,last_name,first_name").eq("school_id",profile.school_id).eq("active",true).order("last_name"),
  supabase.from("discipline_records").select("id,record_date,sanction_type,reason,action_taken,parent_contacted,parent_contact_note,students(matricule,last_name,first_name)").eq("school_id",profile.school_id).order("record_date",{ascending:false}).limit(100)
 ]);setStudents(s||[]);setRows(r||[])}
 useEffect(()=>{load()},[profile.school_id]);
 async function save(e:React.FormEvent){e.preventDefault();if(!editable)return;setMsg("");if(!studentId||!form.reason.trim()){setMsg("Sélectionnez l’élève et indiquez le motif.");return}const {error}=await supabase.from("discipline_records").insert({...form,school_id:profile.school_id,student_id:studentId,recorded_by:profile.id});if(error)setMsg(error.message);else{setMsg("Signalement enregistré.");setStudentId("");setForm({record_date:today(),sanction_type:"Observation",reason:"",action_taken:"",parent_contacted:false,parent_contact_note:""});load()}}
 return <><div className="head"><div><h1>Discipline</h1><p>Sanctions et observations des élèves. Seul le Chargé de discipline peut enregistrer un signalement.</p></div></div>{editable&&<form className="panel formGrid" onSubmit={save}><label>Élève<select required value={studentId} onChange={e=>setStudentId(e.target.value)}><option value="">Choisir…</option>{students.map(x=><option key={x.id} value={x.id}>{x.last_name} {x.first_name} — {x.matricule}</option>)}</select></label><label>Date<input type="date" value={form.record_date} onChange={e=>setForm({...form,record_date:e.target.value})}/></label><label>Type<select value={form.sanction_type} onChange={e=>setForm({...form,sanction_type:e.target.value})}><option>Observation</option><option>Avertissement</option><option>Retenue</option><option>Exclusion temporaire</option><option>Autre sanction</option></select></label><label>Motif<textarea required rows={3} value={form.reason} onChange={e=>setForm({...form,reason:e.target.value})}/></label><label>Mesure prise<textarea rows={3} value={form.action_taken} onChange={e=>setForm({...form,action_taken:e.target.value})}/></label><label><input type="checkbox" checked={form.parent_contacted} onChange={e=>setForm({...form,parent_contacted:e.target.checked})}/> Parent contacté</label><label>Note de contact<textarea rows={2} value={form.parent_contact_note} onChange={e=>setForm({...form,parent_contact_note:e.target.value})}/></label>{msg&&<div className="error">{msg}</div>}<button className="btn"><Save size={16}/> Enregistrer</button></form>}{!editable&&msg&&<div className="notice">{msg}</div>}<div className="panel tableWrap"><table><thead><tr><th>Date</th><th>Élève</th><th>Type</th><th>Motif</th><th>Mesure</th><th>Parent contacté</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{new Date(x.record_date).toLocaleDateString("fr-FR")}</td><td>{x.students?.last_name} {x.students?.first_name}</td><td>{x.sanction_type}</td><td>{x.reason}</td><td>{x.action_taken||"—"}</td><td>{x.parent_contacted?"Oui":"Non"}</td></tr>)}{!rows.length&&<tr><td colSpan={6} className="empty">Aucun signalement disciplinaire.</td></tr>}</tbody></table></div></>
}

function TeacherAssignments({profile,can}:any){
 const editable=can("assignments","etudes");
 const [rows,setRows]=useState<any[]>([]);
 const [teachers,setTeachers]=useState<any[]>([]);
 const [classes,setClasses]=useState<any[]>([]);
 const [subjects,setSubjects]=useState<any[]>([]);
 const [years,setYears]=useState<any[]>([]);
 const [show,setShow]=useState(false);
 const [msg,setMsg]=useState("");
 const [form,setForm]=useState<any>({teacher_id:"",class_id:"",subject_id:"",academic_year_id:""});

 async function load(){
  const [a,t,c,s,y]=await Promise.all([
   supabase.from("teacher_subject_assignments").select("id,teacher_id,class_id,subject_id,academic_year_id,teachers(last_name,first_name,matricule,access_code),classes(name),subjects(name),academic_years(name)").eq("school_id",profile.school_id).eq("active",true),
   supabase.from("teachers").select("id,last_name,first_name,matricule,access_code").eq("school_id",profile.school_id).eq("active",true).order("last_name"),
   supabase.from("classes").select("id,name").eq("school_id",profile.school_id).order("name"),
   supabase.from("subjects").select("id,name").eq("school_id",profile.school_id).order("name"),
   supabase.from("academic_years").select("id,name,is_current").eq("school_id",profile.school_id).order("start_date",{ascending:false})
  ]);
  setRows(a.data||[]);
  setTeachers(t.data||[]);
  setClasses(c.data||[]);
  setSubjects(s.data||[]);
  setYears(y.data||[]);
  if(!form.academic_year_id&&y.data?.[0]){
   setForm((f:any)=>({...f,academic_year_id:y.data.find((x:any)=>x.is_current)?.id||y.data[0].id}));
  }
 }

 useEffect(()=>{load()},[profile.school_id]);

 async function save(e:React.FormEvent){
  e.preventDefault();
  if(!editable)return;
  setMsg("");
  if(!form.teacher_id||!form.class_id||!form.subject_id){
   setMsg("Choisissez l’enseignant, la classe et la matière.");
   return;
  }
  const {data:exists}=await supabase.from("teacher_subject_assignments")
   .select("id")
   .eq("school_id",profile.school_id)
   .eq("teacher_id",form.teacher_id)
   .eq("class_id",form.class_id)
   .eq("subject_id",form.subject_id)
   .eq("academic_year_id",form.academic_year_id)
   .eq("active",true)
   .maybeSingle();
  if(exists){
   setMsg("Cette affectation existe déjà.");
   return;
  }
  const {error}=await supabase.from("teacher_subject_assignments").insert({
   school_id:profile.school_id,
   teacher_id:form.teacher_id,
   class_id:form.class_id,
   subject_id:form.subject_id,
   academic_year_id:form.academic_year_id||null,
   active:true
  });
  if(error){
   setMsg(error.message);
  }else{
   setMsg("Affectation enregistrée.");
   setShow(false);
   setForm({teacher_id:"",class_id:"",subject_id:"",academic_year_id:form.academic_year_id});
   load();
  }
 }

 async function remove(id:string){
  if(!editable)return;
  if(!confirm("Retirer cette affectation ?"))return;
  const {error}=await supabase.from("teacher_subject_assignments")
   .update({active:false})
   .eq("id",id)
   .eq("school_id",profile.school_id);
  if(error)setMsg(error.message);
  else load();
 }

 return <>
  <div className="head">
   <div>
    <h1>Affectations enseignants</h1>
    <p>Le Chargé des études détermine précisément quelles classes et matières chaque enseignant peut utiliser dans son portail.</p>
   </div>
   {editable&&<button className="btn" onClick={()=>setShow(!show)}><Plus size={17}/> {show?"Fermer":"Nouvelle affectation"}</button>}
  </div>

  {show&&editable&&<form className="panel formGrid" onSubmit={save}>
   <label>Enseignant
    <select required value={form.teacher_id} onChange={e=>setForm({...form,teacher_id:e.target.value})}>
     <option value="">Choisir…</option>
     {teachers.map(x=><option key={x.id} value={x.id}>{x.last_name} {x.first_name} — {x.matricule}</option>)}
    </select>
   </label>
   <label>Classe
    <select required value={form.class_id} onChange={e=>setForm({...form,class_id:e.target.value})}>
     <option value="">Choisir…</option>
     {classes.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
    </select>
   </label>
   <label>Matière
    <select required value={form.subject_id} onChange={e=>setForm({...form,subject_id:e.target.value})}>
     <option value="">Choisir…</option>
     {subjects.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
    </select>
   </label>
   <label>Année scolaire
    <select value={form.academic_year_id} onChange={e=>setForm({...form,academic_year_id:e.target.value})}>
     <option value="">Aucune / toutes</option>
     {years.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}
    </select>
   </label>
   {msg&&<div className="error">{msg}</div>}
   <button className="btn"><Save size={16}/> Enregistrer</button>
  </form>}

  <div className="panel tableWrap">
   <table>
    <thead><tr><th>Enseignant</th><th>Classe</th><th>Matière</th><th>Année</th><th>Code portail</th>{editable&&<th>Action</th>}</tr></thead>
    <tbody>
     {rows.map(x=><tr key={x.id}>
      <td>{x.teachers?.last_name} {x.teachers?.first_name}</td>
      <td>{x.classes?.name}</td>
      <td>{x.subjects?.name}</td>
      <td>{x.academic_years?.name||"—"}</td>
      <td><code>{x.teachers?.access_code||"—"}</code></td>
      {editable&&<td><button className="btn light" onClick={()=>remove(x.id)}>Retirer</button></td>}
     </tr>)}
     {!rows.length&&<tr><td colSpan={6} className="empty">Aucune affectation active.</td></tr>}
    </tbody>
   </table>
  </div>
 </>
}

function StudentFinance({profile,can}:any){
 const [rows,setRows]=useState<any[]>([]),[q,setQ]=useState(""),[classId,setClassId]=useState("all"),[optionName,setOptionName]=useState("all"),[classes,setClasses]=useState<any[]>([]),[optionList,setOptionList]=useState<string[]>([]),[feeName,setFeeName]=useState("all"),[feeNames,setFeeNames]=useState<string[]>([]),[loading,setLoading]=useState(true),[msg,setMsg]=useState("");
 async function load(){
  setLoading(true);setMsg("");
  const [{data:students,error:se},{data:fees,error:fe},{data:payments,error:pe},{data:paymentItems,error:pie},{data:enrollments,error:ee},{data:classRows,error:ce},{data:optionRows,error:oe},{data:feeCatalog,error:fce}]=await Promise.all([
   supabase.from("students").select("id,matricule,last_name,first_name").eq("school_id",profile.school_id).eq("active",true).order("last_name").order("first_name"),
   supabase.from("student_fees").select("student_id,fee_id,amount_due,discount,currency").eq("school_id",profile.school_id),
   supabase.from("payments").select("id,student_id,amount,currency,status,paid_at").eq("school_id",profile.school_id),
   supabase.from("payment_items").select("payment_id,student_id,fee_id,amount,currency").eq("school_id",profile.school_id),
   supabase.from("enrollments").select("student_id,class_id,option_name,status,classes(name,option_name,section_name)").eq("school_id",profile.school_id),
   supabase.from("classes").select("id,name,option_name,section_name").eq("school_id",profile.school_id).order("name"),
   supabase.from("school_options").select("name,active").eq("school_id",profile.school_id).eq("active",true).order("name")
  ]);
  if(se||fe||pe||ee||ce||oe||fce){setMsg((se||fe||pe||ee||ce||oe||fce)?.message||"Impossible de charger la situation financière.");setLoading(false);return}
  const due=new Map<string,{fc:number,usd:number}>(),paid=new Map<string,{fc:number,usd:number}>(),enrollmentMap=new Map<string,any>(),classById=new Map<string,any>((classRows||[]).map((x:any)=>[x.id,x]));
  (enrollments||[]).filter((x:any)=>!x.status||["active","enrolled","confirmed"].includes(String(x.status).toLowerCase())).forEach((x:any)=>{if(!enrollmentMap.has(x.student_id))enrollmentMap.set(x.student_id,x)});
  (fees||[]).forEach((x:any)=>{const a=due.get(x.student_id)||{fc:0,usd:0};const amount=Math.max(0,Number(x.amount_due||0)-Number(x.discount||0));if(x.currency==="USD")a.usd+=amount;else a.fc+=amount;due.set(x.student_id,a)});
  const feeCatalogRows=feeCatalog||[];const assignedStudents=new Set<string>((fees||[]).map((x:any)=>x.student_id));(students||[]).forEach((s:any)=>{if(assignedStudents.has(s.id))return;const a=due.get(s.id)||{fc:0,usd:0};const enrollment=(enrollments||[]).find((e:any)=>e.student_id===s.id);feeCatalogRows.filter((f:any)=>{const option=(enrollment?.option_name||enrollment?.classes?.option_name||"").trim();const section=(enrollment?.classes?.section_name||"").trim();return (!f.option_name||!option||f.option_name===option)&&(!f.section_name||!section||f.section_name===section)}).forEach((f:any)=>{if(f.currency==="USD")a.usd+=Number(f.amount||0);else a.fc+=Number(f.amount||0)});due.set(s.id,a)});
  const validatedPaymentIds=new Set<string>((payments||[]).filter((x:any)=>x.status==="validated").map((x:any)=>x.id));
  const itemRows=(paymentItems||[]).filter((x:any)=>validatedPaymentIds.has(x.payment_id));
  if(itemRows.length){itemRows.forEach((x:any)=>{const a=paid.get(x.student_id)||{fc:0,usd:0};if(x.currency==="USD")a.usd+=Number(x.amount||0);else a.fc+=Number(x.amount||0);paid.set(x.student_id,a)})}else{(payments||[]).filter((x:any)=>x.status==="validated").forEach((x:any)=>{const a=paid.get(x.student_id)||{fc:0,usd:0};if(x.currency==="USD")a.usd+=Number(x.amount||0);else a.fc+=Number(x.amount||0);paid.set(x.student_id,a)})}
  setClasses(classRows||[]);
  setFeeNames(Array.from(new Set([...(feeCatalogRows||[]).map((x:any)=>String(x.name||"").trim()),...(fees||[]).map((x:any)=>String(x.fee_id||"").trim())].filter(Boolean))).sort((a,b)=>a.localeCompare(b,"fr",{sensitivity:"base"})));
  const knownOptions=new Set<string>((optionRows||[]).filter((x:any)=>x.name).map((x:any)=>x.name.trim()));
  (enrollments||[]).forEach((x:any)=>{const n=(x.option_name||x.classes?.option_name||"").trim();if(n)knownOptions.add(n)});
  (classRows||[]).forEach((x:any)=>{const n=(x.option_name||"").trim();if(n)knownOptions.add(n)});
  setOptionList(Array.from(knownOptions).sort((a,b)=>a.localeCompare(b,"fr",{sensitivity:"base"})));
  setRows((students||[]).map((s:any)=>{const d=due.get(s.id)||{fc:0,usd:0},p=paid.get(s.id)||{fc:0,usd:0},en=enrollmentMap.get(s.id);return {...s,class_id:en?.class_id||"",class_name:en?.classes?.name||"Classe non attribuée",feeNames:(fees||[]).filter((x:any)=>x.student_id===s.id).map((x:any)=>feeCatalogRows.find((f:any)=>f.id===x.fee_id)?.name).filter(Boolean).concat(feeCatalogRows.filter((f:any)=>!assignedStudents.has(s.id)).map((f:any)=>f.name)).join(" | "),option_name:(en?.option_name||classById.get(en?.class_id)?.option_name||en?.classes?.option_name||"Option à vérifier").trim(),fcDue:d.fc,usdDue:d.usd,fcPaid:p.fc,usdPaid:p.usd,fcBalance:Math.max(0,d.fc-p.fc),usdBalance:Math.max(0,d.usd-p.usd)}}).sort((a:any,b:any)=>a.class_name.localeCompare(b.class_name,"fr",{sensitivity:"base"})||a.option_name.localeCompare(b.option_name,"fr",{sensitivity:"base"})||a.last_name.localeCompare(b.last_name,"fr",{sensitivity:"base"})||a.first_name.localeCompare(b.first_name,"fr",{sensitivity:"base"})));
  setLoading(false);
 }
 useEffect(()=>{load()},[profile.school_id]);
 const optionNames=Array.from(new Set([...optionList,...rows.filter((r:any)=>classId==="all"||r.class_id===classId).map((r:any)=>r.option_name).filter((x:any)=>x&&x!=="Sans filière")])).sort((a:any,b:any)=>a.localeCompare(b,"fr",{sensitivity:"base"}));
 const filtered=rows.filter((r:any)=>(classId==="all"||r.class_id===classId)&&(optionName==="all"||r.option_name===optionName)&&(feeName==="all"||String(r.feeNames||"").split(" | ").includes(feeName))&&(r.matricule+" "+r.last_name+" "+r.first_name).toLowerCase().includes(q.toLowerCase()));
 return <><div className="head"><div><h1>Situation financière des élèves</h1><p>Consultation des frais dus, paiements validés et soldes, organisée par classe et filière.</p></div><button className="btn light" onClick={load}>Actualiser</button></div><div className="panel"><div className="toolbar" style={{flexWrap:"wrap"}}><div className="miniSearch"><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Nom, prénom, matricule…"/></div><label>Classe <select value={classId} onChange={e=>{setClassId(e.target.value);setOptionName("all")}}><option value="all">Toutes les classes</option>{classes.map((x:any)=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Option / filière <select value={optionName} onChange={e=>setOptionName(e.target.value)}><option value="all">Toutes les filières</option>{optionNames.map((x:any)=><option key={x} value={x}>{x}</option>)}</select></label><label>Rubrique <select value={feeName} onChange={e=>setFeeName(e.target.value)}><option value="all">Toutes les rubriques</option>{feeNames.map((x:any)=><option key={x} value={x}>{x}</option>)}</select></label></div>{msg&&<div className="error">{msg}</div>}{loading?<p>Chargement…</p>:<div className="tableWrap"><table><thead><tr><th>Classe</th><th>Option / filière</th><th>Élève</th><th>Dû FC</th><th>Payé FC</th><th>Solde FC</th><th>Dû USD</th><th>Payé USD</th><th>Solde USD</th></tr></thead><tbody>{filtered.map((r:any)=><tr key={r.id}><td>{r.class_name}</td><td>{r.option_name}</td><td><b>{r.last_name} {r.first_name}</b><br/><small>{r.matricule||"Sans matricule"}</small></td><td>{money(r.fcDue,"FC")}</td><td>{money(r.fcPaid,"FC")}</td><td><b>{money(r.fcBalance,"FC")}</b></td><td>{money(r.usdDue,"USD")}</td><td>{money(r.usdPaid,"USD")}</td><td><b>{money(r.usdBalance,"USD")}</b></td></tr>)}{!filtered.length&&<tr><td colSpan={9} className="empty">Aucun élève trouvé pour ces critères.</td></tr>}</tbody></table></div>}<p className="notice">Consultation uniquement. Les paiements et les frais restent modifiables uniquement par les rôles autorisés.</p></div></>;
}

function Finance({profile,can}:any){
 const [tab,setTab]=useState("payments"),[payments,setPayments]=useState<any[]>([]),[expenses,setExpenses]=useState<any[]>([]),[fees,setFees]=useState<any[]>([]),[installments,setInstallments]=useState<any[]>([]),[expenseCategories,setExpenseCategories]=useState<any[]>([]),[studentFees,setStudentFees]=useState<any[]>([]),[students,setStudents]=useState<any[]>([]),[show,setShow]=useState(false),[form,setForm]=useState<any>({student_id:"",amount:"",currency:"FC",method:"cash",reference:"",category:"",category_id:"",category_description:"",monthly_budget:"",annual_budget:"",description:"",fee_id:"",fee_name:"",installment_id:""}),[msg,setMsg]=useState(""),[printPayment,setPrintPayment]=useState<any>(null);
 const editable=can("finance","finance","comptable");
 const feeEditable=can("finance","finance");
 async function load(){const [p,e,f,ins,ec,s,sf]=await Promise.all([
  supabase.from("payments").select("*,students(last_name,first_name,matricule)").eq("school_id",profile.school_id).order("paid_at",{ascending:false}),
  supabase.from("expenses").select("*").eq("school_id",profile.school_id).order("paid_at",{ascending:false}),
  supabase.from("fees").select("*").eq("school_id",profile.school_id).order("name"),
  supabase.from("fee_installments").select("*").eq("school_id",profile.school_id).eq("active",true).order("installment_number"),
  supabase.from("expense_categories").select("*").eq("school_id",profile.school_id).eq("active",true).order("name"),
  supabase.from("students").select("id,matricule,last_name,first_name").eq("school_id",profile.school_id).order("last_name"),
  supabase.from("student_fees").select("id,student_id,fee_id").eq("school_id",profile.school_id)
 ]);setPayments(p.data||[]);setExpenses(e.data||[]);setFees(f.data||[]);setInstallments(ins.data||[]);setExpenseCategories(ec.data||[]);setStudents(s.data||[]);setStudentFees(sf.data||[])}
 useEffect(()=>{load()},[profile.school_id]);
 const fcIncome=payments.filter(x=>x.currency!=="USD").reduce((a,x)=>a+Number(x.amount||0),0),usdIncome=payments.filter(x=>x.currency==="USD").reduce((a,x)=>a+Number(x.amount||0),0),fcOut=expenses.filter(x=>x.currency!=="USD").reduce((a,x)=>a+Number(x.amount||0),0),usdOut=expenses.filter(x=>x.currency==="USD").reduce((a,x)=>a+Number(x.amount||0),0);
 function reset(){setForm({student_id:"",amount:"",currency:"FC",method:"cash",reference:"",category:"",category_id:"",category_description:"",monthly_budget:"",annual_budget:"",description:"",fee_id:"",fee_name:"",installment_id:""})}
 async function save(e:React.FormEvent){e.preventDefault();setMsg("");
  if(tab==="fees"){if(!feeEditable)return;const {data:fee,error}=await supabase.from("fees").insert({school_id:profile.school_id,name:form.fee_name,description:form.description||null,amount:Number(form.amount),currency:form.currency,frequency:"annual",active:true,required:false}).select("id,amount,currency").single();if(error){setMsg("Création de la rubrique impossible : "+error.message);return}const {data:enrollments,error:enrollmentError}=await supabase.from("enrollments").select("student_id,academic_year_id,status").eq("school_id",profile.school_id);if(enrollmentError){setMsg("Rubrique créée, mais affectation aux élèves impossible : "+enrollmentError.message);return}const eligible=Array.from(new Map((enrollments||[]).filter((x:any)=>!x.status||["active","enrolled","confirmed"].includes(String(x.status).toLowerCase())).map((x:any)=>[x.student_id,x])).values()) as any[];if(eligible.length){const {error:assignError}=await supabase.from("student_fees").upsert(eligible.map((x:any)=>({school_id:profile.school_id,student_id:x.student_id,fee_id:fee.id,academic_year_id:x.academic_year_id||null,amount_due:Number(fee.amount),discount:0,currency:fee.currency})),{onConflict:"student_id,fee_id,academic_year_id"});if(assignError){setMsg("Rubrique créée, mais affectation automatique incomplète : "+assignError.message);return}}setMsg("Rubrique créée et affectée aux élèves inscrits.");setShow(false);reset();await load();return}
  if(tab==="expense_categories"){if(!feeEditable)return;const {error}=await supabase.from("expense_categories").insert({school_id:profile.school_id,name:form.category.trim(),description:form.category_description||null,monthly_budget:form.monthly_budget?Number(form.monthly_budget):null,annual_budget:form.annual_budget?Number(form.annual_budget):null,currency:form.currency,active:true});if(error)setMsg(error.message);else{setMsg("Rubrique de dépense ajoutée.");setShow(false);reset();load()}return}
  if(!editable)return;
  if(tab==="payments"){
   if(!form.student_id||!form.amount)return;
   const fee=fees.find(x=>x.id===form.fee_id);
   const receipt="REC-"+new Date().getFullYear()+"-"+String(Date.now()).slice(-6);
   const {data:row,error}=await supabase.from("payments").insert({school_id:profile.school_id,student_id:form.student_id,student_fee_id:studentFees.find(x=>x.student_id===form.student_id&&x.fee_id===form.fee_id)?.id||null,receipt_number:receipt,amount:Number(form.amount),currency:form.currency,method:form.method,reference:form.reference||null,status:"validated",received_by:profile.id,note:fee?fee.name:(form.fee_name||null)}).select("*,students(last_name,first_name,matricule)").single();
   if(error){setMsg(error.message);return}
   const item={payment_id:row.id,school_id:profile.school_id,student_id:form.student_id,fee_id:form.fee_id||null,installment_id:form.installment_id||null,description:(fee?.name||form.fee_name||"Paiement scolaire")+(form.installment_id?" — "+(installments.find(i=>i.id===form.installment_id)?.name||"Tranche"):""),amount:Number(form.amount),currency:form.currency};
   const {error:ie}=await supabase.from("payment_items").insert(item);
   if(ie){setMsg("Paiement enregistré, mais le détail du reçu n'a pas pu être enregistré : "+ie.message);return}
   const {error:me}=await supabase.from("cash_movements").insert({school_id:profile.school_id,movement_type:"in",amount:Number(form.amount),currency:form.currency,payment_id:row.id,method:form.method,reference:form.reference||null,note:fee?.name||form.fee_name||null,created_by:profile.id});
   if(me){setMsg("Paiement enregistré, mais le mouvement de caisse n'a pas pu être créé : "+me.message);return}
   setPrintPayment(row);setShow(false);reset();await load();return
  }
  const expenseCategory=expenseCategories.find((x:any)=>x.id===form.category_id);const isOther=form.category_id==="__other__";if(!expenseCategory&&!isOther){setMsg("Sélectionnez une rubrique de dépense ou choisissez Autres.");return}const categoryName=isOther?"Autres":expenseCategory.name;const {data:row,error}=await supabase.from("expenses").insert({school_id:profile.school_id,category:categoryName,category_id:isOther?null:expenseCategory.id,description:form.description,amount:Number(form.amount),currency:form.currency,status:"validated",created_by:profile.id}).select().single();
  if(error){setMsg(error.message);return}
  const {error:me}=await supabase.from("cash_movements").insert({school_id:profile.school_id,movement_type:"out",amount:Number(form.amount),currency:form.currency,expense_id:row.id,method:form.method||null,reference:form.reference||null,note:form.description,created_by:profile.id});
  if(me)setMsg("Dépense enregistrée, mais le mouvement de caisse n'a pas pu être créé : "+me.message); else {setShow(false);reset();load()}
 }
 return <><div className="head"><div><h1>Finances</h1><p>Frais configurables, encaissements détaillés, reçus et dépenses en FC/USD.</p></div>{((tab==="fees"&&feeEditable)||(tab==="expense_categories"&&feeEditable)||(tab==="payments"&&editable)||(tab==="expenses"&&editable))&&<button className="btn" onClick={()=>setShow(!show)}><Plus size={17}/> {tab==="payments"?"Nouvel encaissement":tab==="fees"?"Nouvelle rubrique de frais":tab==="expense_categories"?"Nouvelle rubrique de dépense":"Nouvelle dépense"}</button>}</div>
 <div className="cards"><Stat title="Encaissements FC" value={money(fcIncome,"FC")} icon={<Receipt/>}/><Stat title="Encaissements USD" value={money(usdIncome,"USD")} icon={<Receipt/>}/><Stat title="Dépenses FC" value={money(fcOut,"FC")} icon={<Wallet/>}/><Stat title="Dépenses USD" value={money(usdOut,"USD")} icon={<Wallet/>}/></div>
 <div className="panel"><div className="financeSummary"><div><small>Solde FC</small><b>{money(fcIncome-fcOut,"FC")}</b></div><div><small>Solde USD</small><b>{money(usdIncome-usdOut,"USD")}</b></div><div><small>Transactions</small><b>{payments.length+expenses.length}</b></div></div></div>
 <div className="tabs"><button className={tab==="payments"?"tab active":"tab"} onClick={()=>{setTab("payments");setShow(false)}}>Encaissements</button><button className={tab==="fees"?"tab active":"tab"} onClick={()=>{setTab("fees");setShow(false)}}>Rubriques de frais</button><button className={tab==="expenses"?"tab active":"tab"} onClick={()=>{setTab("expenses");setShow(false)}}>Dépenses</button>{feeEditable&&<button className={tab==="expense_categories"?"tab active":"tab"} onClick={()=>{setTab("expense_categories");setShow(false)}}>Rubriques dépenses</button>}</div>
 {show&&<form className="panel formGrid" onSubmit={save}>{tab==="payments"?<><label>Élève<select required value={form.student_id} onChange={e=>setForm({...form,student_id:e.target.value})}><option value="">Choisir…</option>{students.map(s=><option key={s.id} value={s.id}>{s.matricule} — {s.last_name} {s.first_name}</option>)}</select></label><label>Rubrique<select required value={form.fee_id} onChange={e=>{const f=fees.find(x=>x.id===e.target.value);setForm({...form,fee_id:e.target.value,amount:f?.amount??form.amount,currency:f?.currency??form.currency,fee_name:f?.name||"",installment_id:""})}}><option value="">Choisir la rubrique…</option>{fees.filter(x=>x.active!==false).map(f=><option key={f.id} value={f.id}>{f.name} — {money(Number(f.amount),f.currency)}</option>)}</select></label><label>Tranche<select value={form.installment_id} onChange={e=>{const i=installments.find(x=>x.id===e.target.value);setForm({...form,installment_id:e.target.value,amount:i?.amount??form.amount,currency:i?.currency??form.currency})}}><option value="">Paiement global / sans tranche</option>{installments.filter(i=>!form.fee_id||i.fee_id===form.fee_id).map(i=><option key={i.id} value={i.id}>{i.name} — {money(Number(i.amount),i.currency)}</option>)}</select></label><label>Montant payé<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Devise<select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}><option value="FC">Franc congolais (FC)</option><option value="USD">Dollar américain ($)</option></select></label><label>Mode<select value={form.method} onChange={e=>setForm({...form,method:e.target.value})}><option value="cash">Espèces</option><option value="mobile_money">Mobile Money</option><option value="bank">Banque</option></select></label><label>Référence<input value={form.reference} onChange={e=>setForm({...form,reference:e.target.value})}/></label></>
 :tab==="fees"?<><label>Nom de la rubrique<input required value={form.fee_name} onChange={e=>setForm({...form,fee_name:e.target.value})} placeholder="Vareuse"/></label><label>Montant<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Devise<select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}><option value="USD">Dollar américain ($)</option><option value="FC">Franc congolais (FC)</option></select></label><label>Description<input value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Vareuse scolaire"/></label></>
 :tab==="expense_categories"?<><label>Nom de la rubrique<input required value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Électricité"/></label><label>Devise<select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}><option value="FC">Franc congolais (FC)</option><option value="USD">Dollar américain ($)</option></select></label><label>Budget mensuel<input type="number" min="0" step="0.01" value={form.monthly_budget} onChange={e=>setForm({...form,monthly_budget:e.target.value})}/></label><label>Budget annuel<input type="number" min="0" step="0.01" value={form.annual_budget} onChange={e=>setForm({...form,annual_budget:e.target.value})}/></label><label style={{gridColumn:"1/-1"}}>Description<textarea rows={3} value={form.category_description} onChange={e=>setForm({...form,category_description:e.target.value})}/></label></>
 :<><label>Rubrique de dépense<select required value={form.category_id} onChange={e=>{const x=expenseCategories.find((c:any)=>c.id===e.target.value);setForm({...form,category_id:e.target.value,category:x?.name||"",currency:x?.currency||form.currency})}}><option value="">Choisir une rubrique…</option>{expenseCategories.map((x:any)=><option key={x.id} value={x.id}>{x.name} — {x.currency}</option>)}<option value="__other__">Autres — dépense exceptionnelle</option></select></label><label>Montant<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Devise<select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}><option value="FC">Franc congolais (FC)</option><option value="USD">Dollar américain ($)</option></select></label><label style={{gridColumn:"1/-1"}}>Description<textarea required rows={3} value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label></>}
 {msg&&<div className="error" style={{gridColumn:"1/-1"}}>{msg}</div>}<button className="btn"><Save size={16}/> Enregistrer</button></form>}
 {tab==="fees"?<div className="panel tableWrap"><table><thead><tr><th>Rubrique</th><th>Montant</th><th>Devise</th><th>Fréquence</th><th>Statut</th></tr></thead><tbody>{fees.map(f=><tr key={f.id}><td><b>{f.name}</b><br/><small>{f.description||""}</small></td><td>{money(Number(f.amount),f.currency)}</td><td>{f.currency}</td><td>{f.frequency||"annuel"}</td><td><span className="badge">{f.active?"Active":"Inactive"}</span></td></tr>)}</tbody></table></div>
 :tab==="expense_categories"?<div className="panel tableWrap"><table><thead><tr><th>Rubrique</th><th>Description</th><th>Budget mensuel</th><th>Budget annuel</th><th>Devise</th></tr></thead><tbody>{expenseCategories.map((x:any)=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.description||"—"}</td><td>{x.monthly_budget?money(Number(x.monthly_budget),x.currency):"—"}</td><td>{x.annual_budget?money(Number(x.annual_budget),x.currency):"—"}</td><td>{x.currency}</td></tr>)}{!expenseCategories.length&&<tr><td colSpan={5} className="empty">Aucune rubrique de dépense.</td></tr>}</tbody></table></div>
 :<div className="panel tableWrap"><table><thead><tr><th>Date</th><th>{tab==="payments"?"Reçu":"Catégorie"}</th><th>Élève/Description</th><th>Montant</th><th>Devise</th><th>Statut</th>{tab==="payments"&&<th></th>}</tr></thead><tbody>{(tab==="payments"?payments:expenses).map(x=><tr key={x.id}><td>{new Date(x.paid_at||Date.now()).toLocaleDateString("fr-FR")}</td><td>{x.receipt_number||x.category}</td><td>{tab==="payments"?(x.students?.last_name+" "+x.students?.first_name):x.description}</td><td><b>{money(Number(x.amount),x.currency||"FC")}</b></td><td>{x.currency==="USD"?"Dollar":"Franc congolais"}</td><td><span className="badge">{x.status}</span></td>{tab==="payments"&&<td><button className="btn light" onClick={()=>setPrintPayment(x)}><Printer size={15}/> Reçu</button></td>}</tr>)}{!(tab==="payments"?payments:expenses).length&&<tr><td colSpan={7} className="empty">Aucune transaction.</td></tr>}</tbody></table></div>}
 {printPayment&&<ReceiptPrint payment={printPayment} school={profile.school_id} onClose={()=>setPrintPayment(null)}/>}</>
}

function FeeTracking({profile}:any){
 const [classes,setClasses]=useState<any[]>([]),[enrollments,setEnrollments]=useState<any[]>([]),[students,setStudents]=useState<any[]>([]),[studentFees,setStudentFees]=useState<any[]>([]),[items,setItems]=useState<any[]>([]),[payments,setPayments]=useState<any[]>([]),[feeCatalog,setFeeCatalog]=useState<any[]>([]),[installments,setInstallments]=useState<any[]>([]),[selected,setSelected]=useState(""),[status,setStatus]=useState("all");
 useEffect(()=>{(async()=>{const [c,e,s,sf,pi,p,f,ins]=await Promise.all([supabase.from("classes").select("id,name,option_name,section_name").eq("school_id",profile.school_id).order("name"),supabase.from("enrollments").select("student_id,class_id,option_name,status").eq("school_id",profile.school_id),supabase.from("students").select("id,matricule,last_name,first_name").eq("school_id",profile.school_id),supabase.from("student_fees").select("student_id,fee_id,amount_due,discount,currency").eq("school_id",profile.school_id),supabase.from("payment_items").select("student_id,installment_id,amount,currency,fee_id").eq("school_id",profile.school_id),supabase.from("payments").select("student_id,amount,currency,status").eq("school_id",profile.school_id),supabase.from("fees").select("id,amount,currency,active").eq("school_id",profile.school_id),supabase.from("fee_installments").select("*").eq("school_id",profile.school_id).order("installment_number")]);setClasses(c.data||[]);setEnrollments(e.data||[]);setStudents(s.data||[]);setStudentFees(sf.data||[]);setItems(pi.data||[]);setPayments(p.data||[]);setFeeCatalog((f.data||[]).filter((x:any)=>x.active!==false));setInstallments(ins.data||[])})()},[profile.school_id]);
 const stats=useMemo(()=>classes.map((cl:any)=>{const ids=enrollments.filter((e:any)=>e.class_id===cl.id&&String(e.status||"").toLowerCase()!=="cancelled").map((e:any)=>e.student_id);const rows=ids.map((id:string)=>{const sf=studentFees.filter((x:any)=>x.student_id===id);const pi=items.filter((x:any)=>x.student_id===id);const fallbackFees=sf.length?[]:feeCatalog;const dueRows=[...sf,...fallbackFees.map((x:any)=>({fee_id:x.id,amount_due:x.amount,discount:0,currency:x.currency}))];const dueFC=dueRows.filter((x:any)=>x.currency!=="USD").reduce((a:number,x:any)=>a+Math.max(0,Number(x.amount_due||0)-Number(x.discount||0)),0);const dueUSD=dueRows.filter((x:any)=>x.currency==="USD").reduce((a:number,x:any)=>a+Math.max(0,Number(x.amount_due||0)-Number(x.discount||0)),0);const studentPayments=payments.filter((x:any)=>x.student_id===id&&x.status==="validated");const payRows=pi.length?pi:studentPayments;const paidFC=payRows.filter((x:any)=>x.currency!=="USD").reduce((a:number,x:any)=>a+Number(x.amount||0),0);const paidUSD=payRows.filter((x:any)=>x.currency==="USD").reduce((a:number,x:any)=>a+Number(x.amount||0),0);const tr=installments.filter((i:any)=>sf.some((f:any)=>f.fee_id===i.fee_id)).map((i:any)=>{const paid=pi.filter((x:any)=>x.installment_id===i.id).reduce((a:number,x:any)=>a+Number(x.amount||0),0);return {...i,paid,status:paid>=Number(i.amount)&&Number(i.amount)>0?"soldée":(i.due_date&&new Date(i.due_date)<new Date()&&paid<Number(i.amount)?"en retard":"à payer")}});const totalDue=dueFC+dueUSD;return {...students.find((s:any)=>s.id===id),dueFC,dueUSD,paidFC,paidUSD,settled:totalDue>0&&dueFC<=paidFC&&dueUSD<=paidUSD,partial:(paidFC>0||paidUSD>0)&&!(totalDue>0&&dueFC<=paidFC&&dueUSD<=paidUSD),overdue:tr.some((x:any)=>x.status==="en retard"),tr}});return {id:cl.id,name:cl.name,count:rows.length,settled:rows.filter((x:any)=>x.settled).length,partial:rows.filter((x:any)=>x.partial&&!x.settled).length,overdue:rows.filter((x:any)=>x.overdue).length,rows}}),[classes,enrollments,students,studentFees,items,installments]);
 const current=stats.find((x:any)=>x.id===selected);
 return <div className="panel"><div className="head"><div><h2>Contrôle des frais scolaires</h2><p>Suivi automatique par classe, élève et tranche.</p></div><div className="toolbar"><select value={status} onChange={e=>setStatus(e.target.value)}><option value="all">Tous</option><option value="settled">Soldés</option><option value="partial">Partiels</option><option value="overdue">En retard</option></select><select value={selected} onChange={e=>setSelected(e.target.value)}><option value="">Toutes les classes</option>{classes.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>{current?<div><div className="cards"><Stat title="Élèves" value={current.count} icon={<Users/>}/><Stat title="Soldés" value={current.settled} icon={<CheckCircle/>}/><Stat title="Paiements partiels" value={current.partial} icon={<Receipt/>}/><Stat title="En retard" value={current.overdue} icon={<AlertTriangle/>}/></div><div className="tableWrap"><table><thead><tr><th>Matricule</th><th>Élève</th><th>Reste FC</th><th>Reste USD</th><th>Tranches</th><th>État</th></tr></thead><tbody>{current.rows.filter((s:any)=>status==="all"||(status==="settled"&&s.settled)||(status==="partial"&&s.partial)||(status==="overdue"&&s.overdue)).map((s:any)=><tr key={s.id}><td>{s.matricule}</td><td>{s.last_name} {s.first_name}</td><td>{money(Math.max(0,s.dueFC-s.paidFC),"FC")}</td><td>{money(Math.max(0,s.dueUSD-s.paidUSD),"USD")}</td><td>{s.tr.filter((x:any)=>x.status==="soldée").length}/{s.tr.length}</td><td>{s.overdue?"En retard":s.settled?"Soldé":s.partial?"Partiel":"À payer"}</td></tr>)}</tbody></table></div></div>:<div className="tableWrap"><table><thead><tr><th>Classe</th><th>Élèves</th><th>Soldés</th><th>Partiels</th><th>En retard</th></tr></thead><tbody>{stats.map((x:any)=><tr key={x.id}><td><button className="btn light" onClick={()=>setSelected(x.id)}>{x.name}</button></td><td>{x.count}</td><td>{x.settled}</td><td>{x.partial}</td><td>{x.overdue}</td></tr>)}</tbody></table></div>}</div></div>
}
function FeeInstallmentManager({profile,can}:any){
 const [fees,setFees]=useState<any[]>([]),[rows,setRows]=useState<any[]>([]),[open,setOpen]=useState(false),[form,setForm]=useState<any>({fee_id:"",name:"",installment_number:1,amount:"",currency:"USD",due_date:""}),[msg,setMsg]=useState("");
 const editable=can("studentFinance","finance");
 async function load(){const [f,r]=await Promise.all([supabase.from("fees").select("id,name,currency,active").eq("school_id",profile.school_id).order("name"),supabase.from("fee_installments").select("*").eq("school_id",profile.school_id).order("fee_id").order("installment_number")]);if(f.error||r.error){setMsg("Chargement impossible : "+(f.error||r.error)?.message);return}const available=f.data||[];setFees(available);setRows(r.data||[]);setMsg(available.length?"":"Aucune rubrique de frais n’a été retournée pour cet établissement. Vérifie que les rubriques ont été créées dans le même établissement et que les autorisations de lecture sont actives.")}
 useEffect(()=>{load()},[profile.school_id]);
 async function save(e:React.FormEvent){e.preventDefault();if(!editable)return;const f=fees.find((x:any)=>x.id===form.fee_id);const {error}=await supabase.from("fee_installments").insert({school_id:profile.school_id,fee_id:form.fee_id,name:form.name,installment_number:Number(form.installment_number),amount:Number(form.amount),currency:form.currency,due_date:form.due_date||null,active:true});if(error){setMsg("Enregistrement impossible : "+error.message);return}setMsg("Tranche enregistrée.");setOpen(false);setForm({fee_id:"",name:"",installment_number:1,amount:"",currency:f?.currency||"USD",due_date:""});load()}
 return <div className="panel">{msg&&<div className={msg.includes("impossible")?"error":"notice"}>{msg}</div>}<div className="head"><div><h2>Échéancier des frais</h2><p>Définissez les tranches, leurs montants et leurs dates limites.</p></div>{editable&&<button className="btn" onClick={()=>setOpen(!open)}><Plus size={16}/> Nouvelle tranche</button>}</div>{open&&<form className="formGrid" onSubmit={save}><label>Rubrique<select required value={form.fee_id} onChange={e=>{const f=fees.find((x:any)=>x.id===e.target.value);setForm({...form,fee_id:e.target.value,currency:f?.currency||form.currency})}}><option value="">Choisir…</option>{fees.map((f:any)=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label><label>Nom<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="1ère tranche"/></label><label>N°<input type="number" min="1" required value={form.installment_number} onChange={e=>setForm({...form,installment_number:e.target.value})}/></label><label>Montant<input type="number" min="0.01" step="0.01" required value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Devise<select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}><option value="USD">USD</option><option value="FC">FC</option></select></label><label>Date limite<input type="date" value={form.due_date} onChange={e=>setForm({...form,due_date:e.target.value})}/></label><button className="btn">Enregistrer</button></form>}<div className="tableWrap"><table><thead><tr><th>Rubrique</th><th>Tranche</th><th>Montant</th><th>Échéance</th></tr></thead><tbody>{rows.map((r:any)=><tr key={r.id}><td>{fees.find((f:any)=>f.id===r.fee_id)?.name||"—"}</td><td>{r.name}</td><td>{money(Number(r.amount),r.currency)}</td><td>{r.due_date?new Date(r.due_date).toLocaleDateString("fr-FR"):"—"}</td></tr>)}</tbody></table></div></div>
}

function ReceiptPrint({payment,onClose}:any){
 const [items,setItems]=useState<any[]>([]);
 const [school,setSchool]=useState<any>(null);
 useEffect(()=>{(async()=>{const [{data:i},{data:s}]=await Promise.all([supabase.from("payment_items").select("*").eq("payment_id",payment.id).order("created_at"),supabase.from("schools").select("*").eq("id",payment.school_id).single()]);setItems(i||[]);setSchool(s)})()},[payment.id]);
 return <div className="modalBackdrop" onClick={onClose}><div className="panel adminModal" onClick={e=>e.stopPropagation()}><div className="receipt" id="print-receipt"><div style={{textAlign:"center"}}>{school?.logo_url&&<img src={school.logo_url} alt="Logo" style={{maxWidth:90,maxHeight:90,objectFit:"contain"}}/>}<h2>{school?.name||"Établissement scolaire"}</h2><b>REÇU DE PAIEMENT</b><p>N° {payment.receipt_number}<br/>{new Date(payment.paid_at).toLocaleString("fr-FR")}</p></div><p><b>Élève :</b> {payment.students?.last_name} {payment.students?.first_name}<br/><b>Matricule :</b> {payment.students?.matricule}</p><table><thead><tr><th>Désignation</th><th>Montant</th></tr></thead><tbody>{items.map(i=><tr key={i.id}><td>{i.description}</td><td>{money(Number(i.amount),i.currency)}</td></tr>)}</tbody></table><p><b>Total payé : {money(Number(payment.amount),payment.currency)}</b><br/>Mode : {payment.method}{payment.reference?" • Réf. "+payment.reference:""}</p><p style={{textAlign:"center",marginTop:24}}>Merci pour votre confiance.</p></div><div style={{display:"flex",gap:8,marginTop:12}}><button className="btn" onClick={()=>window.print()}><Printer size={16}/> Imprimer</button><button className="btn light" onClick={onClose}>Fermer</button></div></div></div>
}

function Parents({profile}:any){
 const [rows,setRows]=useState<any[]>([]);
 async function load(){const {data}=await supabase.from("parents").select("*").eq("school_id",profile.school_id).order("last_name");setRows(data||[])}
 useEffect(()=>{load()},[profile.school_id]);
 return <><div className="head"><div><h1>Parents & tuteurs</h1><p>Consultation des responsables déjà enregistrés. Pour créer un parent, utilisez uniquement « Inscrire un enfant ».</p></div></div><div className="panel tableWrap"><table><thead><tr><th>Parent</th><th>Téléphone</th><th>Email</th><th>Profession</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{x.last_name} {x.first_name}</td><td>{x.phone||"—"}</td><td>{x.email||"—"}</td><td>{x.occupation||"—"}</td></tr>)}{!rows.length&&<tr><td colSpan={4} className="empty">Aucun parent enregistré.</td></tr>}</tbody></table></div></>
}

function Enrollments({profile,can}:any){
 const [photoBusy,setPhotoBusy]=useState(false),[photoPreview,setPhotoPreview]=useState("");
 const [classes,setClasses]=useState<any[]>([]),[options,setOptions]=useState<any[]>([]),[years,setYears]=useState<any[]>([]),[rows,setRows]=useState<any[]>([]),[busy,setBusy]=useState(false),[msg,setMsg]=useState(""),[success,setSuccess]=useState<any>(null);
 const [form,setForm]=useState<any>({student:{last_name:"",first_name:"",post_name:"",sex:"M",date_of_birth:"",place_of_birth:"",address:"",phone:"",email:""},parent1:{last_name:"",first_name:"",phone:"",email:"",address:"",occupation:"",relationship:"Père"},parent2:{last_name:"",first_name:"",phone:"",email:"",address:"",occupation:"",relationship:"Mère"},class_id:"",academic_year_id:"",option_name:"",registration_number:""});
 async function load(){const [e,c,o,y]=await Promise.all([supabase.from("enrollments").select("id,registration_number,status,registered_at,students(last_name,first_name,matricule,parent_access_code,student_parents(relationship,is_primary,parents(first_name,last_name,phone))),classes(name),academic_years(name)").eq("school_id",profile.school_id).order("registered_at",{ascending:false}),supabase.from("classes").select("id,name,option_name").eq("school_id",profile.school_id).order("name"),supabase.from("school_options").select("id,name").eq("school_id",profile.school_id).eq("active",true).order("name"),supabase.from("academic_years").select("id,name,is_current").eq("school_id",profile.school_id).order("start_date",{ascending:false})]);setRows(e.data||[]);setClasses(c.data||[]);setOptions(o.data||[]);setYears(y.data||[]);if(!form.academic_year_id&&y.data?.[0])setForm((f:any)=>({...f,academic_year_id:y.data[0].id}))}
 useEffect(()=>{load()},[profile.school_id]);
 const updateStudent=(k:string,v:any)=>setForm((f:any)=>({...f,student:{...f.student,[k]:v}}));
 const updateParent=(which:"parent1"|"parent2",k:string,v:any)=>setForm((f:any)=>({...f,[which]:{...f[which],[k]:v}}));
 async function uploadStudentPhoto(file:File){setPhotoBusy(true);setMsg("");const ext=(file.name.split(".").pop()||"jpg").toLowerCase();const path=`${profile.school_id}/students/${crypto.randomUUID()}.${ext}`;const {error}=await supabase.storage.from("school-assets").upload(path,file,{upsert:false,contentType:file.type||"image/jpeg"});if(error){setMsg("Photo non envoyée : "+error.message);setPhotoBusy(false);return}const url=await signedAsset(path);setForm((f:any)=>({...f,student:{...f.student,photo_path:path}}));setPhotoPreview(url||"");setPhotoBusy(false)}
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setMsg("");setSuccess(null);const {data,error}=await supabase.functions.invoke("register-student",{body:form});if(error){let detail=error.message;try{const b=await (error as any).context?.json?.();if(b?.error)detail=b.error}catch{}setMsg(detail||"Inscription impossible.");setBusy(false);return}if(data?.error){setMsg(data.error);setBusy(false);return}setSuccess(data);setForm({student:{last_name:"",first_name:"",post_name:"",sex:"M",date_of_birth:"",place_of_birth:"",address:"",phone:"",email:""},parent1:{last_name:"",first_name:"",phone:"",email:"",address:"",occupation:"",relationship:"Père"},parent2:{last_name:"",first_name:"",phone:"",email:"",address:"",occupation:"",relationship:"Mère"},class_id:"",academic_year_id:years[0]?.id||"",option_name:"",registration_number:""});await load();setBusy(false)}
 return <><div className="head"><div><h1>Inscrire un enfant</h1><p>Un seul parcours : élève + parent(s) + classe + année scolaire + numéro d'inscription.</p></div></div>{profile.roles?.name==="secretaire"&&<form className="panel formGrid" onSubmit={save}><h3 style={{gridColumn:"1/-1"}}>1. Informations de l’enfant</h3><label>Nom<input required value={form.student.last_name} onChange={e=>updateStudent("last_name",e.target.value)}/></label><label>Prénom<input required value={form.student.first_name} onChange={e=>updateStudent("first_name",e.target.value)}/></label><label>Postnom<input value={form.student.post_name} onChange={e=>updateStudent("post_name",e.target.value)}/></label><label>Sexe<select value={form.student.sex} onChange={e=>updateStudent("sex",e.target.value)}><option>M</option><option>F</option></select></label><label>Date de naissance<input type="date" value={form.student.date_of_birth} onChange={e=>updateStudent("date_of_birth",e.target.value)}/></label><label>Lieu de naissance<input value={form.student.place_of_birth} onChange={e=>updateStudent("place_of_birth",e.target.value)}/></label><label>Adresse<input value={form.student.address} onChange={e=>updateStudent("address",e.target.value)}/></label><label>Téléphone<input value={form.student.phone} onChange={e=>updateStudent("phone",e.target.value)}/></label><label>Email<input type="email" value={form.student.email} onChange={e=>updateStudent("email",e.target.value)}/></label><label>Photo de l’élève <small>(facultative — ajout possible plus tard)</small><input type="file" accept="image/*" capture="environment" disabled={photoBusy} onChange={e=>{const f=e.target.files?.[0];if(f)uploadStudentPhoto(f)}}/>{photoPreview&&<img src={photoPreview} alt="Aperçu" style={{width:90,height:110,objectFit:"cover",borderRadius:8,marginTop:6}}/>}</label><h3 style={{gridColumn:"1/-1"}}>2. Parent / responsable principal <small>(obligatoire)</small></h3><label>Nom<input required value={form.parent1.last_name} onChange={e=>updateParent("parent1","last_name",e.target.value)}/></label><label>Prénom<input required value={form.parent1.first_name} onChange={e=>updateParent("parent1","first_name",e.target.value)}/></label><label>Téléphone<input required value={form.parent1.phone} onChange={e=>updateParent("parent1","phone",e.target.value)}/></label><label>Email<input type="email" value={form.parent1.email} onChange={e=>updateParent("parent1","email",e.target.value)}/></label><label>Profession<input value={form.parent1.occupation} onChange={e=>updateParent("parent1","occupation",e.target.value)}/></label><label>Lien<select value={form.parent1.relationship} onChange={e=>updateParent("parent1","relationship",e.target.value)}><option>Père</option><option>Mère</option><option>Tuteur</option><option>Responsable</option></select></label><label>Adresse<input value={form.parent1.address} onChange={e=>updateParent("parent1","address",e.target.value)}/></label><h3 style={{gridColumn:"1/-1"}}>3. Deuxième parent / responsable <small>(facultatif)</small></h3><label>Nom<input value={form.parent2.last_name} onChange={e=>updateParent("parent2","last_name",e.target.value)}/></label><label>Prénom<input value={form.parent2.first_name} onChange={e=>updateParent("parent2","first_name",e.target.value)}/></label><label>Téléphone<input value={form.parent2.phone} onChange={e=>updateParent("parent2","phone",e.target.value)}/></label><label>Email<input type="email" value={form.parent2.email} onChange={e=>updateParent("parent2","email",e.target.value)}/></label><label>Profession<input value={form.parent2.occupation} onChange={e=>updateParent("parent2","occupation",e.target.value)}/></label><label>Lien<select value={form.parent2.relationship} onChange={e=>updateParent("parent2","relationship",e.target.value)}><option>Mère</option><option>Père</option><option>Tuteur</option><option>Responsable</option></select></label><h3 style={{gridColumn:"1/-1"}}>4. Scolarité</h3><label>Classe<select required value={form.class_id} onChange={e=>setForm({...form,class_id:e.target.value})}><option value="">Choisir…</option>{classes.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Option / filière<select value={form.option_name} onChange={e=>setForm({...form,option_name:e.target.value})}><option value="">Aucune / non concernée</option>{options.map(x=><option key={x.id} value={x.name}>{x.name}</option>)}</select></label><label>Année scolaire<select required value={form.academic_year_id} onChange={e=>setForm({...form,academic_year_id:e.target.value})}><option value="">Choisir…</option>{years.map(x=><option key={x.id} value={x.id}>{x.name}{x.is_current?" — actuelle":""}</option>)}</select></label><label>N° d'inscription<input value={form.registration_number} onChange={e=>setForm({...form,registration_number:e.target.value})} placeholder="Automatique si vide"/></label>{msg&&<div className="error" style={{gridColumn:"1/-1"}}>{msg}</div>}<button className="btn" disabled={busy} style={{gridColumn:"1/-1"}}><Save size={16}/>{busy?"Enregistrement…":"Inscrire l’enfant"}</button></form>}{success&&<div className="panel notice"><b>Inscription réussie.</b><p>Matricule : <code>{success.student.matricule}</code></p><p>Code d’accès parent : <code>{success.student.parent_access_code}</code></p><p>Remettez ce code au parent. Il lui permet de consulter uniquement le dossier de cet enfant depuis l’espace parents.</p></div>}<div className="panel tableWrap"><h3>Dernières inscriptions</h3><table><thead><tr><th>N°</th><th>Élève</th><th>Parent / responsable</th><th>Téléphone parent</th><th>Classe</th><th>Année</th><th>Code parent</th><th>Statut</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.registration_number}</b></td><td>{x.students?.last_name} {x.students?.first_name}<br/><small>{x.students?.matricule}</small></td><td>{(()=>{const p=(x.students?.student_parents||[]).find((v:any)=>v.is_primary)?.parents||(x.students?.student_parents||[])[0]?.parents;return p?`${p.first_name||""} ${p.last_name||""}`.trim():"—"})()}</td><td>{(()=>{const p=(x.students?.student_parents||[]).find((v:any)=>v.is_primary)?.parents||(x.students?.student_parents||[])[0]?.parents;return p?.phone||"—"})()}</td><td>{x.classes?.name||"—"}</td><td>{x.academic_years?.name||"—"}</td><td><code>{x.students?.parent_access_code||"—"}</code></td><td><span className="badge">{x.status}</span></td></tr>)}{!rows.length&&<tr><td colSpan={8} className="empty">Aucune inscription.</td></tr>}</tbody></table></div></>
}

function Attendance({profile,can}:any){
 const [classes,setClasses]=useState<any[]>([]),[students,setStudents]=useState<any[]>([]),[classId,setClassId]=useState(""),[date,setDate]=useState(today()),[rows,setRows]=useState<any[]>([]),[stats,setStats]=useState<any>({present:0,absent:0,late:0,excused:0,total:0}),[schoolStats,setSchoolStats]=useState<any>({present:0,absent:0,late:0,excused:0,total:0}),[msg,setMsg]=useState("");
 useEffect(()=>{supabase.from("classes").select("id,name").eq("school_id",profile.school_id).order("name").then(({data})=>{setClasses(data||[]);if(!classId&&data?.[0])setClassId(data[0].id)})},[profile.school_id]);
 useEffect(()=>{if(!classId)return;(async()=>{const {data:e}=await supabase.from("enrollments").select("student_id").eq("school_id",profile.school_id).eq("class_id",classId).eq("status","active");const ids=(e||[]).map(x=>x.student_id);if(!ids.length){setStudents([]);setRows([]);setStats({present:0,absent:0,late:0,excused:0,total:0});return}const [{data:s},{data:a}]=await Promise.all([supabase.from("students").select("id,matricule,last_name,first_name").in("id",ids).order("last_name"),supabase.from("attendance").select("student_id,status,note").eq("school_id",profile.school_id).eq("class_id",classId).eq("attendance_date",date)]);setStudents(s||[]);const map=new Map((a||[]).map(x=>[x.student_id,x]));const next=(s||[]).map(st=>({student_id:st.id,status:map.get(st.id)?.status||"present",note:map.get(st.id)?.note||""}));setRows(next);setStats(next.reduce((a:any,x:any)=>(a[x.status]=(a[x.status]||0)+1,a),{present:0,absent:0,late:0,excused:0,total:next.length}));})()},[classId,date,profile.school_id]);
 useEffect(()=>{(async()=>{const {data}=await supabase.from("attendance").select("status").eq("school_id",profile.school_id).eq("attendance_date",date);const x=data||[];setSchoolStats(x.reduce((a:any,r:any)=>(a[r.status]=(a[r.status]||0)+1,a),{present:0,absent:0,late:0,excused:0,total:x.length}))})()},[date,profile.school_id]);
 const editable=can("discipline","discipline");
 async function save(){if(!editable)return;setMsg("");await supabase.from("attendance").delete().eq("school_id",profile.school_id).eq("class_id",classId).eq("attendance_date",date);const payload=rows.map(x=>({school_id:profile.school_id,student_id:x.student_id,class_id:classId,attendance_date:date,status:x.status,note:x.note||null}));const {error}=payload.length?await supabase.from("attendance").insert(payload):{error:null};if(error)setMsg(error.message);else setMsg("Présences enregistrées.");}
 return <><div className="head"><div><h1>Présences</h1><p>Pointage quotidien par classe. Seul le Chargé de discipline peut modifier.</p></div>{editable&&<button className="btn" onClick={save}><Save size={17}/> Enregistrer</button>}</div><div className="panel formGrid"><label>Classe<select value={classId} onChange={e=>setClassId(e.target.value)}><option value="">Choisir…</option>{classes.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Date<input type="date" value={date} onChange={e=>setDate(e.target.value)}/></label></div><div className="cards" style={{marginTop:12}}><Stat title="Présents — classe" value={stats.present} icon={<CheckCircle/>}/><Stat title="Absents — classe" value={stats.absent} icon={<AlertTriangle/>}/><Stat title="En retard — classe" value={stats.late} icon={<CalendarCheck/>}/><Stat title="Présence — école" value={schoolStats.total?Math.round((schoolStats.present/schoolStats.total)*100)+"%":"—"} icon={<BarChart3/>}/></div>{msg&&<div className="notice" style={{marginTop:12}}>{msg}</div>}<div className="panel tableWrap" style={{marginTop:12}}><table><thead><tr><th>Matricule</th><th>Élève</th><th>Statut</th><th>Note</th></tr></thead><tbody>{students.map((s,i)=><tr key={s.id}><td>{s.matricule}</td><td>{s.last_name} {s.first_name}</td><td>{editable?<select value={rows[i]?.status||"present"} onChange={e=>setRows(rs=>rs.map((x,j)=>j===i?{...x,status:e.target.value}:x))}><option value="present">Présent</option><option value="absent">Absent</option><option value="late">En retard</option><option value="excused">Justifié</option></select>:({present:"Présent",absent:"Absent",late:"En retard",excused:"Justifié"} as any)[rows[i]?.status||"present"]}</td><td>{editable?<input value={rows[i]?.note||""} onChange={e=>setRows(rs=>rs.map((x,j)=>j===i?{...x,note:e.target.value}:x))}/>:rows[i]?.note||"—"}</td></tr>)}{!students.length&&<tr><td colSpan={4} className="empty">Aucun élève actif inscrit dans cette classe.</td></tr>}</tbody></table></div></>
}

function Grades({profile,can}:any){
 const [tab,setTab]=useState("assessments"),[assessments,setAssessments]=useState<any[]>([]),[classes,setClasses]=useState<any[]>([]),[subjects,setSubjects]=useState<any[]>([]),[students,setStudents]=useState<any[]>([]),[assignments,setAssignments]=useState<any[]>([]),[form,setForm]=useState<any>({class_id:"",subject_id:"",title:"",assessment_date:today(),max_score:"20",term:"Trimestre 1",assessment_type:"devoir"}),[selected,setSelected]=useState<any>(null),[gradeRows,setGradeRows]=useState<any[]>([]),[msg,setMsg]=useState("");
 async function load(){const [{data:a},{data:c},{data:s}]=await Promise.all([supabase.from("assessments").select("*,subjects(name),classes(name)").eq("school_id",profile.school_id).order("assessment_date",{ascending:false}),supabase.from("classes").select("id,name,option_name").eq("school_id",profile.school_id).order("name"),supabase.from("subjects").select("id,name,coefficient").eq("school_id",profile.school_id).order("name")]);setAssessments(a||[]);setClasses(c||[]);setSubjects(s||[]);if(profile.roles?.name==="enseignant"){const {data:u}=await supabase.auth.getUser();const {data:t}=await supabase.from("teachers").select("id").eq("school_id",profile.school_id).eq("email",u.user?.email||"").maybeSingle();if(t?.id){const {data:as}=await supabase.from("teacher_subject_assignments").select("class_id,subject_id,classes(name),subjects(name)").eq("school_id",profile.school_id).eq("teacher_id",t.id).eq("active",true);setAssignments(as||[])}}}
 useEffect(()=>{load()},[profile.school_id]);
 const teacherMode=profile.roles?.name==="enseignant",allowed=(a:any)=>!teacherMode||assignments.some(x=>x.class_id===a.class_id&&x.subject_id===a.subject_id),allowedClasses=teacherMode?classes.filter(c=>assignments.some(a=>a.class_id===c.id)):classes,allowedSubjects=teacherMode?subjects.filter(s=>assignments.some(a=>a.subject_id===s.id)):subjects;
 async function createAssessment(e:React.FormEvent){e.preventDefault();setMsg("");if(teacherMode&&!assignments.some(a=>a.class_id===form.class_id&&a.subject_id===form.subject_id)){setMsg("Cette classe et cette matière ne sont pas affectées à votre compte enseignant.");return}const {error}=await supabase.from("assessments").insert({school_id:profile.school_id,subject_id:form.subject_id,class_id:form.class_id,title:form.title,assessment_date:form.assessment_date,max_score:Number(form.max_score),term:form.term,assessment_type:form.assessment_type,created_by:profile.id});if(error)setMsg(error.message);else{setForm({...form,title:""});load()}}
 async function openGrades(a:any){if(!allowed(a)){setMsg("Accès refusé : évaluation hors de vos affectations.");return}setSelected(a);const {data:e}=await supabase.from("enrollments").select("student_id").eq("school_id",profile.school_id).eq("class_id",a.class_id).eq("status","active");const ids=(e||[]).map(x=>x.student_id);const [{data:s},{data:g}]=await Promise.all([ids.length?supabase.from("students").select("id,matricule,last_name,first_name").in("id",ids).order("last_name"):Promise.resolve({data:[]}),supabase.from("grades").select("student_id,score,comment").eq("assessment_id",a.id)]);const gm=new Map((g||[]).map(x=>[x.student_id,x]));setStudents(s||[]);setGradeRows((s||[]).map(st=>({student_id:st.id,score:gm.get(st.id)?.score??"",comment:gm.get(st.id)?.comment||""})));setTab("grades")}
 async function saveGrades(){if(!can("grades","etudes","enseignant")){setMsg("Consultation seule : vous ne pouvez pas modifier les notes.");return}setMsg("");await supabase.from("grades").delete().eq("assessment_id",selected.id);const payload=gradeRows.filter(x=>x.score!==""&&x.score!==null).map(x=>({assessment_id:selected.id,student_id:x.student_id,score:Number(x.score),comment:x.comment||null,graded_by:profile.id,graded_at:new Date().toISOString()}));const {error}=payload.length?await supabase.from("grades").insert(payload):{error:null};if(error)setMsg(error.message);else setMsg("Notes enregistrées avec succès.")}
 return <><div className="head"><div><h1>{teacherMode?"Espace enseignant — Évaluations":"Notes & évaluations"}</h1><p>{teacherMode?"Créez vos devoirs/interrogations et évaluez uniquement vos classes et matières affectées.":"Évaluations, saisie des notes et préparation des relevés de cote."}</p></div>{can("administrateur","etudes","enseignant")&&tab==="assessments"&&<button className="btn" onClick={()=>setTab("new")}><Plus size={17}/> Nouvelle évaluation</button>}</div>{teacherMode&&<div className="panel notice"><b>Votre espace professeur est actif.</b> Les classes et matières apparaissent automatiquement à partir de votre affectation dans l’emploi du temps.</div>}{tab==="new"&&<form className="panel formGrid" onSubmit={createAssessment}><label>Classe<select required value={form.class_id} onChange={e=>setForm({...form,class_id:e.target.value})}><option value="">Choisir…</option>{allowedClasses.map(x=><option key={x.id} value={x.id}>{x.name}{x.option_name?" — "+x.option_name:""}</option>)}</select></label><label>Matière<select required value={form.subject_id} onChange={e=>setForm({...form,subject_id:e.target.value})}><option value="">Choisir…</option>{allowedSubjects.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Type<select value={form.assessment_type} onChange={e=>setForm({...form,assessment_type:e.target.value})}><option value="devoir">Devoir</option><option value="interrogation">Interrogation</option><option value="examen">Examen</option><option value="travail_pratique">Travail pratique</option></select></label><label>Titre<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Devoir 1"/></label><label>Date<input type="date" required value={form.assessment_date} onChange={e=>setForm({...form,assessment_date:e.target.value})}/></label><label>Note maximale<input type="number" min="1" value={form.max_score} onChange={e=>setForm({...form,max_score:e.target.value})}/></label><label>Période<select value={form.term} onChange={e=>setForm({...form,term:e.target.value})}><option>Trimestre 1</option><option>Trimestre 2</option><option>Trimestre 3</option><option>Semestre 1</option><option>Semestre 2</option></select></label>{msg&&<div className="error">{msg}</div>}<button className="btn"><Save size={16}/> Créer l’évaluation</button></form>}{tab==="assessments"&&<div className="panel tableWrap"><table><thead><tr><th>Évaluation</th><th>Type</th><th>Classe</th><th>Matière</th><th>Date</th><th>Barème</th><th></th></tr></thead><tbody>{assessments.filter(allowed).map(a=><tr key={a.id}><td>{a.title}</td><td>{a.assessment_type||"devoir"}</td><td>{a.classes?.name}</td><td>{a.subjects?.name}</td><td>{new Date(a.assessment_date).toLocaleDateString("fr-FR")}</td><td>{a.max_score}</td><td><button className="btn light" onClick={()=>openGrades(a)}>{can("etudes","enseignant")?"Évaluer":"Consulter"}</button></td></tr>)}{!assessments.filter(allowed).length&&<tr><td colSpan={7} className="empty">{teacherMode?"Aucune évaluation pour vos affectations.":"Aucune évaluation."}</td></tr>}</tbody></table></div>}{tab==="grades"&&selected&&<><div className="panel"><h3>{selected.title} — {selected.subjects?.name} — {selected.classes?.name}</h3><p>Barème : {selected.max_score} • {selected.assessment_type||"devoir"}</p></div><div className="panel tableWrap"><table><thead><tr><th>Matricule</th><th>Élève</th><th>Note</th><th>Commentaire</th></tr></thead><tbody>{students.map((s,i)=><tr key={s.id}><td>{s.matricule}</td><td>{s.last_name} {s.first_name}</td><td><input type="number" min="0" max={selected.max_score} step="0.01" value={gradeRows[i]?.score??""} readOnly={!can("etudes","enseignant")} onChange={e=>setGradeRows(rs=>rs.map((x,j)=>j===i?{...x,score:e.target.value}:x))}/></td><td><input value={gradeRows[i]?.comment||""} readOnly={!can("etudes","enseignant")} onChange={e=>setGradeRows(rs=>rs.map((x,j)=>j===i?{...x,comment:e.target.value}:x))}/></td></tr>)}</tbody></table></div><div style={{marginTop:12,display:"flex",gap:8}}>{can("etudes","enseignant")&&<button className="btn" onClick={saveGrades}><Save size={16}/> Enregistrer les notes</button>}<button className="btn light" onClick={()=>setTab("assessments")}>Retour</button></div>{msg&&<div className="notice" style={{marginTop:12}}>{msg}</div>}</>}</>
}
function Schedule({profile,can}:any){
 const [rows,setRows]=useState<any[]>([]),[classes,setClasses]=useState<any[]>([]),[subjects,setSubjects]=useState<any[]>([]),[teachers,setTeachers]=useState<any[]>([]);
 const [selectedClass,setSelectedClass]=useState("all");
 const [form,setForm]=useState<any>({class_id:"",subject_id:"",teacher_id:"",weekday:"1",start_time:"07:00",end_time:"07:45",room:""}),[show,setShow]=useState(false),[msg,setMsg]=useState("");
 async function load(){const [r,c,s,t]=await Promise.all([
  supabase.from("schedules").select("*,classes(name,option_name),subjects(name),teachers(first_name,last_name)").eq("school_id",profile.school_id),
  supabase.from("classes").select("id,name,option_name").eq("school_id",profile.school_id).order("name"),
  supabase.from("subjects").select("id,name").eq("school_id",profile.school_id).order("name"),
  supabase.from("teachers").select("id,first_name,last_name").eq("school_id",profile.school_id).order("last_name")
 ]);if(r.error)setMsg(r.error.message);setRows(r.data||[]);setClasses(c.data||[]);setSubjects(s.data||[]);setTeachers(t.data||[])}
 useEffect(()=>{load()},[profile.school_id]);
 const days=["","Lundi","Mardi","Mercredi","Jeudi","Vendredi","Samedi"];
 const classLabel=(x:any)=>[x?.name,x?.option_name].filter(Boolean).join(" — ")||"Classe non précisée";
 const visibleRows=useMemo(()=>rows.filter(x=>selectedClass==="all"||x.class_id===selectedClass).sort((a,b)=>classLabel(a.classes).localeCompare(classLabel(b.classes),"fr")||Number(a.weekday)-Number(b.weekday)||(a.start_time||"").localeCompare(b.start_time||"")),[rows,selectedClass]);
 async function save(e:React.FormEvent){e.preventDefault();setMsg("");if(form.end_time<=form.start_time){setMsg("L’heure de fin doit être postérieure à l’heure de début.");return}
  const overlap=(a:string,b:string,c:string,d:string)=>a<d&&c<b;
  const sameDay=rows.filter(x=>Number(x.weekday)===Number(form.weekday));
  if(sameDay.some(x=>x.class_id===form.class_id&&overlap(form.start_time,form.end_time,(x.start_time||"").slice(0,5),(x.end_time||"").slice(0,5)))){setMsg("Conflit : cette classe a déjà un cours sur cette plage horaire.");return}
  if(form.teacher_id&&sameDay.some(x=>x.teacher_id===form.teacher_id&&overlap(form.start_time,form.end_time,(x.start_time||"").slice(0,5),(x.end_time||"").slice(0,5)))){setMsg("Conflit : ce professeur est déjà affecté à un autre cours sur cette plage horaire.");return}
  const payload={...form,teacher_id:form.teacher_id||null,subject_id:form.subject_id||null,school_id:profile.school_id,weekday:Number(form.weekday)};
  const {error}=await supabase.from("schedules").insert(payload);
  if(error)setMsg(error.message);else{setShow(false);setForm({...form,class_id:"",subject_id:"",teacher_id:"",start_time:"07:00",end_time:"07:45",room:""});setMsg("Cours ajouté et emploi du temps réorganisé automatiquement.");await load()}
 }
 return <><div className="head"><div><h1>Emploi du temps</h1><p>Les cours sont classés automatiquement par classe, jour et heure.</p></div>{can("schedule","etudes")&&<button className="btn" onClick={()=>{setShow(!show);setMsg("")}}><Plus size={17}/> Ajouter un cours</button>}</div>
 <div className="panel formGrid"><label>Filtrer par classe<select value={selectedClass} onChange={e=>setSelectedClass(e.target.value)}><option value="all">Toutes les classes</option>{classes.map(x=><option key={x.id} value={x.id}>{classLabel(x)}</option>)}</select></label><div className="notice">L’affichage suit l’ordre des jours puis des heures, même si les cours ont été saisis dans le désordre.</div></div>
 {show&&<form className="panel formGrid" onSubmit={save}><label>Classe<select required value={form.class_id} onChange={e=>setForm({...form,class_id:e.target.value})}><option value="">Choisir…</option>{classes.map(x=><option key={x.id} value={x.id}>{classLabel(x)}</option>)}</select></label><label>Matière<select value={form.subject_id} onChange={e=>setForm({...form,subject_id:e.target.value})}><option value="">Choisir…</option>{subjects.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label>Enseignant<select value={form.teacher_id} onChange={e=>setForm({...form,teacher_id:e.target.value})}><option value="">Choisir…</option>{teachers.map(x=><option key={x.id} value={x.id}>{x.last_name} {x.first_name}</option>)}</select></label><label>Jour<select value={form.weekday} onChange={e=>setForm({...form,weekday:e.target.value})}>{days.slice(1).map((d,i)=><option key={d} value={i+1}>{d}</option>)}</select></label><label>Début<input type="time" required value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})}/></label><label>Fin<input type="time" required value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})}/></label><label>Salle<input value={form.room} onChange={e=>setForm({...form,room:e.target.value})}/></label>{msg&&<div className="error">{msg}</div>}<button className="btn"><Save size={16}/> Enregistrer</button></form>}
 {msg&&!show&&<div className="panel notice">{msg}</div>}
 <div className="panel tableWrap"><table><thead><tr><th>Classe</th><th>Jour</th><th>Horaire</th><th>Matière</th><th>Enseignant</th><th>Salle</th></tr></thead><tbody>{visibleRows.map(x=><tr key={x.id}><td>{classLabel(x.classes)}</td><td>{days[Number(x.weekday)]||"—"}</td><td>{x.start_time?.slice(0,5)}–{x.end_time?.slice(0,5)}</td><td>{x.subjects?.name||"—"}</td><td>{x.teachers?x.teachers.last_name+" "+x.teachers.first_name:"—"}</td><td>{x.room||"—"}</td></tr>)}{!visibleRows.length&&<tr><td colSpan={6} className="empty">{selectedClass==="all"?"Aucun cours planifié.":"Aucun cours planifié pour cette classe."}</td></tr>}</tbody></table></div></>
}
function ReportCards({profile,can}:any){
 const [rows,setRows]=useState<any[]>([]),[years,setYears]=useState<any[]>([]),[year,setYear]=useState(""),[classFilter,setClassFilter]=useState("all"),[term,setTerm]=useState("Trimestre 1"),[busy,setBusy]=useState(false),[msg,setMsg]=useState(""),[detailCard,setDetailCard]=useState<any|null>(null),[detailGrades,setDetailGrades]=useState<any[]>([]),[detailBusy,setDetailBusy]=useState(false);
 async function load(){const [r,y,e,c]=await Promise.all([supabase.from("report_cards").select("*,students(matricule,last_name,first_name),academic_years(name)").eq("school_id",profile.school_id),supabase.from("academic_years").select("id,name").eq("school_id",profile.school_id).order("start_date",{ascending:false}),supabase.from("enrollments").select("student_id,academic_year_id,class_id").eq("school_id",profile.school_id).eq("status","active"),supabase.from("classes").select("id,name,option_name").eq("school_id",profile.school_id)]);const classMap=new Map((c.data||[]).map((x:any)=>[x.id,[x.name,x.option_name].filter(Boolean).join(" — ")]));const enrollmentMap=new Map((e.data||[]).map((x:any)=>[x.student_id+"|"+x.academic_year_id,{class_id:x.class_id,class_label:classMap.get(x.class_id)||"Classe non précisée"}]));setRows((r.data||[]).map((x:any)=>({...x,...(enrollmentMap.get(x.student_id+"|"+x.academic_year_id)||{class_id:"",class_label:"Classe non précisée"})})).sort((a:any,b:any)=>a.class_label.localeCompare(b.class_label,"fr")||(a.students?.last_name||"").localeCompare(b.students?.last_name||"","fr")||(a.students?.first_name||"").localeCompare(b.students?.first_name||"","fr")));setYears(y.data||[]);if(!year&&y.data?.[0])setYear(y.data[0].id)}
 useEffect(()=>{load()},[profile.school_id]);
 async function generate(){if(!year)return;setBusy(true);setMsg("");const {data:students,error}=await supabase.from("students").select("id").eq("school_id",profile.school_id).eq("active",true);if(error){setMsg(error.message);setBusy(false);return}let count=0;for(const st of students||[]){const {data:e}=await supabase.from("enrollments").select("id").eq("school_id",profile.school_id).eq("student_id",st.id).eq("academic_year_id",year).eq("status","active").maybeSingle();if(!e)continue;const {data:card,error:ce}=await supabase.from("report_cards").upsert({school_id:profile.school_id,student_id:st.id,academic_year_id:year,term,status:"draft"},{onConflict:"student_id,academic_year_id,term"}).select().single();if(!ce&&card)count++}setMsg(count+" relevé(s) de cote préparé(s) en brouillon.");setBusy(false);load()}
 async function publish(id:string){const {error}=await supabase.from("report_cards").update({status:"published",validated_by:profile.id,validated_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",id);if(error)setMsg(error.message);else load()}
 async function viewResults(card:any){setDetailCard(card);setDetailGrades([]);setDetailBusy(true);const {data:assessments,error}=await supabase.from("assessments").select("id,title,assessment_date,max_score,term,assessment_type,class_id,classes(name),subjects(name)").eq("school_id",profile.school_id).eq("term",card.term).order("assessment_date",{ascending:true});if(error){setMsg("Impossible de charger les évaluations : "+error.message);setDetailBusy(false);return}const ids=(assessments||[]).map(a=>a.id);if(!ids.length){setDetailBusy(false);return}const {data:grades,error:ge}=await supabase.from("grades").select("assessment_id,score,comment").eq("student_id",card.student_id).in("assessment_id",ids);if(ge)setMsg("Impossible de charger les notes : "+ge.message);const gm=new Map((grades||[]).map(g=>[g.assessment_id,g]));setDetailGrades((assessments||[]).map(a=>({...a,grade:gm.get(a.id)||null})));setDetailBusy(false)}
 return <><div className="head"><div><h1>Relevés de cote</h1><p>Préparation, validation et publication des relevés de cote scolaires.</p></div>{can("reportcards","etudes")&&<button className="btn" disabled={busy} onClick={generate}><FileText size={17}/>{busy?"Préparation…":"Préparer les relevés de cote"}</button>}</div><div className="panel formGrid"><label>Année scolaire<select value={year} onChange={e=>setYear(e.target.value)}><option value="">Choisir…</option>{years.map(y=><option key={y.id} value={y.id}>{y.name}</option>)}</select></label><label>Classe<select value={classFilter} onChange={e=>setClassFilter(e.target.value)}><option value="all">Toutes les classes</option>{Array.from(new Map(rows.map((x:any)=>[x.class_id,x.class_label])).entries()).filter(([id])=>Boolean(id)).sort((a:any,b:any)=>String(a[1]).localeCompare(String(b[1]),"fr")).map(([id,label]:any)=><option key={id} value={id}>{label}</option>)}</select></label><label>Période<select value={term} onChange={e=>setTerm(e.target.value)}><option>Trimestre 1</option><option>Trimestre 2</option><option>Trimestre 3</option><option>Semestre 1</option><option>Semestre 2</option></select></label></div>{msg&&<div className="notice" style={{marginTop:12}}>{msg}</div>}<div className="panel tableWrap"><table><thead><tr><th>Classe</th><th>Élève</th><th>Matricule</th><th>Année</th><th>Période</th><th>Moyenne</th><th>Statut</th><th></th></tr></thead><tbody>{rows.filter(x=>(classFilter==="all"||x.class_id===classFilter)&&(x.term===term)).map(x=><tr key={x.id}><td>{x.class_label}</td><td>{x.students?.last_name} {x.students?.first_name}</td><td>{x.students?.matricule}</td><td>{x.academic_years?.name||"—"}</td><td>{x.term}</td><td>{x.average??"—"}</td><td><span className="badge">{x.status}</span></td><td><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button className="btn light" onClick={()=>viewResults(x)}>Voir les notes</button>{x.status!=="published"&&can("etudes")&&<button className="btn light" onClick={()=>publish(x.id)}>Publier</button>}</div></td></tr>)}{!rows.length&&<tr><td colSpan={8} className="empty">Aucun relevé de cote pour cette classe et cette période.</td></tr>}</tbody></table></div>{detailCard&&<div className="panel" style={{marginTop:12}}><div className="head"><div><h2>Résultats de {detailCard.students?.last_name} {detailCard.students?.first_name}</h2><p>{detailCard.term} • {detailCard.academic_years?.name||"Année scolaire"}</p></div><button className="btn light" onClick={()=>setDetailCard(null)}>Fermer</button></div>{detailBusy?<p>Chargement des notes…</p>:<div className="tableWrap"><table><thead><tr><th>Date</th><th>Évaluation</th><th>Classe</th><th>Cours / matière</th><th>Note obtenue</th><th>Barème</th><th>Commentaire</th></tr></thead><tbody>{detailGrades.map((g:any)=><tr key={g.id}><td>{g.assessment_date?new Date(g.assessment_date).toLocaleDateString("fr-FR"):"—"}</td><td>{g.title}</td><td>{g.classes?.name||"—"}</td><td>{g.subjects?.name||"—"}</td><td>{g.grade?.score??"Non cotée"}</td><td>{g.max_score??"—"}</td><td>{g.grade?.comment||"—"}</td></tr>)}{!detailGrades.length&&<tr><td colSpan={7} className="empty">Aucune évaluation trouvée pour cette période.</td></tr>}</tbody></table></div>}</div>}</>
}

function Announcements({profile,can}:any){
 const [rows,setRows]=useState<any[]>([]),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState(""),[form,setForm]=useState<any>({title:"",content:"",audience:"parents",published:true});
 const editable=can("announcements","promoteur","directeur","etudes");
 async function load(){const {data}=await supabase.from("announcements").select("*").eq("school_id",profile.school_id).order("created_at",{ascending:false});setRows(data||[])}
 useEffect(()=>{load()},[profile.school_id]);
 async function save(e:React.FormEvent){e.preventDefault();setBusy(true);setMsg("");const {error}=await supabase.from("announcements").insert({school_id:profile.school_id,title:form.title,content:form.content,audience:form.audience,published:form.published});setMsg(error?error.message:"Publication enregistrée.");if(!error){setForm({title:"",content:"",audience:"parents",published:true});setShow(false);load()}setBusy(false)}
 return <><div className="head"><div><h1>Communications</h1><p>Publiez des informations destinées aux parents depuis l’école.</p></div>{editable&&<button className="btn" onClick={()=>setShow(!show)}><MessageSquare size={17}/> Nouvelle publication</button>}</div>{show&&editable&&<form className="panel formGrid" onSubmit={save}><label>Titre<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Audience<select value={form.audience} onChange={e=>setForm({...form,audience:e.target.value})}><option value="parents">Parents</option><option value="all">Toute l’école</option><option value="teachers">Enseignants</option></select></label><label style={{gridColumn:"1/-1"}}>Message<textarea required rows={5} value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></label><label style={{gridColumn:"1/-1"}}><input type="checkbox" checked={form.published} onChange={e=>setForm({...form,published:e.target.checked})}/> Publier immédiatement</label>{msg&&<div className="notice" style={{gridColumn:"1/-1"}}>{msg}</div>}<button className="btn" disabled={busy}><Save size={16}/>{busy?"Publication…":"Publier"}</button></form>}<div className="panel"><div className="tableWrap"><table><thead><tr><th>Titre</th><th>Audience</th><th>Publié</th><th>Date</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.title}</b><br/><small>{x.content}</small></td><td>{x.audience}</td><td><span className="badge">{x.published?"Oui":"Non"}</span></td><td>{new Date(x.created_at).toLocaleDateString("fr-FR")}</td></tr>)}{!rows.length&&<tr><td colSpan={4} className="empty">Aucune publication.</td></tr>}</tbody></table></div></div></>
}

function Staff({profile,school,onPayroll}:any){
 const [rows,setRows]=useState<any[]>([]);
 const [show,setShow]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const [teacherCode,setTeacherCode]=useState("");
 const [editing,setEditing]=useState<any|null>(null);
 const [editingPermissions,setEditingPermissions]=useState<any|null>(null);const [serviceCard,setServiceCard]=useState<any|null>(null);
 const [form,setForm]=useState<any>({full_name:"",email:"",phone:"",password:"",role_name:"secretaire",contract_type:"CDI",monthly_salary:"",salary_currency:"FC",staff_duties:""});
 const permissionChoices:[string,string][]=[["students","Consulter les dossiers des élèves"],["parents","Gérer les dossiers des parents"],["enrollments","Inscrire les élèves"],["studies","Gérer classes, matières et salles"],["assignments","Affecter les enseignants"],["attendance","Enregistrer les présences"],["discipline","Gérer les dossiers disciplinaires"],["schedule","Gérer l’emploi du temps"],["grades","Créer les évaluations et saisir les notes"],["reportcards","Préparer et publier les relevés"],["finance","Gérer les paramètres financiers"],["studentFinance","Consulter les situations financières des élèves"],["staff","Gérer le personnel et les accès"],["announcements","Publier les communications"],["settings","Modifier les paramètres de l’établissement"],["audit","Consulter le journal d’activité"]];
 const roleOptions:[string,string,string][]=[
 ["secretaire","Secrétaire","Inscriptions, dossiers et gestion administrative des élèves."],
 ["etudes","Chargé des études","Classes, matières, affectations et suivi pédagogique."],
 ["discipline","Chargé de discipline","Présences quotidiennes et dossiers disciplinaires."],
 ["surveillant","Surveillant","Suivi des présences et discipline selon les droits accordés."],
 ["enseignant","Enseignant","Accès pédagogique limité aux classes et matières autorisées."],
 ["finance","Responsable financier","Paramétrage financier, budgets et rapports financiers."],
 ["comptable","Comptable / Caissier","Encaissements, reçus et opérations de caisse autorisées."],
 ["directeur","Directeur","Supervision générale de l’établissement."],
 ["administrateur","Administrateur système","Administration technique et gestion des accès autorisés."]
 ];
 async function load(){const {data,error}=await supabase.from("profiles").select("id,full_name,phone,active,permission_overrides,role_id,roles(name,label)").eq("school_id",profile.school_id).order("created_at",{ascending:false});if(error)setMsg(error.message);setRows(data||[])}
 useEffect(()=>{load()},[profile.school_id]);
 function startEdit(x:any){setEditing(x);setForm({full_name:x.full_name||"",email:"",phone:x.phone||"",password:"",role_name:x.roles?.name||"secretaire",contract_type:x.contract_type||"CDI",monthly_salary:x.monthly_salary??"",salary_currency:x.salary_currency||"FC",staff_duties:x.staff_duties||""});setShow(false);setMsg("");}
 async function savePermissions(){if(!editingPermissions)return;setBusy(true);setMsg("");const {error}=await supabase.rpc("set_staff_permission_overrides",{target_profile_id:editingPermissions.id,overrides:editingPermissions.permission_overrides||{}});if(error)setMsg(error.message);else{setMsg("Autorisations mises à jour et journalisées.");setEditingPermissions(null);await load()}setBusy(false)}
 async function save(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMsg("");
  if(editing){
   const roleName=String(form.role_name||"");
   if(roleName==="promoteur"){setMsg("Le rôle Promoteur principal ne peut pas être attribué depuis ce formulaire.");setBusy(false);return}
   const {data,error}=await supabase.functions.invoke("manage-school-user",{body:{action:"update",target_profile_id:editing.id,full_name:form.full_name.trim(),phone:form.phone.trim(),role_name:roleName}});
   if(error){let detail=error.message;try{const b=await (error as any).context?.json?.();if(b?.error)detail=b.error}catch{}setMsg(detail||"Modification refusée.");setBusy(false);return}
   if(data?.error){setMsg(data.error);setBusy(false);return}
   setMsg(data?.message||"Personnel modifié.");setEditing(null);await load();setBusy(false);return
  }
  const {data,error}=await supabase.functions.invoke("create-school-user",{body:{school_id:profile.school_id,...form}});
  if(error){let detail=error.message;try{const b=await (error as any).context?.json?.();if(b?.error)detail=b.error}catch{}setMsg(detail||"Création impossible.");setBusy(false);return}
  if(data?.error){setMsg(data.error);setBusy(false);return}
  setMsg("Utilisateur créé et accès attribué.");setTeacherCode(data?.user?.access_code||"");setForm({full_name:"",email:"",phone:"",password:"",role_name:"secretaire",contract_type:"CDI",monthly_salary:"",salary_currency:"FC",staff_duties:""});setShow(false);await load();setBusy(false)
 }
 async function deactivate(x:any){
  if(x.roles?.name==="promoteur"){setMsg("Le compte du Promoteur principal ne peut pas être retiré depuis cette liste.");return}
  if(!window.confirm("Retirer l’accès de "+(x.full_name||"ce membre du personnel")+" ? Son historique sera conservé."))return;
  setBusy(true);setMsg("");
  const {data,error}=await supabase.functions.invoke("manage-school-user",{body:{action:"deactivate",target_profile_id:x.id}});
  if(error){let detail=error.message;try{const b=await (error as any).context?.json?.();if(b?.error)detail=b.error}catch{}setMsg("Retrait impossible : "+(detail||"erreur inconnue"));}else if(data?.error)setMsg(data.error);else{setMsg(data?.message||"Accès retiré. L’historique est conservé.");if(editing?.id===x.id)setEditing(null);if(editingPermissions?.id===x.id)setEditingPermissions(null);await load()}
  setBusy(false)
 }
 return <><div className="head"><div><h1>Personnel & autorisations</h1><p>Ajoutez le personnel, attribuez les rôles, modifiez les informations et retirez les accès. Le Promoteur principal contrôle les autorisations complémentaires.</p></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><button className="btn" onClick={()=>onPayroll?.()}><Wallet size={17}/> Salaires & paiements</button><button className="btn" onClick={()=>{setShow(!show);setEditing(null);setMsg("")}}><UserCog size={17}/> Ajouter un utilisateur</button></div></div>
 {msg&&<div className="notice" style={{marginBottom:12}}>{msg}</div>}
 {(show||editing)&&<form className="panel formGrid" onSubmit={save}><h3 style={{gridColumn:"1/-1",margin:0}}>{editing?"Modifier le personnel":"Ajouter un membre du personnel"}</h3><label>Nom complet<input required value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})}/></label>{!editing&&<label>Email de connexion<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>}<label>Téléphone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Type de contrat<select value={form.contract_type||"CDI"} onChange={e=>setForm({...form,contract_type:e.target.value})}><option value="CDI">CDI</option><option value="CDD">CDD</option><option value="Journalier">Journalier</option><option value="Prestataire">Prestataire</option><option value="Stage">Stage</option><option value="Bénévole">Bénévole</option></select></label><label>Salaire mensuel<input type="number" min="0" step="0.01" value={form.monthly_salary??""} onChange={e=>setForm({...form,monthly_salary:e.target.value})}/></label><label>Devise du salaire<select value={form.salary_currency||"FC"} onChange={e=>setForm({...form,salary_currency:e.target.value})}><option value="FC">FC</option><option value="USD">USD</option></select></label><label style={{gridColumn:"1/-1"}}>Tâches et responsabilités<textarea rows={3} value={form.staff_duties||""} onChange={e=>setForm({...form,staff_duties:e.target.value})}/></label><label>Fonction / rôle<select value={form.role_name} onChange={e=>setForm({...form,role_name:e.target.value})}>{roleOptions.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>{!editing&&<label>Mot de passe initial<input required minLength={8} type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label>}{editing&&<p style={{gridColumn:"1/-1",margin:0,opacity:.8}}>La modification du rôle remplace ses fonctions de base. Les autorisations complémentaires se règlent séparément depuis le bouton « Autorisations » du Promoteur principal.</p>}<div style={{gridColumn:"1/-1",display:"flex",gap:8,flexWrap:"wrap"}}><button className="btn" disabled={busy}><Save size={16}/>{busy?"Enregistrement…":editing?"Enregistrer les modifications":"Créer l’utilisateur"}</button><button type="button" className="btn light" onClick={()=>{setEditing(null);setShow(false)}}>Annuler</button></div></form>}
 {teacherCode&&<div className="panel notice"><b>Code d’accès enseignant</b><p>Remettez ce code uniquement à l’enseignant concerné. Il est utilisé pour son portail pédagogique.</p><code style={{fontSize:20}}>{teacherCode}</code></div>}
 <div className="panel"><div className="tableWrap"><table><thead><tr><th>Matricule</th><th>Nom</th><th>Téléphone</th><th>Contrat</th><th>Salaire</th><th>Tâches</th><th>Rôle et fonction</th><th>Statut</th><th>Actions</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{x.staff_matricule||"—"}</td><td>{x.full_name||"—"}</td><td>{x.phone||"—"}</td><td>{x.contract_type||"—"}</td><td>{x.monthly_salary===null||x.monthly_salary===undefined?"—":money(Number(x.monthly_salary),x.salary_currency||"FC")}</td><td style={{maxWidth:220,whiteSpace:"normal"}}>{x.staff_duties||"—"}</td><td><b>{x.roles?.label||"—"}</b><div style={{fontSize:12,opacity:.75,maxWidth:300}}>{roleOptions.find(r=>r[0]===x.roles?.name)?.[2]||""}</div></td><td><span className="badge">{x.active?"Actif":"Accès retiré"}</span></td><td><div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button className="btn light" onClick={()=>setServiceCard(x)}>Carte de service</button>{x.active&&<><button className="btn light" onClick={()=>startEdit(x)}>Modifier</button>{profile.roles?.name==="promoteur"&&<button className="btn light" onClick={()=>setEditingPermissions({...x,permission_overrides:x.permission_overrides||{}})}>Autorisations</button>}<button className="btn light" disabled={busy||x.roles?.name==="promoteur"} onClick={()=>deactivate(x)}>Retirer l’accès</button></>}</div></td></tr>)}</tbody></table></div><p className="notice">Retirer l’accès désactive le profil scolaire sans effacer l’historique financier, pédagogique ou administratif. Pour réactiver un compte retiré, une procédure dédiée sera nécessaire.</p></div>
 {serviceCard&&<div className="panel" style={{display:"grid",justifyItems:"center",gap:12}}><div id="service-card-print" style={{width:320,minHeight:500,border:"2px solid #173b5c",borderRadius:18,overflow:"hidden",background:"#fff",color:"#173b5c",boxShadow:"0 8px 30px #102f4e20"}}><div style={{background:"#103b64",color:"#fff",padding:18,textAlign:"center"}}><div style={{fontSize:10,letterSpacing:2}}>CARTE DE SERVICE</div><div style={{fontWeight:800,fontSize:17,marginTop:5}}>{school?.name||"Établissement scolaire"}</div></div><div style={{padding:18,textAlign:"center"}}><div style={{width:94,height:94,borderRadius:12,border:"2px solid #d4af37",margin:"0 auto 12px",display:"grid",placeItems:"center",fontSize:28,fontWeight:800,background:"#f2f5f8"}}>{String(serviceCard.full_name||"P").trim().split(/\\s+/).map((v:string)=>v[0]||"").slice(0,2).join("").toUpperCase()}</div><div style={{fontSize:18,fontWeight:800}}>{serviceCard.full_name||"Nom du personnel"}</div><div style={{fontSize:12,marginTop:5}}>{serviceCard.roles?.label||"Personnel"}</div><div style={{height:2,background:"#d4af37",margin:"16px 0"}}/><div style={{textAlign:"left",display:"grid",gap:10,fontSize:12}}><div><small style={{display:"block",color:"#66788b"}}>MATRICULE</small><b>{serviceCard.staff_matricule||"—"}</b></div><div><small style={{display:"block",color:"#66788b"}}>TYPE DE CONTRAT</small><b>{serviceCard.contract_type||"—"}</b></div><div><small style={{display:"block",color:"#66788b"}}>TÉLÉPHONE</small><b>{serviceCard.phone||"—"}</b></div><div><small style={{display:"block",color:"#66788b"}}>TÂCHES / RESPONSABILITÉS</small><b>{serviceCard.staff_duties||"—"}</b></div></div><div style={{marginTop:22,borderTop:"1px solid #dbe3ed",paddingTop:12,fontSize:10,textAlign:"center"}}>Cette carte est personnelle et reste la propriété de l’établissement.</div></div></div><div style={{display:"flex",gap:8}}><button className="btn" onClick={()=>window.print()}><Printer size={16}/> Imprimer la carte verticale</button><button className="btn light" onClick={()=>setServiceCard(null)}>Fermer</button></div><style>{`@media print{body *{visibility:hidden!important}#service-card-print,#service-card-print *{visibility:visible!important}#service-card-print{position:fixed!important;left:0!important;top:0!important;width:80mm!important;min-height:125mm!important;box-shadow:none!important;border-radius:0!important}}`}</style></div>}{editingPermissions&&profile.roles?.name==="promoteur"&&<div className="panel"><h3>Autorisations complémentaires — {editingPermissions.full_name}</h3><p>Les droits de base dépendent du rôle attribué. Cochez ici les ensembles de fonctions supplémentaires nécessaires. Les droits du Promoteur principal ne sont pas modifiables.</p><div className="formGrid">{permissionChoices.map(([key,label])=><label key={key} style={{display:"flex",alignItems:"center",gap:8}}><input type="checkbox" checked={editingPermissions.permission_overrides?.[key]===true} onChange={e=>setEditingPermissions({...editingPermissions,permission_overrides:{...editingPermissions.permission_overrides,[key]:e.target.checked}})}/> {label}</label>)}</div><div style={{display:"flex",gap:8,marginTop:12,flexWrap:"wrap"}}><button className="btn" disabled={busy} onClick={savePermissions}>Enregistrer les autorisations</button><button className="btn light" onClick={()=>setEditingPermissions(null)}>Annuler</button></div></div>}</>
}


function AuditLog({profile}:any){
 const [rows,setRows]=useState<any[]>([]),[msg,setMsg]=useState(""),[loading,setLoading]=useState(true);
 const actionLabels:Record<string,string>={insert:"Création d’un enregistrement",create:"Création d’un enregistrement",update:"Modification d’un enregistrement",delete:"Suppression d’un enregistrement",login:"Connexion",logout:"Déconnexion",role_update:"Modification des autorisations",permission_update:"Modification des autorisations",approve:"Approbation",reject:"Refus",export:"Exportation",import:"Importation"};
 const moduleLabels:Record<string,string>={students:"Élèves",enrollments:"Inscriptions",profiles:"Comptes du personnel",school_staff:"Engagements du personnel",staff_attendance:"Présences du personnel",staff_leave_requests:"Congés du personnel",staff_payroll_items:"Paiements du personnel",staff_payroll_runs:"Paie du personnel",library_books:"Bibliothèque — livres",library_loans:"Bibliothèque — prêts",payments:"Paiements des élèves",expenses:"Dépenses",grades:"Cotes et résultats",announcements:"Annonces",roles:"Rôles",schools:"Établissements",settings:"Paramètres"};
 useEffect(()=>{supabase.from("school_audit_logs").select("id,actor_name,actor_user_id,action,entity_table,entity_id,created_at").eq("school_id",profile.school_id).order("created_at",{ascending:false}).limit(200).then(({data,error})=>{if(error)setMsg(error.message);setRows(data||[]);setLoading(false)})},[profile.school_id]);
 const readableAction=(value:string)=>{const v=(value||"").toLowerCase();if(actionLabels[v])return actionLabels[v];if(v.includes("insert")||v.includes("create")||v.includes("created"))return "Création d’un enregistrement";if(v.includes("update")||v.includes("edit")||v.includes("modified"))return "Modification d’un enregistrement";if(v.includes("delete")||v.includes("remove"))return "Suppression d’un enregistrement";if(v.includes("login")||v.includes("sign in"))return "Connexion au système";if(v.includes("permission")||v.includes("role"))return "Modification des autorisations";return (value||"Activité enregistrée").replace(/[_-]+/g," ").replace(/\b\w/g,(m)=>m.toUpperCase())};
 return <><div className="head"><div><h1>Journal d’activité</h1><p>Historique lisible des opérations et des changements effectués dans cet établissement.</p></div><button className="btn light" onClick={()=>{setLoading(true);supabase.from("school_audit_logs").select("id,actor_name,actor_user_id,action,entity_table,entity_id,created_at").eq("school_id",profile.school_id).order("created_at",{ascending:false}).limit(200).then(({data,error})=>{if(error)setMsg(error.message);setRows(data||[]);setLoading(false)})}}>Actualiser</button></div>{msg&&<div className="error">{msg}</div>}<div className="panel tableWrap"><table><thead><tr><th>Date et heure</th><th>Personne</th><th>Action effectuée</th><th>Rubrique</th><th>Référence</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString("fr-FR",{dateStyle:"medium",timeStyle:"short"})}</td><td>{x.actor_name||"Utilisateur du système"}</td><td>{readableAction(x.action)}</td><td>{moduleLabels[x.entity_table]||String(x.entity_table||"Système").replace(/[_-]+/g," ").replace(/\b\w/g,(m)=>m.toUpperCase())}</td><td>{x.entity_id?"Référence enregistrée":"—"}</td></tr>)}{!loading&&!rows.length&&<tr><td colSpan={5} className="empty">Aucune activité enregistrée pour le moment.</td></tr>}{loading&&<tr><td colSpan={5} className="empty">Chargement de l’historique…</td></tr>}</tbody></table></div></>
}
function SettingsPage({school,profile,reload}:any){
 const [logoFile,setLogoFile]=useState<File|null>(null),[logoPreview,setLogoPreview]=useState(school?.logo_url||""),[form,setForm]=useState<any>({name:school?.name||"",logo_path:school?.logo_path||"",primary_color:school?.primary_color||"#0f3d5e",secondary_color:school?.secondary_color||"#d4af37",phone:school?.phone||"",email:school?.email||"",address:school?.address||"",city:school?.city||"Kinshasa",currency:school?.currency||"FC"}),[msg,setMsg]=useState("");
 useEffect(()=>{setForm({name:school?.name||"",logo_path:school?.logo_path||"",primary_color:school?.primary_color||"#0f3d5e",secondary_color:school?.secondary_color||"#d4af37",phone:school?.phone||"",email:school?.email||"",address:school?.address||"",city:school?.city||"Kinshasa",currency:school?.currency||"FC"});setLogoPreview(school?.logo_url||"");setLogoFile(null)},[school]);
 async function save(e:React.FormEvent){e.preventDefault();setMsg("");let logo_path=form.logo_path||null;if(logoFile){const ext=(logoFile.name.split(".").pop()||"png").toLowerCase();const path=profile.school_id+"/logo/"+crypto.randomUUID()+"."+ext;const {error:ue}=await supabase.storage.from("school-assets").upload(path,logoFile,{upsert:false,contentType:logoFile.type||"image/png"});if(ue){setMsg("Logo non envoyé : "+ue.message);return}logo_path=path}const {error}=await supabase.from("schools").update({...form,logo_path,logo_url:null,updated_at:new Date().toISOString()}).eq("id",profile.school_id);if(error){setMsg(error.message);return}setMsg("Paramètres enregistrés.");setLogoFile(null);reload()}
 return <><div className="head"><div><h1>Paramètres</h1><p>Personnalisez l’identité de votre établissement.</p></div></div><form className="panel formGrid" onSubmit={save}><label>Nom de l’école<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Logo de l’école <small>(sélection directe depuis la galerie — aucun lien URL)</small><input type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(f){setLogoFile(f);setLogoPreview(URL.createObjectURL(f))}}}/>{logoPreview&&<img src={logoPreview} alt="Logo" style={{width:90,height:90,objectFit:"contain",border:"1px solid #ddd",borderRadius:10,marginTop:6}}/>}</label><label>Couleur principale<input type="color" value={form.primary_color} onChange={e=>setForm({...form,primary_color:e.target.value})}/></label><label>Couleur secondaire<input type="color" value={form.secondary_color} onChange={e=>setForm({...form,secondary_color:e.target.value})}/></label><label>Téléphone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Adresse<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label><label>Ville<input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label><label>Devise<select value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}><option>FC</option><option>USD</option></select></label>{msg&&<div className={msg.includes("enregistr")?"notice":"error"}>{msg}</div>}<button className="btn"><Save size={16}/> Enregistrer les paramètres</button></form></>
}

// Rebuild trigger: verify Vercel uses the corrected main branch commit.


function Inventory({profile,can}:any){
 const [items,setItems]=useState<any[]>([]),[moves,setMoves]=useState<any[]>([]),[query,setQuery]=useState(""),[tab,setTab]=useState("items"),[show,setShow]=useState(false),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const [form,setForm]=useState<any>({name:"",category:"Général",item_type:"consumable",sku:"",unit:"pièce",quantity:"0",min_quantity:"0",unit_cost:"0",storage_location:"",condition_status:"good",notes:""});
 const [movement,setMovement]=useState<any>({item_id:"",movement_type:"in",quantity:"1",reason:"Réapprovisionnement",reference:"",recipient:""});
 const editable=can("inventory","promoteur","administrateur","logisticien");
 async function load(){
  const [a,b]=await Promise.all([
   supabase.from("inventory_items").select("*").eq("school_id",profile.school_id).order("name"),
   supabase.from("inventory_movements").select("id,item_id,movement_type,quantity,reason,reference,recipient,created_at,inventory_items(name,unit)").eq("school_id",profile.school_id).order("created_at",{ascending:false}).limit(100)
  ]);
  if(a.error||b.error){setMsg((a.error||b.error)?.message||"Impossible de charger les stocks.");return}
  setItems(a.data||[]);setMoves(b.data||[]);
  if(!movement.item_id&&a.data?.[0])setMovement((m:any)=>({...m,item_id:a.data[0].id}));
 }
 useEffect(()=>{load()},[profile.school_id]);
 const filtered=items.filter(x=>(x.name+" "+x.category+" "+(x.sku||"")+" "+(x.storage_location||"")).toLowerCase().includes(query.toLowerCase()));
 const low=items.filter(x=>Number(x.quantity)<=Number(x.min_quantity)).length;
 const totalValue=items.reduce((n,x)=>n+Number(x.quantity||0)*Number(x.unit_cost||0),0);
 async function saveItem(e:React.FormEvent){
  e.preventDefault();if(!editable)return;setBusy(true);setMsg("");
  const payload={school_id:profile.school_id,name:form.name.trim(),category:form.category||"Général",item_type:form.item_type,sku:form.sku.trim()||null,unit:form.unit||"pièce",quantity:Number(form.quantity||0),min_quantity:Number(form.min_quantity||0),unit_cost:Number(form.unit_cost||0),storage_location:form.storage_location.trim()||null,condition_status:form.condition_status,notes:form.notes.trim()||null,created_by:profile.id};
  const {data,error}=await supabase.from("inventory_items").insert(payload).select().single();
  if(error)setMsg(error.message);else{setMsg("Article enregistré.");setShow(false);setForm({name:"",category:"Général",item_type:"consumable",sku:"",unit:"pièce",quantity:"0",min_quantity:"0",unit_cost:"0",storage_location:"",condition_status:"good",notes:""});if(Number(payload.quantity)>0){await supabase.from("inventory_movements").insert({school_id:profile.school_id,item_id:data.id,movement_type:"in",quantity:Number(payload.quantity),reason:"Stock initial",performed_by:profile.id})}await load()}
  setBusy(false);
 }
 async function saveMovement(e:React.FormEvent){
  e.preventDefault();if(!editable)return;setBusy(true);setMsg("");
  const item=items.find(x=>x.id===movement.item_id),qty=Number(movement.quantity);
  if(!item||!Number.isFinite(qty)||qty<=0){setMsg("Choisissez un article et une quantité valide.");setBusy(false);return}
  const {error:me}=await supabase.rpc("record_inventory_movement",{p_item_id:item.id,p_movement_type:movement.movement_type,p_quantity:qty,p_reason:movement.reason.trim(),p_reference:movement.reference.trim()||null,p_recipient:movement.recipient.trim()||null});
  if(me){setMsg(me.message);setBusy(false);return}
  setMsg("Mouvement enregistré.");setMovement((m:any)=>({...m,quantity:"1",reason:"",reference:"",recipient:""}));await load();
  setBusy(false);
 }
 return <>
  <div className="head"><div><h1>Stocks et matériel</h1><p>Inventaire des fournitures et équipements, entrées, sorties et alertes de stock.</p></div>{editable&&<button className="btn" onClick={()=>{setShow(!show);setTab("items")}}><Plus size={17}/>{show?"Fermer":"Nouvel article"}</button>}</div>
  <div className="cards">
   <div className="stat"><div className="icon"><Boxes size={20}/></div><small>Références en stock</small><b>{items.length}</b></div>
   <div className="stat"><div className="icon"><AlertTriangle size={20}/></div><small>Alertes de stock bas</small><b>{low}</b></div>
   <div className="stat"><div className="icon"><Wallet size={20}/></div><small>Valeur indicative du stock</small><b>{money(totalValue,"FC")}</b></div>
   <div className="stat"><div className="icon"><ClipboardList size={20}/></div><small>Mouvements récents</small><b>{moves.length}</b></div>
  </div>
  <div className="tabs" style={{marginTop:16}}><button className={"tab "+(tab==="items"?"active":"")} onClick={()=>{setTab("items");setShow(false)}}>Articles et équipements</button><button className={"tab "+(tab==="movements"?"active":"")} onClick={()=>{setTab("movements");setShow(false)}}>Entrées / sorties</button>{editable&&<button className={"tab "+(tab==="newmove"?"active":"")} onClick={()=>{setTab("newmove");setShow(false)}}>Enregistrer un mouvement</button>}</div>
  {msg&&<div className="notice" style={{marginBottom:12}}>{msg}</div>}
  {show&&editable&&<form className="panel formGrid" onSubmit={saveItem}>
   <label>Nom de l’article / équipement<input required maxLength={140} value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
   <label>Catégorie<input required value={form.category} onChange={e=>setForm({...form,category:e.target.value})} placeholder="Papeterie, informatique…"/></label>
   <label>Type<select value={form.item_type} onChange={e=>setForm({...form,item_type:e.target.value})}><option value="consumable">Fourniture consommable</option><option value="equipment">Matériel durable</option></select></label>
   <label>Référence / code<input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})}/></label>
   <label>Unité<input value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})} placeholder="pièce, boîte, ramette…"/></label>
   <label>Quantité initiale<input required type="number" min="0" step="0.01" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})}/></label>
   <label>Seuil d’alerte<input required type="number" min="0" step="0.01" value={form.min_quantity} onChange={e=>setForm({...form,min_quantity:e.target.value})}/></label>
   <label>Coût unitaire (FC)<input type="number" min="0" step="0.01" value={form.unit_cost} onChange={e=>setForm({...form,unit_cost:e.target.value})}/></label>
   <label>Lieu de rangement<input value={form.storage_location} onChange={e=>setForm({...form,storage_location:e.target.value})}/></label>
   <label>État<select value={form.condition_status} onChange={e=>setForm({...form,condition_status:e.target.value})}><option value="good">Bon état</option><option value="worn">Usé</option><option value="damaged">Endommagé</option><option value="out_of_service">Hors service</option></select></label>
   <label style={{gridColumn:"1/-1"}}>Observations<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
   <button className="btn" disabled={busy}><Save size={16}/>Enregistrer l’article</button>
  </form>}
  {tab==="newmove"&&editable&&<form className="panel formGrid" onSubmit={saveMovement}>
   <label>Article<select required value={movement.item_id} onChange={e=>setMovement({...movement,item_id:e.target.value})}><option value="">Choisir…</option>{items.map(x=><option key={x.id} value={x.id}>{x.name} — disponible : {x.quantity} {x.unit}</option>)}</select></label>
   <label>Opération<select value={movement.movement_type} onChange={e=>setMovement({...movement,movement_type:e.target.value})}><option value="in">Entrée / réapprovisionnement</option><option value="out">Sortie / attribution</option><option value="adjustment">Ajustement d’inventaire</option></select></label>
   <label>Quantité<input required type="number" min="0.01" step="0.01" value={movement.quantity} onChange={e=>setMovement({...movement,quantity:e.target.value})}/></label>
   <label>Motif<input required value={movement.reason} onChange={e=>setMovement({...movement,reason:e.target.value})} placeholder="Achat, distribution, réparation…"/></label>
   <label>Référence / bon<input value={movement.reference} onChange={e=>setMovement({...movement,reference:e.target.value})}/></label>
   <label>Bénéficiaire / service<input value={movement.recipient} onChange={e=>setMovement({...movement,recipient:e.target.value})} placeholder="Classe, service, employé…"/></label>
   <button className="btn" disabled={busy}><Save size={16}/>Valider le mouvement</button>
  </form>}
  {tab==="items"&&<div className="panel"><div className="toolbar"><div className="miniSearch"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Rechercher un article, une catégorie…"/></div></div><div className="tableWrap"><table><thead><tr><th>Article</th><th>Catégorie</th><th>Type</th><th>Quantité</th><th>Seuil</th><th>Lieu</th><th>État</th></tr></thead><tbody>{filtered.map(x=><tr key={x.id}><td><b>{x.name}</b><br/><small>{x.sku||"Sans référence"} · {x.unit}</small></td><td>{x.category}</td><td>{x.item_type==="equipment"?"Équipement":"Consommable"}</td><td><b>{x.quantity}</b></td><td>{x.min_quantity}</td><td>{x.storage_location||"—"}</td><td>{x.condition_status==="good"?"Bon état":x.condition_status==="worn"?"Usé":x.condition_status==="damaged"?"Endommagé":"Hors service"}{Number(x.quantity)<=Number(x.min_quantity)&&<div style={{color:"#b45309",fontSize:12,fontWeight:700}}>Stock bas</div>}</td></tr>)}{!filtered.length&&<tr><td colSpan={7} className="empty">Aucun article enregistré.</td></tr>}</tbody></table></div></div>}
  {tab==="movements"&&<div className="panel tableWrap"><table><thead><tr><th>Date</th><th>Article</th><th>Opération</th><th>Quantité</th><th>Motif</th><th>Référence</th><th>Bénéficiaire</th></tr></thead><tbody>{moves.map(x=><tr key={x.id}><td>{new Date(x.created_at).toLocaleString("fr-FR")}</td><td>{x.inventory_items?.name||"Article"}</td><td>{x.movement_type==="in"?"Entrée":x.movement_type==="out"?"Sortie":"Ajustement"}</td><td>{x.quantity} {x.inventory_items?.unit||""}</td><td>{x.reason}</td><td>{x.reference||"—"}</td><td>{x.recipient||"—"}</td></tr>)}{!moves.length&&<tr><td colSpan={7} className="empty">Aucun mouvement enregistré.</td></tr>}</tbody></table></div>}
  {!editable&&<p className="notice" style={{marginTop:12}}>Mode consultation : vous pouvez consulter les stocks et l’historique, mais seul le logisticien ou une personne autorisée peut modifier les données.</p>}
 </>;
}
