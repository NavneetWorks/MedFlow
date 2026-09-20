import React, { useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Activity, AlertTriangle, Ambulance, ArrowRight, BedDouble, ChevronDown,
  CircleAlert, Clock3, Gauge, HeartPulse, Menu, MonitorCog, MoreHorizontal,
  Play, Plus, ShieldAlert, Stethoscope, Users, X, Settings
} from 'lucide-react';
import './styles.css';
import LiveQueue from './LiveQueue';
import PatientDetails from './PatientDetails';
import HospitalOperations from './HospitalOperations';
import Analytics from './Analytics';
import ResourcePanel from './ResourcePanel';
import { useSimulationSocket } from './hooks/useSimulationSocket';

const patients = [
  { position: 1, name: 'Aarav Sharma', id: 'PT-2048', department: 'Emergency', priority: 'Urgent', wait: '18 min', resource: 'ICU Bed', status: 'Awaiting bed', score: 104.5, processing: 35 },
  { position: 2, name: 'Meera Iyer', id: 'PT-2051', department: 'Cardiology', priority: 'Urgent', wait: '13 min', resource: 'Doctor', status: 'Waiting', score: 96.2, processing: 22 },
  { position: 3, name: 'Rohan Kapoor', id: 'PT-2045', department: 'Emergency', priority: 'High', wait: '31 min', resource: 'Doctor', status: 'Waiting', score: 84.7, processing: 28 },
  { position: 4, name: 'Sara Khan', id: 'PT-2054', department: 'Orthopedics', priority: 'High', wait: '09 min', resource: 'General Bed', status: 'Assigned', score: 76.4, processing: 14 },
  { position: 5, name: 'Dev Patel', id: 'PT-2042', department: 'General', priority: 'Moderate', wait: '42 min', resource: 'Doctor', status: 'Waiting', score: 61.8, processing: 16 }
];

const resources = [
  { label: 'General Beds', used: 54, total: 72, icon: BedDouble },
  { label: 'ICU Beds', used: 11, total: 12, icon: HeartPulse },
  { label: 'Operating Rooms', used: 4, total: 6, icon: MonitorCog },
  { label: 'Doctors', used: 9, total: 12, icon: Stethoscope },
  { label: 'Nurses', used: 28, total: 36, icon: Users },
  { label: 'Ambulances', used: 3, total: 5, icon: Ambulance }
];

const departments = [
  { name: 'Emergency', waiting: 9, consulting: 4, doctors: '2 / 4', wait: '17 min', load: 'Overloaded' },
  { name: 'Cardiology', waiting: 5, consulting: 3, doctors: '2 / 3', wait: '12 min', load: 'Busy' },
  { name: 'Orthopedics', waiting: 3, consulting: 2, doctors: '3 / 4', wait: '8 min', load: 'Normal' },
  { name: 'General Medicine', waiting: 7, consulting: 4, doctors: '4 / 5', wait: '14 min', load: 'Busy' }
];

function PriorityBadge({ priority }) { return <span className={`priority ${priority.toLowerCase()}`}>{priority}</span>; }
function Utilization({ used, total }) {
  const pct = Math.round((used / total) * 100);
  return <><div className="util-label"><span>{used} used</span><span>{total} total</span></div><div className="bar"><span className={pct >= 90 ? 'critical' : pct >= 75 ? 'warning' : ''} style={{ width: `${pct}%` }} /></div></>;
}

