import React from 'react';
import { useAuth } from '../context/AuthContext';
import PatientDashboard from './dashboards/PatientDashboard';
import DoctorDashboard from './dashboards/DoctorDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import PharmacyDashboard from './dashboards/PharmacyDashboard';

export const HomeRouter = ({ onNavigate }) => {
  const { user } = useAuth();
  const role = user?.role || 'patient';

  switch (role) {
    case 'doctor':
      return <DoctorDashboard onNavigate={onNavigate} />;
    case 'admin':
      return <AdminDashboard onNavigate={onNavigate} />;
    case 'pharmacy':
      return <PharmacyDashboard onNavigate={onNavigate} />;
    case 'patient':
    default:
      return <PatientDashboard onNavigate={onNavigate} />;
  }
};

export default HomeRouter;
