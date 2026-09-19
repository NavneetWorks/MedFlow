import React from 'react';
import { AlertTriangle, Ambulance, ArrowRight, BedDouble, BriefcaseMedical, HeartPulse, Stethoscope, Users } from 'lucide-react';
import './operations.css';

const departments = [
  ['Emergency', '9', '2', '4', '2 / 4', '17 min', 'Overloaded'],
  ['Cardiology', '5', '1', '3', '2 / 3', '12 min', 'Busy'],
  ['Orthopedics', '3', '1', '2', '3 / 4', '8 min', 'Normal'],
  ['General Medicine', '7', '2', '4', '4 / 5', '14 min', 'Busy']
];
const resources = [
  ['General Beds', 54, 72, BedDouble], ['ICU Beds', 11, 12, HeartPulse], ['Operating Rooms', 4, 6, BriefcaseMedical], ['Doctors', 9, 12, Stethoscope], ['Nurses', 28, 36, Users], ['Ambulances', 3, 5, Ambulance]
];
const doctors = [['Dr. A. Banerjee', 'Emergency', 'Consulting', 'Aarav Sharma', '—', 'ER-02'], ['Dr. J. Williams', 'Orthopedics', 'Available', '—', 'Sara Khan', 'OP-04'], ['Dr. K. Rao', 'Cardiology', 'Consulting', 'Nikhil Shah', 'Meera Iyer', 'CD-01'], ['Dr. S. Mehta', 'General Medicine', 'Available', '—', 'Dev Patel', 'GM-06']];
const inventory = [['ICU-01', 'ICU Bed', 'Emergency', 'Occupied', 'PT-2019', 'Dr. Banerjee'], ['ICU-02', 'ICU Bed', 'Emergency', 'Available', '—', '—'], ['GB-14', 'General Bed', 'General Medicine', 'Occupied', 'PT-2042', 'Dr. Mehta'], ['OR-01', 'Operating Room', 'Surgery', 'Occupied', 'PT-2036', 'Dr. Lewis'], ['D-03', 'Doctor', 'Emergency', 'Failed', '—', '—']];

