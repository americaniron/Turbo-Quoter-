
import React, { useState, useEffect } from 'react';
import { AppSettings, AdminInfo, UserCredentials, Theme } from '../types.ts';

interface SettingsPanelProps {
    settings: AppSettings;
    onSettingsChange: (newSettings: AppSettings) => void;
    onClose: () => void;
}

type ActiveTab = 'admin' | 'users' | 'appearance';

const TabButton: React.FC<{ active: boolean, onClick: () => void, children: React.ReactNode }> = ({ active, onClick, children }) => (
    <button onClick={onClick} className={`px-6 py-4 text-sm font-black uppercase tracking-widest rounded-t-2xl border-b-4 transition-all ${active ? 'bg-white border-indigo-600 text-indigo-600' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100'}`}>
        {children}
    </button>
);

const Field: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
  <div className="relative flex flex-col group">
    <label className="text-[10px] font-black uppercase text-slate-500 mb-2 ml-3">{label}</label>
    {children}
  </div>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange, onClose }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>('admin');
    const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
    const [newUser, setNewUser] = useState<UserCredentials>({ username: '', password: '', displayName: '', role: 'Logistics Specialist' });

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleAdminChange = (field: keyof AdminInfo, value: any) => {
        setLocalSettings(prev => ({
            ...prev,
            adminInfo: { ...prev.adminInfo, [field]: value }
        }));
    };
    
    const handleThemeChange = (theme: Theme) => {
        setLocalSettings(prev => ({ ...prev, theme }));
    };

    const handleAddUser = () => {
        if (!newUser.username || !newUser.password) {
            alert("Username and password are required.");
            return;
        }
        setLocalSettings(prev => ({
            ...prev,
            users: [...prev.users, newUser]
        }));
        setNewUser({ username: '', password: '', displayName: '', role: 'Logistics Specialist' });
    };

    const handleDeleteUser = (username: string) => {
        if (localSettings.users.length <= 1) {
            alert("Cannot delete the last user.");
            return;
        }
        setLocalSettings(prev => ({
            ...prev,
            users: prev.users.filter(u => u.username !== username)
        }));
    };

    const handleSave = () => {
        onSettingsChange(localSettings);
        onClose();
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                handleAdminChange('logoUrl', event.target?.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[200] flex items-center justify-center p-6 animate-in fade-in duration-300">
            <div className="bg-slate-50 w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
                
                <div className="p-10 border-b border-slate-200 flex justify-between items-center bg-white">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Hub Configuration</h3>
                        <p className="text-[11px] text-indigo-600 font-black uppercase mt-2 tracking-[0.2em]">Manage System-Wide Settings</p>
                    </div>
                    <button onClick={onClose} className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center hover:bg-red-50 hover:text-red-600 transition-all active:scale-90">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                
                <div className="border-b border-slate-200 px-6 bg-slate-100">
                    <TabButton active={activeTab === 'admin'} onClick={() => setActiveTab('admin')}>Admin Info</TabButton>
                    <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')}>Users</TabButton>
                    <TabButton active={activeTab === 'appearance'} onClick={() => setActiveTab('appearance')}>Appearance</TabButton>
                </div>

                <div className="flex-grow p-10 overflow-y-auto bg-white">
                    {activeTab === 'admin' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <Field label="Company Name">
                                    <input type="text" value={localSettings.adminInfo.companyName} onChange={e => handleAdminChange('companyName', e.target.value)} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl" />
                                </Field>
                                <Field label="Phone">
                                    <input type="text" value={localSettings.adminInfo.phone} onChange={e => handleAdminChange('phone', e.target.value)} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl" />
                                </Field>
                                <Field label="Email">
                                    <input type="email" value={localSettings.adminInfo.email} onChange={e => handleAdminChange('email', e.target.value)} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl" />
                                </Field>
                            </div>
                            <Field label="Website">
                                <input type="text" value={localSettings.adminInfo.website} onChange={e => handleAdminChange('website', e.target.value)} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl" />
                            </Field>
                            <Field label="Address">
                                <input type="text" value={localSettings.adminInfo.address} onChange={e => handleAdminChange('address', e.target.value)} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl" />
                            </Field>
                            <div className="grid grid-cols-4 gap-6">
                                <Field label="City"><input type="text" value={localSettings.adminInfo.city} onChange={e => handleAdminChange('city', e.target.value)} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl" /></Field>
                                <Field label="State/Province"><input type="text" value={localSettings.adminInfo.state} onChange={e => handleAdminChange('state', e.target.value)} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl" /></Field>
                                <Field label="ZIP/Postal Code"><input type="text" value={localSettings.adminInfo.zip} onChange={e => handleAdminChange('zip', e.target.value)} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl" /></Field>
                                <Field label="Country"><input type="text" value={localSettings.adminInfo.country} onChange={e => handleAdminChange('country', e.target.value)} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl" /></Field>
                            </div>
                            <Field label="Company Logo">
                                <div className="flex items-center gap-4">
                                    {localSettings.adminInfo.logoUrl && <img src={localSettings.adminInfo.logoUrl} alt="logo" className="h-16 w-auto bg-slate-100 p-2 rounded-lg" />}
                                    <input type="file" onChange={handleLogoUpload} accept="image/*" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                                </div>
                            </Field>
                        </div>
                    )}
                    {activeTab === 'users' && (
                        <div>
                             <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 mb-8 grid grid-cols-5 gap-4 items-end">
                                <Field label="Username"><input type="text" value={newUser.username} onChange={e => setNewUser(p => ({...p, username: e.target.value}))} className="w-full p-3 border-2 border-slate-300 rounded-lg" /></Field>
                                <Field label="Password"><input type="password" value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} className="w-full p-3 border-2 border-slate-300 rounded-lg" /></Field>
                                <Field label="Display Name"><input type="text" value={newUser.displayName} onChange={e => setNewUser(p => ({...p, displayName: e.target.value}))} className="w-full p-3 border-2 border-slate-300 rounded-lg" /></Field>
                                <Field label="Role"><input type="text" value={newUser.role} onChange={e => setNewUser(p => ({...p, role: e.target.value}))} className="w-full p-3 border-2 border-slate-300 rounded-lg" /></Field>
                                <button onClick={handleAddUser} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 transition-all">Add User</button>
                             </div>
                             <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                                {localSettings.users.map(user => (
                                    <div key={user.username} className="p-4 flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-slate-800">{user.displayName} <span className="ml-2 text-xs font-mono text-slate-500">({user.username})</span></p>
                                            <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-1">{user.role}</p>
                                        </div>
                                        <button onClick={() => handleDeleteUser(user.username)} className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-all">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                        </button>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                    {activeTab === 'appearance' && (
                        <div className="space-y-4">
                            <Field label="Theme">
                               <div className="flex gap-4">
                                   <div onClick={() => handleThemeChange(Theme.LIGHT)} className={`cursor-pointer p-4 border-4 rounded-2xl flex-1 ${localSettings.theme === Theme.LIGHT ? 'border-indigo-600' : 'border-slate-200'}`}>
                                       <div className="w-full h-24 bg-white border border-slate-200 rounded-lg"></div>
                                       <p className="text-center font-bold mt-2 text-sm">Light Mode</p>
                                   </div>
                                   <div onClick={() => handleThemeChange(Theme.DARK)} className={`cursor-pointer p-4 border-4 rounded-2xl flex-1 ${localSettings.theme === Theme.DARK ? 'border-indigo-600' : 'border-slate-200'}`}>
                                       <div className="w-full h-24 bg-slate-800 border border-slate-700 rounded-lg"></div>
                                       <p className="text-center font-bold mt-2 text-sm">Dark Mode</p>
                                   </div>
                               </div>
                            </Field>
                        </div>
                    )}
                </div>

                <div className="p-8 border-t border-slate-200 bg-slate-50/50 flex justify-end">
                    <button onClick={handleSave} className="px-10 py-4 bg-indigo-600 text-white font-black text-sm uppercase rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95">
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
};
