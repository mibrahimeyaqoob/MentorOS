import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { ShieldCheck, User, Mail, Lock, Loader2, KeyRound } from "lucide-react";

export default function ForgotPassword() {
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [formData, setFormData] = useState({
        username: "",
        email: "",
        securityAnswer: "",
        newPassword: "",
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.recoverPassword(
                formData.username,
                formData.email,
                formData.securityAnswer,
                formData.newPassword,
            );
            showToast(
                "Password successfully reset! You may now log in.",
                "success",
            );
            navigate("/login");
        } catch (err) {
            showToast(
                err.message || "Failed to reset password. Verify your details.",
                "error",
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4 font-sans">
            <div className="flex items-center gap-2 mb-8">
                <div className="bg-red-600 p-2 rounded-xl shadow-sm">
                    <KeyRound size={24} className="text-white" />
                </div>
                <span className="text-2xl font-bold text-gray-900 tracking-tight">
                    Zero-Trust Recovery
                </span>
            </div>

            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
                <p className="text-gray-500 text-sm text-center mb-6 font-medium">
                    Verify your identity using your Username, Recovery Email,
                    and Security Answer.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative">
                        <User
                            size={18}
                            className="absolute left-4 top-3.5 text-gray-400"
                        />
                        <input
                            type="text"
                            required
                            placeholder="Username"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-xl text-sm focus:border-red-500 outline-none"
                            value={formData.username}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    username: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="relative">
                        <Mail
                            size={18}
                            className="absolute left-4 top-3.5 text-gray-400"
                        />
                        <input
                            type="email"
                            required
                            placeholder="Email Address"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-xl text-sm focus:border-red-500 outline-none"
                            value={formData.email}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    email: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="relative">
                        <ShieldCheck
                            size={18}
                            className="absolute left-4 top-3.5 text-gray-400"
                        />
                        <input
                            type="password"
                            required
                            placeholder="Security Answer (e.g. Fluffy)"
                            className="w-full pl-11 pr-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm focus:border-amber-500 outline-none"
                            value={formData.securityAnswer}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    securityAnswer: e.target.value,
                                })
                            }
                        />
                    </div>
                    <div className="relative pt-4 border-t">
                        <Lock
                            size={18}
                            className="absolute left-4 top-7 text-gray-400"
                        />
                        <input
                            type="password"
                            required
                            minLength="6"
                            placeholder="New Password"
                            className="w-full pl-11 pr-4 py-3 bg-gray-50 border rounded-xl text-sm focus:border-red-500 outline-none"
                            value={formData.newPassword}
                            onChange={(e) =>
                                setFormData({
                                    ...formData,
                                    newPassword: e.target.value,
                                })
                            }
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-red-600 text-white py-3.5 rounded-xl text-sm font-bold hover:bg-red-700 transition-all flex justify-center items-center gap-2 mt-4 disabled:opacity-70"
                    >
                        {loading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            "Reset Password"
                        )}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-gray-500">
                    Remembered it?{" "}
                    <Link
                        to="/login"
                        className="text-gray-900 font-black hover:underline"
                    >
                        Back to Login
                    </Link>
                </p>
            </div>
        </div>
    );
}
