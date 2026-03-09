import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { ShieldCheck, Loader2, KeyRound } from "lucide-react";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({ username: "", email: "", securityAnswer: "", newPassword: "" });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.recoverPassword(formData.username, formData.email, formData.securityAnswer, formData.newPassword);
            showToast("Password successfully reset! You may now log in.", "success");
            navigate("/login");
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border p-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="text-center mb-6">
                    <div className="bg-red-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-white"><KeyRound size={28} /></div>
                    <h1 className="text-2xl font-black text-gray-900">Zero-Trust Recovery</h1>
                    <p className="text-gray-500 text-sm mt-1">Verify your identity to reset your password.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" required placeholder="Username" className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                    <input type="email" required placeholder="Recovery Email" className="w-full p-3 bg-gray-50 border rounded-xl" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                    <input type="password" required placeholder="Security Answer (Pet's name?)" className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl" value={formData.securityAnswer} onChange={e => setFormData({...formData, securityAnswer: e.target.value})} />
                    <input type="password" required minLength="6" placeholder="New Password" className="w-full p-3 bg-gray-50 border rounded-xl font-mono" value={formData.newPassword} onChange={e => setFormData({...formData, newPassword: e.target.value})} />

                    <button type="submit" disabled={loading} className="w-full py-3 bg-red-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-red-700 disabled:opacity-50">
                        {loading ? <Loader2 className="animate-spin" /> : <><ShieldCheck size={18}/> Reset Password</>}
                    </button>
                </form>
                <div className="mt-4 text-center">
                    <Link to="/login" className="text-sm font-bold text-gray-900 hover:underline">Back to Login</Link>
                </div>
            </div>
        </div>
    );
}