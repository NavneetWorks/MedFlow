import { useState, useEffect } from 'react';
import socket from '../services/socketManager';

export function useSimulationSocket() {
  // --- Live Data States ---
  const [queue, setQueue] = useState({});
  const [resourceStatus, setResourceStatus] = useState({});
  const [resourceDetailed, setResourceDetailed] = useState([]);
  
  const [simState, setSimState] = useState({
    isRunning: false,
    speedRatio: 1,
    simTimeMinutes: 0,
    waitingCount: 0,
    allocatedCount: 0
  });

  const [logs, setLogs] = useState([]);
  const [historyPatients, setHistoryPatients] = useState([]);

  // --- Socket Listeners ---
  useEffect(() => {
    // 1. Queue Updates
    socket.on('queue:updated', (data) => {
      setQueue(data);
    });

    // 2. Resource Updates
    socket.on('resources:status', (data) => {
      setResourceStatus(data);
    });

    socket.on('resources:detailed', (data) => {
      setResourceDetailed(data);
    });

    // 3. Simulation Tick & Metrics
    socket.on('sim:tick', (data) => {
      setSimState(prev => ({
        ...prev,
        simTimeMinutes: data.simTimeMinutes,
        waitingCount: data.waitingCount,
        allocatedCount: data.allocatedCount
      }));
    });

    socket.on('sim:state_changed', (data) => {
      setSimState(prev => ({ ...prev, isRunning: data.isRunning }));
    });

    socket.on('sim:speed_changed', (data) => {
      setSimState(prev => ({ ...prev, speedRatio: data.ratio }));
    });

    // 4. Activity Logs (Patient arrived, allocated, etc.)
    socket.on('patient:arrived', (patient) => {
      addLog(`New Patient Arrived: ${patient.name || patient.id}`);
    });

    socket.on('patient:allocated', (data) => {
      addLog(`Patient ${data.patientId} allocated resources: ${data.resourceIds.join(', ')}`);
    });

    socket.on('resource:status_changed', (data) => {
      addLog(`Resource ${data.resourceId} is now ${data.newStatus}`);
    });
    
    // 5. History / Submitted Patients
    socket.on('patients:history_response', (data) => {
      setHistoryPatients(data);
    });

    // Request full state immediately in case we missed the on-connect emission
    socket.emit('request_initial_state');
    socket.emit('patients:history_request');

    // Cleanup listeners on unmount
    return () => {
      socket.off('queue:updated');
      socket.off('resources:status');
      socket.off('resources:detailed');
      socket.off('sim:tick');
      socket.off('sim:state_changed');
      socket.off('sim:speed_changed');
      socket.off('patient:arrived');
      socket.off('patient:allocated');
      socket.off('resource:status_changed');
      socket.off('patients:history_response');
    };
  }, []);

  // Utility to keep logs limited to the last 50 entries
  const addLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ time: timestamp, message }, ...prev].slice(0, 50));
  };

  // --- Emitters (Commands to Backend) ---

  // Control Simulation
  const startSimulation = () => socket.emit('sim:start');
  const pauseSimulation = () => socket.emit('sim:pause');
  const setSimulationSpeed = (ratio) => socket.emit('sim:speed', ratio);
  const subscribeToSim = (simId) => socket.emit('sim:subscribe', simId);

  // Patient Management
  const addPatient = (patientData) => {
    // TODO: Implementation for injecting patient details goes here
    socket.emit('patient:add', patientData);
  };

  // Resource Management
  const configureResources = (configList) => {
    // TODO: Implementation for updating max beds/doctors goes here
    socket.emit('resources:configure', configList);
  };

  return {
    // Expose Data
    queue,
    resourceStatus,
    resourceDetailed,
    simState,
    logs,
    historyPatients,
    
    // Expose Actions
    startSimulation,
    pauseSimulation,
    setSimulationSpeed,
    subscribeToSim,
    addPatient,
    configureResources
  };
}
