import React from 'react';
import { Play, RotateCcw, Activity, Clock, Stethoscope, CheckCircle2, AlertCircle } from 'lucide-react';
import { useSimulationSocket } from './hooks/useSimulationSocket';
import './visualizer.css';

const DEPARTMENTS = [
  { key: 'EMERGENCY_ER', label: 'Emergency ER', docLabel: 'ER Doc', color: '#da1e28' },
  { key: 'CARDIOLOGY', label: 'Cardiology', docLabel: 'Cardio Doc', color: '#0f62fe' },
  { key: 'NEUROLOGY', label: 'Neurology', docLabel: 'Neuro Doc', color: '#8a3ff8' },
  { key: 'ORTHOPEDICS', label: 'Orthopedics / Trauma', docLabel: 'Ortho Doc', color: '#007d79' },
  { key: 'GENERAL_SURGERY', label: 'General Surgery', docLabel: 'Surgery Doc', color: '#ee5396' },
  { key: 'PULMONOLOGY', label: 'Pulmonology', docLabel: 'Pulmo Doc', color: '#005d5d' },
  { key: 'PEDIATRICS', label: 'Pediatrics', docLabel: 'Pedia Doc', color: '#1192e8' }
];

const EQUIPMENT_TYPES = [
  { key: 'BED', label: 'Beds' },
  { key: 'VENTILATOR', label: 'Ventilators' },
  { key: 'ECG', label: 'ECG' },
  { key: 'DEFIBRILLATOR', label: 'Defibrillators' },
  { key: 'OXYGEN', label: 'Oxygen' }
];

