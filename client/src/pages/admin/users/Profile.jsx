import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../contexts/ToastContext';
import { api } from '../../../services/api';
import { UserCircle, Shield, Save, Loader2 } from 'lucide-react';

export default function Profile() {
    const { user, login } = useAuth();
    const { showToast } = useToast();
    const [formData, setFormData] = useState({ name: '', email: '', password: '', securityQuestion: '', securityAnswer: '' });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData(prev => ({ ...prev, name: user.name || '', email: user.email || '' }));
        }
    }, [user]);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const updatedUser = await api.updateProfile(user.id, formData.name, formData.email, formData.password, formData.securityQuestion, formData.securityAnswer);
            login({ user: updatedUser, token: JSON.parse(localStorage.getItem('mentorOS_user')).token }); 
            setFormData(prev => ({ ...prev, password: '', securityAnswer: '' })); 
            showToast("Profile updated successfully!", "success");
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto p-4 animate-in fade-in">
            <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600"><UserCircle size={40} /></div>
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-2">
                        Identity Settings
                        {user?.roles?.includes('super_admin') && <span className="bg-red-100 text-red-700 text-[10px] uppercase px-2 py-1 rounded-md font-bold flex items-center gap-1"><Shield size={12}/> Root</span>}
                    </h1>
                    <p className="text-gray-500">Manage your personal information.</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Full Name</label>
                        <input type="text" className="w-full bg-gray-50 border p-3 rounded-xl font-bold text-gray-800" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Username (Locked)</label>
                        <input type="text" className="w-full bg-gray-100 border text-gray-400 p-3 rounded-xl cursor-not-allowed font-mono" value={`@${user?.username}`} disabled />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Recovery Email</label>
                        <input type="email" className="w-full bg-gray-50 border p-3 rounded-xl font-bold text-gray-800" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
                    </div>
                </div>

                <hr className="border-gray-100" />

                <h3 className="text-lg font-bold text-gray-900">Security Updates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">New Password (Optional)</label>
                        <input type="password" placeholder="Leave blank to keep current" className="w-full bg-gray-50 border p-3 rounded-xl font-mono" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">New Security Answer (Optional)</label>
                        <input type="password" placeholder="Answer for: Pet's Name" className="w-full bg-gray-50 border p-3 rounded-xl" value={formData.securityAnswer} onChange={e => setFormData({...formData, securityAnswer: e.target.value})} />
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
                        {loading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Save Changes
                    </button>
                </div>
            </form>
        </div>
    );
}