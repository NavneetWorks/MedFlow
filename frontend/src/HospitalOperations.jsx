import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Ambulance, ArrowRight, BedDouble, BriefcaseMedical, HeartPulse, Stethoscope, Users, Plus, Save, Settings } from 'lucide-react';
import { useSimulationSocket } from './hooks/useSimulationSocket';
import './operations.css';

export default function HospitalOperations({ failure }) {
  const { resourceStatus, resourceDetailed, configureResources, queue, simState } = useSimulationSocket();
  const activeFailure = failure !== 'No active failure';

  // --- Manage Resources Form State ---
  const [selectedSpecId, setSelectedSpecId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [draftConfig, setDraftConfig] = useState([]);

  // Compute unique specializations/types from detailed backend state
  const availableSpecs = useMemo(() => {
    const baseOptions = [
      { type: 'DOCTOR', specialization: 'EMERGENCY', count: 0 },
      { type: 'DOCTOR', specialization: 'CARDIOLOGY', count: 0 },
      { type: 'DOCTOR', specialization: 'ORTHOPEDICS', count: 0 },
      { type: 'DOCTOR', specialization: 'GENERAL', count: 0 },
      { type: 'NURSE', specialization: 'ICU', count: 0 },
      { type: 'NURSE', specialization: 'GENERAL', count: 0 },
      { type: 'BED', specialization: 'GENERAL', count: 0 },
      { type: 'ICU_BED', specialization: 'ICU', count: 0 },
      { type: 'OT', specialization: 'SURGERY', count: 0 },
      { type: 'AMBULANCE', specialization: 'EMERGENCY', count: 0 }
    ];
    
    const specMap = new Map();
    baseOptions.forEach(opt => specMap.set(`${opt.type}-${opt.specialization || 'GEN'}`, { ...opt }));

    if (resourceDetailed && Array.isArray(resourceDetailed)) {
      resourceDetailed.forEach(r => {
        const id = `${r.type}-${r.specialization || 'GEN'}`;
        if (!specMap.has(id)) {
          specMap.set(id, { type: r.type, specialization: r.specialization, count: 0 });
        }
        specMap.get(id).count += 1;
      });
    }
    return Array.from(specMap.values());
  }, [resourceDetailed]);

  useEffect(() => {
    if (availableSpecs.length > 0 && !selectedSpecId) {
      setSelectedSpecId(`${availableSpecs[0].type}-${availableSpecs[0].specialization || 'GEN'}`);
    }
  }, [availableSpecs, selectedSpecId]);

  const handleAddDraft = () => {
    if (!selectedSpecId || !quantity) return;
    const spec = availableSpecs.find(s => `${s.type}-${s.specialization || 'GEN'}` === selectedSpecId);
    if (!spec) return;
    setDraftConfig(prev => {
      const existingIdx = prev.findIndex(c => c.type === spec.type && c.specialization === spec.specialization);
      if (existingIdx >= 0) {
        const next = [...prev];
        next[existingIdx].count = parseInt(quantity, 10);
        return next;
      }
      return [...prev, { type: spec.type, specialization: spec.specialization, count: parseInt(quantity, 10) }];
    });
    setQuantity('');
  };

  const handleUpdateBackend = () => {
    if (draftConfig.length > 0) {
      configureResources(draftConfig);
      setDraftConfig([]);
    }
  };

  // --- Live Data Calculations ---
  const totalDoctors = resourceStatus?.['DOCTOR']?.total || 0;
  const availableDoctors = resourceStatus?.['DOCTOR']?.available || 0;
  
  const totalBeds = (resourceStatus?.['BED']?.total || 0) + (resourceStatus?.['ICU_BED']?.total || 0);
  const availableBeds = (resourceStatus?.['BED']?.available || 0) + (resourceStatus?.['ICU_BED']?.available || 0);
  const occupiedBeds = totalBeds - availableBeds;

  const liveDepartments = useMemo(() => {
    const depts = ['EMERGENCY', 'CARDIOLOGY', 'ORTHOPEDICS', 'GENERAL', 'ICU', 'OT'];
    return depts.map(deptName => {
      const waitList = Array.isArray(queue?.[deptName]) ? queue[deptName] : [];
      return {
        name: deptName,
        waiting: waitList.length,
        consulting: 0, 
        availableDoctors: '-',
        avgWait: 'N/A',
        load: waitList.length > 5 ? 'Overloaded' : waitList.length > 2 ? 'Busy' : 'Normal'
      }
    }).filter(d => d.waiting > 0 || d.name === 'EMERGENCY' || d.name === 'CARDIOLOGY' || d.name === 'GENERAL');
  }, [queue]);

  const doctorsList = useMemo(() => {
    if (!Array.isArray(resourceDetailed)) return [];
    return resourceDetailed.filter(r => r.type === 'DOCTOR').map(d => ({
      name: d.name,
      department: d.specialization || 'GENERAL',
      status: d.status,
      currentPatient: d.currentPatientId || '—'
    }));
  }, [resourceDetailed]);

  const inventoryList = useMemo(() => {
    if (!Array.isArray(resourceDetailed)) return [];
    return resourceDetailed.map(r => ({
      id: r.id,
      type: r.type,
      department: r.specialization || '—',
      status: r.status,
      patient: r.currentPatientId || '—'
    }));
  }, [resourceDetailed]);

  return <div className="operations-page">
    <section className="operations-intro"><div><p className="eyebrow">CAPACITY & ALLOCATION</p><h2>Hospital resource operations</h2><p>Live view of capacity, staff allocation, department load, and active operational constraints.</p></div><span className="ops-live"><i className="live-dot"/>LIVE OPERATIONS</span></section>
    
    <section className="ops-kpis">
      <OpsKpi value={totalDoctors} label="Total doctors" />
      <OpsKpi value={availableDoctors} label="Available doctors" tone="green" />
      <OpsKpi value={totalDoctors - availableDoctors} label="Consulting doctors" />
      <OpsKpi value={totalBeds} label="Total rooms" />
      <OpsKpi value={availableBeds} label="Available rooms" tone="green" />
      <OpsKpi value={occupiedBeds} label="Occupied rooms" tone="warning" />
    </section>

    <section className="operations-alerts">
      {activeFailure && <OpsAlert critical text={`${failure} is offline and has been removed from the available resource pool.`}/>}
      <OpsAlert text={`Hospital capacity: ${totalBeds ? Math.round((occupiedBeds/totalBeds)*100) : 0}% occupied. ${simState.waitingCount || 0} patients waiting globally.`} />
    </section>

    {/* LIVE CONFIGURATION IN-PAGE */}
    <section className="panel ops-section" style={{ backgroundColor: '#f4f4f4', borderLeft: '4px solid #0f62fe' }}>
      <div className="section-heading">
        <div><p className="eyebrow">CONFIGURATION</p><h2 style={{display:'flex', alignItems:'center', gap:'8px'}}><Settings size={20}/> Manage Live Resources</h2></div>
      </div>
      
      <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start', marginTop: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px', fontWeight: 600 }}>
            Resource Type
            <select value={selectedSpecId} onChange={(e) => setSelectedSpecId(e.target.value)} style={{ padding: '8px', border: '1px solid #8d8d8d' }}>
              {availableSpecs.map((s) => {
                const id = `${s.type}-${s.specialization || 'GEN'}`;
                const label = `${s.type} ${s.specialization && s.specialization !== 'GEN' ? `(${s.specialization})` : ''}`;
                return <option key={id} value={id}>{label} - Current: {s.count}</option>;
              })}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px', fontWeight: 600 }}>
            New Quantity Target
            <input type="number" min="0" placeholder="e.g. 15" value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ padding: '8px', border: '1px solid #8d8d8d' }}/>
          </label>
          <button onClick={handleAddDraft} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#e0e0e0', border: 'none', cursor: 'pointer' }}>
            <Plus size={16}/> Stage Change
          </button>
        </div>

        <div style={{ flex: 1, borderLeft: '1px solid #c6c6c6', paddingLeft: '24px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Staged Changes</h3>
          {draftConfig.length === 0 ? <p style={{ fontSize: '14px', color: '#6f6f6f' }}>No changes staged.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {draftConfig.map((config, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', padding: '8px', background: '#e0e0e0' }}>
                  <span>{config.type} {config.specialization && `(${config.specialization})`}</span>
                  <strong>{config.count}</strong>
                </div>
              ))}
            </div>
          )}
          <button onClick={handleUpdateBackend} disabled={draftConfig.length === 0} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: draftConfig.length === 0 ? '#8d8d8d' : '#0f62fe', color: '#fff', border: 'none', cursor: draftConfig.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 600, width: '100%', justifyContent: 'center' }}>
            <Save size={16}/> Push to Backend
          </button>
        </div>
      </div>
    </section>

    <section className="panel ops-section">
      <div className="section-heading"><div><p className="eyebrow">DEPARTMENT OPERATIONS (LIVE)</p><h2>Department load and staffing</h2></div></div>
      <div className="ops-table-wrap">
        <table className="operations-table">
          <thead><tr><th>DEPARTMENT</th><th>WAITING</th><th>CONSULTING</th><th>AVAILABLE DOCTORS</th><th>AVERAGE WAIT</th><th>LOAD</th></tr></thead>
          <tbody>
            {liveDepartments.map(d => <tr key={d.name}><td><strong>{d.name}</strong></td><td>{d.waiting}</td><td>{d.consulting}</td><td>{d.availableDoctors}</td><td>{d.avgWait}</td><td><Load value={d.load}/></td></tr>)}
          </tbody>
        </table>
      </div>
    </section>

    <section className="panel ops-section">
      <div className="section-heading"><div><p className="eyebrow">STAFF ALLOCATION</p><h2>Doctor availability</h2></div></div>
      <div className="ops-table-wrap">
        <table className="operations-table">
          <thead><tr><th>DOCTOR</th><th>DEPARTMENT</th><th>STATUS</th><th>CURRENT PATIENT</th></tr></thead>
          <tbody>
            {doctorsList.map((d, i) => <tr key={i}><td><strong>{d.name}</strong></td><td>{d.department}</td><td><span className={`doctor-status ${d.status.toLowerCase()}`}>{d.status}</span></td><td>{d.currentPatient}</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>

    <section className="panel ops-section inventory-section">
      <div className="section-heading"><div><p className="eyebrow">RESOURCE INVENTORY</p><h2>Unit-level resource status</h2></div></div>
      <div className="ops-table-wrap" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        <table className="operations-table">
          <thead><tr><th>RESOURCE ID</th><th>TYPE</th><th>DEPARTMENT</th><th>STATUS</th><th>PATIENT</th></tr></thead>
          <tbody>
            {inventoryList.map(r => <tr key={r.id}><td><strong>{r.id}</strong></td><td>{r.type}</td><td>{r.department}</td><td><span className={`resource-status ${r.status.toLowerCase()}`}>{r.status}</span></td><td>{r.patient}</td></tr>)}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}

function OpsKpi({ value, label, tone = '' }) { return <div className={`ops-kpi ${tone}`}><b>{value}</b><span>{label}</span></div>; }
function OpsAlert({ critical, text }) { return <div className={`ops-alert ${critical ? 'critical' : ''}`}><AlertTriangle size={18}/><span>{text}</span><button>View <ArrowRight size={14}/></button></div>; }
function Load({ value }) { return <span className={`load ${value.toLowerCase()}`}>{value}</span>; }