function App() {
  const socketData = useSimulationSocket();
  
  // TEST: Log incoming data to browser console
  React.useEffect(() => {
    console.log('📡 [LIVE SOCKET DATA]:', socketData);
  }, [socketData]);

  const [strategy, setStrategy] = useState('Urgency + Waiting');
  const [surge, setSurge] = useState(false);
  const [doctors, setDoctors] = useState(12);
  const [failure, setFailure] = useState('No active failure');
  const [showControls, setShowControls] = useState(true);
  const [page, setPage] = useState('dashboard');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showResourceSidebar, setShowResourceSidebar] = useState(false);
  const queue = useMemo(() => {
    const urgency = { Urgent: 4, High: 3, Moderate: 2, Stable: 1 };
    const sorted = [...patients].sort((a, b) => {
      if (strategy === 'FCFS') return a.position - b.position;
      if (strategy === 'Urgency Only') return urgency[b.priority] - urgency[a.priority] || a.position - b.position;
      if (strategy === 'Shortest Processing Time') return a.processing - b.processing;
      return b.score - a.score;
    });
    return sorted.map((patient, index) => ({ ...patient, position: index + 1 }));
  }, [strategy]);
  const activeFailure = failure !== 'No active failure';

  return <main>
    <aside className="sidebar">
      <div className="brand-mark"><span className="mark">+</span><span>MEDFLOW</span></div>
      <nav>
        <a className={page === 'dashboard' ? 'nav-active' : ''} onClick={() => setPage('dashboard')}><Gauge size={18}/>Dashboard</a>
        <a className={page === 'queue' ? 'nav-active' : ''} onClick={() => setPage('queue')}><Activity size={18}/>Live Queue <span className="nav-count">24</span></a>
        <a><Users size={18}/>Patients</a>
        <a className={page === 'operations' ? 'nav-active' : ''} onClick={() => setPage('operations')}><BedDouble size={18}/>Hospital Operations</a>
        <a className={page === 'analytics' ? 'nav-active' : ''} onClick={() => setPage('analytics')}><MonitorCog size={18}/>Analytics</a>
      </nav>
      <div className="sidebar-bottom">
        <a><CircleAlert size={18}/>Alerts <span className="alert-dot"/></a>
        <a onClick={() => setShowResourceSidebar(true)} style={{cursor: 'pointer'}}><Settings size={18}/>Resource Mgmt</a>
      </div>
    </aside>

    <section className="shell">
      <header>
        <div><p className="eyebrow">HOSPITAL OPERATIONS</p><h1>{page === 'dashboard' ? 'Dashboard' : page === 'queue' ? 'Live Queue' : page === 'operations' ? 'Hospital Operations' : page === 'analytics' ? 'Analytics' : 'Patient Details'}</h1></div>
        <div className="header-actions"><span className="updated"><span className="live-dot"/> Live · Updated just now</span><button className="icon-button"><Menu size={19}/></button><div className="avatar">NK</div></div>
      </header>

      <div className="status-strip"><span><i className="live-dot"/>LIVE SIMULATION</span><span>Strategy: <b>{strategy}</b></span><span>Surge: <b>{surge ? 'ON' : 'OFF'}</b></span><span>{doctors} Doctors</span>{activeFailure && <span className="failure-status"><AlertTriangle size={14}/>{failure} offline</span>}</div>

      {page === 'dashboard' ? <>
      <section className="controls panel">
        <div className="section-heading"><div><p className="eyebrow">LIVE CONFIGURATION</p><h2>Simulation controls</h2></div><button className="text-button" onClick={() => setShowControls(!showControls)}>{showControls ? 'Collapse' : 'Expand'} <ChevronDown size={16}/></button></div>
        {showControls && <div className="control-grid">
          <label>Mode <div className="segmented"><button className={!surge ? 'selected' : ''} onClick={() => setSurge(false)}>Normal</button><button className={surge ? 'selected surge' : ''} onClick={() => setSurge(true)}>Surge</button></div></label>
          <label>Available doctors <div className="range-control"><input type="range" min="4" max="12" value={doctors} onChange={e => setDoctors(+e.target.value)}/><b>{doctors}</b></div></label>
          <label>Resource failure <div className="select-wrap"><select value={failure} onChange={e => setFailure(e.target.value)}><option>No active failure</option><option>ICU Bed 02</option><option>Doctor D3</option><option>Operating Room 1</option></select><ChevronDown size={15}/></div></label>
          <label>Scheduling strategy <div className="select-wrap"><select value={strategy} onChange={e => setStrategy(e.target.value)}><option>Urgency + Waiting</option><option>Urgency Only</option><option>FCFS</option><option>Shortest Processing Time</option></select><ChevronDown size={15}/></div></label>
          <button className="compare" onClick={() => setPage('analytics')}><Activity size={17}/>Compare strategies <ArrowRight size={17}/></button>
        </div>}
      </section>

      <section className="kpis">
        {[[surge ? '31' : '24','Patients waiting',surge ? '+10 during surge' : '+3 in last hour','neutral'],['6','Urgent cases','2 need immediate action','critical'],['9','Active consultations','75% doctor capacity','neutral'],[`${Math.max(0, doctors - 9)}`,'Available doctors',doctors < 9 ? `${9-doctors} below active demand` : 'Current staffing capacity',doctors < 9 ? 'critical' : 'positive'],['14 min','Average wait','Target: under 15 minutes','positive']].map(([num,label,note,tone]) => <div className="kpi panel" key={label}><p>{label}</p><div className="kpi-num">{num}</div><small className={tone}>{note}</small></div>)}
      </section>

      <section className="content-grid">
        <article className="panel queue-card"><div className="section-heading"><div><p className="eyebrow">LIVE PRIORITY QUEUE</p><h2>Patients requiring attention <span className="small-count">{surge ? '31' : '24'}</span></h2></div><button className="link-button" onClick={() => setPage('queue')}>View full queue <ArrowRight size={16}/></button></div>
          <div className="table-wrap"><table><thead><tr><th>POS.</th><th>PATIENT</th><th>DEPARTMENT</th><th>PRIORITY</th><th>WAIT TIME</th><th>RESOURCE</th><th>STATUS</th></tr></thead><tbody>{queue.map(p => <tr key={p.id}><td><strong>{p.position}</strong></td><td><strong>{p.name}</strong><small>{p.id}</small></td><td>{p.department}</td><td><PriorityBadge priority={p.priority}/></td><td>{p.wait}</td><td>{p.resource}</td><td><span className={p.status === 'Awaiting bed' ? 'status caution' : p.status === 'Assigned' ? 'status assigned' : 'status'}>{p.status}</span></td></tr>)}</tbody></table></div>
        </article>
        <article className="panel alerts"><div className="section-heading"><div><p className="eyebrow">NEEDS ATTENTION</p><h2>Priority alerts</h2></div><button className="text-button">View all</button></div>
          <Alert icon={ShieldAlert} type="critical" title="ICU nearing capacity" text="11 of 12 beds occupied · 1 urgent patient waiting" link="View ICU status"/>
          <Alert icon={Clock3} type="warning" title="Extended patient wait" text="Rohan Kapoor has been waiting 31 minutes" link="View patient"/>
          {activeFailure ? <Alert icon={AlertTriangle} type="critical" title="Resource unavailable" text={`${failure} is currently offline`} link="View operations" onClick={() => setPage('operations')}/> : <Alert icon={Users} type="info" title="Emergency department load" text="9 patients waiting · doctor availability is low" link="View department" onClick={() => setPage('operations')}/>} 
        </article>
      </section>

      <section className="bottom-grid">
        <article className="panel departments"><div className="section-heading"><div><p className="eyebrow">DEPARTMENT OVERVIEW</p><h2>Current department load</h2></div><button className="link-button">Open operations <ArrowRight size={16}/></button></div><div className="department-grid">{departments.map(d => <div className="department" key={d.name}><div><h3>{d.name}</h3><span className={`load ${d.load.toLowerCase()}`}>{d.load}</span></div><div className="dept-values"><span><b>{d.waiting}</b>Waiting</span><span><b>{d.consulting}</b>Consulting</span><span><b>{d.doctors}</b>Doctors</span><span><b>{d.wait}</b>Avg. wait</span></div></div>)}</div></article>
        <article className="panel activity"><div className="section-heading"><div><p className="eyebrow">SYSTEM ACTIVITY</p><h2>Recent events</h2></div><MoreHorizontal size={20}/></div>{[['Patient assigned','Meera Iyer assigned to Dr. Banerjee','1m ago'],['Consultation completed','Patient PT-2039 discharged from Cardiology','3m ago'],['New arrival','Ambulance arrival: PT-2054 assessed','5m ago'],['Doctor available','Dr. Williams is now available','7m ago']].map((a,i) => <div className="event" key={a[0]}><span className={`event-dot e${i}`}/><div><b>{a[0]}</b><p>{a[1]}</p></div><small>{a[2]}</small></div>)}</article>
      </section>

      <section className="panel resource-panel"><div className="section-heading"><div><p className="eyebrow">RESOURCE CAPACITY</p><h2>Hospital utilization</h2></div><button className="link-button">View all resources <ArrowRight size={16}/></button></div><div className="resource-grid">{resources.map(r => { const Icon = r.icon; return <div className="resource" key={r.label}><div className="resource-title"><span className="resource-icon"><Icon size={19}/></span><span>{r.label}</span><b>{Math.round(r.used/r.total*100)}%</b></div><Utilization used={r.used} total={r.total}/></div>})}</div></section>
      </> : page === 'queue' ? <LiveQueue patients={queue} strategy={strategy} surge={surge} failure={failure} onFullDetails={(patient) => { setSelectedPatient(patient); setPage('patient'); }} /> : page === 'operations' ? <HospitalOperations failure={failure} doctors={doctors} /> : page === 'analytics' ? <Analytics /> : <PatientDetails patient={selectedPatient || patients[0]} onBack={() => setPage('queue')} />}
    </section>
    
    <ResourcePanel isOpen={showResourceSidebar} onClose={() => setShowResourceSidebar(false)} />
  </main>;
}

function Alert({ icon: Icon, type, title, text, link, onClick }) { return <div className={`alert ${type}`}><span className="alert-icon"><Icon size={19}/></span><div><b>{title}</b><p>{text}</p><button onClick={onClick}>{link} <ArrowRight size={13}/></button></div></div>; }

createRoot(document.getElementById('root')).render(<App/>);
