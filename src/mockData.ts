import { UserProfile, EmergencyContact, SafetyPermissions, AppNotification, VitalsData, ActivityEvent } from './types';

export const INITIAL_PROFILE: UserProfile = {
  name: '',
  email: '',
  age: '',
  gender: 'Female',
  weight: '',
  height: '',
  workStatus: 'Employed',
  profession: '',
  address: '',
  watchModel: '',
  medicalConditions: [],
  otherMedicalNotes: '',
  allergies: [],
  medications: [],
  bloodGroup: 'Select Blood Group',
  uploadedDocuments: [],
  signedUpWithGoogle: false,
  setupTarget: 'myself',
  language: 'English',
};

// The app should not fill any phone number itself. Only filled when provided by user.
export const INITIAL_CONTACTS: EmergencyContact[] = [];

export const INITIAL_PERMISSIONS: SafetyPermissions = {
  microphoneCamera: true,
  liveLocation: true,
  motionSensors: true,
  neighboursPermission: true,
  watchSync: true,
  cookiesDataStorage: true,
};

export const INITIAL_VITALS: VitalsData = {
  bpSys: 118,
  bpDia: 76,
  pulse: 72,
  spo2: 98,
  hrv: 62,
  bodyTemperature: 98.6,
  cardiacRhythm: 'Normal Sinus Rhythm',
  lastUpdated: 'Just now'
};

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n-1',
    title: 'Emergency Response System Updated',
    message: 'Unified 108 Medical and 112 National Emergency lines directly synchronized with live GPS beaconing.',
    type: 'feature',
    timestamp: '10 mins ago',
    read: false
  },
  {
    id: 'n-2',
    title: 'Voice Safety Check Active',
    message: 'Voice-based health query and 10-second fail-safe timer enabled for passive crisis detection.',
    type: 'update',
    timestamp: '1 hour ago',
    read: false
  },
  {
    id: 'n-3',
    title: 'Safety Circle Sync Successful',
    message: 'Emergency contact network confirmed and synchronized.',
    type: 'sms',
    timestamp: 'Yesterday, 4:15 PM',
    read: true
  },
  {
    id: 'n-4',
    title: 'Smart Safety Mode Routine',
    message: 'Low-power motion sentinel verified nominal. Zero unauthorized sensor activations.',
    type: 'system',
    timestamp: 'Yesterday, 8:00 AM',
    read: true
  }
];

export const INITIAL_ACTIVITIES: ActivityEvent[] = [
  {
    id: 'act-1',
    timestamp: 'Today, 06:45 AM',
    category: 'Check-in',
    title: 'Morning Wellness Check-in',
    details: 'User selected "Great". Heart rate nominal at 72 BPM.',
    severity: 'nominal'
  },
  {
    id: 'act-2',
    timestamp: 'Today, 06:12 AM',
    category: 'Sensor Monitor',
    title: 'Low-Power Sentinel Baseline Audit',
    details: 'Zero suspicious motion spikes. Accelerometer calibrated to resting baseline.',
    severity: 'nominal'
  },
  {
    id: 'act-3',
    timestamp: 'Yesterday, 07:30 PM',
    category: 'Journey',
    title: 'Safety Journey Completed',
    details: 'Duration: 28 mins · 3,420 steps logged. Live tracking verified safe.',
    severity: 'logged'
  },
  {
    id: 'act-4',
    timestamp: 'Yesterday, 02:15 PM',
    category: 'Safety Insight',
    title: 'Sensor Anomaly Evaluation',
    details: 'Sudden deceleration detected (car braking). Sensor verification test triggered: User responded "I am okay". SOS aborted safely.',
    severity: 'alert'
  },
  {
    id: 'act-5',
    timestamp: '2 days ago, 09:00 AM',
    category: 'Contact Alert',
    title: 'Emergency Circle Relay Test',
    details: 'Automated encrypted SMS ping sent to primary contacts. Latency: 1.4s.',
    severity: 'logged'
  }
];

export const MEDICAL_CONDITIONS_LIST = [
  'Asthma / Mild Respiratory',
  'Diabetes Type 1',
  'Diabetes Type 2',
  'Hypertension (High Blood Pressure)',
  'Cardiac Arrhythmia / Atrial Fibrillation',
  'Epilepsy / Seizure Disorder',
  'Severe Allergy - Penicillin',
  'Severe Allergy - Peanuts / Nuts',
  'Severe Allergy - Latex',
  'Blood Thinners / Anticoagulants',
  'Pacemaker / ICD Implant',
  'Kidney Disease / Dialysis',
  'Chronic Migraine / Neurological',
  'Pregnancy'
];

export const WATCH_MODELS_LIST = [
  'ResQNet Watch',
  'Apple Watch Ultra 2 / Series 9',
  'Samsung Galaxy Watch 6 / 7 Pro',
  'Fitbit Sense 2 / Charge 6',
  'Garmin Venu 3 / Forerunner',
  'Noise ColorFit Pro 5',
  'boAt Wave Call / Ultima',
  'Other'
];

export const WORK_STATUS_LIST = [
  'Student',
  'College student',
  'Employed',
  'Unemployed'
];
