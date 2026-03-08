import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../services/api";
import { useAuth } from "../../contexts/AuthContext"; 
import { useToast } from "../../contexts/ToastContext"; 
import { Brain, Loader2 } from "lucide-react";

export default function Signup() {
    const navigate = useNavigate();
    const { login } = useAuth(); 
    const { showToast } = useToast();
    const [formData, setFormData] = useState({ name: "", username: "", email: "", password: "", securityQuestion: "What is your pet's name?", securityAnswer: "" });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const userData = await api.signup(formData.name, formData.username, formData.email, formData.password, formData.securityQuestion, formData.securityAnswer);
            login(userData); 
            showToast("Account created successfully.", "success");
            navigate('/hq-mentor-core/dashboard');
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border p-8">
                <div className="text-center mb-6">
                    <div className="bg-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4 text-white"><Brain size={28} /></div>
                    <h1 className="text-2xl font-black text-gray-900">System Initialization</h1>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="text" placeholder="Full Name" required className="w-full p-3 bg-gray-50 border rounded-xl" onChange={e => setFormData({...formData, name: e.target.value})} />
                    <input type="text" placeholder="Username (use 'admin' for SuperAdmin)" required className="w-full p-3 bg-gray-50 border rounded-xl" onChange={e => setFormData({...formData, username: e.target.value})} />
                    <input type="email" placeholder="Email" required className="w-full p-3 bg-gray-50 border rounded-xl" onChange={e => setFormData({...formData, email: e.target.value})} />
                    <input type="password" placeholder="Password" required className="w-full p-3 bg-gray-50 border rounded-xl" onChange={e => setFormData({...formData, password: e.target.value})} />
                    <input type="text" placeholder="Security Answer (Pet's name)" required className="w-full p-3 bg-gray-50 border rounded-xl" onChange={e => setFormData({...formData, securityAnswer: e.target.value})} />

                    <button disabled={loading} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold">
                        {loading ? <Loader2 className="animate-spin mx-auto"/> : "Initialize Account"}
                    </button>
                </form>
                <div className="mt-4 text-center">
                    <Link to="/login" className="text-sm font-bold text-indigo-600 hover:text-indigo-800">Back to Login</Link>
                </div>
            </div>
        </div>
    );
}