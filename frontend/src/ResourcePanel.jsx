import React, { useState, useEffect } from 'react';
import { X, Settings, Plus, Save } from 'lucide-react';
import { useSimulationSocket } from './hooks/useSimulationSocket';
import './resource-panel.css';

export default function ResourcePanel({ isOpen, onClose }) {
  const { resourceDetailed, configureResources } = useSimulationSocket();
  const [selectedSpecId, setSelectedSpecId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [draftConfig, setDraftConfig] = useState([]);

  // Compute unique specializations/types from detailed backend state
  const availableSpecs = React.useMemo(() => {
    if (!resourceDetailed || !Array.isArray(resourceDetailed)) return [];
    
    // Create a map to get count per unique (type + specialization)
    const specMap = new Map();
    resourceDetailed.forEach(r => {
      const id = `${r.type}-${r.specialization || 'GEN'}`;
      if (!specMap.has(id)) {
        specMap.set(id, { type: r.type, specialization: r.specialization, count: 0 });
      }
      specMap.get(id).count += 1;
    });

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
      // Dispatch resources:configure to the socket via the hook
      configureResources(draftConfig);
      setDraftConfig([]); // clear after saving
    }
  };

  return (
    <div className={`resource-panel-overlay ${isOpen ? 'open' : ''}`}>
      <div className="resource-panel">
        <header>
          <div>
            <Settings size={20} style={{ color: '#0f62fe' }} />
            <h2>Resource Management</h2>
          </div>
          <button className="resource-panel-close" onClick={onClose}><X size={20} /></button>
        </header>

        <div className="resource-panel-body">
          <div className="resource-config-form">
            <label>
              <span>Resource & Specialization</span>
              <select value={selectedSpecId} onChange={(e) => setSelectedSpecId(e.target.value)}>
                {availableSpecs.map((s) => {
                  const id = `${s.type}-${s.specialization || 'GEN'}`;
                  const label = `${s.type} ${s.specialization && s.specialization !== 'GEN' ? `(${s.specialization})` : ''}`;
                  return (
                    <option key={id} value={id}>
                      {label} - Current: {s.count}
                    </option>
                  );
                })}
              </select>
            </label>

            <label>
              <span>Target Quantity</span>
              <input 
                type="number" 
                placeholder="e.g. 15" 
                min="0"
                value={quantity} 
                onChange={(e) => setQuantity(e.target.value)} 
              />
            </label>

            <button className="btn-add-draft" onClick={handleAddDraft}>
              <Plus size={16} /> Stage Change
            </button>
          </div>

          <div className="staged-changes">
            <h3>Staged Updates</h3>
            {draftConfig.length === 0 ? (
              <p style={{ fontSize: '14px', color: '#8d8d8d' }}>No changes staged.</p>
            ) : (
              <div className="draft-list">
                {draftConfig.map((config, idx) => {
                  const label = `${config.type} ${config.specialization && config.specialization !== 'GEN' ? `(${config.specialization})` : ''}`;
                  return (
                    <div key={idx} className="draft-item">
                      <span>{label}</span>
                      <strong>{config.count} units</strong>
                    </div>
                  );
                })}
              </div>
            )}
            
            <button 
              className="btn-deploy" 
              onClick={handleUpdateBackend} 
              disabled={draftConfig.length === 0}
            >
              <Save size={18} /> Deploy to Backend
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