export default function SimulationVisualizer() {
  const { 
    queue, 
    simState, 
    historyPatients, 
    resourceStatus,
    resourceDetailed,
    activeTreatments: liveActiveTreatments,
    completedPatients: liveCompletedPatients,
    startSimulation, 
    pauseSimulation, 
    resetSimulation 
  } = useSimulationSocket();

  const isRunning = simState?.isRunning || false;
  const simTime = Math.floor(simState?.simTimeMinutes || 0);

  // Set of patient IDs that are currently in any department waiting queue
  const queuedPatientIds = new Set(
    Object.values(queue || {}).flatMap(q => Array.isArray(q) ? q.map(p => p.id) : [])
  );

  // Active treatments (Patients currently in treatment from live RAM socket stream)
  const activeTreatments = (liveActiveTreatments && liveActiveTreatments.length > 0) 
    ? liveActiveTreatments 
    : (historyPatients || []).filter(p => p.status === 'IN_TREATMENT');
  const activePatientIds = new Set(activeTreatments.map(p => p.id));

  // Completed / Discharged Patients from live RAM socket stream
  const completedPatients = (liveCompletedPatients && liveCompletedPatients.length > 0)
    ? liveCompletedPatients
    : (historyPatients || []).filter(p => p.status === 'COMPLETED');
  const completedPatientIds = new Set(completedPatients.map(p => p.id));

  // Extract registered/incoming patients for the Intake Station Box (ONLY future arrivals that have NOT reached arrivalTime yet)
  const incomingPatients = (historyPatients || []).filter(p => {
    const arrTime = p.arrivalTime ?? p.arrival_time ?? 0;
    return arrTime > simTime && p.status === 'REGISTERED';
  });

  // Helper to reliably extract priority score
  const getPatientScore = (p) => {
    if (!p) return '-';
    const rawScore = p.priority_score ?? p.priorityScore ?? p.dynamicPriorityScore ?? p.critical_level ?? p.criticalLevel;
    if (rawScore !== undefined && rawScore !== null && !isNaN(Number(rawScore))) {
      return Number(rawScore).toFixed(1);
    }
    const vitals = typeof p.vitals === 'string' ? JSON.parse(p.vitals) : (p.vitals || {});
    const spo2 = vitals.spo2 || 98;
    const sys = vitals.systolicBP || vitals.bloodPressureSystolic || 120;
    const hr = vitals.heartRate || 75;
    const age = p.age || 40;

    let est = 45;
    if (spo2 < 92) est += 30;
    else if (spo2 < 95) est += 15;
    if (sys < 90 || sys > 180) est += 20;
    if (hr > 110 || hr < 50) est += 15;
    if (age > 65) est += 10;

    return Math.min(99.9, est).toFixed(1);
  };

  // --- Live Resource Calculation Helpers ---
  const getDoctorCounts = (deptKey) => {
    const docs = (resourceDetailed || []).filter(r => r.resourceType === 'DOCTOR' && r.specialization === deptKey);
    if (docs.length > 0) {
      const avail = docs.filter(r => r.status === 'AVAILABLE').length;
      return { avail, total: docs.length };
    }
    const defaultTotals = { EMERGENCY_ER: 3, CARDIOLOGY: 2, NEUROLOGY: 2, ORTHOPEDICS: 2, GENERAL_SURGERY: 2, PULMONOLOGY: 1, PEDIATRICS: 1 };
    const tot = defaultTotals[deptKey] || 2;
    return { avail: tot, total: tot };
  };

  const getNursesCounts = () => {
    const nurses = (resourceDetailed || []).filter(r => r.resourceType === 'NURSE');
    if (nurses.length > 0) {
      const avail = nurses.filter(r => r.status === 'AVAILABLE').length;
      return { avail, total: nurses.length };
    }
    return { avail: 8, total: 10 };
  };

  const getEquipmentCounts = (typeKey) => {
    const items = (resourceDetailed || []).filter(r => 
      r.resourceType === typeKey || 
      (r.resourceType === 'EQUIPMENT' && r.specialization === typeKey) ||
      (typeKey === 'BED' && (r.resourceType === 'BED' || r.resourceType === 'ICU_BED'))
    );
    if (items.length > 0) {
      const avail = items.filter(r => r.status === 'AVAILABLE').length;
      return { avail, total: items.length };
    }
    const defaultTotals = { BED: 15, VENTILATOR: 4, ECG: 5, DEFIBRILLATOR: 3, OXYGEN: 10 };
    const tot = defaultTotals[typeKey] || 5;
    return { avail: tot, total: tot };
  };

  const nurseStats = getNursesCounts();

  return (
    <div className="visualizer-page-compact">
      {/* 1. STANDALONE TOP HEADER BAR */}
      <header className="visualizer-top-header panel">
        <div className="header-title-clean">
          <h2>Simulation Visualizer</h2>
        </div>

        <div className="visualizer-controls-compact">
          <div className="sim-time-badge-compact">
            <Clock size={13}/>
            <span>Time: <b>{simTime} min</b></span>
            <span className={`status-pill ${isRunning ? 'running' : 'paused'}`}>
              {isRunning ? 'RUNNING' : 'PAUSED'}
            </span>
          </div>

          <div className="button-group-compact">
            {!isRunning ? (
              <button className="btn-start-compact" onClick={startSimulation}>
                <Play size={13}/> Start
              </button>
            ) : (
              <button className="btn-pause-compact" onClick={pauseSimulation}>
                <Clock size={13}/> Pause
              </button>
            )}

            <button className="btn-reset-compact" onClick={resetSimulation}>
              <RotateCcw size={13}/> Reset
            </button>
          </div>
        </div>
      </header>

      {/* 2. UNIFORM HOSPITAL RESOURCE INVENTORY PANEL */}
      <section className="resource-inventory-strip panel">
        <div className="inventory-group">
          <div className="group-label">
            <Stethoscope size={13} color="#0f62fe" />
            <span>Doctors:</span>
          </div>
          <div className="badges-inline">
            {DEPARTMENTS.map(dept => {
              const counts = getDoctorCounts(dept.key);
              const isFull = counts.avail === counts.total;
              return (
                <div key={dept.key} className={`resource-badge doctor-badge ${!isFull ? 'in-use' : ''}`}>
                  <span className="badge-name">{dept.docLabel}</span>
                  <span className="badge-value"><b>{counts.avail}</b>/{counts.total}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="inventory-group">
          <div className="group-label">
            <Activity size={13} color="#007d79" />
            <span>Resources:</span>
          </div>
          <div className="badges-inline">
            <div className={`resource-badge ${nurseStats.avail < nurseStats.total ? 'in-use' : ''}`}>
              <span className="badge-name">Nurses Pool</span>
              <span className="badge-value"><b>{nurseStats.avail}</b>/{nurseStats.total}</span>
            </div>
            {EQUIPMENT_TYPES.map(eq => {
              const counts = getEquipmentCounts(eq.key);
              const isFull = counts.avail === counts.total;
              return (
                <div key={eq.key} className={`resource-badge ${!isFull ? 'in-use' : ''}`}>
                  <span className="badge-name">{eq.label}</span>
                  <span className="badge-value"><b>{counts.avail}</b>/{counts.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. PATIENT INTAKE STATION */}
      <section className="intake-station-panel panel">
        <div className="intake-header-line">
          <div className="intake-title">
            <Activity size={14} color="#0f62fe"/>
            <span><b>Intake Station:</b> ({incomingPatients.length} Incoming)</span>
          </div>
          {incomingPatients.length === 0 && (
            <span className="intake-empty-txt">No incoming patients scheduled.</span>
          )}
        </div>

        {incomingPatients.length > 0 && (
          <div className="intake-chips-container">
            {incomingPatients.map(p => (
              <div key={p.id} className="intake-patient-chip">
                <span className="chip-id">{p.id}</span>
                <span className="chip-score">{getPatientScore(p)}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. DEPARTMENT WAITING QUEUE TRACKS (14 SLOTS EACH) */}
      <section className="queues-tracks-section panel">
        <div className="queues-tracks-container">
          {DEPARTMENTS.map(dept => {
            const deptQueueList = queue?.[dept.key] || [];
            const waitingCount = deptQueueList.length;

            return (
              <div key={dept.key} className="department-track-row">
                <div className="track-dept-header">
                  <span className="dept-title-text">{dept.label}</span>
                  <span className="dept-wait-count">{waitingCount} Waiting</span>
                </div>

                <div className="track-slots-wrapper">
                  {(() => {
                    const slots = [];
                    for (let i = 0; i < 14; i++) {
                      const patient = deptQueueList[i];
                      if (patient) {
                        slots.push(
                          <div key={patient.id} className="patient-slot-card filled">
                            <div className="slot-index">[{i}]</div>
                            <b className="p-id">{patient.id}</b>
                            <span className="p-score">{getPatientScore(patient)}</span>
                          </div>
                        );
                      } else {
                        slots.push(
                          <div key={`empty-${i}`} className="patient-slot-card empty">
                            <div className="slot-index">[{i}]</div>
                            <span className="dot">-</span>
                          </div>
                        );
                      }
                    }
                    return slots;
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. 7 VERTICAL ACTIVE TREATMENT COLUMNS */}
      <section className="treatment-columns-section panel">
        <div className="section-header-compact">
          <Stethoscope size={13} />
          <span><b>Active Treatment Columns</b> (Live In-Treatment Work by Department)</span>
        </div>

        <div className="treatment-columns-grid">
          {DEPARTMENTS.map(dept => {
            const deptTreatments = activeTreatments.filter(p => p.department === dept.key);

            return (
              <div key={dept.key} className="treatment-column-card" style={{ borderTopColor: dept.color }}>
                <div className="column-title-bar">
                  <span className="column-name">{dept.docLabel}</span>
                  <span className="column-count-badge">{deptTreatments.length} Active</span>
                </div>

                <div className="column-treatments-list">
                  {deptTreatments.length === 0 ? (
                    <div className="empty-column-txt">No active treatment</div>
                  ) : (
                    deptTreatments.map(p => {
                      const startTime = p.treatmentStartTime || p.treatment_start_time || simTime;
                      const duration = p.treatmentDuration || p.treatment_duration || 30;
                      const endTime = p.treatmentEndTime || p.treatment_end_time || (startTime + duration);
                      const remaining = Math.max(0, endTime - simTime);
                      const progressPct = Math.min(100, Math.max(0, Math.round(((simTime - startTime) / duration) * 100)));

                      const resIds = p.allocatedResourceIds || [];
                      const docRes = resIds.find(id => id.startsWith('DOC-')) || `${dept.docLabel}-1`;
                      const bedRes = resIds.find(id => id.startsWith('BED-') || id.startsWith('ICU-')) || 'BED-01';

                      return (
                        <div key={p.id} className="active-patient-card">
                          <div className="card-top-info">
                            <b className="p-id">{p.id}</b>
                            <span className="p-name">{p.name}</span>
                          </div>
                          <div className="card-resource-tags">
                            <span className="tag-doc">🩺 {docRes} (1x)</span>
                            <span className="tag-bed">🛏️ {bedRes} (1x)</span>
                          </div>
                          <div className="card-timer-bar">
                            <div className="timer-text">
                              <Clock size={9}/> {remaining}m left
                            </div>
                            <div className="progress-bg">
                              <div className="progress-fill" style={{ width: `${progressPct}%` }}></div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. NEW: COMPLETED / DISCHARGED PATIENTS TRACK */}
      <section className="completed-track-section panel">
        <div className="completed-label-compact">
          <CheckCircle2 size={13} color="#166534" />
          <span><b>Completed & Discharged Patients:</b> ({completedPatients.length} Discharged)</span>
        </div>

        <div className="completed-chips-list">
          {completedPatients.length === 0 ? (
            <span className="empty-completed-txt">No patients completed yet.</span>
          ) : (
            completedPatients.map(p => (
              <div key={p.id} className="completed-chip">
                <CheckCircle2 size={10} color="#166534"/>
                <b className="comp-id">{p.id}</b>
                <span className="comp-name">{p.name}</span>
                <span className="comp-dept">{p.department}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
