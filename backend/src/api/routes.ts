import { Router } from 'express';
import { getHealth, getHospitalState, admitPatient } from './controllers';

const router = Router();

// Health check endpoint
router.get('/health', getHealth);

// Extensible REST endpoints for future usage
router.get('/simulations/state', getHospitalState);
router.post('/simulations/patients', admitPatient);

export default router;
