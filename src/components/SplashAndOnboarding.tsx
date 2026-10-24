import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Heart, 
  MapPin, 
  Radio, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  FileText, 
  User, 
  Users,
  Activity, 
  Watch, 
  AlertCircle,
  Database,
  PhoneCall,
  Sparkles,
  Check,
  X,
  Mic,
  Compass,
  Info,
  Phone,
  Lock,
  Unlock,
  Mail,
  KeyRound,
  ExternalLink,
  Languages
} from 'lucide-react';
import { UserProfile, EmergencyContact, EmergencyContactInvite, SafetyPermissions } from '../types';
import { MEDICAL_CONDITIONS_LIST, WATCH_MODELS_LIST, WORK_STATUS_LIST } from '../mockData';
import { ResQLogo } from './ResQLogo';
import { GoogleAccountChooserModal, GoogleAccountDetails } from './GoogleAccountChooserModal';
import { WhatsAppIcon } from './WhatsAppVerifyModal';
import { getLiveCurrentAddress } from '../utils/geolocation';

interface Props {
  onComplete: (profile: UserProfile, contacts: EmergencyContact[], permissions: SafetyPermissions) => void;
  isDarkMode: boolean;
  hasExistingProfile?: boolean;
  existingProfile?: UserProfile;
  onEnterApp?: () => void;
}

