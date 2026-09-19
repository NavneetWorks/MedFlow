import { Request, Response } from 'express';

/**
 * Health Check Controller
 */
export const getHealth = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    service: 'MEDFLOW Backend Server',
    timestamp: new Date().toISOString(),
  });
};

/**
 * Placeholder REST Controllers for future extensibility
 */
export const getHospitalState = (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Hospital state placeholder - Real-time state served via Socket.IO',
  });
};

export const admitPatient = (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Patient admission placeholder - Handled real-time via Socket.IO or REST',
  });
};
