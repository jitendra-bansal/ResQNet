export interface UserProfile {
  name: string;
  email: string;
  age: string;
  gender: 'Male' | 'Female' | 'Other';
  weight: string; // in kg
  height: string; // in cm
  workStatus: 'Student' | 'College student' | 'Unemployed' | 'Employed';
  profession: string;
  address: string;
  watchModel: string;
  medicalConditions: string[];
  otherMedicalNotes: string;
  allergies: string[];
  medications: string[];
  bloodGroup: string;
  uploadedDocuments: MedicalDocument[];
  signedUpWithGoogle: boolean;
  setupTarget: 'myself' | 'relative';
  relationshipToUser?: string;
  caregiverName?: string;
  language: 'English' | 'Hindi';
}

export interface MedicalDocument {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
  extractedSummary?: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string; // exactly 10 digits
  relationship: string;
  priority: 'Primary' | 'Secondary' | 'Tertiary' | 'Quaternary';
  status: 'Verified' | 'Pending' | 'Declined';
  addedAt: string;
}

export interface EmergencyContactInvite {
  id: string;
  phone: string;
  name: string;
  relationship: string;
  priority: 'Primary' | 'Secondary' | 'Tertiary' | 'Quaternary';
  status: 'pending' | 'approved' | 'declined';
  sentAt: string;
  waUrl?: string;
  approveUrl?: string;
  declineUrl?: string;
}

export interface SafetyPermissions {
  microphoneCamera: boolean; // Compulsory in emergency
  liveLocation: boolean; // Compulsory
  motionSensors: boolean; // Compulsory
  neighboursPermission: boolean; // Compulsory via SMS
  watchSync: boolean;
  cookiesDataStorage: boolean; // Compulsory
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'emergency' | 'sms' | 'system' | 'checkin' | 'feature' | 'update';
  timestamp: string;
  read: boolean;
}

export interface VitalsData {
  bpSys: number;
  bpDia: number;
  pulse: number;
  spo2: number;
  hrv: number;
  bodyTemperature: number; // in °F (e.g. 98.6)
  cardiacRhythm: string;
  lastUpdated: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  category: 'Check-in' | 'Sensor Monitor' | 'Journey' | 'Contact Alert' | 'Safety Insight';
  title: string;
  details: string;
  severity: 'nominal' | 'alert' | 'logged';
}

export interface JourneySession {
  id: string;
  startTime: string;
  endTime?: string;
  durationSeconds: number;
  stepsWalked: number;
  status: 'active' | 'completed';
}
