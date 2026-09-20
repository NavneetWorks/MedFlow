import React, { useMemo, useState } from 'react';
import { AlertTriangle, ChevronDown, Clock3, Info, Search, SlidersHorizontal, X } from 'lucide-react';
import { useSimulationSocket } from './hooks/useSimulationSocket';
import './queue.css';

function PriorityBadge({ priority }) { return <span className={`priority ${priority.toLowerCase()}`}>{priority}</span>; }

const DEPARTMENTS = [
  { key: 'EMERGENCY_ER', label: 'Emergency ER', color: '#da1e28' },
  { key: 'CARDIOLOGY', label: 'Cardiology', color: '#0f62fe' },
  { key: 'NEUROLOGY', label: 'Neurology', color: '#8a3ff8' },
  { key: 'ORTHOPEDICS', label: 'Orthopedics / Trauma', color: '#007d79' },
  { key: 'GENERAL_SURGERY', label: 'General Surgery', color: '#ee5396' },
  { key: 'PULMONOLOGY', label: 'Pulmonology', color: '#005d5d' },
  { key: 'PEDIATRICS', label: 'Pediatrics', color: '#1192e8' }
];

export default function LiveQueue({ onFullDetails }) {
  const { queue, activeTreatments, simState } = useSimulationSocket();
  
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState('All priorities');
  const [viewMode, setViewMode] = useState('tracks'); // 'tracks' | 'table'
  const [selected, setSelected] = useState(null);

  // Flatten and process queue data from backend RAM + active treatments
  const allPatients = useMemo(() => {
    let patients = [];
    
    // Map of active treatments for quick lookup
    const activeMap = new Map();
    if (Array.isArray(activeTreatments)) {
      activeTreatments.forEach(ap => activeMap.set(ap.id, ap));
    }

    if (queue) {
      Object.keys(queue).forEach(dept => {
        const list = Array.isArray(queue[dept]) ? queue[dept] : [];
        list.forEach(p => {
          const scoreVal = typeof p.priorityScore === 'number' ? p.priorityScore : (p.dynamicPriorityScore || 0);
          const waitMins = typeof p.waitingMinutes === 'number' ? p.waitingMinutes : (p.waitTime || 0);
          const crit = typeof p.criticalLevel === 'number' ? p.criticalLevel : (p.acuityScore || 0);
          
          const waitStr = waitMins > 60 
            ? `${Math.floor(waitMins/60)}h ${Math.floor(waitMins%60)}m` 
            : `${Math.floor(waitMins)} min`;
          
          let prioLabel = 'Stable';
          if (crit >= 75 || scoreVal >= 70) prioLabel = 'Urgent';
          else if (crit >= 50 || scoreVal >= 50) prioLabel = 'High';
          else if (crit >= 25 || scoreVal >= 25) prioLabel = 'Moderate';

          const activeInfo = activeMap.get(p.id);

          patients.push({
            id: p.id || '—',
            name: p.name || 'Unknown',
            age: p.age ?? '—',
            department: p.department || dept,
            priority: prioLabel,
            arrival: typeof p.arrivalTime === 'number' ? `Min ${p.arrivalTime}` : (p.arrivalTime || 'Just now'),
            wait: waitStr,
            waitTime: waitMins,
            doctor: activeInfo?.allocatedResourceIds?.find(id => id.startsWith('DOC-')) || 'Waiting Allocation',
            resource: Array.isArray(p.requiredResources) && p.requiredResources.length > 0 
              ? p.requiredResources.map(r => typeof r === 'string' ? r : r.resourceType).join(', ')
              : 'Bed + Doctor',
            status: activeInfo ? 'IN_TREATMENT' : (p.status || 'WAITING'),
            score: scoreVal.toFixed(1),
            originalScore: scoreVal,
            acuityBase: crit
          });
        });
      });
    }
    patients.sort((a, b) => b.originalScore - a.originalScore);
    patients.forEach((p, i) => p.position = i + 1);
    return patients;
  }, [queue, activeTreatments]);

  const filtered = useMemo(() => allPatients.filter(p => {
    const term = search.toLowerCase();
    return (!term || p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term)) &&
      (priority === 'All priorities' || p.priority.toLowerCase() === priority.toLowerCase());
  }), [search, priority, allPatients]);
  
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
      <div>
        <p className="eyebrow">LIVE SCHEDULING ENGINE</p>
        <h2>Real-Time Department Queues</h2>
        <p className="queue-copy">
          Live priority queue tracks for all 7 hospital departments updating on every tick. Patient positions adjust automatically based on priority scores.
        </p>
      </div>
      <div className="queue-live">
        <span className="live-dot"/>QUEUE LIVE <span>Simulation Time: {Math.floor(simState?.simTimeMinutes || 0)} min</span>
      </div>
    </section>

    <section className="queue-kpis">
      <QueueKpi value={totalWaiting} label="Total waiting" />
      <QueueKpi value={urgentCount} label="Urgent" tone="critical" />
      <QueueKpi value={highCount} label="High" tone="warning" />
      <QueueKpi value={modCount} label="Moderate" tone="blue" />
      <QueueKpi value={stableCount} label="Stable" />
      <QueueKpi value={`${avgWait} min`} label="Average wait" />
    </section>

    {urgentCount > 3 && (
      <section className="capacity-banner">
        <AlertTriangle size={19}/>
        <div><b>High Acuity Load</b><span>There are {urgentCount} urgent patients waiting for resources across departments.</span></div>
      </section>
    )}

    <section className="queue-workspace panel">
      <div className="filter-heading">
        <div>
          <p className="eyebrow">ACTIVE WORKLIST</p>
          <h2>All Department Queues <span className="small-count">{totalWaiting} Patients</span></h2>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="view-toggle-btns">
            <button className={`view-toggle-btn ${viewMode === 'tracks' ? 'active' : ''}`} onClick={() => setViewMode('tracks')}>
              Tracks View
            </button>
            <button className={`view-toggle-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}>
              Table View
            </button>
          </div>
        </div>
      </div>

      <div className="filters">
        <label className="search">
          <Search size={17}/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient name or ID (e.g. P1, P2)" />
        </label>
        <Filter label="Priority" value={priority} setValue={setPriority} options={['All priorities', 'Urgent', 'High', 'Moderate', 'Stable']} />
      </div>

      {viewMode === 'tracks' ? (
        <div className="dept-lanes-container">
          {DEPARTMENTS.map(dept => {
            const deptPatients = filtered.filter(p => p.department === dept.key);
            const deptAvgWait = deptPatients.length > 0 
              ? Math.floor(deptPatients.reduce((a, b) => a + b.waitTime, 0) / deptPatients.length)
              : 0;
            const topScore = deptPatients.length > 0 ? deptPatients[0].score : '—';

            return (
              <div className="dept-lane-card" key={dept.key} style={{ borderLeftColor: dept.color }}>
                <div className="dept-lane-header">
                  <div className="dept-title-wrap">
                    <h3>{dept.label}</h3>
                    <span className="dept-badge">{deptPatients.length} Waiting</span>
                  </div>
                  <div className="dept-stats-summary">
                    <span>Avg Wait: <b>{deptAvgWait} min</b></span>
                    <span>Top Score: <b>{topScore}</b></span>
                  </div>
                </div>

                <div className="horizontal-track-wrapper">
                  <div className="horizontal-track">
                    {(() => {
                      const totalSlots = Math.max(6, deptPatients.length + 2);
                      const slots = [];
                      for (let i = 0; i < totalSlots; i++) {
                        const p = deptPatients[i];
                        if (p) {
                          slots.push(
                            <div 
                              key={p.id} 
                              className={`patient-card-box ${current?.id === p.id ? 'selected-card' : ''}`}
                              onClick={() => setSelected(p)}
                            >
                              <div className="slot-index-tag">Slot [{i}]</div>
                              <div className="card-top-row">
                                <span className="patient-id-badge">{p.id}</span>
                                <PriorityBadge priority={p.priority} />
                              </div>
                              
                              <div className="card-patient-name">{p.name}</div>
                              <div className="card-patient-meta">Age: {p.age}y · Pos: #{p.position}</div>

                              <div className="card-bottom-row">
                                <div className="card-score-pill">
                                  <span>Score</span>
                                  <b>{p.score}</b>
                                </div>
                                <div className="card-wait-time">
                                  <Clock3 size={12}/> {p.wait}
                                </div>
                              </div>
                            </div>
                          );
                        } else {
                          slots.push(
                            <div key={`empty-slot-${dept.key}-${i}`} className="empty-slot-box">
                              <div className="slot-index-tag">Slot [{i}]</div>
                              <div className="empty-slot-label">Empty Slot</div>
                              <div className="empty-slot-status">Awaiting Patient</div>
                            </div>
                          );
                        }
                      }
                      return slots;
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="queue-table-wrap" style={{ marginTop: '16px' }}>
          <table className="full-queue-table">
            <thead>
              <tr>
                <th>POS.</th>
                <th>PATIENT</th>
                <th>AGE</th>
                <th>DEPARTMENT</th>
                <th>PRIORITY</th>
                <th>PRIORITY SCORE <Info size={12}/></th>
                <th>ARRIVAL</th>
                <th>WAIT</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px' }}>
                    No patients waiting in queue.
                  </td>
                </tr>
              )}
              {filtered.map(p => (
                <tr onClick={() => setSelected(p)} className={current?.id === p.id ? 'selected-row' : ''} key={p.id}>
                  <td><strong>#{p.position}</strong></td>
                  <td><strong>{p.name}</strong><small style={{ display: 'block', color: '#6f6f6f' }}>{p.id}</small></td>
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
      )}

      <div className="table-footer">
        Showing {filtered.length} of {totalWaiting} waiting patients across 7 department queues
      </div>
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
