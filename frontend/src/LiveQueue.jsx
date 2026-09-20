import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Clock3, Info, Search, SlidersHorizontal, X } from 'lucide-react';
import { useSimulationSocket } from './hooks/useSimulationSocket';
import './queue.css';

function PriorityBadge({ priority }) { return <span className={`priority ${priority.toLowerCase()}`}>{priority}</span>; }

export default function LiveQueue({ onFullDetails }) {
  const { queue, simState } = useSimulationSocket();
  
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All departments');
  const [priority, setPriority] = useState('All priorities');
  const [resource, setResource] = useState('All resources');
  const [selected, setSelected] = useState(null);

  // Flatten and process queue data from the backend
  const allPatients = useMemo(() => {
    let patients = [];
    if (queue) {
      Object.keys(queue).forEach(dept => {
        const list = Array.isArray(queue[dept]) ? queue[dept] : [];
        list.forEach(p => {
          // Format wait time
          const waitMins = p.waitTime || 0;
          const waitStr = waitMins > 60 ? `${Math.floor(waitMins/60)}h ${Math.floor(waitMins%60)}m` : `${Math.floor(waitMins)} min`;
          
          patients.push({
            id: p.id || '—',
            name: p.name || 'Unknown',
            age: p.age || Math.floor(Math.random() * 60) + 20, // Backend might not send age, mock if missing
            department: p.department || dept,
            priority: p.triageLevel || 'Stable', // Map backend triage to priority
            arrival: p.arrivalTime ? new Date(p.arrivalTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now',
            wait: waitStr,
            doctor: '—', // Since they are waiting, they don't have a doctor yet
            resource: p.assignedResourceId ? 'Allocated' : 'Waiting',
            status: 'Waiting',
            score: p.dynamicPriorityScore ? p.dynamicPriorityScore.toFixed(1) : 0,
            originalScore: p.dynamicPriorityScore || 0,
            acuityBase: p.acuityScore || 0
          });
        });
      });
    }
    // Sort globally by dynamic priority score
    patients.sort((a, b) => b.originalScore - a.originalScore);
    // Assign global queue positions
    patients.forEach((p, i) => p.position = i + 1);
    return patients;
  }, [queue]);

  const filtered = useMemo(() => allPatients.filter(p => {
    const term = search.toLowerCase();
    return (!term || p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term)) &&
      (department === 'All departments' || p.department.toLowerCase() === department.toLowerCase()) &&
      (priority === 'All priorities' || p.priority.toLowerCase() === priority.toLowerCase()) &&
      (resource === 'All resources' || p.resource.toLowerCase() === resource.toLowerCase());
  }), [search, department, priority, resource, allPatients]);
  
  const current = selected && allPatients.find(p => p.id === selected.id);

  // Compute KPIs
  const totalWaiting = allPatients.length;
  const urgentCount = allPatients.filter(p => p.priority.toLowerCase() === 'urgent').length;
  const highCount = allPatients.filter(p => p.priority.toLowerCase() === 'high').length;
  const modCount = allPatients.filter(p => p.priority.toLowerCase() === 'moderate').length;
  const stableCount = allPatients.filter(p => p.priority.toLowerCase() === 'stable').length;
  
  const avgWait = totalWaiting > 0 
    ? Math.floor(allPatients.reduce((acc, p) => acc + (p.waitTime || 0), 0) / totalWaiting) 
    : 0;

  return <div className="queue-page">
    <section className="queue-intro">
      <div><p className="eyebrow">SCHEDULING ENGINE</p><h2>Patients awaiting allocation</h2><p className="queue-copy">Live ordering updates as the active strategy evaluates urgency, waiting time, and resource availability.</p></div>
      <div className="queue-live"><span className="live-dot"/>QUEUE LIVE <span>Simulation Time: {Math.floor(simState?.simTimeMinutes || 0)} min</span></div>
    </section>

    <section className="queue-kpis">
      <QueueKpi value={totalWaiting} label="Total waiting" />
      <QueueKpi value={urgentCount} label="Urgent" tone="critical" />
      <QueueKpi value={highCount} label="High" tone="warning" />
      <QueueKpi value={modCount} label="Moderate" tone="blue" />
      <QueueKpi value={stableCount} label="Stable" />
      <QueueKpi value={`${avgWait} min`} label="Average wait" />
    </section>

    {/* Capacity constraint banner could be dynamic based on resources:status, mocking if none */}
    {urgentCount > 3 && (
      <section className="capacity-banner">
        <AlertTriangle size={19}/>
        <div><b>High Acuity Load</b><span>There are {urgentCount} urgent patients waiting for resources.</span></div>
        <button>Review resources</button>
      </section>
    )}

    <section className="queue-workspace panel">
      <div className="filter-heading"><div><p className="eyebrow">ACTIVE WORKLIST</p><h2>Priority queue <span className="small-count">{filtered.length}</span></h2></div><button className="filter-button"><SlidersHorizontal size={16}/>Filters</button></div>
      <div className="filters">
        <label className="search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or ID" /></label>
        <Filter label="Department" value={department} setValue={setDepartment} options={['All departments', 'Emergency', 'Cardiology', 'Orthopedics', 'General']} />
        <Filter label="Priority" value={priority} setValue={setPriority} options={['All priorities', 'Urgent', 'High', 'Moderate', 'Stable']} />
      </div>
      <div className="queue-table-wrap">
        <table className="full-queue-table">
          <thead><tr><th>POS.</th><th>PATIENT</th><th>AGE</th><th>DEPARTMENT</th><th>PRIORITY</th><th>PRIORITY SCORE <Info size={12}/></th><th>ARRIVAL</th><th>WAIT</th><th>STATUS</th></tr></thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan="9" style={{textAlign: 'center', padding: '32px'}}>No patients waiting in queue.</td></tr>}
            {filtered.map(p => (
              <tr onClick={() => setSelected(p)} className={current?.id === p.id ? 'selected-row' : ''} key={p.id}>
                <td><strong>#{p.position}</strong></td>
                <td><strong>{p.name}</strong><small>{p.id}</small></td>
                <td>{p.age}</td>
                <td>{p.department}</td>
                <td><PriorityBadge priority={p.priority}/></td>
                <td><span className="score">{p.score}</span></td>
                <td>{p.arrival}</td>
                <td>{p.wait}</td>
                <td><span className={'status'}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="table-footer">Showing {filtered.length} of {totalWaiting} waiting patients</div>
    </section>
    {current && <PatientDrawer patient={current} close={() => setSelected(null)} onFullDetails={onFullDetails} />}
  </div>;
}

function QueueKpi({ value, label, tone = '' }) { return <div className={`queue-kpi ${tone}`}><b>{value}</b><span>{label}</span></div>; }
function Filter({ label, value, setValue, options }) { return <label className="filter-select"><span>{label}</span><div><select value={value} onChange={e => setValue(e.target.value)}>{options.map(v => <option key={v}>{v}</option>)}</select><ChevronDown size={14}/></div></label>; }

function PatientDrawer({ patient, close, onFullDetails }) {
  const urgency = patient.priority.toLowerCase() === 'urgent' ? 85 : patient.priority.toLowerCase() === 'high' ? 65 : 40;
  return <aside className="patient-drawer">
    <div className="drawer-head"><div><p className="eyebrow">PATIENT QUICK VIEW</p><h2>{patient.name}</h2><span>{patient.id} · {patient.age} years · {patient.department}</span></div><button onClick={close}><X size={20}/></button></div>
    <div className="drawer-status"><PriorityBadge priority={patient.priority}/><span>{patient.status}</span></div>
    <div className="drawer-grid">
      <div><span>Queue position</span><b>#{patient.position}</b></div>
      <div><span>Wait time</span><b>{patient.wait}</b></div>
      <div><span>Assigned doctor</span><b>{patient.doctor}</b></div>
      <div><span>Required resource</span><b>{patient.resource}</b></div>
    </div>
    <section className="why">
      <p className="eyebrow">WHY THIS POSITION?</p>
      <h3>Priority score <span>{patient.score}</span></h3>
      <p className="why-copy">This score combines clinical urgency with time spent waiting and current resource scarcity.</p>
      <Score label="Acuity Base" value={Math.min(100, patient.acuityBase * 2)} color="red" text={`+${patient.acuityBase}`} />
      <Score label="Waiting time factor" value={30} color="blue" text="Dynamic" />
      <div className="explanation"><Clock3 size={16}/><span>Dynamic urgency boosts score as patient waits longer.</span></div>
    </section>
    <section className="drawer-notes">
      <p className="eyebrow">ASSESSMENT SUMMARY</p>
      <p>{patient.priority.toLowerCase() === 'urgent' ? 'Requires immediate clinical attention and priority resource allocation.' : 'Awaiting clinical review and resource assignment.'}</p>
      <button onClick={() => onFullDetails(patient)}>View full patient details →</button>
    </section>
  </aside>;
}
function Score({ label, value, color, text }) { return <div className="score-row"><div><span>{label}</span><b>{text}</b></div><div className="score-bar"><i className={color} style={{ width: `${value}%` }} /></div></div>; }
