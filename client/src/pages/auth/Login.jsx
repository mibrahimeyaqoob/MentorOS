import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { api } from '../../services/api';
import { Brain, Loader2, ArrowRight } from 'lucide-react';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const { showToast } = useToast();
    const [formData, setFormData] = useState({ identifier: '', password: '' });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const userData = await api.login(formData.identifier, formData.password);
            login(userData); 
            showToast("Welcome to MentorOS", "success");

            const roles = userData.user.roles || [];
            if (roles.includes('super_admin') || roles.includes('admin') || roles.includes('creator')) {
                navigate('/hq-mentor-core/dashboard');
            } else {
                navigate('/student/dashboard');
            }
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="mb-8 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200 text-white">
                    <Brain size={28} />
                </div>
                <h1 className="text-3xl font-black text-gray-900 tracking-tight">Mentor<span className="text-indigo-600">OS</span></h1>
                <p className="text-gray-500 font-medium mt-2">AI Knowledge Extraction Engine</p>
            </div>

            <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Username or Email</label>
                        <input 
                            type="text" required 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-bold text-gray-700 transition-all"
                            value={formData.identifier}
                            onChange={e => setFormData({...formData, identifier: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">Password</label>
                        <input 
                            type="password" required 
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-bold text-gray-700 transition-all"
                            value={formData.password}
                            onChange={e => setFormData({...formData, password: e.target.value})}
                        />
                    </div>
                    <button disabled={loading} className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg disabled:opacity-50">
                        {loading ? <Loader2 size={18} className="animate-spin"/> : <>Access Terminal <ArrowRight size={18}/></>}
                    </button>
                </form>
                <div className="mt-6 text-center">
                    <Link to="/signup" className="text-sm font-bold text-indigo-600 hover:text-indigo-800">Create New Account</Link>
                </div>
            </div>
        </div>
    );
}