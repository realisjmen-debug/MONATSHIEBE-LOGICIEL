"use client";

import {useEffect,useState} from "react";
import {supabase} from "../../lib/supabase";
import "./platform.css";
import {Building2,Plus,Power,ExternalLink,ShieldCheck,RefreshCw,UserPlus,X,Layers,PlusCircle,Search,CheckCircle2,PauseCircle,Wallet,LockKeyhole,ShoppingCart} from "lucide-react";

type School={id:string;name:string;slug:string;status:string;city:string|null;phone:string|null;created_at:string};
type License={school_id:string;license_type:"perpetual";status:"pending"|"active"|"suspended";purchase_amount:number|null;currency:"USD"|"CDF";purchased_at:string|null;notes:string|null};
type Module={module_key:string;name:string;description:string;category:string;implementation_status:"available"|"in_development"|"planned";default_enabled:boolean;one_time_price:number|null;price_currency:"USD"|"CDF"};
type SchoolModule={module_key:string;enabled:boolean;purchased:boolean;purchase_type:"base"|"addon";purchase_price:number|null;purchase_currency:"USD"|"CDF";purchased_at:string|null};

function uniqueModuleRows(rows:Module[]):Module[]{
 const byName=new Map<string,Module>();
 for(const m of rows){
  const key=m.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
  const previous=byName.get(key);
  const rank=(x:Module)=>x.implementation_status==="available"?3:x.implementation_status==="in_development"?2:1;
  if(!previous||rank(m)>rank(previous))byName.set(key,m);
 }
 return [...byName.values()].sort((a,b)=>a.category.localeCompare(b.category)||a.name.localeCompare(b.name));
}
const formatMoney=(amount:number|null|undefined,currency:string)=>amount===null||amount===undefined?"À définir":new Intl.NumberFormat("fr-FR",{maximumFractionDigits:2}).format(Number(amount))+" "+(currency==="CDF"?"FC":"USD");

