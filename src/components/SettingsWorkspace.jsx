import { useEffect, useRef, useState } from 'react';
import DictionaryManagementPanel from './DictionaryManagementPanel.jsx';
import TeachingAdvancedDashboard from './TeachingAdvancedDashboard.jsx';
import { COLOR_SOURCES } from '../lib/colorSource.js';

const SECTIONS = [
  ['reading','Reading','Appearance and reading behavior'],
  ['integrations','Integrations','Anki, enrichment, and local services'],
  ['dictionaries','Dictionaries','Installed dictionary data and updates'],
  ['teaching','Teaching administration','Evidence, quality, governance, and handoff'],
  ['diagnostics','Diagnostics','Runtime, contracts, persistence, and reports'],
];
function Card({ title, description, children }) { return <section className="settings-card"><header><h3>{title}</h3>{description && <p>{description}</p>}</header>{children}</section>; }
function Metric({ label, value, tone='' }) { return <div className={`settings-metric ${tone}`}><span>{label}</span><strong>{String(value ?? 'Unavailable')}</strong></div>; }
export default function SettingsWorkspace(props) {
  const [section,setSection]=useState('reading');
  const closeRef=useRef(null);
  useEffect(()=>{ closeRef.current?.focus(); const key=e=>{ if(e.key==='Escape') props.onClose(); }; window.addEventListener('keydown',key); return()=>window.removeEventListener('keydown',key); },[]);
  const fieldEntries=Object.entries(props.fields || {});
  return <div className="settings-workspace-layer" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)props.onClose();}}>
    <section className="settings-workspace" role="dialog" aria-modal="true" aria-labelledby="settings-workspace-title">
      <header className="settings-workspace-header"><div><span>Application workspace</span><h2 id="settings-workspace-title">Settings and administration</h2><p>Reading preferences, integrations, dictionaries, Teaching administration, and diagnostics.</p></div><button ref={closeRef} type="button" className="secondary" onClick={props.onClose}>Close</button></header>
      <div className="settings-workspace-layout">
        <nav className="settings-workspace-nav" aria-label="Settings sections">{SECTIONS.map(([id,label,description])=><button type="button" key={id} className={section===id?'active':''} aria-current={section===id?'page':undefined} onClick={()=>setSection(id)}><strong>{label}</strong><span>{description}</span></button>)}</nav>
        <main className="settings-workspace-content" tabIndex="-1">
          {section==='reading' && <div className="settings-section"><div className="settings-section-heading"><span>Reader</span><h2>Reading</h2><p>These controls use the existing per-book progress and appearance state.</p></div>
            <Card title="Typography" description="Adjust the book viewport without changing EPUB content."><div className="settings-control-grid">
              <label>Font family<select value={props.readerStyle.fontFamily} onChange={e=>props.updateStyle({fontFamily:e.target.value})}><option value="mincho">Mincho</option><option value="gothic">Gothic</option></select></label>
              <label>Font size <output>{props.readerStyle.fontSize}px</output><input type="range" min="20" max="46" value={props.readerStyle.fontSize} onChange={e=>props.updateStyle({fontSize:Number(e.target.value)})}/></label>
              <label>Line spacing <output>{props.readerStyle.lineHeight.toFixed(2)}</output><input type="range" min="1.4" max="2.8" step="0.05" value={props.readerStyle.lineHeight} onChange={e=>props.updateStyle({lineHeight:Number(e.target.value)})}/></label>
              <label>Viewport height <output>{props.readerStyle.height}px</output><input type="range" min="420" max="900" step="20" value={props.readerStyle.height} onChange={e=>props.updateStyle({height:Number(e.target.value)})}/></label>
            </div></Card>
            <Card title="Reading behavior"><div className="settings-toggle-grid"><button type="button" className={props.showFurigana?'active secondary':'secondary'} onClick={()=>props.setShowFurigana(v=>!v)}>Furigana {props.showFurigana?'On':'Off'}</button><button type="button" className={props.verticalMode?'active secondary':'secondary'} onClick={()=>props.setVerticalMode(v=>!v)}>{props.verticalMode?'Vertical':'Horizontal'} writing</button></div><label>Colour source<select value={props.colorSource} onChange={e=>props.setColorSource(e.target.value)}><option value={COLOR_SOURCES.JP_ANALYZER}>JP Analyzer</option><option value={COLOR_SOURCES.PLAIN_TEXT}>Plain text</option></select><small>JP Analyzer remains the sole linguistic source. Plain text changes presentation only.</small></label><button type="button" className="secondary" onClick={props.resetStyle}>Reset reading appearance</button></Card>
          </div>}
          {section==='integrations' && <div className="settings-section"><div className="settings-section-heading"><span>Local services</span><h2>Integrations</h2><p>Existing AnkiConnect, enrichment, and speech settings remain authoritative.</p></div>
            <div className="settings-metrics"><Metric label="AnkiConnect" value={props.ankiStatus.connected?'Connected':'Offline'} tone={props.ankiStatus.connected?'success':'warning'}/><Metric label="Known-word cache" value={props.knownWordAuthority.phase}/><Metric label="Effective known" value={props.knownWordAuthority.effectiveCount}/><Metric label="Last refresh" value={props.knownWordAuthority.refreshedAt?new Date(props.knownWordAuthority.refreshedAt).toLocaleString():'Not available'}/></div>
            <Card title="Anki and enrichment"><div className="settings-control-grid"><label>Note type<input value={props.noteType} onChange={e=>props.setNoteType(e.target.value)}/></label>{fieldEntries.map(([key,value])=><label key={key}>{key.replace(/([A-Z])/g,' $1')}<input value={value} onChange={e=>props.setFields(current=>({...current,[key]:e.target.value}))}/></label>)}</div><div className="settings-action-row"><button type="button" onClick={props.rebuildKnownWords}>Rebuild known-word cache</button><button type="button" className="secondary" onClick={props.clearKnownWords}>Clear Anki cache</button></div></Card>
            <Card title="Nadeshiko and speech"><label>Session token<input type="password" autoComplete="off" value={props.sessionToken} onChange={e=>props.setSessionToken(e.target.value)} placeholder="Stored only in local browser storage"/><small>The token remains masked and is not added to Debug Report v2.</small></label><button type="button" className={props.forceTts?'active secondary':'secondary'} onClick={props.toggleForceTts}>Force TTS {props.forceTts?'On':'Off'}</button></Card>
          </div>}
          {section==='dictionaries' && <div className="settings-section"><div className="settings-section-heading"><span>JP Analyzer data</span><h2>Dictionaries</h2><p>Install, replace, update, inspect, or remove dictionaries through the existing transaction clients.</p></div><DictionaryManagementPanel/></div>}
          {section==='teaching' && <div className="settings-section"><div className="settings-section-heading"><span>Governed evidence</span><h2>Teaching administration</h2><p>Quality, governance, portability, packaging, evaluation, handoff, and controlled-activation information.</p></div><TeachingAdvancedDashboard records={[]} onClose={()=>setSection('reading')}/></div>}
          {section==='diagnostics' && <div className="settings-section"><div className="settings-section-heading"><span>Read-only inspection</span><h2>Diagnostics</h2><p>Runtime facts are projected from existing status, contract, persistence, and analyzer sources.</p></div>
            <div className="settings-metrics"><Metric label="Analyzer" value={props.analyzerStatus}/><Metric label="Reader contract" value={props.readerContractValid?'Valid':'Invalid'} tone={props.readerContractValid?'success':'warning'}/><Metric label="Result source" value={props.resultSource}/><Metric label="Scene" value={props.sceneLabel}/><Metric label="API contracts" value={`${props.contractDiagnostics?.contractCount ?? 0} registered`}/><Metric label="Persistence" value={`${props.persistenceDiagnostics?.records?.length ?? 0} records inspected`}/></div>
            <Card title="Status domains" description="All Alpha 6 domains remain separate."><div className="settings-domain-list">{Object.values(props.statusDomains||{}).map(item=><div key={item.domain}><strong>{item.domain.replaceAll('-',' ')}</strong><span>{item.phase}</span><small>{item.message||'No current message'}</small></div>)}</div></Card>
            <Card title="Debug Report v2"><label className="settings-check"><input type="checkbox" checked={props.includeFullParserInventory} onChange={e=>props.setIncludeFullParserInventory(e.target.checked)}/><span>Include full EPUB parser inventory</span></label><div className="settings-action-row"><button type="button" onClick={props.onExportDebugReport}>Export Debug Report</button><button type="button" className="secondary" onClick={props.onCopyDiagnosticSummary}>Copy diagnostic summary</button><button type="button" className="secondary" onClick={props.onClearAnalyzerCache}>Clear cached sentence analyses</button><button type="button" className={props.debugMode?'active secondary':'secondary'} onClick={()=>props.setDebugMode(v=>!v)}>Debug mode {props.debugMode?'On':'Off'}</button></div></Card>
          </div>}
        </main>
      </div>
    </section>
  </div>;
}
