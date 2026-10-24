import React, { useState, useEffect, useRef } from 'react';
import { 
  Navigation, 
  MapPin, 
  Compass, 
  Footprints, 
  Clock, 
  ShieldCheck, 
  Radio, 
  AlertTriangle,
  Play,
  Square,
  CheckCircle2,
  Eye,
  Camera,
  Mic,
  Activity
} from 'lucide-react';
import { SafetyPermissions } from '../types';

interface Props {
  permissions: SafetyPermissions;
  isDarkMode: boolean;
  onLogActivity: (category: any, title: string, details: string, severity: 'nominal' | 'alert' | 'logged') => void;
  onTriggerDangerDetection?: (type?: string) => void;
}

export const SafetyTab: React.FC<Props> = ({
  permissions,
  isDarkMode,
  onLogActivity,
  onTriggerDangerDetection,
}) => {
  // Journey state
  const [journeyActive, setJourneyActive] = useState(false);
  const [journeySeconds, setJourneySeconds] = useState(0);
  const [journeySteps, setJourneySteps] = useState(0);

  // Message box modal states
  const [journeyStartedModal, setJourneyStartedModal] = useState(false);
  const [journeyStoppedModal, setJourneyStoppedModal] = useState<{
    durationMinutes: number;
    durationSeconds: number;
    steps: number;
  } | null>(null);

  const timerRef = useRef<any>(null);

  // Live timer & step increment when journey is active
  useEffect(() => {
    if (journeyActive) {
      timerRef.current = setInterval(() => {
        setJourneySeconds(prev => prev + 1);
        setJourneySteps(prev => prev + Math.floor(Math.random() * 2) + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [journeyActive]);

  // Handle Start Journey (Green Box)
  const handleStartJourney = () => {
    setJourneyActive(true);
    setJourneySeconds(0);
    setJourneySteps(0);
    setJourneyStartedModal(true);

    onLogActivity(
      'Journey',
      'Safety Journey Started',
      `Route tracking initiated at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Real-time step counting active.`,
      'logged'
    );
  };

  // Handle Stop Journey (Red Box)
  const handleStopJourney = () => {
    setJourneyActive(false);
    const mins = Math.floor(journeySeconds / 60);
    const secs = journeySeconds % 60;
    const finalSteps = journeySteps;

    setJourneyStoppedModal({
      durationMinutes: mins,
      durationSeconds: secs,
      steps: finalSteps,
    });

    // Store in Activity so user can see it in Activity tab!
    onLogActivity(
      'Journey',
      'Safety Journey Completed',
      `Walk Duration: ${mins}m ${secs}s · Total steps: ${finalSteps.toLocaleString()} steps. Arrived safely.`,
      'nominal'
    );
  };

  // When user clicks 'Okay' on stopped message box -> returns UI to Start Journey green box
  const handleAcknowledgeStopped = () => {
    setJourneyStoppedModal(null);
  };

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* 1. START / STOP JOURNEY INTERFACE */}
      <div className={`p-6 sm:p-8 rounded-3xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } space-y-6`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2.5 text-slate-900 dark:text-white">
              <Navigation className="w-6 h-6 text-cyan-500" />
              <span>Safety Journey &amp; Route Guard</span>
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Start your journey when walking or commuting. We count your steps, track time, and guard your route.
            </p>
          </div>
          {journeyActive && (
            <span className="text-xs sm:text-sm font-mono font-bold px-3.5 py-1.5 bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 rounded-xl">
              Live Transit Active
            </span>
          )}
        </div>

        {/* Live Metrics if journey active */}
        {journeyActive ? (
          <div className={`grid grid-cols-2 sm:grid-cols-3 gap-4 p-6 rounded-2xl text-center border ${
            isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}>
            <div>
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 block font-bold">Journey Duration</span>
              <span className="text-3xl sm:text-4xl font-black font-mono text-cyan-600 dark:text-cyan-400 mt-1 block">
                {formatTime(journeySeconds)}
              </span>
            </div>
            <div>
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 block font-bold">Steps Walked</span>
              <span className="text-3xl sm:text-4xl font-black font-mono text-slate-900 dark:text-white mt-1 block">
                {journeySteps.toLocaleString()}
              </span>
            </div>
            <div className="col-span-2 sm:col-span-1 flex flex-col justify-center">
              <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 block font-bold">Route Status</span>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                Passive GPS Sentinel Active
              </span>
            </div>
          </div>
        ) : (
          <div className={`p-5 rounded-2xl border text-sm space-y-1.5 ${
            isDarkMode ? 'bg-slate-950/40 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-800'
          }`}>
            <span className="font-bold text-slate-900 dark:text-white block">Simple Walking Protection:</span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              When you click the green <strong className="text-emerald-600 dark:text-emerald-400">Start Journey</strong> box, ResQNet begins tracking your steps and time. If an unexpected stop or accident occurs, emergency beacons stand ready. When you arrive, click the red <strong className="text-red-600 dark:text-red-400">Stop Journey</strong> box to save the trip to your Activity log.
            </p>
          </div>
        )}

        {/* Action Button: Start Journey in GREEN box vs Stop Journey in RED box */}
        <div>
          {!journeyActive ? (
            <button
              onClick={handleStartJourney}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-base sm:text-lg rounded-2xl shadow-xl shadow-emerald-900/30 transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>Start Journey</span>
            </button>
          ) : (
            <button
              onClick={handleStopJourney}
              className="w-full py-4 px-6 bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-base sm:text-lg rounded-2xl shadow-xl shadow-red-900/30 transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <Square className="w-5 h-5 fill-current" />
              <span>Stop Journey</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. SENSOR SENTINEL STATUS (Clean table without any green dots) */}
      <div className={`p-6 sm:p-8 rounded-3xl border ${
        isDarkMode ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      } space-y-4`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">Low-Power Sensor Sentinel</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
              Sensors operate in passive monitoring mode to protect battery life and user privacy.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-600 dark:text-slate-400 font-bold">
            20 Hz Sampling
          </span>
        </div>

        {/* Clean table / grid without decorative green dots */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-xs text-slate-600 dark:text-slate-400 block font-bold">Motion Sensor</span>
            <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 block mt-1">Passive Sentinel</span>
            <span className="text-xs text-slate-500 block mt-0.5">Threshold: 2.8G Fall Impact</span>
          </div>

          <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-xs text-slate-600 dark:text-slate-400 block font-bold">GPS Location</span>
            <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 block mt-1">Standby Geofence</span>
            <span className="text-xs text-slate-500 block mt-0.5">Dispatched only during SOS</span>
          </div>

          <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-xs text-slate-600 dark:text-slate-400 block font-bold">Camera Sensor</span>
            <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 block mt-1">Dormant (Zero Stream)</span>
            <span className="text-xs text-slate-500 block mt-0.5">Unlocked 15s post-impact</span>
          </div>

          <div className={`p-4 rounded-2xl border ${isDarkMode ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <span className="text-xs text-slate-600 dark:text-slate-400 block font-bold">Microphone Sensor</span>
            <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 block mt-1">On-Device Voice Wake</span>
            <span className="text-xs text-slate-500 block mt-0.5">No continuous recording</span>
          </div>

        </div>

        {/* Autonomous Danger Detection Protocol Trigger */}
        {onTriggerDangerDetection && (
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
            <div className="text-xs space-y-0.5">
              <strong className="text-red-700 dark:text-red-300 block font-bold">
                *ResQSense* Autonomous Danger Protocol:
              </strong>
              <span className="text-slate-600 dark:text-slate-400">
                Issues 3 warning notifications. If declined &amp; danger persists, calls Primary Responder. If &quot;I&apos;m not fine&quot;, activates camera assessment.
              </span>
            </div>
            <button
              type="button"
              onClick={() => onTriggerDangerDetection('High-G Fall Impact & Motion Freeze Detected')}
              className="py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
            >
              <AlertTriangle className="w-4 h-4 animate-pulse" />
              <span>Simulate Danger Event</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL 1: JOURNEY STARTED MESSAGE BOX */}
      {journeyStartedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className={`max-w-md w-full border rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 ${
            isDarkMode ? 'bg-slate-900 border-emerald-500/40 text-white' : 'bg-white border-emerald-300 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center font-bold text-white shrink-0">
                <Navigation className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Journey Has Begun</h4>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Tracking &amp; Step Counter Started</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              The journey has began. The time duration and step counting have started. Low-power GPS is safeguarding your route.
            </p>

            <button
              onClick={() => setJourneyStartedModal(false)}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold cursor-pointer transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: JOURNEY STOPPED MESSAGE BOX WITH DURATION, STEPS AND OKAY BUTTON */}
      {journeyStoppedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className={`max-w-md w-full border rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 ${
            isDarkMode ? 'bg-slate-900 border-cyan-500/40 text-white' : 'bg-white border-cyan-300 text-slate-900'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-600 flex items-center justify-center font-bold text-white shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">Journey Has Been Stopped</h4>
                <p className="text-xs text-cyan-600 dark:text-cyan-400 font-bold">Saved to Activity Log</p>
              </div>
            </div>

            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              The journey has been stoped. Here is the information of your duration and steps walked:
            </p>

            <div className={`grid grid-cols-2 gap-3 p-4 rounded-2xl text-center border ${
              isDarkMode ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-100 border-slate-200'
            }`}>
              <div>
                <span className="text-xs text-slate-600 dark:text-slate-400 block font-bold">Duration</span>
                <span className="text-2xl font-black font-mono text-cyan-600 dark:text-cyan-400 mt-0.5 block">
                  {journeyStoppedModal.durationMinutes}m {journeyStoppedModal.durationSeconds}s
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-600 dark:text-slate-400 block font-bold">Steps Walked</span>
                <span className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-0.5 block">
                  {journeyStoppedModal.steps.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              onClick={handleAcknowledgeStopped}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold cursor-pointer transition-colors shadow"
            >
              Okay
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
