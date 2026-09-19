import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Clock3, Info, Search, SlidersHorizontal, X } from 'lucide-react';
import './queue.css';

const morePatients = [
  { position: 6, name: 'Isha Nair', id: 'PT-2058', age: 56, department: 'Cardiology', priority: 'Moderate', arrival: '10:18', wait: '06 min', doctor: '—', resource: 'Doctor', status: 'Waiting', score: 55.2 },
  { position: 7, name: 'Kabir Singh', id: 'PT-2038', age: 36, department: 'General', priority: 'Stable', arrival: '09:38', wait: '46 min', doctor: '—', resource: 'General Bed', status: 'Waiting', score: 42.1 }
];

function PriorityBadge({ priority }) { return <span className={`priority ${priority.toLowerCase()}`}>{priority}</span>; }

export default function LiveQueue({ patients, strategy, onFullDetails }) {
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('All departments');
  const [priority, setPriority] = useState('All priorities');
  const [resource, setResource] = useState('All resources');
  const [selected, setSelected] = useState(null);
  const allPatients = [...patients.map((p, i) => ({ ...p, age: [68, 45, 37, 29, 59][i], arrival: ['09:46', '09:51', '09:33', '10:02', '09:22'][i], doctor: ['—', '—', '—', 'Dr. Williams', '—'][i] })), ...morePatients];
  const filtered = useMemo(() => allPatients.filter(p => {
    const term = search.toLowerCase();
    return (!term || p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term)) &&
      (department === 'All departments' || p.department === department) &&
      (priority === 'All priorities' || p.priority === priority) &&
      (resource === 'All resources' || p.resource === resource);
  }), [search, department, priority, resource]);
  const current = selected && allPatients.find(p => p.id === selected.id);

  return <div className="queue-page">
    <section className="queue-intro">
      <div><p className="eyebrow">SCHEDULING ENGINE</p><h2>Patients awaiting allocation</h2><p className="queue-copy">Live ordering updates as the active strategy evaluates urgency, waiting time, and resource availability.</p></div>
      <div className="queue-live"><span className="live-dot"/>QUEUE LIVE <span>Last update: just now</span></div>
    </section>

    <section className="queue-kpis">
      <QueueKpi value="24" label="Total waiting" /><QueueKpi value="6" label="Urgent" tone="critical" />
      <QueueKpi value="8" label="High" tone="warning" /><QueueKpi value="7" label="Moderate" tone="blue" />
      <QueueKpi value="3" label="Stable" /><QueueKpi value="14 min" label="Average wait" />
    </section>

    <section className="capacity-banner"><AlertTriangle size={19}/><div><b>ICU capacity constraint</b><span>ICU is at 92% capacity — 1 urgent patient is waiting for an ICU bed.</span></div><button>Review constraint</button></section>

    <section className="queue-workspace panel">
      <div className="filter-heading"><div><p className="eyebrow">ACTIVE WORKLIST</p><h2>Priority queue <span className="small-count">{filtered.length}</span></h2></div><button className="filter-button"><SlidersHorizontal size={16}/>Filters</button></div>
      <div className="filters">
        <label className="search"><Search size={17}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient or ID" /></label>
        <Filter label="Department" value={department} setValue={setDepartment} options={['All departments', 'Emergency', 'Cardiology', 'Orthopedics', 'General']} />
        <Filter label="Priority" value={priority} setValue={setPriority} options={['All priorities', 'Urgent', 'High', 'Moderate', 'Stable']} />
        <Filter label="Resource needed" value={resource} setValue={setResource} options={['All resources', 'ICU Bed', 'Doctor', 'General Bed']} />
      </div>
      <div className="queue-table-wrap"><table className="full-queue-table"><thead><tr><th>POS.</th><th>PATIENT</th><th>AGE</th><th>DEPARTMENT</th><th>PRIORITY</th><th>PRIORITY SCORE <Info size={12}/></th><th>ARRIVAL</th><th>WAIT</th><th>DOCTOR</th><th>RESOURCE</th><th>STATUS</th></tr></thead>
        <tbody>{filtered.map(p => <tr onClick={() => setSelected(p)} className={current?.id === p.id ? 'selected-row' : ''} key={p.id}><td><strong>#{p.position}</strong></td><td><strong>{p.name}</strong><small>{p.id}</small></td><td>{p.age}</td><td>{p.department}</td><td><PriorityBadge priority={p.priority}/></td><td><span className="score">{p.score}</span></td><td>{p.arrival}</td><td>{p.wait}</td><td>{p.doctor}</td><td>{p.resource}{p.status === 'Awaiting bed' && <small className="blocked">Waiting on ICU bed</small>}</td><td><span className={p.status === 'Awaiting bed' ? 'status caution' : p.status === 'Assigned' ? 'status assigned' : 'status'}>{p.status}</span></td></tr>)}</tbody></table></div>
      <div className="table-footer">Showing {filtered.length} of 24 waiting patients <span>Active strategy: <b>{strategy}</b></span></div>
    </section>
    {current && <PatientDrawer patient={current} close={() => setSelected(null)} onFullDetails={onFullDetails} />}
  </div>;
}

function QueueKpi({ value, label, tone = '' }) { return <div className={`queue-kpi ${tone}`}><b>{value}</b><span>{label}</span></div>; }
function Filter({ label, value, setValue, options }) { return <label className="filter-select"><span>{label}</span><div><select value={value} onChange={e => setValue(e.target.value)}>{options.map(v => <option key={v}>{v}</option>)}</select><ChevronDown size={14}/></div></label>; }

function PatientDrawer({ patient, close, onFullDetails }) {
  const urgency = patient.priority === 'Urgent' ? 76 : patient.priority === 'High' ? 59 : 38;
  return <aside className="patient-drawer"><div className="drawer-head"><div><p className="eyebrow">PATIENT QUICK VIEW</p><h2>{patient.name}</h2><span>{patient.id} · {patient.age} years · {patient.department}</span></div><button onClick={close}><X size={20}/></button></div>
    <div className="drawer-status"><PriorityBadge priority={patient.priority}/><span>{patient.status}</span></div>
    <div className="drawer-grid"><div><span>Queue position</span><b>#{patient.position}</b></div><div><span>Wait time</span><b>{patient.wait}</b></div><div><span>Assigned doctor</span><b>{patient.doctor}</b></div><div><span>Required resource</span><b>{patient.resource}</b></div></div>
    <section className="why"><p className="eyebrow">WHY THIS POSITION?</p><h3>Priority score <span>{patient.score}</span></h3><p className="why-copy">This score combines clinical urgency with time spent waiting and current resource scarcity.</p><Score label="Urgency" value={urgency} color="red" text={`+${urgency}`} /><Score label="Waiting time" value={18} color="blue" text="+18.5" /><Score label="Resource scarcity" value={patient.resource === 'ICU Bed' ? 10 : 4} color="amber" text={patient.resource === 'ICU Bed' ? '+10' : '+4'} />
      <div className="explanation"><Clock3 size={16}/><span>{patient.resource === 'ICU Bed' ? 'ICU availability is below 10% — scarcity boost applied.' : `Boosted for ${patient.wait} in queue.`}</span></div>
    </section>
    <section className="drawer-notes"><p className="eyebrow">ASSESSMENT SUMMARY</p><p>{patient.priority === 'Urgent' ? 'Requires immediate clinical attention and priority resource allocation.' : 'Awaiting clinical review and resource assignment.'}</p><button onClick={() => onFullDetails(patient)}>View full patient details →</button></section>
  </aside>;
}
function Score({ label, value, color, text }) { return <div className="score-row"><div><span>{label}</span><b>{text}</b></div><div className="score-bar"><i className={color} style={{ width: `${value}%` }} /></div></div>; }
