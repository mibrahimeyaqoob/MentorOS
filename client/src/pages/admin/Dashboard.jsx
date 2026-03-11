import React, { useState, useEffect } from "react";
import { api } from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { BookOpen, LayoutDashboard, Trash2, Loader2, BrainCircuit, Activity, Edit3, AlertCircle } from 'lucide-react';
import { Link } from "react-router-dom";

export default function Dashboard() {
    const { showToast } = useToast();
    const [courses, setCourses] = useState([]);
    const[loading, setLoading] = useState(true);

    useEffect(() => { loadCourses(); },[]);

    const loadCourses = async () => {
        try {
            const data = await api.getCourses();
            setCourses(data ||[]);
        } catch (error) { showToast(error.message, "error"); } 
        finally { setLoading(false); }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this course permanently?")) return;
        try {
            await api.deleteCourse(id);
            setCourses(courses.filter(c => c.id !== id));
            showToast("Course deleted", "success");
        } catch (error) { showToast(error.message, "error"); }
    };

    if (loading) return <div className="p-10 text-center"><Loader2 size={40} className="animate-spin text-indigo-600 mx-auto"/></div>;

    return (
        <div className="max-w-7xl mx-auto animate-in fade-in pb-12">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3"><LayoutDashboard size={32} className="text-indigo-600" /> Fleet Manager</h1>
                    <p className="text-gray-500 mt-1">Manage and audit deployed courses.</p>
                </div>
                <Link to="/hq-mentor-core/course-creator" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black hover:bg-indigo-700 flex items-center gap-2 shadow-lg">
                    <BookOpen size={18} /> Deploy New Course
                </Link>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b text-xs uppercase tracking-widest text-gray-500">
                            <th className="p-4 font-black">Course Title</th>
                            <th className="p-4 font-black">Status</th>
                            <th className="p-4 font-black">Modules</th>
                            <th className="p-4 font-black text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {courses.length === 0 ? (
                            <tr><td colSpan="4" className="p-10 text-center text-gray-400">No courses yet.</td></tr>
                        ) : courses.map((course) => (
                            <tr key={course.id} className="hover:bg-gray-50/50">
                                <td className="p-4">
                                    <div className="flex items-center gap-2">
                                        <p className="font-bold text-gray-900 text-base">{course.title}</p>

                                        {/* 🔥 SHOW UNPUBLISHED EDITS BADGE IF DRAFT DATA EXISTS */}
                                        {course.draft_data && course.status === 'published' && (
                                            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-widest flex items-center gap-1">
                                                <AlertCircle size={10}/> Unpublished Edits
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-wider mt-1">{course.target_audience || "General Audience"}</p>
                                </td>
                                <td className="p-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${course.status === 'draft' ? 'bg-gray-100 text-gray-600' : 'bg-emerald-100 text-emerald-700'}`}>
                                        {course.status}
                                    </span>
                                </td>
                                <td className="p-4 font-bold text-gray-600">{course.course_modules?.[0]?.count || 0}</td>
                                <td className="p-4 text-right space-x-2">
                                    <button onClick={() => showToast("Brain Syncing requires Vector setup", "info")} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100" title="Sync to Vector Brain"><BrainCircuit size={18} /></button>
                                    <Link to={`/hq-mentor-core/course-creator/${course.id}`} className="inline-flex p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100" title="Edit"><Edit3 size={18} /></Link>
                                    <button onClick={() => handleDelete(course.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" title="Delete"><Trash2 size={18} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}