import React, { useState, useEffect } from 'react';
import { 
  Users, Activity, Clock3, Send, Plus, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import socket from './services/socketManager';
import './setup.css';

const DEPARTMENTS = [
  'EMERGENCY_ER', 'CARDIOLOGY', 'NEUROLOGY', 'ORTHOPEDICS', 
  'GENERAL_SURGERY', 'PULMONOLOGY', 'PEDIATRICS'
];

function PatientSetup({ onDeploy, historyPatients, setHistoryPatients }) {
  const [stagedPatients, setStagedPatients] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [toast, setToast] = useState(null); // { message, type: 'success' | 'error' }

  useEffect(() => {
    const handleHistory = (data) => setHistoryPatients(data);
    socket.on('patients:history_response', handleHistory);
    
    // Only fetch if empty to prevent flashing on page switch
    if (!historyPatients || historyPatients.length === 0) {
      socket.emit('patients:history_request');
    }

    return () => socket.off('patients:history_response', handleHistory);
  }, [historyPatients, setHistoryPatients]);
  
  // Form State
  const [basicInfo, setBasicInfo] = useState({
    name: '', age: 30, department: '', arrivalTime: 0, 
    treatmentDuration: 30, deteriorationRate: 15
  });

  const [vitals, setVitals] = useState({
    respirationRate: 16, spo2: 98, onSupplementalOxygen: false,
    systolicBP: 120, pulseRate: 75, consciousness: 'ALERT', temperature: 37.0
  });

  // Symptom States
  const [cardioSymptoms, setCardioSymptoms] = useState({
    chestPainSeverity: 0, painRadiation: 'NONE', shortnessOfBreath: 'NONE',
    coldSweating: false, dizzinessOrFainting: false
  });

  const [neuroSymptoms, setNeuroSymptoms] = useState({
    confusionOrDisorientation: false, facialAsymmetry: false, speechSlurring: false,
    limbWeakness: 'NONE', severeSuddenHeadache: false
  });

  const [pulmoSymptoms, setPulmoSymptoms] = useState({
    breathingDifficulty: 'NORMAL', coughSeverity: 'NONE', wheezingOrStridor: false,
    cyanosisLipBlueness: false, hasHistoryOfCOPD: false
  });

  const [traumaSymptoms, setTraumaSymptoms] = useState({
    visibleBleeding: 'NONE', painSeverity: 0, mobilityStatus: 'WALKING',
    visibleDeformityOrSwelling: false
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const getMaxId = () => {
    let max = 0;
    const all = [...historyPatients, ...stagedPatients];
    for (const p of all) {
      if (p.id && p.id.startsWith('P')) {
        const num = parseInt(p.id.substring(1), 10);
        if (!isNaN(num) && num > max) max = num;
      }
    }
    return max;
  };

  const handleAddPatient = () => {
    if (!basicInfo.name) {
      showToast("Please enter a patient name", "error");
      return;
    }
    if (!basicInfo.department) {
      showToast("Please select a department", "error");
      return;
    }

    const nextId = `P${getMaxId() + 1}`;

    const newPatient = {
      id: nextId,
      name: basicInfo.name,
      age: parseInt(basicInfo.age),
      department: basicInfo.department,
      arrivalTime: Number(basicInfo.arrivalTime),
      treatmentDuration: Number(basicInfo.treatmentDuration),
      deteriorationRate: Number(basicInfo.deteriorationRate),
      vitals: { ...vitals, 
        respirationRate: Number(vitals.respirationRate),
        spo2: Number(vitals.spo2),
        systolicBP: Number(vitals.systolicBP),
        pulseRate: Number(vitals.pulseRate),
        temperature: Number(vitals.temperature)
      }
    };

    if (basicInfo.department === 'CARDIOLOGY') {
      newPatient.cardiologySymptoms = { ...cardioSymptoms, chestPainSeverity: Number(cardioSymptoms.chestPainSeverity) };
    } else if (basicInfo.department === 'NEUROLOGY') {
      newPatient.neurologySymptoms = neuroSymptoms;
    } else if (basicInfo.department === 'PULMONOLOGY') {
      newPatient.pulmonologySymptoms = pulmoSymptoms;
    } else if (['ORTHOPEDICS', 'EMERGENCY_ER', 'GENERAL_SURGERY'].includes(basicInfo.department)) {
      newPatient.traumaSymptoms = { ...traumaSymptoms, painSeverity: Number(traumaSymptoms.painSeverity) };
    }

    setStagedPatients([...stagedPatients, newPatient]);
    
    // Reset basic info for next patient, keep vitals mostly as defaults
    setBasicInfo({ ...basicInfo, name: '', arrivalTime: Number(basicInfo.arrivalTime) + 5 });
  };

  const handleDeploy = () => {
    if (stagedPatients.length === 0) return;
    
    // Connect to socket and emit scheduled patients
    socket.emit('patients:schedule', stagedPatients);
    
    // Create a one-time listener for the response
    const handleResponse = (response) => {
      if (response.success) {
        showToast(`Successfully deployed ${stagedPatients.length} patients to Backend Buffer!`, 'success');
        setStagedPatients([]); // clear the list
        // Explicitly NOT calling onDeploy() so the user stays on this page and sees real-time updates
      } else {
        showToast("Error deploying patients: " + response.error, 'error');
      }
      socket.off('patients:schedule_response', handleResponse);
    };
    
    socket.on('patients:schedule_response', handleResponse);
  };

  return (
    <div className="setup-page">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.type === 'success' ? <Activity size={16} /> : <AlertTriangle size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      <div className="setup-intro">
        <h2>Patient Intake Form</h2>
        <p>Configure patient clinical details and arrival timeline before starting the simulation.</p>
      </div>

      <div className="setup-grid">
        {/* Left Column: Entry Form */}
        <div className="setup-card">
          <h3><Plus size={16} className="inline-icon" /> New Patient Entry</h3>
          
          <div className="form-row">
            <div>
              <label className="form-label">Patient Name</label>
              <input type="text" className="form-input" value={basicInfo.name} onChange={e => setBasicInfo({...basicInfo, name: e.target.value})} placeholder="e.g. John Doe" />
            </div>
            <div>
              <label className="form-label">Age</label>
              <input type="number" className="form-input" value={basicInfo.age} onChange={e => setBasicInfo({...basicInfo, age: e.target.value})} />
            </div>
          </div>

          <div className="form-row">
            <div>
              <label className="form-label">Department</label>
              <select className="form-select" value={basicInfo.department} onChange={e => setBasicInfo({...basicInfo, department: e.target.value})}>
                <option value="" disabled>--- Select Department ---</option>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Arrival Time (sim mins)</label>
              <input type="number" className="form-input" value={basicInfo.arrivalTime} onChange={e => setBasicInfo({...basicInfo, arrivalTime: e.target.value})} />
            </div>
          </div>

          {basicInfo.department && (
            <>
              <div className="section-title"><Activity size={14} className="inline-icon" /> Core Vitals</div>
              <div className="form-row">
            <div>
              <label className="form-label">SpO2 (%)</label>
              <input type="number" className="form-input" value={vitals.spo2} onChange={e => setVitals({...vitals, spo2: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Pulse (bpm)</label>
              <input type="number" className="form-input" value={vitals.pulseRate} onChange={e => setVitals({...vitals, pulseRate: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Sys BP</label>
              <input type="number" className="form-input" value={vitals.systolicBP} onChange={e => setVitals({...vitals, systolicBP: e.target.value})} />
            </div>
          </div>
          <div className="form-row">
            <div>
              <label className="form-label">Resp Rate</label>
              <input type="number" className="form-input" value={vitals.respirationRate} onChange={e => setVitals({...vitals, respirationRate: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Temp (°C)</label>
              <input type="number" className="form-input" step="0.1" value={vitals.temperature} onChange={e => setVitals({...vitals, temperature: e.target.value})} />
            </div>
            <div>
              <label className="form-label">Consciousness</label>
              <select className="form-select" value={vitals.consciousness} onChange={e => setVitals({...vitals, consciousness: e.target.value})}>
                <option value="ALERT">Alert</option>
                <option value="CONFUSION">Confusion</option>
                <option value="VOICE">Voice</option>
                <option value="PAIN">Pain</option>
                <option value="UNRESPONSIVE">Unresponsive</option>
              </select>
            </div>
          </div>

          {basicInfo.department === 'CARDIOLOGY' && (
            <>
              <div className="section-title"><AlertTriangle size={14} className="inline-icon" /> Cardiology Symptoms</div>
              <div className="form-row">
                <div>
                  <label className="form-label">Chest Pain (0-10)</label>
                  <input type="number" className="form-input" value={cardioSymptoms.chestPainSeverity} onChange={e => setCardioSymptoms({...cardioSymptoms, chestPainSeverity: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Pain Radiation</label>
                  <select className="form-select" value={cardioSymptoms.painRadiation} onChange={e => setCardioSymptoms({...cardioSymptoms, painRadiation: e.target.value})}>
                    <option value="NONE">None</option>
                    <option value="ARM_JAW_BACK">Arm/Jaw/Back</option>
                  </select>
                </div>
              </div>
              <label className="form-checkbox">
                <input type="checkbox" checked={cardioSymptoms.coldSweating} onChange={e => setCardioSymptoms({...cardioSymptoms, coldSweating: e.target.checked})} /> Cold Sweating
              </label>
            </>
          )}

          {basicInfo.department === 'NEUROLOGY' && (
            <>
              <div className="section-title"><AlertTriangle size={14} className="inline-icon" /> Neurology Symptoms</div>
              <div className="form-row">
                <div>
                  <label className="form-label">Limb Weakness</label>
                  <select className="form-select" value={neuroSymptoms.limbWeakness} onChange={e => setNeuroSymptoms({...neuroSymptoms, limbWeakness: e.target.value})}>
                    <option value="NONE">None</option>
                    <option value="ONE_SIDE">One Side</option>
                    <option value="BOTH_SIDES">Both Sides</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <label className="form-checkbox">
                  <input type="checkbox" checked={neuroSymptoms.facialAsymmetry} onChange={e => setNeuroSymptoms({...neuroSymptoms, facialAsymmetry: e.target.checked})} /> Facial Droop
                </label>
                <label className="form-checkbox">
                  <input type="checkbox" checked={neuroSymptoms.speechSlurring} onChange={e => setNeuroSymptoms({...neuroSymptoms, speechSlurring: e.target.checked})} /> Slurred Speech
                </label>
              </div>
            </>
          )}

          {/* Fallback for Trauma/Ortho/ER */}
          {['ORTHOPEDICS', 'EMERGENCY_ER', 'GENERAL_SURGERY'].includes(basicInfo.department) && (
            <>
              <div className="section-title"><AlertTriangle size={14} className="inline-icon" /> Trauma Symptoms</div>
              <div className="form-row">
                <div>
                  <label className="form-label">Visible Bleeding</label>
                  <select className="form-select" value={traumaSymptoms.visibleBleeding} onChange={e => setTraumaSymptoms({...traumaSymptoms, visibleBleeding: e.target.value})}>
                    <option value="NONE">None</option>
                    <option value="MINOR">Minor</option>
                    <option value="SEVERE_HEMORRHAGE">Severe Hemorrhage</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Mobility Status</label>
                  <select className="form-select" value={traumaSymptoms.mobilityStatus} onChange={e => setTraumaSymptoms({...traumaSymptoms, mobilityStatus: e.target.value})}>
                    <option value="WALKING">Walking</option>
                    <option value="LIMPING">Limping</option>
                    <option value="IMMOBILE_STRETCHER">Immobile / Stretcher</option>
                  </select>
                </div>
              </div>
            </>
          )}

          <button className="btn-add" onClick={handleAddPatient}>
            <Plus size={16} /> Add to Timeline
          </button>
            </>
          )}
        </div>

        {/* Right Column: Staged Timeline */}
        <div className="setup-card">
          <h3><Clock3 size={16} className="inline-icon" /> Scheduled Roster ({stagedPatients.length})</h3>
          
          {stagedPatients.length === 0 ? (
            <div className="empty-state">
              No patients staged yet.<br/>Configure patients on the left to build your simulation timeline.
            </div>
          ) : (
            <div className="staged-list">
              {stagedPatients.slice().sort((a,b) => a.arrivalTime - b.arrivalTime).map((p) => {
                const isExpanded = expandedId === p.id;
                return (
                  <div key={p.id} className="staged-item">
                    <div className="staged-header" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                      <div className="staged-title">
                        <b><span style={{fontSize: '12px', color: 'var(--text-light)', fontWeight: '600', marginRight: '6px'}}>{p.id}</span> {p.name} (Age {p.age})</b>
                        <span>{p.department}</span>
                      </div>
                      <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                        <div className="staged-time">t = {p.arrivalTime} min</div>
                        {isExpanded ? <ChevronUp size={16} color="#525252" /> : <ChevronDown size={16} color="#525252" />}
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="staged-details">
                        <div className="detail-group">
                          <h4>Vitals</h4>
                          <p>SpO2: <i>{p.vitals.spo2}%</i></p>
                          <p>Pulse: <i>{p.vitals.pulseRate} bpm</i></p>
                          <p>BP: <i>{p.vitals.systolicBP} mmHg</i></p>
                          <p>Resp: <i>{p.vitals.respirationRate} /min</i></p>
                          <p>Status: <i>{p.vitals.consciousness}</i></p>
                        </div>
                        <div className="detail-group">
                          <h4>Symptoms</h4>
                          {p.cardiologySymptoms && Object.entries(p.cardiologySymptoms).map(([k,v]) => <p key={k}>{k}: <i>{v.toString()}</i></p>)}
                          {p.neurologySymptoms && Object.entries(p.neurologySymptoms).map(([k,v]) => <p key={k}>{k}: <i>{v.toString()}</i></p>)}
                          {p.traumaSymptoms && Object.entries(p.traumaSymptoms).map(([k,v]) => <p key={k}>{k}: <i>{v.toString()}</i></p>)}
                          {!p.cardiologySymptoms && !p.neurologySymptoms && !p.traumaSymptoms && <p><i>Standard intake</i></p>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <button className="btn-deploy" onClick={handleDeploy} disabled={stagedPatients.length === 0}>
            <Send size={16} /> Deploy {stagedPatients.length} Patients to Backend
          </button>
        </div>
      </div>

      {/* Full Width History Section */}
      <div className="setup-history-section">
        <h3><Activity size={16} className="inline-icon" /> Active Intake History</h3>
        <p className="history-subtitle">Showing all patients successfully deployed to the engine or actively waiting.</p>

        {historyPatients.length === 0 ? (
          <div className="empty-state">No submitted patients found.</div>
        ) : (
          <div className="history-grid">
            {historyPatients.map((p, idx) => {
              const isExpanded = expandedHistoryId === p.id;
              
              // Safely parse JSONB symptoms and vitals
              const vitals = typeof p.vitals === 'string' ? JSON.parse(p.vitals) : (p.vitals || {});
              const symptomsJson = typeof p.symptoms === 'string' ? JSON.parse(p.symptoms) : (p.symptoms || {});
              
              const cardio = symptomsJson.cardiology;
              const neuro = symptomsJson.neurology;
              const trauma = symptomsJson.trauma;

              return (
                <div key={p.id} className="history-item">
                  <div className="history-header" onClick={() => setExpandedHistoryId(isExpanded ? null : p.id)}>
                    <div className="h-col name">
                      <b><span style={{fontSize: '12px', color: 'var(--text-light)', fontWeight: '600', marginRight: '6px'}}>{p.id}</span> {p.name}</b>
                      <span>Age {p.age}</span>
                    </div>
                    <div className="h-col dept">
                      <b>{p.department}</b>
                      <span>Arr: t={p.arrival_time}</span>
                    </div>
                    <div className="h-col status">
                      <span className={`status-badge ${p.status.toLowerCase()}`}>{p.status}</span>
                    </div>
                    <div className="h-col action">
                      {isExpanded ? <ChevronUp size={16} color="#525252" /> : <ChevronDown size={16} color="#525252" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="staged-details history-details">
                      <div className="detail-group">
                        <h4>Vitals</h4>
                        <p>SpO2: <i>{vitals.spo2}%</i></p>
                        <p>Pulse: <i>{vitals.pulseRate} bpm</i></p>
                        <p>BP: <i>{vitals.systolicBP} mmHg</i></p>
                        <p>Resp: <i>{vitals.respirationRate} /min</i></p>
                        <p>Status: <i>{vitals.consciousness}</i></p>
                      </div>
                      <div className="detail-group">
                        <h4>Symptoms</h4>
                        {cardio && Object.entries(cardio).map(([k,v]) => <p key={k}>{k}: <i>{v?.toString()}</i></p>)}
                        {neuro && Object.entries(neuro).map(([k,v]) => <p key={k}>{k}: <i>{v?.toString()}</i></p>)}
                        {trauma && Object.entries(trauma).map(([k,v]) => <p key={k}>{k}: <i>{v?.toString()}</i></p>)}
                        {!cardio && !neuro && !trauma && <p><i>Standard intake (No specific symptoms)</i></p>}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default PatientSetup;
