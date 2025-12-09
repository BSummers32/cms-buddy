import React, { useState, useEffect } from 'react';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase'; 
import { Monitor, Layout } from 'lucide-react';
import PlayerView from './components/PlayerView';
import AdminDashboard from './components/AdminDashboard';

export default function App() {
  const [user, setUser] = useState(null);
  const [mode, setMode] = useState('selection'); 
  const [appId] = useState('default-signage-app'); 

  useEffect(() => {
    // Basic anonymous auth for demo. 
    // In production, consider adding a real login screen for Admin mode.
    signInAnonymously(auth);
    return onAuthStateChanged(auth, setUser);
  }, []);

  if (!user) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white">Connecting to Cloud...</div>;

  if (mode === 'selection') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-sans">
        <h1 className="text-4xl md:text-6xl font-black text-white mb-12 tracking-tighter">AMAZING SIGNAGE <span className="text-emerald-400">CMS</span></h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {/* Player Option */}
          <button 
            onClick={() => setMode('player')}
            className="group relative p-12 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden text-left"
          >
            <div className="absolute inset-0 bg-white/10 group-hover:bg-white/0 transition-colors" />
            <Monitor className="w-20 h-20 text-white mb-6" />
            <h2 className="text-3xl font-bold text-white mb-2">Launch Player</h2>
            <p className="text-indigo-200 text-lg">Run this on the Amazon Stick to display content.</p>
          </button>

          {/* Admin Option */}
          <button 
            onClick={() => setMode('admin')}
            className="group relative p-12 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden text-left"
          >
             <div className="absolute inset-0 bg-white/10 group-hover:bg-white/0 transition-colors" />
            <Layout className="w-20 h-20 text-white mb-6" />
            <h2 className="text-3xl font-bold text-white mb-2">Admin Dashboard</h2>
            <p className="text-emerald-200 text-lg">Manage screens, schedules, and playlists.</p>
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'player') return <PlayerView db={db} appId={appId} />;
  if (mode === 'admin') return <AdminDashboard db={db} user={user} appId={appId} setMode={setMode} />;
}