export default function HospitalOperations({ failure, doctors: doctorCount }) {
  const activeFailure = failure !== 'No active failure';
  return <div className="operations-page">
    <section className="operations-intro"><div><p className="eyebrow">CAPACITY & ALLOCATION</p><h2>Hospital resource operations</h2><p>Live view of capacity, staff allocation, department load, and active operational constraints.</p></div><span className="ops-live"><i className="live-dot"/>LIVE OPERATIONS</span></section>
    <section className="ops-kpis"><OpsKpi value="12" label="Total doctors" /><OpsKpi value={String(doctorCount - 9)} label="Available doctors" tone="green" /><OpsKpi value="9" label="Consulting doctors" /><OpsKpi value="78" label="Total rooms" /><OpsKpi value="20" label="Available rooms" tone="green" /><OpsKpi value="58" label="Occupied rooms" tone="warning" /></section>
    <section className="operations-alerts">{activeFailure ? <OpsAlert critical text={`${failure} is offline and has been removed from the available resource pool.`}/> : <OpsAlert critical text="Emergency department is overloaded — 9 patients waiting and 2 of 4 doctors are available."/>}<OpsAlert text="ICU capacity is critically high: 11 of 12 beds occupied. 1 urgent patient is waiting." /></section>
    <section className="panel ops-section"><div className="section-heading"><div><p className="eyebrow">DEPARTMENT OPERATIONS</p><h2>Department load and staffing</h2></div><button className="link-button">View department detail <ArrowRight size={16}/></button></div><div className="ops-table-wrap"><table className="operations-table"><thead><tr><th>DEPARTMENT</th><th>WAITING</th><th>ASSESSMENT</th><th>CONSULTING</th><th>AVAILABLE DOCTORS</th><th>AVERAGE WAIT</th><th>LOAD</th></tr></thead><tbody>{departments.map(d => <tr key={d[0]}><td><strong>{d[0]}</strong></td><td>{d[1]}</td><td>{d[2]}</td><td>{d[3]}</td><td>{d[4]}</td><td>{d[5]}</td><td><Load value={d[6]}/></td></tr>)}</tbody></table></div></section>
    <div className="operations-grid">
      <section className="panel ops-section"><div className="section-heading"><div><p className="eyebrow">RESOURCE CAPACITY</p><h2>Resource utilization</h2></div></div><div className="ops-resource-grid">{resources.map(([label, used, total, Icon]) => <Resource key={label} label={label} used={used} total={total} Icon={Icon}/>)}</div></section>
      <section className="panel icu-panel"><p className="eyebrow">ICU CONSTRAINTS</p><h2>Intensive care capacity</h2><div className="icu-value"><b>11</b><span>/ 12 beds occupied</span></div><div className="icu-bar"><i/></div><div className="icu-metrics"><span><b>1</b>Patient waiting</span><span><b>2</b>Scarcity boosted</span></div><p className="icu-note"><AlertTriangle size={15}/> ICU availability is below 10%; priority scarcity rules are active.</p><button className="link-button">View ICU resources <ArrowRight size={15}/></button></section>
    </div>
    <div className="operations-grid lower">
      <section className="panel ops-section"><div className="section-heading"><div><p className="eyebrow">AMBULANCE OPERATIONS</p><h2>Incoming and available vehicles</h2></div><span className="ops-available">2 available</span></div><div className="ambulance-summary"><div><b>3</b><span>Out on calls</span></div><div><b>2</b><span>Available now</span></div><div><b>1</b><span>Arriving within 10 min</span></div></div><div className="incoming"><span className="ambulance-icon"><Ambulance size={18}/></span><div><b>AMB-05 · Emergency intake</b><p>Patient PT-2061 · respiratory distress</p></div><span className="eta">ETA 06 min</span></div></section>
      <section className="panel ops-section"><div className="section-heading"><div><p className="eyebrow">UTILIZATION</p><h2>Operational efficiency</h2></div></div><Util label="Doctor utilization" percent={75}/><Util label="Room utilization" percent={74}/><Util label="Emergency department" percent={92}/><Util label="ICU utilization" percent={92}/></section>
    </div>
    <section className="panel ops-section"><div className="section-heading"><div><p className="eyebrow">STAFF ALLOCATION</p><h2>Doctor availability</h2></div><button className="link-button">View all staff <ArrowRight size={16}/></button></div><div className="ops-table-wrap"><table className="operations-table"><thead><tr><th>DOCTOR</th><th>DEPARTMENT</th><th>STATUS</th><th>CURRENT PATIENT</th><th>NEXT PATIENT</th><th>ROOM</th></tr></thead><tbody>{doctors.map(d => <tr key={d[0]}><td><strong>{d[0]}</strong></td><td>{d[1]}</td><td><span className={`doctor-status ${d[2].toLowerCase()}`}>{d[2]}</span></td><td>{d[3]}</td><td>{d[4]}</td><td>{d[5]}</td></tr>)}</tbody></table></div></section>
    <section className="panel ops-section inventory-section"><div className="section-heading"><div><p className="eyebrow">RESOURCE INVENTORY</p><h2>Unit-level resource status</h2></div><button className="link-button">View inventory <ArrowRight size={16}/></button></div><div className="ops-table-wrap"><table className="operations-table"><thead><tr><th>RESOURCE ID</th><th>TYPE</th><th>DEPARTMENT</th><th>STATUS</th><th>PATIENT</th><th>DOCTOR</th></tr></thead><tbody>{inventory.map(r => <tr key={r[0]}><td><strong>{r[0]}</strong></td><td>{r[1]}</td><td>{r[2]}</td><td><span className={`resource-status ${r[3].toLowerCase()}`}>{r[3]}</span></td><td>{r[4]}</td><td>{r[5]}</td></tr>)}</tbody></table></div></section>
  </div>;
}
function OpsKpi({ value, label, tone = '' }) { return <div className={`ops-kpi ${tone}`}><b>{value}</b><span>{label}</span></div>; }
function OpsAlert({ critical, text }) { return <div className={`ops-alert ${critical ? 'critical' : ''}`}><AlertTriangle size={18}/><span>{text}</span><button>View <ArrowRight size={14}/></button></div>; }
function Load({ value }) { return <span className={`load ${value.toLowerCase()}`}>{value}</span>; }
function Resource({ label, used, total, Icon }) { const percent = Math.round(used/total*100); return <div className="ops-resource"><div><span className="ops-resource-icon"><Icon size={18}/></span><b>{label}</b><strong>{percent}%</strong></div><p><span>{used} used</span><span>{total} total</span></p><i><em className={percent >= 90 ? 'critical' : percent >= 75 ? 'warning' : ''} style={{width:`${percent}%`}}/></i></div>; }
function Util({ label, percent }) { return <div className="util-row"><div><span>{label}</span><b>{percent}%</b></div><i><em className={percent >= 90 ? 'critical' : percent >= 75 ? 'warning' : ''} style={{width:`${percent}%`}}/></i></div>; }