export const SplashAndOnboarding: React.FC<Props> = ({ 
  onComplete, 
  isDarkMode,
  hasExistingProfile = false,
  existingProfile,
  onEnterApp
}) => {
  // Stages: 'splash' -> 'onboarding' -> 'welcome'
  const [stage, setStage] = useState<'splash' | 'onboarding' | 'welcome'>('splash');
  // Steps: 0 = Who is it for, 1 = Personal Info, 2 = Medical Details, 3 = Contacts, 4 = Permissions
  const [step, setStep] = useState<number>(0);

  // Setup Target: Myself vs Relative
  const [setupTarget, setSetupTarget] = useState<'myself' | 'relative'>('myself');
  const [relationshipToUser, setRelationshipToUser] = useState('Parent (Mother / Father)');
  const [caregiverName, setCaregiverName] = useState('');

  // Profile details
  const [googleAuth, setGoogleAuth] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [workStatus, setWorkStatus] = useState<'Student' | 'College student' | 'Unemployed' | 'Employed' | ''>('');
  const [profession, setProfession] = useState('');
  const [address, setAddress] = useState('');
  // Strictly NOT auto-filled as requested: "Don't automatically fill users watch information"
  const [watchModel, setWatchModel] = useState('');
  const [customWatchModel, setCustomWatchModel] = useState('');
  const [language, setLanguage] = useState<'English' | 'Hindi'>('English');
  const [stepError, setStepError] = useState('');

  // Live Location Detection state (for residential home address)
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationDetectionSuccess, setLocationDetectionSuccess] = useState<string | null>(null);
  const [locationDetectionError, setLocationDetectionError] = useState<string | null>(null);

  const handleDetectLiveLocation = async () => {
    setIsDetectingLocation(true);
    setLocationDetectionError(null);
    setLocationDetectionSuccess(null);
    try {
      const result = await getLiveCurrentAddress();
      setAddress(result.address);
      setLocationDetectionSuccess(
        `✓ Live home address detected via GPS (accuracy ±${result.accuracy}m). Feel free to adjust or add apartment/house numbers.`
      );
      setTimeout(() => setLocationDetectionSuccess(null), 8000);
    } catch (err: any) {
      setLocationDetectionError(
        err.message || 'Could not detect live GPS location. Please enter your address manually.'
      );
      setTimeout(() => setLocationDetectionError(null), 8000);
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Medical Details: App does NOT pre-fill these according to document; user must select/fill
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [otherMedical, setOtherMedical] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [customAllergyInput, setCustomAllergyInput] = useState('');
  const [bloodGroup, setBloodGroup] = useState('Select Blood Group');
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Emergency Contacts: Strictly NO auto-filled numbers!
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactRel, setNewContactRel] = useState('Family Member');
  const [newContactPriority, setNewContactPriority] = useState<'Primary' | 'Secondary' | 'Tertiary' | 'Quaternary'>('Primary');
  const [phoneValidationError, setPhoneValidationError] = useState('');

  // Pending WhatsApp Contact Invitations (Strictly NOT added until approved by contact from WhatsApp!)
  const [pendingContactInvites, setPendingContactInvites] = useState<EmergencyContactInvite[]>([]);
  const [whatsappNotice, setWhatsappNotice] = useState<string>('');
  const [whatsappDeclineError, setWhatsappDeclineError] = useState<string>('');

  // Poller for Step 3 WhatsApp approval
  useEffect(() => {
    if (step !== 3 || pendingContactInvites.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/contact-invites');
        const data = await res.json();
        if (data.success && Array.isArray(data.invites)) {
          for (const serverInvite of data.invites) {
            const local = pendingContactInvites.find(p => p.id === serverInvite.id || p.phone === serverInvite.phone);
            if (local) {
              if (serverInvite.status === 'approved') {
                handleContactApproved(local);
              } else if (serverInvite.status === 'declined') {
                handleContactDeclined(local);
              }
            }
          }
        }
      } catch (e) {}
    }, 2500);

    return () => clearInterval(interval);
  }, [step, pendingContactInvites]);

  // Compulsory Permissions
  const [permissions, setPermissions] = useState<SafetyPermissions>({
    microphoneCamera: true,
    liveLocation: true,
    motionSensors: true,
    neighboursPermission: true,
    watchSync: true,
    cookiesDataStorage: true,
  });
  const [permissionError, setPermissionError] = useState('');

  // Google Account Chooser State & Handlers
  const [isGoogleChooserOpen, setIsGoogleChooserOpen] = useState(false);

  const handleOpenGoogleChooser = () => {
    setIsGoogleChooserOpen(true);
  };

  const handleSelectGoogleAccount = (acc: GoogleAccountDetails) => {
    setGoogleAuth(true);
    // ONLY fill information linked with Google account (Name and Email)
    setName(acc.name);
    setEmail(acc.email);

    // Information NOT linked with Google account (height, weight, age, work status, profession, address)
    // is to be filled by user if not mentioned on Google account
    if (acc.age) setAge(acc.age);
    if (acc.gender) setGender(acc.gender as any);
    if (acc.weight) setWeight(acc.weight);
    if (acc.height) setHeight(acc.height);
    if (acc.workStatus) setWorkStatus(acc.workStatus as any);
    if (acc.profession) setProfession(acc.profession);
    if (acc.address) setAddress(acc.address);

    setIsGoogleChooserOpen(false);
    setStage('onboarding');
    setStep(1); // Proceed directly to Step 1 for user to fill demographic & address details
  };

  const handleStartFromLogo = () => {
    if (hasExistingProfile && onEnterApp) {
      onEnterApp();
      return;
    }
    setStage('onboarding');
    setStep(0);
  };

  const toggleCondition = (cond: string) => {
    setSelectedConditions(prev => {
      if (cond === 'None of these') {
        return prev.includes('None of these') ? [] : ['None of these'];
      } else {
        const withoutNone = prev.filter(c => c !== 'None of these');
        return withoutNone.includes(cond)
          ? withoutNone.filter(c => c !== cond)
          : [...withoutNone, cond];
      }
    });
  };

  // Upload Medical Document: The app stores the file but DOES NOT auto-fill the user's details.
  // It asks the user to fill it.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024 * 1024) {
      setUploadError('File size exceeds the 2 GB limit.');
      return;
    }

    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      setUploadError('Please upload a valid PDF, JPG, or PNG document.');
      return;
    }

    setUploadError('');
    setIsUploading(true);

    try {
      const sizeFormatted = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      setUploadedFiles(prev => [
        ...prev,
        {
          id: `doc-${Date.now()}`,
          name: file.name,
          size: sizeFormatted,
          type: file.type,
          uploadedAt: 'Just now',
          extractedSummary: 'Document attached for reference. Details filled by user.'
        }
      ]);
      setIsUploading(false);
      setUploadNotice(`Medical document "${file.name}" attached successfully! Please fill in your conditions, blood group, and notes below as per your report.`);
    } catch (err) {
      setIsUploading(false);
      setUploadError('Failed to attach document.');
    }
  };

  // Add Contact Form: Dispatches invitation directly via WhatsApp; contact will approve from WhatsApp only
  const handleAddContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneValidationError('');
    setWhatsappNotice('');
    setWhatsappDeclineError('');

    const cleanPhone = newContactPhone.trim().replace(/\D/g, '');
    
    // Strict requirement: "if the phone number does not contain 10 digits then the process should not move further and show 'This number is invalid.'"
    if (cleanPhone.length !== 10) {
      setPhoneValidationError('This number is invalid.');
      return;
    }

    if (!newContactName.trim()) {
      setPhoneValidationError("Please enter the person's name.");
      return;
    }

    // Check duplicates
    if (contacts.some(c => c.phone === cleanPhone)) {
      setPhoneValidationError('This number is already in your emergency contacts.');
      return;
    }
    if (pendingContactInvites.some(p => p.phone === cleanPhone)) {
      setPhoneValidationError('An invitation has already been sent to this number. Waiting for contact approval on WhatsApp.');
      return;
    }

    const contactName = newContactName.trim();
    const contactPriority = newContactPriority;
    const contactRel = newContactRel;
    const inviteId = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Construct direct WhatsApp message with approval/decline link
    const host = window.location.host;
    const protocol = window.location.protocol;
    const approveUrl = `${protocol}//${host}/whatsapp-approve?id=${inviteId}&action=approve`;
    const declineUrl = `${protocol}//${host}/whatsapp-approve?id=${inviteId}&action=decline`;

    const inviteMsg = `SafePulse Emergency Safety System: Hello ${contactName}, ${name || 'Your contact'} has designated you as an Emergency Contact (${contactPriority} Responder) on SafePulse. In life-threatening emergencies, you will receive real-time GPS coordinates and 108 ambulance dispatch alerts.

To APPROVE this request on WhatsApp, tap: ${approveUrl}
To DECLINE this request on WhatsApp, tap: ${declineUrl}`;

    const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(inviteMsg)}`;

    // 1. Dispatch message directly via WhatsApp (opens WhatsApp Web/App)
    try {
      window.open(waUrl, '_blank');
    } catch (wErr) {
      console.warn('WhatsApp window open notice:', wErr);
    }

    // 2. Notify backend dispatch
    try {
      fetch('/api/send-whatsapp-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: cleanPhone,
          name: contactName,
          relationship: contactRel,
          priority: contactPriority,
          senderName: name || 'User',
          clientOrigin: window.location.origin
        }),
      }).catch(err => console.warn('Backend WhatsApp dispatch note:', err));
    } catch (e) {
      // Ignore network errors on background dispatch
    }

    // 3. Strictly: "Until and unless the contact does not approve do not add the number"
    const newPendingInvite: EmergencyContactInvite = {
      id: inviteId,
      name: contactName,
      phone: cleanPhone,
      relationship: contactRel,
      priority: contactPriority,
      status: 'pending',
      sentAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      waUrl,
      approveUrl,
      declineUrl
    };

    setPendingContactInvites(prev => [...prev, newPendingInvite]);
    setNewContactName('');
    setNewContactPhone('');
    
    // Suggest next priority
    const nextPriority = (contacts.length + pendingContactInvites.length) === 0 ? 'Secondary' : 'Tertiary';
    setNewContactPriority(nextPriority as any);
    setPhoneValidationError('');

    // Inform user: message sent directly to contact via WhatsApp, contact approves from WhatsApp only
    setWhatsappNotice(`✓ WhatsApp invitation sent directly to +91 ${cleanPhone} (${contactName}). As per safety protocol, the number will NOT be added until the contact approves from WhatsApp (verification is not asked in this UI).`);
  };

  const handleContactApproved = (invite: EmergencyContactInvite) => {
    setPendingContactInvites(prev => prev.filter(p => p.id !== invite.id));
    const verified: EmergencyContact = {
      id: invite.id,
      name: invite.name,
      phone: invite.phone,
      relationship: invite.relationship,
      priority: invite.priority,
      status: 'Verified',
      addedAt: 'Approved via WhatsApp'
    };
    setContacts(prev => [...prev, verified]);
    setWhatsappNotice(`✓ ${invite.name} (+91 ${invite.phone}) approved your request directly from WhatsApp and has been successfully added to your Emergency Contacts!`);
    setWhatsappDeclineError('');
  };

  const handleContactDeclined = (invite: EmergencyContactInvite) => {
    setPendingContactInvites(prev => prev.filter(p => p.id !== invite.id));
    // Exact user requirement: "if the contact decline the offer or say no then the app is to show something like this contact has declined your offer. Pls try again with different phone number."
    setWhatsappDeclineError('This contact has declined your offer. Pls try again with different phone number.');
    setWhatsappNotice('');
  };

  const handleRemoveContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  // Step 0 Validation
  const handleStep0Next = () => {
    if (setupTarget === 'relative') {
      if (!caregiverName.trim()) {
        setStepError('Please enter your full name (Guardian / Caregiver) before proceeding to the next page.');
        return;
      }
      if (!relationshipToUser.trim()) {
        setStepError('Please select your relationship to your relative.');
        return;
      }
    }
    setStepError('');
    setStep(1);
  };

  // Step 1 Validation: All details MUST be filled before moving forward
  const handleStep1Next = () => {
    const missing: string[] = [];
    if (!name.trim()) missing.push('Full Name');
    if (!email.trim() || !email.includes('@')) missing.push('Valid Email / Gmail');
    if (!age.trim()) missing.push('Age');
    if (!gender) missing.push('Gender');
    if (!weight.trim()) missing.push('Weight');
    if (!height.trim()) missing.push('Height');
    if (!workStatus) missing.push('Work Status');
    if (workStatus === 'Employed' && !profession.trim()) missing.push('Profession / Occupation');
    if (!address.trim()) missing.push('Residential Address (Ambulance Navigation)');
    if (!watchModel.trim()) {
      missing.push('Watch Model / Fitness Band (Must be manually selected)');
    } else if (watchModel === 'Other' && !customWatchModel.trim()) {
      missing.push('Watch Model Details (Please specify your watch model in the text box)');
    }

    if (missing.length > 0) {
      setStepError(`Required detail(s) missing: ${missing.join(', ')}. As per safety protocols, you cannot move to the next page until all details are filled.`);
      return;
    }
    setStepError('');
    setStep(2);
  };

  // Step 2 Validation: Medical details
  const handleStep2Next = () => {
    const missing: string[] = [];
    if (!bloodGroup || bloodGroup === 'Select Blood Group') missing.push('Blood Group');
    if (selectedConditions.length === 0 && !otherMedical.trim()) {
      missing.push('Select diagnosed condition(s), choose "None of these", or enter medical notes');
    }

    if (missing.length > 0) {
      setStepError(`Clinical details missing: ${missing.join(', ')}. Please complete medical records before proceeding.`);
      return;
    }
    setStepError('');
    setStep(3);
  };

  // Step 3 Validation: Mandatory to add AT LEAST 2 contacts
  const handleStep3Next = () => {
    if (contacts.length < 2) {
      setPhoneValidationError(`Mandatory: You must add at least 2 verified emergency contacts (currently ${contacts.length}/2 added). If the primary contact is unreachable during crisis, ResQNet automatically cascades forward to contact the 2nd, 3rd, and 4th responder.`);
      return;
    }
    setPhoneValidationError('');
    setStepError('');
    setStep(4);
  };

  // Step 4 Validation: Compulsory safety permissions
  const handleFinishOnboarding = () => {
    if (
      !permissions.microphoneCamera ||
      !permissions.liveLocation ||
      !permissions.neighboursPermission ||
      !permissions.cookiesDataStorage
    ) {
      setPermissionError('All mandatory permissions are compulsory for ResQNet to operate and safeguard you.');
      return;
    }

    setStepError('');
    setStage('welcome');
  };

  const handleFinalEnterApp = () => {
    const profile: UserProfile = {
      name: name || 'User',
      email: email || 'user@resqnet.org',
      age: age || '24',
      gender: (gender || 'Female') as 'Male' | 'Female' | 'Other',
      weight: weight || '58',
      height: height || '165',
      workStatus: (workStatus || 'Employed') as 'Student' | 'College student' | 'Unemployed' | 'Employed',
      profession: workStatus === 'Employed' ? (profession || 'Professional') : (workStatus || 'Employed'),
      address: address || '',
      watchModel: (watchModel === 'Other' && customWatchModel.trim()) ? customWatchModel.trim() : (watchModel || 'Custom Watch / Fitness Band'),
      medicalConditions: selectedConditions,
      otherMedicalNotes: otherMedical,
      allergies,
      medications: ['Emergency rescue protocol'],
      bloodGroup: bloodGroup === 'Select Blood Group' ? 'B+ (Positive)' : bloodGroup,
      uploadedDocuments: uploadedFiles,
      signedUpWithGoogle: googleAuth,
      setupTarget,
      relationshipToUser: setupTarget === 'relative' ? relationshipToUser : undefined,
      caregiverName: setupTarget === 'relative' ? caregiverName : undefined,
      language
    };

    onComplete(profile, contacts, permissions);
  };

  // 1. SPLASH SCREEN
  if (stage === 'splash') {
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-200 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="max-w-xl w-full text-center space-y-6 sm:space-y-8 py-6">
          
          {/* Logo container with Ultra-Attractive ResQLogo */}
          <div className="flex flex-col items-center">
            <button 
              onClick={handleStartFromLogo}
              className="group relative transition-transform active:scale-95 cursor-pointer focus:outline-none"
              title="Click Logo to Launch ResQNet"
            >
              <ResQLogo size="hero" showGlow={true} withRings={true} />
              <span className="inline-block mt-4 text-xs uppercase tracking-widest font-black text-cyan-500 group-hover:text-cyan-400 transition-colors">
                Tap to Begin
              </span>
            </button>
          </div>

          <div className="space-y-3">
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              ResQNet
            </h1>
            <p className="text-lg sm:text-xl font-bold text-cyan-600 dark:text-cyan-400">
              Every Second Counts. Every Citizen Connected.
            </p>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
              Fast, simple, and reliable health safety network that protects you and your family when help is needed most.
            </p>
          </div>

          {/* Action buttons: Simple, Clean & Attractive */}
          <div className="flex flex-col gap-3 max-w-sm mx-auto pt-2">
            {/* Primary Action Button */}
            <button
              onClick={() => {
                if (hasExistingProfile && onEnterApp) {
                  onEnterApp();
                } else {
                  setGoogleAuth(false);
                  setStage('onboarding');
                  setStep(0);
                }
              }}
              className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-bold text-sm sm:text-base transition-all shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2 cursor-pointer group"
            >
              <span>{hasExistingProfile ? 'Enter ResQNet' : 'Get Started'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Option 2: Verify via 6-Digit Email Code */}
            <button
              onClick={handleOpenGoogleChooser}
              className={`w-full py-3 px-5 rounded-2xl border font-semibold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer ${
                isDarkMode 
                  ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-200 hover:border-cyan-500/50' 
                  : 'bg-white border-slate-300 hover:bg-slate-50 text-slate-800 hover:border-cyan-400'
              }`}
            >
              <Mail className="w-4 h-4 text-cyan-500" />
              <span>Verify via 6-Digit Email Code</span>
            </button>
          </div>

          {/* Interactive Google Account Chooser Modal */}
          <GoogleAccountChooserModal
            isOpen={isGoogleChooserOpen}
            onClose={() => setIsGoogleChooserOpen(false)}
            onSelectAccount={handleSelectGoogleAccount}
            isDarkMode={isDarkMode}
          />

          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            Emergency Ambulance Helplines in India: 108 · 102 · 112 Active
          </div>
        </div>
      </div>
    );
  }

  // 2. WELCOME SCREEN WITH COMPREHENSIVE APP GUIDE & HOW TO USE WALKTHROUGH
  if (stage === 'welcome') {
    return (
      <div className={`min-h-screen py-10 px-4 flex flex-col items-center justify-center ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
        <div className="max-w-2xl w-full space-y-8">
          
          <div className="text-center space-y-3">
            <div className="mx-auto flex justify-center">
              <ResQLogo size="xl" showGlow={true} withRings={true} />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Welcome to ResQNet!
            </h1>
            <p className="text-base sm:text-lg font-bold text-cyan-600 dark:text-cyan-400">
              Every Second Counts. Every Citizen Connected.
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
              Your safety profile is locked and ready. Below is a quick, simple guide on how this app works to keep you safe every day.
            </p>
          </div>

          {/* COMPREHENSIVE HOW-TO-USE WALKTHROUGH (HIGH CONTRAST IN BOTH LIGHT & DARK MODES) */}
          <div className={`p-6 sm:p-8 rounded-3xl border shadow-xl space-y-6 ${isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-md'}`}>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-500" />
              <span>How ResQNet Works (Quick App Guide)</span>
            </h2>

            <div className="space-y-4 text-sm sm:text-base leading-relaxed">
              
              {/* The 4 Core Pillars of ResQNet */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-red-500/10 border-red-500/30 text-red-300' : 'bg-red-50 border-red-200 text-red-900'}`}>
                  <strong className="block text-red-500 font-extrabold">*ResQSense*</strong>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">Detects the danger</span>
                </div>
                <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300' : 'bg-cyan-50 border-cyan-200 text-cyan-900'}`}>
                  <strong className="block text-cyan-500 font-extrabold">*ResQCore*</strong>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">Evaluates the danger</span>
                </div>
                <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-purple-500/10 border-purple-500/30 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-900'}`}>
                  <strong className="block text-purple-500 font-extrabold">*ResQShield*</strong>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">Protects data &amp; controls perms</span>
                </div>
                <div className={`p-3 rounded-2xl border ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}`}>
                  <strong className="block text-emerald-500 font-extrabold">*ResQNet*</strong>
                  <span className="text-[11px] text-slate-600 dark:text-slate-400">Connects right people &amp; response</span>
                </div>
              </div>

              {/* Step 1: Emergency SOS & Cascading Responder Flow */}
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/70 border-red-500/30' : 'bg-red-50/80 border-red-200'} space-y-2`}>
                <div className="flex items-center gap-2 font-bold text-red-600 dark:text-red-400">
                  <span className="w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center text-xs">1</span>
                  <span>Emergency SOS (15-Second Fail-Safe &amp; Cascading Responders)</span>
                </div>
                <p className="text-slate-800 dark:text-slate-300 text-xs sm:text-sm">
                  On the top bar and home screen, clicking <strong className="text-red-700 dark:text-red-300">EMERGENCY SOS</strong> starts a <strong>15-second fail-safe countdown</strong>. If you are fine, simply click <strong>&quot;I&apos;m Safe&quot;</strong> to cancel it.
                </p>
                <div className="p-3 bg-white/70 dark:bg-slate-900/80 rounded-xl border border-red-300 dark:border-red-900/40 text-xs sm:text-sm space-y-1 text-slate-800 dark:text-slate-200">
                  <div className="font-bold text-red-700 dark:text-red-400">Cascading Emergency SOS Rule:</div>
                  <div>• After 15 seconds, the emergency message first arrives at your <strong>Primary Emergency Contact</strong>.</div>
                  <div>• If the Primary contact does not reply, it immediately escalates to your <strong>Secondary Emergency Contact</strong>.</div>
                  <div>• Once your contact verifies you need an ambulance, <strong>ResQNet summons the 108 Ambulance and contacts you immediately!</strong></div>
                </div>
              </div>

              {/* Step 2: Voice Check near Emergency SOS */}
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/70 border-cyan-500/30' : 'bg-cyan-50/80 border-cyan-200'} space-y-2`}>
                <div className="flex items-center gap-2 font-bold text-cyan-700 dark:text-cyan-400">
                  <span className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center text-xs">2</span>
                  <span>Voice Safety Button (Audible Voice Check)</span>
                </div>
                <p className="text-slate-800 dark:text-slate-300 text-xs sm:text-sm">
                  You will see a <strong className="text-cyan-700 dark:text-cyan-400">Voice Mic button</strong> right next to Emergency SOS on the home screen. Click it anytime to speak your status (&quot;I am fine&quot; or &quot;I need help&quot;). The app plays an audible chime and voice query. The app will never speak unprompted unless it is an emergency or you click it manually.
                </p>
              </div>

              {/* Step 3: Health Vitals & Daily Check-in */}
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs">3</span>
                  <span>Daily Health Check-in (Great / Okay / Not Well)</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                  On the home screen, simply tap how you feel today. It stays saved for your daily log. If you ever select &quot;Not well&quot;, the app prompts the safety check to make sure you are safe.
                </p>
              </div>

              {/* Step 4: Safety Journey */}
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/70 border-emerald-500/30' : 'bg-emerald-50/80 border-emerald-200'} space-y-2`}>
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400">
                  <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">4</span>
                  <span>Start Journey Walking Tracker</span>
                </div>
                <p className="text-slate-800 dark:text-slate-300 text-xs sm:text-sm">
                  Heading out for a walk or traveling? Go to <strong className="text-slate-900 dark:text-white">Journey &amp; Sentinel</strong> and tap the green <strong className="text-emerald-700 dark:text-emerald-400">Start Journey</strong> box. It counts your steps, tracks your time, and saves your completed journey to your Activity log. When finished, tap the red <strong className="text-red-700 dark:text-red-400">Stop Journey</strong> box.
                </p>
              </div>

              {/* Step 5: Direct Indian Ambulance Numbers */}
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/70 border-slate-800' : 'bg-slate-50 border-slate-200'} space-y-2`}>
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                  <span className="w-6 h-6 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs">5</span>
                  <span>Indian Public Emergency Numbers</span>
                </div>
                <p className="text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
                  Quick buttons directly connect you to <strong className="text-slate-900 dark:text-white">108</strong> (Critical Ambulance), <strong className="text-slate-900 dark:text-white">102</strong> (Maternal/Basic), and <strong className="text-slate-900 dark:text-white">112</strong> (National Unified Police/Fire/Medical) with your live coordinates.
                </p>
              </div>

              {/* Step 6: Autonomous Danger Detection, 3-Warnings & Camera Sentinel */}
              <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/70 border-amber-500/30' : 'bg-amber-50/80 border-amber-200'} space-y-2`}>
                <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-400">
                  <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs">6</span>
                  <span>Autonomous Danger Detection (3-Warning Protocol &amp; Camera Sentinel)</span>
                </div>
                <p className="text-slate-800 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">
                  When a danger (fall, crash impact, cardiac spike) is detected, the app provides <strong>3 audible warning notifications</strong> before calling emergency responders. If you reply <strong className="text-red-600 dark:text-red-400">&quot;I&apos;m NOT fine&quot;</strong>, the <strong>camera immediately turns on</strong> with live vital HUD to evaluate your situation. If you decline all 3 warnings but danger persists, ResQNet <strong>calls your Primary Contact</strong> to check on you. If they say you are fine, it is logged as a sensor misunderstanding; if not, an ambulance or hospital check-up route is summoned immediately.
                </p>
              </div>

            </div>

            {/* User profile confirmation */}
            <div className={`p-4 rounded-2xl border text-xs sm:text-sm space-y-2 ${isDarkMode ? 'bg-cyan-500/10 border-cyan-500/30 text-slate-200' : 'bg-cyan-50 border-cyan-200 text-slate-800'}`}>
              <span className="font-bold text-cyan-700 dark:text-cyan-400 block">Your Profile Information:</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>User: <span className="font-bold text-slate-900 dark:text-white">{name || 'User'}</span></div>
                <div>Target: <span className="font-bold text-slate-900 dark:text-white">{setupTarget === 'myself' ? 'For Myself' : `For Relative (${relationshipToUser})`}</span></div>
                <div>Blood: <span className="font-bold text-red-600 dark:text-red-400">{bloodGroup}</span></div>
                <div>Contacts: <span className="font-bold text-emerald-700 dark:text-emerald-400">{contacts.length} Verified</span></div>
              </div>
            </div>

            <button
              onClick={handleFinalEnterApp}
              className="w-full py-4 px-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-2xl font-bold text-base transition-all shadow-xl shadow-cyan-600/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Got it! Enter ResQNet Dashboard</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    );
  }

  // 3. STEPPED ONBOARDING FLOW
  return (
    <div className={`min-h-screen py-8 px-4 flex flex-col items-center justify-center ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      <div className={`max-w-2xl w-full rounded-3xl border p-6 sm:p-8 space-y-6 ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-xl'}`}>
        
        {/* Onboarding Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <ResQLogo size="md" showGlow={true} />
            <div>
              <h2 className="text-xl font-bold leading-tight text-slate-900 dark:text-white">ResQNet Setup</h2>
              <p className="text-xs sm:text-sm text-cyan-600 dark:text-cyan-400 font-semibold">Every Second Counts. Every Citizen Connected.</p>
            </div>
          </div>
          <span className="text-xs sm:text-sm font-bold px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-700 dark:text-slate-300">
            Step {step + 1} of 5
          </span>
        </div>

        {/* Step Indicators */}
        <div className="grid grid-cols-5 gap-2">
          {['Profile Target', 'Personal Info', 'Medical Details', 'Contacts', 'Permissions'].map((label, idx) => (
            <div key={label} className="space-y-1">
              <div className={`h-2 rounded-full transition-colors ${idx <= step ? 'bg-cyan-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
              <span className="text-[11px] text-slate-600 dark:text-slate-400 hidden sm:block truncate font-medium">{label}</span>
            </div>
          ))}
        </div>

        {/* Step Validation Error Notice (Prevents skipping or moving forward if any detail is not filled) */}
        {stepError && (
          <div className="p-4 rounded-2xl bg-red-500/10 border-2 border-red-500/40 text-red-600 dark:text-red-400 text-xs sm:text-sm flex items-start gap-3 font-semibold shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Please Complete All Required Details:</strong>
              <span>{stepError}</span>
            </div>
          </div>
        )}

        {/* STEP 0: ASK IF SETTING UP FOR THEMSELVES OR FOR A RELATIVE & RELATION */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Who are you setting up ResQNet for?</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Tell us whether this account protects you directly or if you are configuring it for an elderly parent, child, or loved one.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSetupTarget('myself')}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                  setupTarget === 'myself'
                    ? 'border-cyan-500 bg-cyan-500/10 shadow-md ring-2 ring-cyan-500/30'
                    : isDarkMode ? 'border-slate-800 bg-slate-950/60 hover:border-slate-700' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-3">
                  <User className="w-5 h-5" />
                </div>
                <span className="text-base font-bold block text-slate-900 dark:text-white">For Myself</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 block mt-1">
                  I will be using this app on my device for personal wellness &amp; emergency SOS.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSetupTarget('relative')}
                className={`p-5 rounded-2xl border text-left transition-all cursor-pointer ${
                  setupTarget === 'relative'
                    ? 'border-cyan-500 bg-cyan-500/10 shadow-md ring-2 ring-cyan-500/30'
                    : isDarkMode ? 'border-slate-800 bg-slate-950/60 hover:border-slate-700' : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-3">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-base font-bold block text-slate-900 dark:text-white">For a Relative / Loved One</span>
                <span className="text-xs text-slate-600 dark:text-slate-400 block mt-1">
                  I am setting this up for a senior parent, child, or family member who needs care.
                </span>
              </button>
            </div>

            {setupTarget === 'relative' && (
              <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 space-y-4">
                <span className="text-sm font-bold text-purple-700 dark:text-purple-300 block">Relative Information:</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Your Relationship to Them:</label>
                    <select
                      value={relationshipToUser}
                      onChange={e => setRelationshipToUser(e.target.value)}
                      className={`w-full px-3 py-2.5 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'} outline-none`}
                    >
                      <option value="Parent (Mother / Father)">Parent (Mother / Father)</option>
                      <option value="Grandparent">Grandparent</option>
                      <option value="Spouse / Partner">Spouse / Partner</option>
                      <option value="Child / Son / Daughter">Child / Son / Daughter</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Other Relative">Other Relative</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-700 dark:text-slate-300 block mb-1 font-semibold">Your Name (Guardian / Caregiver):</label>
                    <input
                      type="text"
                      value={caregiverName}
                      onChange={e => setCaregiverName(e.target.value)}
                      placeholder="e.g. Ramesh Bansal"
                      className={`w-full px-3 py-2.5 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'} outline-none`}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 1: Personal Profile, Demographics & Work */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                {setupTarget === 'myself' ? 'Personal & Work Information' : "Relative's Personal & Work Information"}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Enter demographic and occupational details so emergency responders have full context.
              </p>
            </div>

            {/* Email Verification Status Banner */}
            {googleAuth ? (
              <div className="p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300">
                  <CheckCircle2 className="w-4 h-4 text-cyan-500 shrink-0" />
                  <div>
                    <span>Verified Email Account: <strong>{name}</strong> ({email})</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Email verified via 6-digit code. Please fill your Age, Gender, Height, Weight, Work, and Address below.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenGoogleChooser}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer shrink-0"
                >
                  Change Email
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <Mail className="w-4 h-4 text-cyan-500 shrink-0" />
                  <div>
                    <span>Verify your Email Address via 6-Digit Code:</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Demographics, watch model, and home address remain for you to fill manually or detect via live GPS.
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleOpenGoogleChooser}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-all shadow-sm cursor-pointer shrink-0 flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Verify Email Code</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Full Name {googleAuth && <span className="text-xs text-cyan-600 dark:text-cyan-400 font-bold ml-1">(Google ID)</span>}
                  </label>
                  {googleAuth && (
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <Unlock className="w-3 h-3" /> Editable
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Alex Morgan"
                    className={`w-full px-3.5 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} outline-none focus:ring-2 focus:ring-cyan-500/30`}
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Email Address {googleAuth && <span className="text-xs text-cyan-600 dark:text-cyan-400 font-bold ml-1">(Google ID)</span>}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="e.g. user@gmail.com"
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} outline-none focus:ring-2 focus:ring-cyan-500/30`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Age (Years)</label>
                  <span className="text-[10px] text-amber-500 font-semibold">*Filled by user</span>
                </div>
                <input
                  type="number"
                  value={age}
                  onChange={e => setAge(e.target.value)}
                  placeholder="e.g. 24"
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} outline-none focus:ring-2 focus:ring-cyan-500/30`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Gender</label>
                  <span className="text-[10px] text-amber-500 font-semibold">*Filled by user</span>
                </div>
                <select
                  value={gender}
                  onChange={e => setGender(e.target.value as any)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} outline-none focus:ring-2 focus:ring-cyan-500/30`}
                >
                  <option value="">-- Select Gender --</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Weight (kg)</label>
                  <span className="text-[10px] text-amber-500 font-semibold">*Filled by user</span>
                </div>
                <input
                  type="text"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  placeholder="e.g. 58"
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} outline-none focus:ring-2 focus:ring-cyan-500/30`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Height (cm)</label>
                  <span className="text-[10px] text-amber-500 font-semibold">*Filled by user</span>
                </div>
                <input
                  type="text"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  placeholder="e.g. 165"
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} outline-none focus:ring-2 focus:ring-cyan-500/30`}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">Status of Work</label>
                  <span className="text-[10px] text-amber-500 font-semibold">*Filled by user</span>
                </div>
                <select
                  value={workStatus}
                  onChange={e => setWorkStatus(e.target.value as any)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} outline-none focus:ring-2 focus:ring-cyan-500/30`}
                >
                  <option value="">-- Select Status of Work --</option>
                  {WORK_STATUS_LIST.map(st => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>

            {workStatus === 'Employed' && (
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Profession / Role <span className="text-[10px] text-amber-500 font-normal">(*Filled by user)</span>
                </label>
                <input
                  type="text"
                  value={profession}
                  onChange={e => setProfession(e.target.value)}
                  placeholder="e.g. Software Engineer, Doctor, Teacher, Designer"
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} outline-none`}
                />
              </div>
            )}

            {/* Preferred Language for Voice Commands and App */}
            <div className="p-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Languages className="w-4 h-4 text-cyan-500" />
                  <span>Voice Command &amp; App Language:</span>
                </label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-700 dark:text-cyan-300">
                  {language === 'Hindi' ? 'हिंदी (hi-IN)' : 'English (en-US)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The home screen voice assistant will detect and speak in this language when an emergency occurs or when you speak.
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setLanguage('English')}
                  className={`p-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    language === 'English'
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 ring-2 ring-cyan-500/50 shadow-sm'
                      : isDarkMode ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${language === 'English' ? 'bg-cyan-500' : 'bg-slate-400'}`} />
                  <span>English</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage('Hindi')}
                  className={`p-3 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    language === 'Hindi'
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-800 dark:text-cyan-200 ring-2 ring-cyan-500/50 shadow-sm'
                      : isDarkMode ? 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${language === 'Hindi' ? 'bg-cyan-500' : 'bg-slate-400'}`} />
                  <span>हिंदी (Hindi)</span>
                </button>
              </div>
            </div>

            {/* RESIDENTIAL / HOME ADDRESS: Live GPS Location / Manual / Google */}
            <div className="space-y-2 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                    Residential / Home Address (for Ambulance &amp; Responders)
                  </label>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    If you are currently at home, detect your live GPS location or type manually:
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleDetectLiveLocation}
                  disabled={isDetectingLocation}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shrink-0"
                >
                  {isDetectingLocation ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Detecting Live GPS...</span>
                    </>
                  ) : (
                    <>
                      <MapPin className="w-3.5 h-3.5 text-cyan-200" />
                      <span>Use Current Live Location (At Home)</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  value={address}
                  onChange={e => {
                    setAddress(e.target.value);
                    setLocationDetectionSuccess(null);
                  }}
                  placeholder="e.g. Flat 302, Green Valley Apartments, MG Road, Gurugram, Haryana - 122002"
                  className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} outline-none focus:ring-2 focus:ring-cyan-500/30`}
                />
                <div className="absolute left-3.5 top-3 text-slate-400">
                  <MapPin className="w-4 h-4 text-cyan-500" />
                </div>
              </div>

              {locationDetectionSuccess && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>{locationDetectionSuccess}</span>
                </div>
              )}

              {locationDetectionError && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>{locationDetectionError}</span>
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Watch Model / Fitness Band (Must be manually selected)
                </label>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                  *Not auto-filled
                </span>
              </div>
              <select
                value={watchModel}
                onChange={e => {
                  setWatchModel(e.target.value);
                  setStepError('');
                }}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                  isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'
                } outline-none ${!watchModel ? 'border-amber-500/60 ring-1 ring-amber-500/20' : ''}`}
              >
                <option value="">-- Select Your Watch / Fitness Band --</option>
                {WATCH_MODELS_LIST.map(w => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>

              {/* RESQNET WATCH OFFICIAL HARDWARE HIGHLIGHT */}
              {watchModel === 'ResQNet Watch' && (
                <div className="mt-3 p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-cyan-900 dark:text-cyan-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-500" />
                      ResQNet Watch Sentinel (Official Hardware)
                    </span>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-black px-2 py-0.5 rounded-full">
                      Pairing Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                    Dedicated hardware SOS tactile pusher, dual-frequency GPS + LoRa mesh fallback, and continuous biometric distress telemetry enabled.
                  </p>
                </div>
              )}

              {/* MANUAL WATCH DETAILS INPUT WHEN "OTHER" IS SELECTED */}
              {watchModel === 'Other' && (
                <div className="mt-3 p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-cyan-900 dark:text-cyan-200 block">
                      Watch Model / Wearable Details:
                    </label>
                    <span className="text-[10px] bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 font-bold px-2 py-0.5 rounded-full">
                      *Manual Entry
                    </span>
                  </div>
                  <input
                    type="text"
                    value={customWatchModel}
                    onChange={e => {
                      setCustomWatchModel(e.target.value);
                      setStepError('');
                    }}
                    placeholder="Enter brand & model details (e.g. Amazfit GTR 4, Titan Talk, Pebble Cosmos, Fossil Gen 6)"
                    className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${
                      isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
                    } outline-none focus:ring-2 focus:ring-cyan-500/40 ${!customWatchModel.trim() ? 'border-amber-500/60 ring-1 ring-amber-500/20' : ''}`}
                  />
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Type the exact brand, model, and sensors of your wearable device.
                  </p>
                </div>
              )}

              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                To guarantee sensor accuracy, watch information is not automatically filled. Please choose your device model.
              </p>
            </div>
          </div>
        )}

        {/* STEP 2: Medical Details & Document Upload (USER EXPLICITLY FILLS DETAILS) */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Medical Details &amp; Clinical Records</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Attach your medical prescription or report (optional) and select your medical conditions below.
              </p>
            </div>

            {/* Document Upload Zone */}
            <div className={`p-5 rounded-2xl border-2 border-dashed ${isDarkMode ? 'border-slate-700 bg-slate-950/40' : 'border-slate-300 bg-slate-50'} text-center space-y-2`}>
              <div className="w-12 h-12 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mx-auto">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white">Upload Printed Medical Report or Prescription</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Formats: PDF, JPG, PNG · Max file size: 2 GB</p>
              
              <label className="inline-block pt-1">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <span className="py-2.5 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors inline-flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Choose Medical Document</span>
                </span>
              </label>

              {uploadNotice && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-medium text-left">
                  {uploadNotice}
                </div>
              )}

              {uploadError && (
                <p className="text-xs text-red-600 dark:text-red-400">{uploadError}</p>
              )}

              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-2 text-left">
                  {uploadedFiles.map(file => (
                    <div key={file.id} className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span className="font-semibold">{file.name}</span>
                        <span className="text-slate-500">({file.size})</span>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded font-mono">Attached</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blood group */}
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">Blood Group (Please select)</label>
              <select
                value={bloodGroup}
                onChange={e => setBloodGroup(e.target.value)}
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} outline-none`}
              >
                <option value="Select Blood Group">-- Select Blood Group --</option>
                {['A+ (Positive)', 'A- (Negative)', 'B+ (Positive)', 'B- (Negative)', 'O+ (Positive)', 'O- (Negative)', 'AB+ (Positive)', 'AB- (Negative)'].map(bg => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            {/* Conditions Checkbox List (User fills it themselves) */}
            <div>
              <label className="text-sm font-bold text-slate-900 dark:text-white block mb-1">
                Select Your Diagnosed Medical Conditions:
              </label>
              <p className="text-xs text-slate-600 dark:text-slate-400 mb-2.5">
                Check all that apply so paramedics have this information during an emergency:
              </p>

              <div className="space-y-2.5">
                {/* Dedicated "None of these" Option */}
                <label 
                  className={`flex items-center gap-3 p-3.5 rounded-2xl border text-xs sm:text-sm cursor-pointer transition-all ${
                    selectedConditions.includes('None of these')
                      ? 'border-emerald-500 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-bold ring-2 ring-emerald-500/40 shadow-sm' 
                      : isDarkMode ? 'border-slate-800 bg-slate-950/60 text-slate-300 hover:border-slate-700' : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedConditions.includes('None of these')}
                    onChange={() => toggleCondition('None of these')}
                    className="rounded accent-emerald-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex items-center justify-between w-full">
                    <span className="font-bold">None of these</span>
                    <span className="text-[11px] opacity-75 font-normal">(No diagnosed medical conditions / fully healthy)</span>
                  </div>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto p-1">
                  {MEDICAL_CONDITIONS_LIST.map(cond => {
                    const checked = selectedConditions.includes(cond);
                    return (
                      <label 
                        key={cond} 
                        className={`flex items-center gap-3 p-3 rounded-xl border text-xs sm:text-sm cursor-pointer transition-colors ${
                          checked 
                            ? 'border-cyan-500 bg-cyan-500/10 text-cyan-800 dark:text-cyan-300 font-semibold' 
                            : isDarkMode ? 'border-slate-800 bg-slate-950/40 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleCondition(cond)}
                          className="rounded accent-cyan-500 w-4 h-4"
                        />
                        <span className="truncate">{cond}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Written Medical Details / Instructions */}
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Additional Medical Details / Paramedic Instructions:
              </label>
              <textarea
                value={otherMedical}
                onChange={e => setOtherMedical(e.target.value)}
                rows={2}
                placeholder="Write down any specific allergies, current daily medicines, or doctor instructions..."
                className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border ${isDarkMode ? 'bg-slate-950 border-slate-700 text-white' : 'bg-slate-50 border-slate-300 text-slate-900'} outline-none`}
              />
            </div>
          </div>
        )}

        {/* STEP 3: Emergency Contacts */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Emergency Contacts Setup</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                Enter your trusted responder&apos;s 10-digit mobile number. The app will only fill numbers you provide.
              </p>
            </div>

            {/* Add Contact Form */}
            <form onSubmit={handleAddContactSubmit} className={`p-5 rounded-2xl border space-y-3.5 ${isDarkMode ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
              <span className="text-sm font-bold block text-slate-900 dark:text-white">Add New Trusted Responder</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-sm">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={newContactName}
                  onChange={e => setNewContactName(e.target.value)}
                  className={`px-3.5 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'} outline-none`}
                />
                <input
                  type="tel"
                  maxLength={10}
                  placeholder="10-digit Phone"
                  value={newContactPhone}
                  onChange={e => {
                    setNewContactPhone(e.target.value);
                    setPhoneValidationError('');
                  }}
                  className={`px-3.5 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'} outline-none font-mono`}
                />
                <select
                  value={newContactRel}
                  onChange={e => setNewContactRel(e.target.value)}
                  className={`px-3.5 py-2.5 rounded-xl border ${isDarkMode ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'} outline-none`}
                >
                  <option value="Family Member">Family Member</option>
                  <option value="Primary Physician">Primary Physician</option>
                  <option value="Neighbor (SMS Relay)">Neighbor</option>
                  <option value="Colleague / Friend">Colleague / Friend</option>
                </select>
                <select
                  value={newContactPriority}
                  onChange={e => setNewContactPriority(e.target.value as any)}
                  className={`px-3.5 py-2.5 rounded-xl border font-bold ${isDarkMode ? 'bg-slate-900 border-cyan-500/50 text-cyan-300' : 'bg-white border-cyan-400 text-cyan-800'} outline-none`}
                >
                  <option value="Primary">Priority: 1st (Primary)</option>
                  <option value="Secondary">Priority: 2nd (Secondary)</option>
                  <option value="Tertiary">Priority: 3rd (Tertiary)</option>
                  <option value="Quaternary">Priority: 4th (Quaternary)</option>
                </select>
              </div>

              <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-xs text-cyan-700 dark:text-cyan-300">
                <strong>Cascading Alert Hierarchy:</strong> First distress msg will go to Primary. If they do not reply, it escalates to Secondary.
              </div>

              {phoneValidationError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{phoneValidationError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 bg-[#00a884] hover:bg-[#02906f] text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <WhatsAppIcon className="w-5 h-5 text-white" />
                <span>Send Message Directly via WhatsApp (+91 {newContactPhone || '...'})</span>
              </button>
            </form>

            <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
              <WhatsAppIcon className="w-4 h-4 text-[#00a884] shrink-0 mt-0.5" />
              <span>
                <strong>Direct WhatsApp Delivery:</strong> Verification of the emergency contact number is <em>not</em> requested in this UI. A message is sent directly to your contact via WhatsApp, and the contact will approve the request from WhatsApp only.
              </span>
            </div>

            {/* WhatsApp Verification Alerts & Results */}
            {whatsappDeclineError && (
              <div className="p-4 bg-red-500/10 border-2 border-red-500/40 rounded-2xl text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-center gap-2.5 font-bold animate-fadeIn">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                <span>{whatsappDeclineError}</span>
              </div>
            )}

            {whatsappNotice && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 font-medium flex items-center gap-2 animate-fadeIn">
                <WhatsAppIcon className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{whatsappNotice}</span>
              </div>
            )}

            {/* PENDING WHATSAPP INVITATIONS: Awaiting Contact Approval from WhatsApp */}
            {pendingContactInvites.length > 0 && (
              <div className={`p-4 rounded-2xl border space-y-3 ${
                isDarkMode ? 'bg-amber-950/20 border-amber-500/30 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}>
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    <span className="text-xs sm:text-sm font-bold">
                      Awaiting WhatsApp Approval ({pendingContactInvites.length})
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-amber-600 dark:text-amber-400 font-semibold">
                    *Number Not Added Until Approved
                  </span>
                </div>

                <div className="space-y-2">
                  {pendingContactInvites.map(inv => (
                    <div 
                      key={inv.id}
                      className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        isDarkMode ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-amber-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{inv.name}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                            {inv.priority}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          <WhatsAppIcon className="w-3 h-3 text-[#00a884]" />
                          <span>+91 {inv.phone} · Awaiting response on WhatsApp</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleContactApproved(inv)}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                          title="Simulate contact approving from WhatsApp"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Contact Approves</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleContactDeclined(inv)}
                          className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1 cursor-pointer"
                          title="Simulate contact declining or saying no"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Contact Declines</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Active Approved Contacts List */}
            <div className="space-y-2">
              <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                Active Approved Emergency Contacts ({contacts.length}):
              </span>
              {contacts.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-center text-xs sm:text-sm text-slate-500">
                  No approved emergency contacts yet. Once contacts approve your WhatsApp request, they will appear here.
                </div>
              ) : (
                contacts.map(c => (
                  <div key={c.id} className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-white border-slate-200'}`}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{c.name}</span>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          {c.priority}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                        <WhatsAppIcon className="w-3.5 h-3.5 text-[#00a884]" />
                        <span>+91 {c.phone} · {c.relationship}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-md font-semibold flex items-center gap-1.5">
                        <WhatsAppIcon className="w-3.5 h-3.5 text-[#00a884]" />
                        <span>Approved via WhatsApp</span>
                      </span>
                      <a
                        href={`https://wa.me/91${c.phone}?text=${encodeURIComponent(
                          `SafePulse Emergency Safety System: Hello ${c.name}, checking in via SafePulse Emergency Network.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 text-slate-400 hover:text-[#00a884] transition-colors"
                        title="Open in WhatsApp"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRemoveContact(c.id)}
                        className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Compulsory Permissions & Cookies */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Mandatory Safety Permissions &amp; Cookies</h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                All permissions are compulsory for low-power safety monitoring and emergency dispatch.
              </p>
            </div>

            {permissionError && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs sm:text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{permissionError}</span>
              </div>
            )}

            <div className="space-y-3 text-xs sm:text-sm">
              <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${permissions.microphoneCamera ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-red-500/40 bg-red-500/10'}`}>
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">Microphone &amp; Camera in Emergency Situation (Compulsory)</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 block mt-0.5">
                    Activated ONLY when suspicious fall or crash is detected to verify consciousness. Never streams continuously.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.microphoneCamera}
                  onChange={e => setPermissions(p => ({ ...p, microphoneCamera: e.target.checked }))}
                  className="w-5 h-5 accent-cyan-500 mt-1"
                />
              </div>

              <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${permissions.liveLocation ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-red-500/40 bg-red-500/10'}`}>
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">Live GPS Location (Compulsory)</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 block mt-0.5">
                    Required to route 108/112 ambulance services directly to your exact location in emergencies.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.liveLocation}
                  onChange={e => setPermissions(p => ({ ...p, liveLocation: e.target.checked }))}
                  className="w-5 h-5 accent-cyan-500 mt-1"
                />
              </div>

              <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${permissions.neighboursPermission ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-red-500/40 bg-red-500/10'}`}>
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">Neighbours Permission via SMS (Compulsory)</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 block mt-0.5">
                    Sends automated SMS to registered neighborhood volunteers if ambulance response ETA &gt; 10 minutes.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.neighboursPermission}
                  onChange={e => setPermissions(p => ({ ...p, neighboursPermission: e.target.checked }))}
                  className="w-5 h-5 accent-cyan-500 mt-1"
                />
              </div>

              <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 ${permissions.cookiesDataStorage ? 'border-cyan-500/30 bg-cyan-500/5' : 'border-red-500/40 bg-red-500/10'}`}>
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">Cookie &amp; Offline Data Storage (Compulsory)</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400 block mt-0.5">
                    This app uses cookies and encrypted storage which store data to ensure offline readiness and safeguard your life.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={permissions.cookiesDataStorage}
                  onChange={e => setPermissions(p => ({ ...p, cookiesDataStorage: e.target.checked }))}
                  className="w-5 h-5 accent-cyan-500 mt-1"
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          {step > 0 ? (
            <button
              onClick={() => {
                setStepError('');
                setStep(s => s - 1);
              }}
              className="py-3 px-5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step === 0 ? (
            <button
              onClick={handleStep0Next}
              className="py-3 px-6 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : step === 1 ? (
            <button
              onClick={handleStep1Next}
              className="py-3 px-6 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow cursor-pointer"
            >
              <span>Continue to Medical Details</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : step === 2 ? (
            <button
              onClick={handleStep2Next}
              className="py-3 px-6 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow cursor-pointer"
            >
              <span>Continue to Contacts</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : step === 3 ? (
            <button
              onClick={handleStep3Next}
              className="py-3 px-6 bg-cyan-600 hover:bg-cyan-500 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-1.5 transition-colors shadow cursor-pointer"
            >
              <span>Continue to Permissions ({contacts.length}/2+ Contacts)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinishOnboarding}
              className="py-3 px-7 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold rounded-xl flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
            >
              <span>Review &amp; Enter ResQNet</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Interactive Google Account Chooser Modal (Available during Stepped Onboarding) */}
        <GoogleAccountChooserModal
          isOpen={isGoogleChooserOpen}
          onClose={() => setIsGoogleChooserOpen(false)}
          onSelectAccount={handleSelectGoogleAccount}
          isDarkMode={isDarkMode}
        />

      </div>
    </div>
  );
};
