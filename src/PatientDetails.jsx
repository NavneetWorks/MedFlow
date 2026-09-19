import React from 'react';
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, Clock3, HeartPulse, MapPin, Stethoscope, Thermometer, UserRound } from 'lucide-react';
import './patient.css';

function PriorityBadge({ priority }) { return <span className={`priority ${priority.toLowerCase()}`}>{priority}</span>; }

export default function PatientDetails({ patient, onBack }) {
  const urgent = patient.priority === 'Urgent';
  const clinical = urgent ? { condition: 'Acute respiratory distress', notes: 'Requires urgent respiratory support and ICU observation.', assessor: 'Dr. Anjali Banerjee', time: '10:02' } : { condition: 'Requires clinical review', notes: 'Awaiting assessment and resource assignment.', assessor: 'Dr. Anjali Banerjee', time: '10:04' };
  const events = urgent ? [
    ['09:46', 'Patient arrival', 'Arrived by ambulance and registered in Emergency.', 'arrival'],
    ['09:52', 'Triage assessment', 'Urgency classified as Urgent by Dr. Banerjee.', 'assessment'],
    ['09:53', 'Entered priority queue', `Assigned position #${patient.position} based on priority score ${patient.score}.`, 'queue'],
    ['10:04', 'Resource constraint', 'ICU bed unavailable — scarcity boost applied to priority.', 'constraint'],
    ['Now', 'Awaiting allocation', 'Waiting for ICU bed and doctor assignment.', 'waiting']
  ] : [
    ['09:51', 'Patient arrival', 'Registered and routed to department.', 'arrival'],
    ['09:58', 'Triage assessment', `Priority classified as ${patient.priority}.`, 'assessment'],
    ['10:01', 'Entered priority queue', `Assigned position #${patient.position}.`, 'queue'],
    ['Now', 'Awaiting allocation', 'Waiting for required staff and resource.', 'waiting']
  ];
  return <div className="patient-page">
    <button className="back-button" onClick={onBack}><ArrowLeft size={17}/>Back to Live Queue</button>
    <section className="patient-hero panel"><div className="patient-title"><div className="patient-monogram">{patient.name.split(' ').map(n => n[0]).join('')}</div><div><p className="eyebrow">PATIENT RECORD · {patient.id}</p><h2>{patient.name}</h2><p>{patient.age || 68} years · {urgent ? 'Male' : 'Female'} · {patient.department}</p></div></div><div className="patient-hero-side"><PriorityBadge priority={patient.priority}/><span className={patient.status === 'Awaiting bed' ? 'status caution' : 'status'}>{patient.status}</span><small>Arrived {patient.arrival || '09:46'}</small></div></section>
    <section className="care-snapshot"><Snapshot label="Current status" value={patient.status} warning={patient.status === 'Awaiting bed'} /><Snapshot label="Queue position" value={`#${patient.position}`} /><Snapshot label="Wait time" value={patient.wait} /><Snapshot label="Priority score" value={patient.score} blue /></section>
    <div className="patient-layout">
      <div className="patient-main">
        <Section title="Patient information" icon={UserRound} eyebrow="RAW PATIENT DATA"><div className="info-grid"><Info label="Age" value={`${patient.age || 68} years`} /><Info label="Gender" value={urgent ? 'Male' : 'Female'} /><Info label="Blood group" value="B positive" /><Info label="Contact status" value="Family notified" /><Info label="Allergies" value="No known allergies" /><Info label="History flag" value={urgent ? 'Asthma' : 'None recorded'} /></div></Section>
        <Section title="Vitals" icon={HeartPulse} eyebrow="CURRENT CLINICAL MEASUREMENTS"><div className="vitals-grid"><Vital label="Heart rate" value={urgent ? '118' : '92'} unit="bpm" tone={urgent ? 'alert' : ''} /><Vital label="Blood pressure" value={urgent ? '152/94' : '126/82'} unit="mmHg" tone={urgent ? 'alert' : ''} /><Vital label="SpO₂" value={urgent ? '89' : '97'} unit="%" tone={urgent ? 'alert' : ''} /><Vital label="Temperature" value="38.2" unit="°C" tone={urgent ? 'warning' : ''} /><Vital label="Respiratory rate" value={urgent ? '28' : '18'} unit="/min" tone={urgent ? 'alert' : ''} /></div></Section>
        <Section title="Reported symptoms" icon={ClipboardList} eyebrow="PATIENT-REPORTED"><ul className="symptoms"><li>Shortness of breath</li><li>Persistent chest tightness</li><li>Dizziness and fatigue</li></ul></Section>
        <section className="assessment panel"><div className="section-title"><div className="title-icon"><Stethoscope size={19}/></div><div><p className="eyebrow">CLINICAL ASSESSMENT · INTERPRETED</p><h2>Assessment and care plan</h2></div></div><div className="assessment-grid"><Info label="Condition" value={clinical.condition} /><Info label="Clinical urgency" value={patient.priority} /><Info label="Assessed by" value={clinical.assessor} /><Info label="Assessment time" value={clinical.time} /></div><p className="assessment-note">{clinical.notes}</p></section>
      </div>
      <aside className="patient-side">
        <section className="panel side-section"><p className="eyebrow">RESOURCE REQUIREMENTS</p><h2>Required for treatment</h2><div className="requirement"><Stethoscope size={18}/><span>1 Doctor</span><b>Unassigned</b></div><div className={`requirement ${patient.resource === 'ICU Bed' ? 'unavailable' : ''}`}><HeartPulse size={18}/><span>{patient.resource || 'ICU Bed'}</span><b>{patient.status === 'Awaiting bed' ? 'Unavailable' : 'Assigned'}</b></div></section>
        <section className="panel side-section assignment"><p className="eyebrow">SCHEDULING STATE</p><h2>Current allocation</h2><Info label="Department" value={patient.department} /><Info label="Assigned doctor" value={patient.doctor || '—'} /><Info label="Assigned resources" value={patient.status === 'Assigned' ? patient.resource : '—'} /><Info label="Queue wait" value={patient.wait} /></section>
        <section className="panel side-section explain"><p className="eyebrow">WHY THIS POSITION?</p><div className="score-header"><h2>Priority score</h2><b>{patient.score}</b></div><p>Calculated from urgency, waiting time, and resource availability.</p><Score label="Urgency" value={urgent ? 76 : 59} color="red" text={urgent ? '+76' : '+59'} /><Score label="Waiting time" value={18} color="blue" text="+18.5" /><Score label="Resource scarcity" value={patient.resource === 'ICU Bed' ? 10 : 4} color="amber" text={patient.resource === 'ICU Bed' ? '+10' : '+4'} /><div className="explanation"><Clock3 size={16}/><span>{patient.resource === 'ICU Bed' ? 'ICU availability below 10% — scarcity boost applied.' : `Boosted for ${patient.wait} in queue.`}</span></div></section>
      </aside>
    </div>
    <section className="timeline-section panel"><div className="section-title"><div className="title-icon"><CalendarClock size={19}/></div><div><p className="eyebrow">PATIENT JOURNEY</p><h2>Care timeline</h2></div></div><div className="timeline">{events.map(([time, title, text, type], index) => <div className="timeline-item" key={title}><div className={`timeline-mark ${type}`}>{type === 'waiting' ? <Clock3 size={14}/> : <CheckCircle2 size={14}/>}</div><div className="timeline-content"><b>{title}</b><p>{text}</p></div><time>{time}</time>{index < events.length - 1 && <i/>}</div>)}</div></section>
  </div>;
}
function Section({ title, eyebrow, icon: Icon, children }) { return <section className="patient-section panel"><div className="section-title"><div className="title-icon"><Icon size={19}/></div><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></div>{children}</section>; }
function Snapshot({ label, value, warning, blue }) { return <div className={`snapshot ${warning ? 'warning' : ''}`}><span>{label}</span><b className={blue ? 'blue' : ''}>{value}</b></div>; }
function Info({ label, value }) { return <div className="info"><span>{label}</span><b>{value}</b></div>; }
function Vital({ label, value, unit, tone }) { return <div className={`vital ${tone}`}><span>{label}</span><b>{value}<small>{unit}</small></b></div>; }
function Score({ label, value, color, text }) { return <div className="score-row"><div><span>{label}</span><b>{text}</b></div><div className="score-bar"><i className={color} style={{ width: `${value}%` }} /></div></div>; }
