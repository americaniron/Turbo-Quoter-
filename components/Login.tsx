
import React, { useState } from 'react';
import { User } from '../types.ts';
import { Logo } from './Logo.tsx';

interface LoginProps {
  onLogin: (user: User) => void;
}

const USERS = [
  { username: 'ironman1111', password: 'YaKareem1121@', displayName: 'Iron Command', role: 'Chief Engineer' },
  { username: 'batbout', password: 'batto123', displayName: 'Logistics Hub', role: 'Logistics Specialist' }
];

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      const found = USERS.find(u => u.username === username && u.password === password);
      if (found) {
        onLogin({
          username: found.username,
          displayName: found.displayName,
          role: found.role
        });
      } else {
        setError('ACCESS DENIED: INVALID CREDENTIALS');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none overflow-hidden">
         <div className="absolute -top-1/4 -left-1/4 w-full h-full bg-[#ffcd00] rounded-full blur-[200px]"></div>
         <div className="absolute -bottom-1/4 -right-1/4 w-full h-full bg-indigo-600 rounded-full blur-[200px]"></div>
      </div>

      <div className="w-full max-w-md relative z-10 fade-in">
        <div className="flex flex-col items-center mb-10">
          <div className="bg-slate-900/80 p-8 rounded-[3rem] border-2 border-slate-800 shadow-2xl mb-6">
            <Logo className="h-32 w-auto object-contain" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-[0.2em] italic">Engineering Portal</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.5em] mt-2 text-center">American Iron Logistics & Supply Hub</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Terminal Username</label>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-5 text-white font-mono text-sm focus:border-[#ffcd00] outline-none transition-all"
                placeholder=">>> ID_NODE"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Access Protocol (Password)</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border-2 border-slate-800 rounded-2xl p-5 text-white font-mono text-sm focus:border-[#ffcd00] outline-none transition-all"
                placeholder="********"
                required
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 p-4 rounded-xl text-center">
                <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">{error}</p>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#ffcd00] text-slate-950 font-black text-sm py-5 rounded-2xl uppercase tracking-[0.3em] shadow-xl hover:shadow-[#ffcd00]/20 hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="w-5 h-5 border-3 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3 3H6a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
                  Authorize Entry
                </>
              )}
            </button>
          </form>

          <div className="mt-10 border-t border-white/5 pt-8 text-center">
            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
              American Iron LLC • Secure Infrastructure v2.0
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