export default function PlatformPage(){
 const [ok,setOk]=useState(false),[loading,setLoading]=useState(true),[schools,setSchools]=useState<School[]>([]),[licenses,setLicenses]=useState<Record<string,License>>({});
 const [name,setName]=useState(""),[slug,setSlug]=useState(""),[city,setCity]=useState("Kinshasa"),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 const [adminSchool,setAdminSchool]=useState<School|null>(null),[admin,setAdmin]=useState({full_name:"",email:"",phone:"",password:""});
 const [modules,setModules]=useState<Module[]>([]),[selectedSchoolId,setSelectedSchoolId]=useState(""),[schoolModules,setSchoolModules]=useState<Record<string,SchoolModule>>({}),[moduleBusy,setModuleBusy]=useState(false);
 const [newModule,setNewModule]=useState({name:"",key:"",category:"Autres",description:"",price:"",currency:"USD" as "USD"|"CDF"});
 const [modulePriceDraft,setModulePriceDraft]=useState<Record<string,string>>({}),[moduleCurrencyDraft,setModuleCurrencyDraft]=useState<Record<string,"USD"|"CDF">>({});
 const [licenseAmountDraft,setLicenseAmountDraft]=useState<Record<string,string>>({}),[licenseCurrencyDraft,setLicenseCurrencyDraft]=useState<Record<string,"USD"|"CDF">>({});
 const [schoolQuery,setSchoolQuery]=useState(""),[schoolStatusFilter,setSchoolStatusFilter]=useState("all");
 const filteredSchools=schools.filter(s=>(s.name+" "+s.slug+" "+(s.city||"")).toLowerCase().includes(schoolQuery.toLowerCase())&&(schoolStatusFilter==="all"||s.status===schoolStatusFilter));
 const activeSchools=schools.filter(s=>s.status==="active").length,suspendedSchools=schools.filter(s=>s.status==="suspended").length;
 const selectedSchool=schools.find(s=>s.id===selectedSchoolId)||null;

 async function load(){
   setLoading(true);
   const {data:u}=await supabase.auth.getUser();
   if(!u.user){location.href="/platform/login";return}
   const {data:a,error:aError}=await supabase.from("platform_admins").select("user_id,active").eq("user_id",u.user.id).eq("active",true).maybeSingle();
   const authorized=!aError&&a?.active===true;setOk(authorized);
   if(authorized){
     const [s,l,m]=await Promise.all([
       supabase.from("schools").select("id,name,slug,status,city,phone,created_at").order("created_at",{ascending:false}),
       supabase.from("school_licenses").select("school_id,license_type,status,purchase_amount,currency,purchased_at,notes"),
       supabase.from("module_catalog").select("module_key,name,description,category,implementation_status,default_enabled,one_time_price,price_currency").order("category").order("name")
     ]);
     if(s.error)setMsg("Chargement des établissements impossible : "+s.error.message);
     if(l.error)setMsg("Chargement des licences impossible : "+l.error.message);
     setSchools(s.data||[]);
     const licenseMap:Record<string,License>={};(l.data||[]).forEach((x:any)=>{licenseMap[x.school_id]=x});setLicenses(licenseMap);
     setModules(uniqueModuleRows((m.data||[]) as Module[]));
     if(s.data?.length)setSelectedSchoolId(current=>current&&s.data.some((x:any)=>x.id===current)?current:s.data[0].id);
     const amountDraft:Record<string,string>={},currencyDraft:Record<string,"USD"|"CDF">={};
     (l.data||[]).forEach((x:any)=>{amountDraft[x.school_id]=x.purchase_amount===null?"":String(x.purchase_amount);currencyDraft[x.school_id]=x.currency||"USD"});
     setLicenseAmountDraft(amountDraft);setLicenseCurrencyDraft(currencyDraft);
   }
   setLoading(false);
 }
 useEffect(()=>{load()},[]);
 useEffect(()=>{if(!selectedSchoolId){setSchoolModules({});return}let alive=true;(async()=>{
   const {data,error}=await supabase.from("school_modules").select("module_key,enabled,purchased,purchase_type,purchase_price,purchase_currency,purchased_at").eq("school_id",selectedSchoolId);
   if(!alive)return;if(error){setMsg("Chargement des modules impossible : "+error.message);return}
   const map:Record<string,SchoolModule>={};(data||[]).forEach((x:any)=>{map[x.module_key]=x});setSchoolModules(map);
 })();return()=>{alive=false}},[selectedSchoolId]);

 function makeSlug(v:string){return v.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9-]+/g,"-").replace(/-+/g,"-").replace(/^-+|-+$/g,"").slice(0,48)}
 async function createSchool(e:React.FormEvent){
   e.preventDefault();setMsg("");setBusy(true);const finalSlug=makeSlug(slug||name);
   if(!name.trim()||!finalSlug){setMsg("Nom et identifiant de l'école obligatoires.");setBusy(false);return}
   const {data,error}=await supabase.functions.invoke("create-school",{body:{name:name.trim(),slug:finalSlug,city:city.trim(),plan_id:null}});
   if(error){setMsg(error.message||"Création impossible.");setBusy(false);return}
   if(data?.error){setMsg(data.error);setBusy(false);return}
   setName("");setSlug("");setMsg("École créée. Sa licence perpétuelle est en attente de validation par le Super Administrateur.");setBusy(false);await load();
 }
 async function createAdmin(e:React.FormEvent){
   e.preventDefault();if(!adminSchool)return;setBusy(true);setMsg("");
   const {data,error}=await supabase.functions.invoke("create-school-admin",{body:{school_id:adminSchool.id,...admin}});
   if(error){setMsg(error.message||"Impossible de créer l'administrateur.");setBusy(false);return}
   if(data?.error){setMsg(data.error+(data?.stage?" — étape : "+data.stage:""));setBusy(false);return}
   setMsg("Administrateur créé pour "+adminSchool.name+".");setAdmin({full_name:"",email:"",phone:"",password:""});setAdminSchool(null);setBusy(false);
 }
 async function setLicenseStatus(s:School,status:"pending"|"active"|"suspended"){
   const current=licenses[s.id];const {data:userData}=await supabase.auth.getUser();const now=new Date().toISOString();
   const next:License={school_id:s.id,license_type:"perpetual",status,purchase_amount:current?.purchase_amount??null,currency:current?.currency||"USD",purchased_at:current?.purchased_at||(status==="active"?now:null),notes:current?.notes||null};
   const {error}=await supabase.from("school_licenses").upsert({...next,granted_by:userData.user?.id||null,updated_at:now},{onConflict:"school_id"});
   if(error){setMsg("Modification de la licence impossible : "+error.message);return}
   setLicenses(v=>({...v,[s.id]:next}));setMsg("Licence "+(status==="active"?"perpétuelle activée":status==="suspended"?"suspendue":"mise en attente")+" pour "+s.name+".");
 }
 async function saveLicenseDetails(s:School){
   const current=licenses[s.id];if(!current){setMsg("Aucune licence trouvée pour cet établissement.");return}
   const raw=licenseAmountDraft[s.id]??"";const amount=raw.trim()===""?null:Number(raw);
   if(amount!==null&&(!Number.isFinite(amount)||amount<0)){setMsg("Montant de licence invalide.");return}
   const currency=licenseCurrencyDraft[s.id]||"USD";
   const {error}=await supabase.from("school_licenses").update({purchase_amount:amount,currency,updated_at:new Date().toISOString()}).eq("school_id",s.id);
   if(error){setMsg("Enregistrement du montant impossible : "+error.message);return}
   setLicenses(v=>({...v,[s.id]:{...current,purchase_amount:amount,currency}}));setMsg("Informations de licence enregistrées pour "+s.name+".");
 }
 async function setModulePurchased(module:Module,purchased:boolean){
   if(!selectedSchoolId)return;if(module.default_enabled&&!purchased){setMsg("Ce module est inclus dans la licence de base et ne peut pas être retiré.");return}
   setModuleBusy(true);setMsg("");const {data:userData}=await supabase.auth.getUser();const current=schoolModules[module.module_key];
   const purchaseType: "base"|"addon"=module.default_enabled?"base":"addon";
   const payload={school_id:selectedSchoolId,module_key:module.module_key,purchased,enabled:purchased?current?.enabled===true:false,purchase_type:purchaseType,purchase_price:purchased&&!module.default_enabled?module.one_time_price:null,purchase_currency:module.price_currency||"USD",purchased_at:purchased?(current?.purchased_at||new Date().toISOString()):null,purchased_by:purchased?(userData.user?.id||null):null,purchase_note:purchased?(current as any)?.purchase_note||"Achat validé par le Super Administrateur":null,updated_at:new Date().toISOString(),updated_by:userData.user?.id||null};
   const {error}=await supabase.from("school_modules").upsert(payload,{onConflict:"school_id,module_key"});
   if(error)setMsg("Mise à jour de l'achat impossible : "+error.message);
   else{setSchoolModules(v=>({...v,[module.module_key]:{...(v[module.module_key]||{module_key:module.module_key,enabled:false,purchase_type:"addon",purchase_price:null,purchase_currency:"USD",purchased_at:null}),purchased,enabled:payload.enabled,purchase_type:payload.purchase_type,purchase_price:payload.purchase_price,purchase_currency:payload.purchase_currency,purchased_at:payload.purchased_at}}));setMsg(purchased?"Module marqué comme acquis pour l’établissement.":"Acquisition du module retirée ; le module est désactivé.");}
   setModuleBusy(false);
 }
 async function setModuleEnabled(module:Module,enabled:boolean){
   if(!selectedSchoolId)return;const current=schoolModules[module.module_key];
   if(enabled&&!current?.purchased){setMsg("Ce module doit d’abord être marqué comme acquis.");return}
   if(enabled&&module.implementation_status!=="available"){setMsg("Ce module doit être développé et testé avant son activation.");return}
   if(module.module_key==="dashboard"&&!enabled){setMsg("Le tableau de bord principal reste toujours activé.");return}
   setModuleBusy(true);const {data:userData}=await supabase.auth.getUser();
   const {error}=await supabase.from("school_modules").upsert({school_id:selectedSchoolId,module_key:module.module_key,purchased:current?.purchased===true,enabled,purchase_type:current?.purchase_type||"addon",purchase_price:current?.purchase_price??null,purchase_currency:current?.purchase_currency||module.price_currency||"USD",purchased_at:current?.purchased_at||null,purchased_by:(current as any)?.purchased_by||null,updated_at:new Date().toISOString(),updated_by:userData.user?.id||null},{onConflict:"school_id,module_key"});
   if(error)setMsg("Activation du module impossible : "+error.message);
   else{setSchoolModules(v=>({...v,[module.module_key]:{...(current||{module_key:module.module_key,purchased:false,purchase_type:"addon",purchase_price:null,purchase_currency:"USD",purchased_at:null}),enabled}}));setMsg("Module "+(enabled?"activé":"désactivé")+" pour l’établissement.");}
   setModuleBusy(false);
 }
 async function saveModulePrice(module:Module){
   const raw=modulePriceDraft[module.module_key]??(module.one_time_price===null?"":String(module.one_time_price));
   const price=raw.trim()===""?null:Number(raw);if(price!==null&&(!Number.isFinite(price)||price<0)){setMsg("Prix du module invalide.");return}
   const currency=moduleCurrencyDraft[module.module_key]||module.price_currency||"USD";
   const {error}=await supabase.from("module_catalog").update({one_time_price:price,price_currency:currency,updated_at:new Date().toISOString()}).eq("module_key",module.module_key);
   if(error){setMsg("Enregistrement du prix impossible : "+error.message);return}
   setModules(v=>v.map(m=>m.module_key===module.module_key?{...m,one_time_price:price,price_currency:currency}:m));setMsg("Prix d’achat unique enregistré pour "+module.name+".");
 }
 async function addModule(e:React.FormEvent){
   e.preventDefault();setModuleBusy(true);setMsg("");const key=makeSlug(newModule.key||newModule.name).replace(/-/g,"_"),price=newModule.price.trim()===""?null:Number(newModule.price);
   if(!key||!newModule.name.trim()){setMsg("Nom et identifiant du module obligatoires.");setModuleBusy(false);return}
   if(price!==null&&(!Number.isFinite(price)||price<0)){setMsg("Prix du module invalide.");setModuleBusy(false);return}
   const {error}=await supabase.from("module_catalog").insert({module_key:key,name:newModule.name.trim(),description:newModule.description.trim(),category:newModule.category.trim()||"Autres",implementation_status:"planned",default_enabled:false,one_time_price:price,price_currency:newModule.currency});
   if(error){setMsg("Ajout du module impossible : "+error.message);setModuleBusy(false);return}
   setNewModule({name:"",key:"",category:"Autres",description:"",price:"",currency:"USD"});
   const {data}=await supabase.from("module_catalog").select("module_key,name,description,category,implementation_status,default_enabled,one_time_price,price_currency").order("category").order("name");
   setModules(uniqueModuleRows((data||[]) as Module[]));setMsg("Module ajouté au catalogue. Il reste indisponible tant que son développement et ses tests ne sont pas terminés.");setModuleBusy(false);
 }
 async function toggleSchool(s:School){const next=s.status==="suspended"?"active":"suspended";const {error}=await supabase.from("schools").update({status:next,updated_at:new Date().toISOString()}).eq("id",s.id);if(error)setMsg(error.message);else{setMsg("Statut de l’établissement mis à jour.");await load()}}
 if(loading)return <div className="center"><div className="loader"/><p>Chargement de la plateforme…</p></div>;
 if(!ok)return <div className="center"><ShieldCheck size={42}/><h2>Accès refusé</h2><p>Cette zone est réservée au Super Administrateur.</p><a className="btn" href="/">Retour</a></div>;
 return <div className="platform">
  <div className="platformTop"><div><span className="eyebrow">MONATSHIEBE LOGICIEL</span><h1>Administration de la plateforme</h1><p>Licences perpétuelles et modules complémentaires par établissement.</p></div><button className="btn light" onClick={load}><RefreshCw size={17}/> Actualiser</button></div>
  {msg&&<div className="notice" role="status">{msg}</div>}
  <section className="platformStats" aria-label="Indicateurs de la plateforme">
   <div className="statCard"><Building2/><span>Établissements</span><strong>{schools.length}</strong></div>
   <div className="statCard"><CheckCircle2/><span>Écoles actives</span><strong>{activeSchools}</strong></div>
   <div className="statCard"><PauseCircle/><span>Écoles suspendues</span><strong>{suspendedSchools}</strong></div>
   <div className="statCard"><Layers/><span>Modules au catalogue</span><strong>{modules.length}</strong></div>
  </section>
  <div className="platformGrid">
   <form className="panel createForm" onSubmit={createSchool}>
    <div className="sectionTitle"><Building2/><div><h3>Nouvel établissement</h3><p>La licence est validée séparément.</p></div></div>
    <label>Nom de l’école<input value={name} onChange={e=>setName(e.target.value)} placeholder="Complexe Scolaire La Réussite" required/></label>
    <label>Identifiant / slug<input value={slug} onChange={e=>setSlug(makeSlug(e.target.value))} placeholder="la-reussite"/><small>Servira à construire le lien de connexion.</small></label>
    <label>Ville<input value={city} onChange={e=>setCity(e.target.value)}/></label>
    <div className="licenseNotice"><LockKeyhole size={18}/><span><b>Licence à achat unique</b><small>Pas d’abonnement ni d’expiration automatique.</small></span></div>
    <button className="btn full" disabled={busy}><Plus size={17}/>{busy?"Création…":"Créer l’établissement"}</button>
   </form>
   <div className="panel">
    <div className="sectionTitle"><Building2/><div><h3>Établissements enregistrés</h3><p>{filteredSchools.length} résultat(s) sur {schools.length}</p></div></div>
    <div className="schoolFilters"><label><Search size={16}/><input value={schoolQuery} onChange={e=>setSchoolQuery(e.target.value)} placeholder="Rechercher par école, identifiant ou ville"/></label><select aria-label="Filtrer par statut" value={schoolStatusFilter} onChange={e=>setSchoolStatusFilter(e.target.value)}><option value="all">Tous les statuts</option><option value="active">Actives</option><option value="suspended">Suspendues</option><option value="trial">En attente</option></select></div>
    <div className="schoolList">{filteredSchools.map(s=>{const lic=licenses[s.id];return <div className="schoolRow" key={s.id}>
     <div className="schoolMain"><b>{s.name}</b><small>{s.slug} · {s.city||"—"}</small>
      <div className="schoolLinks"><div><small>Connexion école</small><code>{typeof window!=="undefined"?window.location.origin:""}/ecole/{s.slug}</code></div><div><small>Espace parent</small><code>{typeof window!=="undefined"?window.location.origin:""}/ecole/{s.slug}/parent</code></div></div>
      <span className={"status "+(lic?.status!=="active"?"off":"")}>Licence : {lic?.status==="active"?"Perpétuelle active":lic?.status==="suspended"?"Suspendue":"En attente"}</span>
      <div className="licenseControls">
       <label>Montant payé<input type="number" min="0" step="0.01" value={licenseAmountDraft[s.id]??""} onChange={e=>setLicenseAmountDraft(v=>({...v,[s.id]:e.target.value}))} placeholder="Non renseigné"/></label>
       <label>Devise<select value={licenseCurrencyDraft[s.id]||"USD"} onChange={e=>setLicenseCurrencyDraft(v=>({...v,[s.id]:e.target.value as "USD"|"CDF"}))}><option value="USD">USD</option><option value="CDF">CDF</option></select></label>
       <button className="btn light small" type="button" onClick={()=>saveLicenseDetails(s)}>Enregistrer</button>
       <button className="btn small" type="button" onClick={()=>setLicenseStatus(s,lic?.status==="active"?"suspended":"active")}>{lic?.status==="active"?"Suspendre licence":"Activer licence"}</button>
      </div>
     </div>
     <div className="rowActions"><button className="iconBtn" onClick={()=>{setAdminSchool(s);setMsg("")}} title="Créer l’administrateur"><UserPlus size={17}/></button><a className="iconBtn" href={"/ecole/"+encodeURIComponent(s.slug)} title="Ouvrir"><ExternalLink size={17}/></a><button className="iconBtn" onClick={()=>toggleSchool(s)} title={s.status==="suspended"?"Réactiver l’école":"Suspendre l’école"}><Power size={17}/></button></div>
    </div>})}</div>
   </div>
  </div>
  <section className="panel moduleManager">
   <div className="sectionTitle"><Layers/><div><h3>Modules et options complémentaires</h3><p>Les modules de base sont inclus ; les options sont acquises séparément et activées après achat.</p></div></div>
   <label>Établissement concerné<select value={selectedSchoolId} onChange={e=>setSelectedSchoolId(e.target.value)}>{schools.map(s=><option key={s.id} value={s.id}>{s.name} — {s.slug}</option>)}</select></label>
   {selectedSchool&&<p className="selectedSchoolNote"><b>{selectedSchool.name}</b> · Licence : {licenses[selectedSchool.id]?.status==="active"?"active":licenses[selectedSchool.id]?.status==="suspended"?"suspendue":"en attente"}</p>}
   <div className="moduleGrid">{modules.map(m=>{const current=schoolModules[m.module_key];const purchased=current?.purchased===true;const enabled=current?.enabled===true;return <div className="moduleRow" key={m.module_key}>
    <div className="moduleInfo"><b>{m.name}</b><small>{m.category} · <code>{m.module_key}</code></small><p>{m.description}</p><span className={"status "+(m.implementation_status!=="available"?"off":"")}>{m.implementation_status==="available"?"Disponible":m.implementation_status==="in_development"?"En développement":"À développer"}</span><small>{m.default_enabled?"Inclus dans la licence de base":"Option · achat unique : "+formatMoney(m.one_time_price,m.price_currency)}</small>
     {!m.default_enabled&&<div className="modulePriceEdit"><label>Prix unique<input type="number" min="0" step="0.01" value={modulePriceDraft[m.module_key]??(m.one_time_price===null?"":String(m.one_time_price))} onChange={e=>setModulePriceDraft(v=>({...v,[m.module_key]:e.target.value}))} onBlur={()=>saveModulePrice(m)} placeholder="À définir"/></label><label>Devise<select value={moduleCurrencyDraft[m.module_key]||m.price_currency||"USD"} onChange={e=>setModuleCurrencyDraft(v=>({...v,[m.module_key]:e.target.value as "USD"|"CDF"}))} onBlur={()=>saveModulePrice(m)}><option value="USD">USD</option><option value="CDF">CDF</option></select></label></div>}
    </div>
    <div className="moduleActions">
     <label className="moduleToggle"><input type="checkbox" checked={purchased} disabled={moduleBusy||!selectedSchoolId||m.default_enabled} onChange={e=>setModulePurchased(m,e.target.checked)}/><span>{m.default_enabled?"Inclus":purchased?"Acquis":"Non acquis"}</span></label>
     <label className="moduleToggle"><input type="checkbox" checked={enabled} disabled={moduleBusy||!selectedSchoolId||!purchased||m.implementation_status!=="available"||m.module_key==="dashboard"} onChange={e=>setModuleEnabled(m,e.target.checked)}/><span>{enabled?"Activé":"Désactivé"}</span></label>
    </div>
   </div>})}</div>
   <form className="moduleCreate" onSubmit={addModule}><h4><PlusCircle size={18}/> Ajouter une option au catalogue</h4><p>Les nouvelles options sont en attente de développement et ne peuvent pas être activées avant validation technique.</p><div className="moduleCreateGrid"><label>Nom du module<input required value={newModule.name} onChange={e=>setNewModule(v=>({...v,name:e.target.value,key:v.key||makeSlug(e.target.value)}))} placeholder="Ex. Gestion des stages"/></label><label>Identifiant technique<input required value={newModule.key} onChange={e=>setNewModule(v=>({...v,key:e.target.value}))} placeholder="gestion-stages"/></label><label>Catégorie<input value={newModule.category} onChange={e=>setNewModule(v=>({...v,category:e.target.value}))} placeholder="Pédagogie"/></label><label>Prix d’achat unique<input type="number" min="0" step="0.01" value={newModule.price} onChange={e=>setNewModule(v=>({...v,price:e.target.value}))} placeholder="À définir"/></label><label>Devise<select value={newModule.currency} onChange={e=>setNewModule(v=>({...v,currency:e.target.value as "USD"|"CDF"}))}><option value="USD">USD</option><option value="CDF">CDF</option></select></label><label>Description<input value={newModule.description} onChange={e=>setNewModule(v=>({...v,description:e.target.value}))} placeholder="Fonctions principales du module"/></label></div><button className="btn" disabled={moduleBusy}><Plus size={16}/>{moduleBusy?"Enregistrement…":"Ajouter au catalogue"}</button></form>
  </section>
  {adminSchool&&<div className="modalBackdrop" onClick={()=>!busy&&setAdminSchool(null)}><form className="panel adminModal" onSubmit={createAdmin} onClick={e=>e.stopPropagation()}>
   <div className="sectionTitle"><UserPlus/><div><h3>Administrateur de l’école</h3><p>{adminSchool.name}</p></div><button type="button" className="iconBtn" onClick={()=>setAdminSchool(null)} disabled={busy}><X size={18}/></button></div>
   <label>Nom complet<input required value={admin.full_name} onChange={e=>setAdmin(v=>({...v,full_name:e.target.value}))} placeholder="Nom du promoteur"/></label>
   <label>Email de connexion<input required type="email" value={admin.email} onChange={e=>setAdmin(v=>({...v,email:e.target.value}))} placeholder="administration@ecole.cd"/></label>
   <label>Téléphone<input value={admin.phone} onChange={e=>setAdmin(v=>({...v,phone:e.target.value}))} placeholder="+243…"/></label>
   <label>Mot de passe initial<input required minLength={8} type="password" value={admin.password} onChange={e=>setAdmin(v=>({...v,password:e.target.value}))} placeholder="8 caractères minimum"/></label>
   <small>Le compte sera créé avec le rôle Promoteur / Propriétaire.</small><button className="btn full" disabled={busy}><UserPlus size={17}/>{busy?"Création…":"Créer l’administrateur"}</button>
  </form></div>}
  <div className="panel roadmap"><h3>Règles commerciales</h3><div className="road"><span><b>1</b>Licence principale à achat unique</span><span><b>2</b>Accès sans échéance annuelle</span><span><b>3</b>Options achetées séparément</span><span><b>4</b>Activation réservée au Super Administrateur</span><span><b>5</b>Mises à jour distinctes de la maintenance</span></div></div>
 </div>;
}
