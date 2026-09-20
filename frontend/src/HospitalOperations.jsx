import React, { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Ambulance, ArrowRight, BedDouble, BriefcaseMedical, HeartPulse, Stethoscope, Users, Plus, Save, Settings } from 'lucide-react';
import { useSimulationSocket } from './hooks/useSimulationSocket';
import './operations.css';

const DOCTOR_SPECIALTIES = [
  { key: 'EMERGENCY_ER', label: 'Emergency ER' },
  { key: 'CARDIOLOGY', label: 'Cardiology' },
  { key: 'NEUROLOGY', label: 'Neurology' },
  { key: 'ORTHOPEDICS', label: 'Orthopedics / Trauma' },
  { key: 'GENERAL_SURGERY', label: 'General Surgery' },
  { key: 'PULMONOLOGY', label: 'Pulmonology' },
  { key: 'PEDIATRICS', label: 'Pediatrics' }
];

export default function HospitalOperations({ failure }) {
  const { resourceStatus, resourceDetailed, configureResources, queue, simState } = useSimulationSocket();
  const activeFailure = failure !== 'No active failure';

  // --- Manage Resources Form State ---
  const [resourceCategory, setResourceCategory] = useState('DOCTOR');
  const [resourceName, setResourceName] = useState('');
  const [specialization, setSpecialization] = useState('EMERGENCY_ER');
  const [quantity, setQuantity] = useState('1');
  const [draftConfig, setDraftConfig] = useState([]);

  // Active accordion section state
  const [openDepts, setOpenDepts] = useState({
    EMERGENCY_ER: true,
    CARDIOLOGY: true,
    NEUROLOGY: false,
    ORTHOPEDICS: false,
    GENERAL_SURGERY: false,
    PULMONOLOGY: false,
    PEDIATRICS: false
  });

  const toggleDept = (key) => {
    setOpenDepts(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddDraft = () => {
    if (!resourceCategory) return;

    let itemConfig = null;
    if (resourceCategory === 'DOCTOR') {
      const name = resourceName.trim() || `Dr. Staff ${Math.floor(Math.random() * 900) + 100}`;
      itemConfig = {
        type: 'DOCTOR',
        specialization: specialization,
        count: 1,
        name: name
      };
    } else if (resourceCategory === 'NURSE') {
      const name = resourceName.trim() || `Nurse Staff ${Math.floor(Math.random() * 900) + 100}`;
      itemConfig = {
        type: 'NURSE',
        specialization: 'GENERAL',
        count: 1,
        name: name
      };
    } else {
      const qtyNum = parseInt(quantity, 10);
      if (isNaN(qtyNum) || qtyNum <= 0) return;
      itemConfig = {
        type: resourceCategory,
        specialization: 'GENERAL',
        count: qtyNum
      };
    }

    setDraftConfig(prev => [...prev, itemConfig]);
    setResourceName('');
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
  const busyDoctors = totalDoctors - availableDoctors;
  
  const totalNurses = resourceStatus?.['NURSE']?.total || 0;
  const availableNurses = resourceStatus?.['NURSE']?.available || 0;
  const busyNurses = totalNurses - availableNurses;
  
  const totalBeds = (resourceStatus?.['BED']?.total || 0) + (resourceStatus?.['ICU_BED']?.total || 0) + (resourceStatus?.['OT']?.total || 0);
  const availableBeds = (resourceStatus?.['BED']?.available || 0) + (resourceStatus?.['ICU_BED']?.available || 0) + (resourceStatus?.['OT']?.available || 0);
  const occupiedBeds = totalBeds - availableBeds;

  const totalEquip = (resourceStatus?.['EQUIPMENT']?.total || 0) + (resourceStatus?.['AMBULANCE']?.total || 0);
  const availEquip = (resourceStatus?.['EQUIPMENT']?.available || 0) + (resourceStatus?.['AMBULANCE']?.available || 0);
  const busyEquip = totalEquip - availEquip;

  // Group Doctors by Specialization
  const doctorsByDept = useMemo(() => {
    const map = {};
    DOCTOR_SPECIALTIES.forEach(d => {
      map[d.key] = [];
    });

    if (Array.isArray(resourceDetailed)) {
      resourceDetailed.filter(r => r.type === 'DOCTOR').forEach(doc => {
        const spec = doc.specialization || 'EMERGENCY_ER';
        if (!map[spec]) map[spec] = [];
        
        let activity = 'Free · Ready for patient intake';
        if (doc.status === 'BUSY' || doc.status === 'CONSULTING') {
          activity = doc.currentPatientId 
            ? `Consulting Patient ${doc.currentPatientId} · Treatment in progress`
            : `Assigned to active patient treatment`;
        }

        map[spec].push({
          id: doc.id,
          name: doc.name || `Dr. ${doc.id}`,
          status: doc.status || 'AVAILABLE',
          patientId: doc.currentPatientId || null,
          activity: activity
        });
      });
    }
    return map;
  }, [resourceDetailed]);

  // Extract Nurses
  const nursesList = useMemo(() => {
    if (!Array.isArray(resourceDetailed)) return [];
    return resourceDetailed.filter(r => r.type === 'NURSE').map(n => {
      let activity = 'Free · Stationed at General Ward';
      if (n.status === 'BUSY' || n.status === 'CONSULTING') {
        activity = n.currentPatientId 
          ? `On Duty · Assisting Patient ${n.currentPatientId}` 
          : `On Duty · Assigned to Care Unit`;
      }
      return {
        id: n.id,
        name: n.name || `Nurse ${n.id}`,
        unit: n.specialization || 'GENERAL',
        status: n.status || 'AVAILABLE',
        patientId: n.currentPatientId || null,
        activity: activity
      };
    });
  }, [resourceDetailed]);

  // Extract Rooms and Equipment
  const roomsList = useMemo(() => {
    if (!Array.isArray(resourceDetailed)) return [];
    return resourceDetailed.filter(r => ['BED', 'ICU_BED', 'OT'].includes(r.type)).map(room => ({
      id: room.id,
      name: room.name || room.id,
      type: room.type === 'ICU_BED' ? 'ICU Bed' : room.type === 'OT' ? 'Operating Room' : 'General Bed',
      status: room.status || 'AVAILABLE',
      patientId: room.currentPatientId || '—'
    }));
  }, [resourceDetailed]);

  return <div className="operations-page">
    <section className="operations-intro">
      <div>
        <p className="eyebrow">CAPACITY & ALLOCATION</p>
        <h2>Hospital Resource Operations</h2>
        <p>Live real-time view of doctors, nurses, beds, equipment, and active staff activities updating on every tick.</p>
      </div>
      <span className="ops-live"><i className="live-dot"/>LIVE OPERATIONS</span>
    </section>
    
    <section className="ops-kpis">
      <OpsKpi value={totalDoctors} label="Total Doctors" tone="blue" />
      <OpsKpi value={availableDoctors} label="Available Doctors" tone="green" />
      <OpsKpi value={busyDoctors} label="Consulting Doctors" tone="warning" />
      
      <OpsKpi value={totalNurses} label="Total Nurses" tone="blue" />
      <OpsKpi value={availableNurses} label="Available Nurses" tone="green" />
      <OpsKpi value={busyNurses} label="On-Duty Nurses" tone="warning" />

      <OpsKpi value={totalBeds} label="Total Rooms" tone="blue" />
      <OpsKpi value={availableBeds} label="Available Rooms" tone="green" />
      <OpsKpi value={occupiedBeds} label="Occupied Rooms" tone="critical" />
    </section>

    {activeFailure && (
      <section className="operations-alerts">
        <OpsAlert critical text={`${failure} is offline and removed from available resource pool.`}/>
      </section>
    )}

    {/* ADD RESOURCE CONFIGURATION FORM */}
    <section className="panel ops-section" style={{ backgroundColor: '#f8fafc', borderLeft: '4px solid #0f62fe' }}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">RESOURCE MANAGEMENT</p>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Settings size={20}/> Configure & Add Hospital Resources
          </h2>
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px', marginTop: '16px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
              Resource Category
              <select 
                value={resourceCategory} 
                onChange={(e) => setResourceCategory(e.target.value)} 
                style={{ padding: '8px', border: '1px solid #8d8d8d', background: '#fff' }}
              >
                <option value="DOCTOR">Doctor (Person)</option>
                <option value="NURSE">Nurse (Person)</option>
                <option value="ICU_BED">ICU Bed (Hardware)</option>
                <option value="BED">General Bed (Hardware)</option>
                <option value="OT">Operating Room / OT (Hardware)</option>
                <option value="EQUIPMENT">Equipment (Hardware)</option>
                <option value="AMBULANCE">Ambulance (Hardware)</option>
              </select>
            </label>

            {resourceCategory === 'DOCTOR' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
                Doctor Specialization
                <select 
                  value={specialization} 
                  onChange={(e) => setSpecialization(e.target.value)} 
                  style={{ padding: '8px', border: '1px solid #8d8d8d', background: '#fff' }}
                >
                  {DOCTOR_SPECIALTIES.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {resourceCategory === 'DOCTOR' || resourceCategory === 'NURSE' ? (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
              {resourceCategory === 'DOCTOR' ? 'Doctor Full Name' : 'Nurse Full Name'}
              <input 
                type="text" 
                placeholder={resourceCategory === 'DOCTOR' ? 'e.g. Dr. Rajesh Sharma' : 'e.g. Nurse Priya Verma'} 
                value={resourceName} 
                onChange={(e) => setResourceName(e.target.value)} 
                style={{ padding: '8px', border: '1px solid #8d8d8d' }}
              />
            </label>
          ) : (
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '13px', fontWeight: 600 }}>
              Quantity Target
              <input 
                type="number" 
                min="1" 
                placeholder="e.g. 5"
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)} 
                style={{ padding: '8px', border: '1px solid #8d8d8d' }}
              />
            </label>
          )}

          <button 
            onClick={handleAddDraft} 
            style={{ 
              alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px', 
              padding: '8px 18px', background: '#e0e0e0', border: 'none', cursor: 'pointer', fontWeight: 600 
            }}
          >
            <Plus size={16}/> Stage Resource
          </button>
        </div>

        <div style={{ borderLeft: '1px solid #c6c6c6', paddingLeft: '24px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Staged Additions</h3>
          {draftConfig.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#6f6f6f' }}>No staged resource changes yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px', maxHeight: '140px', overflowY: 'auto' }}>
              {draftConfig.map((config, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px', background: '#ffffff', border: '1px solid #e0e0e0' }}>
                  <span><b>{config.name}</b> ({config.type} - {config.specialization})</span>
                  <strong>x{config.count}</strong>
                </div>
              ))}
            </div>
          )}
          <button 
            onClick={handleUpdateBackend} 
            disabled={draftConfig.length === 0} 
            style={{ 
              display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', 
              background: draftConfig.length === 0 ? '#8d8d8d' : '#0f62fe', color: '#fff', 
              border: 'none', cursor: draftConfig.length === 0 ? 'not-allowed' : 'pointer', 
              fontWeight: 600, width: '100%', justifyContent: 'center' 
            }}
          >
            <Save size={16}/> Push Live to Backend
          </button>
        </div>
      </div>
    </section>

    {/* DEPARTMENT-WISE DOCTORS SECTION */}
    <section className="panel ops-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">DOCTORS STAFFING & LIVE ACTIVITY</p>
          <h2>Doctors by Department</h2>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
        {DOCTOR_SPECIALTIES.map(dept => {
          const docs = doctorsByDept[dept.key] || [];
          const availCount = docs.filter(d => d.status === 'AVAILABLE').length;
          const busyCount = docs.length - availCount;
          const isOpen = openDepts[dept.key];

          return (
            <div key={dept.key} style={{ border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
              <div 
                onClick={() => toggleDept(dept.key)}
                style={{ 
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                  padding: '12px 16px', background: '#f4f4f4', cursor: 'pointer', userSelect: 'none' 
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <strong style={{ fontSize: '15px' }}>{dept.label} Doctors</strong>
                  <span style={{ fontSize: '12px', background: '#edf5ff', color: '#0f62fe', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                    {docs.length} Total
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px' }}>
                  <span style={{ color: '#198038', fontWeight: 600 }}>Available: {availCount}</span>
                  <span style={{ color: '#0043ce', fontWeight: 600 }}>Working: {busyCount}</span>
                  <span style={{ fontSize: '12px', color: '#6f6f6f' }}>{isOpen ? '▲ Collapse' : '▼ Expand'}</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ padding: '14px 16px', background: '#fff' }}>
                  {docs.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#6f6f6f', margin: 0 }}>No doctors configured for {dept.label}.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                      {docs.map(doc => (
                        <div 
                          key={doc.id}
                          style={{ 
                            border: '1px solid #d0d0d0', borderRadius: '4px', padding: '12px',
                            borderLeft: `4px solid ${doc.status === 'AVAILABLE' ? '#198038' : '#0f62fe'}`,
                            background: '#fafafa'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <strong style={{ fontSize: '14px' }}>{doc.name}</strong>
                            <span className={`doctor-status ${doc.status === 'AVAILABLE' ? 'available' : 'consulting'}`}>
                              {doc.status === 'AVAILABLE' ? 'AVAILABLE' : 'CONSULTING'}
                            </span>
                          </div>

                          <div style={{ fontSize: '12px', color: '#525252', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <BriefcaseMedical size={13}/>
                            <span>{doc.activity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>

    {/* NURSES SECTION */}
    <section className="panel ops-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">NURSE STAFFING POOL</p>
          <h2>Nurses Live Activity ({nursesList.length} Total)</h2>
        </div>
      </div>

      <div style={{ marginTop: '14px' }}>
        {nursesList.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#6f6f6f' }}>No nurses configured in inventory.</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {nursesList.map(nurse => (
              <div 
                key={nurse.id}
                style={{ 
                  border: '1px solid #d0d0d0', borderRadius: '4px', padding: '12px',
                  borderLeft: `4px solid ${nurse.status === 'AVAILABLE' ? '#198038' : '#0f62fe'}`,
                  background: '#fafafa'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <strong style={{ fontSize: '14px' }}>{nurse.name}</strong>
                  <span className={`doctor-status ${nurse.status === 'AVAILABLE' ? 'available' : 'consulting'}`}>
                    {nurse.status === 'AVAILABLE' ? 'FREE' : 'ON DUTY'}
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: '#525252', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Users size={13}/>
                  <span>{nurse.activity}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>

    {/* BEDS & ROOMS SECTION */}
    <section className="panel ops-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">ROOMS & BEDS OCCUPANCY</p>
          <h2>Unit-Level Room Status</h2>
        </div>
      </div>

      <div className="ops-table-wrap" style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '14px' }}>
        <table className="operations-table">
          <thead>
            <tr>
              <th>ROOM / BED ID</th>
              <th>NAME</th>
              <th>TYPE</th>
              <th>STATUS</th>
              <th>CURRENT PATIENT</th>
            </tr>
          </thead>
          <tbody>
            {roomsList.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px' }}>No rooms or beds configured.</td></tr>
            ) : (
              roomsList.map(room => (
                <tr key={room.id}>
                  <td><strong>{room.id}</strong></td>
                  <td>{room.name}</td>
                  <td>{room.type}</td>
                  <td>
                    <span className={`resource-status ${room.status === 'AVAILABLE' ? 'available' : 'occupied'}`}>
                      {room.status}
                    </span>
                  </td>
                  <td><strong>{room.patientId}</strong></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  </div>;
}

function OpsKpi({ value, label, tone = '', details = [] }) { 
  return (
    <div className={`ops-kpi ${tone} ${details.length > 0 ? 'has-details' : ''}`}>
      <div className="ops-kpi-main">
        <b>{value}</b>
        <span>{label}</span>
      </div>
      {details.length > 0 && (
        <div className="ops-kpi-dropdown">
          {details.map((d, idx) => (
            <div className="detail-row" key={idx}>
              <span className="detail-label">{d.label}</span>
              <span className="detail-stats">
                <span className="free">{d.free} Free</span>
                <span className="busy">{d.busy} Busy</span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
function OpsAlert({ critical, text }) { return <div className={`ops-alert ${critical ? 'critical' : ''}`}><AlertTriangle size={18}/><span>{text}</span><button>View <ArrowRight size={14}/></button></div>; }
function Load({ value }) { return <span className={`load ${value.toLowerCase()}`}>{value}</span>; }
