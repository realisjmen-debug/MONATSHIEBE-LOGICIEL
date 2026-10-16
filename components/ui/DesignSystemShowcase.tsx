"use client";
import { useState } from "react";
import { Moon, Sun, CheckCircle2, ShieldCheck, Smartphone, Palette } from "lucide-react";

const swatches = [
 { name:"Indigo principal", value:"#4338CA" }, { name:"Indigo profond", value:"#3730A3" },
 { name:"Fond clair", value:"#F6F7FB" }, { name:"Surface", value:"#FFFFFF" },
 { name:"Succès", value:"#16805D" }, { name:"Attention", value:"#B7791F" },
];

export default function DesignSystemShowcase() {
 const [dark,setDark]=useState(false);
 return <main className="designSystem" data-theme={dark?"dark":"light"}>
  <div className="designSystem__shell">
   <header className="designSystem__header"><div>
    <p className="designSystem__eyebrow">MONATSHIEBE LOGICIEL · Fondations UI</p><h1>Système de design</h1>
    <p>Une interface cohérente, accessible et légère pour la gestion scolaire. Cette page présente les fondations visuelles sans modifier les données métier ni les accès.</p>
   </div><button className="ui-button ui-button--secondary" type="button" onClick={()=>setDark(v=>!v)} aria-pressed={dark}>{dark?<Sun size={16} aria-hidden="true"/>:<Moon size={16} aria-hidden="true"/>}Thème {dark?"clair":"sombre"}</button></header>
   <section className="designSystem__section" aria-labelledby="ds-colors"><h2 className="designSystem__sectionTitle" id="ds-colors"><Palette size={17}/>Palette et couleurs d’état</h2><div className="designSystem__grid">{swatches.map(item=><div className="designSystem__swatch" key={item.name}><div className="designSystem__swatchColor" style={{background:item.value}}/><div><b>{item.name}</b><br/><code>{item.value}</code></div></div>)}</div></section>
   <section className="designSystem__section" aria-labelledby="ds-typo"><h2 className="designSystem__sectionTitle" id="ds-typo">Typographie</h2><div className="ui-card"><p className="designSystem__eyebrow">Inter · hiérarchie</p><h2 style={{margin:"0 0 8px",fontSize:28,letterSpacing:"-.035em"}}>Titre de page principal</h2><h3 style={{margin:"0 0 8px",fontSize:18}}>Titre de section</h3><p style={{margin:"0 0 8px",lineHeight:1.6}}>Le texte courant reste confortable à lire sur ordinateur et téléphone, avec un contraste adapté et une hiérarchie claire.</p><p className="designSystem__muted">Texte secondaire · informations complémentaires</p></div></section>
   <section className="designSystem__section" aria-labelledby="ds-components"><h2 className="designSystem__sectionTitle" id="ds-components">Composants réutilisables</h2><div className="ui-card"><p className="designSystem__muted" style={{marginTop:0}}>Boutons et états</p><div className="designSystem__sampleRow"><button className="ui-button" type="button"><CheckCircle2 size={16}/>Action principale</button><button className="ui-button ui-button--secondary" type="button">Action secondaire</button><button className="ui-button ui-button--quiet" type="button">Action discrète</button><button className="ui-button ui-button--danger" type="button">Action sensible</button></div><div className="designSystem__sampleRow" style={{marginTop:18}}><span className="ui-status ui-status--success">Actif</span><span className="ui-status ui-status--warning">À vérifier</span><span className="ui-status ui-status--danger">Échec</span><span className="ui-status ui-status--neutral">En attente</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:18,marginTop:22}}><label className="designSystem__field">Champ de formulaire<span>Libellé explicite et visible</span><input className="ui-input" placeholder="Ex. Nom de l’élève"/></label><div className="designSystem__metric"><small>Indicateur</small><strong>—</strong><span className="designSystem__muted">Valeur fournie par le module concerné</span></div></div></div></section>
   <section className="designSystem__section" aria-labelledby="ds-principles"><h2 className="designSystem__sectionTitle" id="ds-principles">Principes d’interface</h2><div className="designSystem__grid"><article className="ui-card"><ShieldCheck size={20} color="var(--ui-brand)"/><h3>Accès inchangés</h3><p className="designSystem__muted">Les rôles et permissions restent définis par l’application existante.</p></article><article className="ui-card"><Smartphone size={20} color="var(--ui-brand)"/><h3>Adapté au mobile</h3><p className="designSystem__muted">Contrôles tactiles, textes lisibles et mise en page adaptable.</p></article><article className="ui-card"><CheckCircle2 size={20} color="var(--ui-brand)"/><h3>Léger et accessible</h3><p className="designSystem__muted">CSS natif, composants simples et préférence de mouvement réduit respectée.</p></article></div></section>
   <footer className="designSystem__section designSystem__muted">Page de référence visuelle · aucune donnée n’est enregistrée.</footer>
  </div>
 </main>;
}
