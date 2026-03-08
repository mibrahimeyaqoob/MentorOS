import React from "react";
import { Outlet, NavLink, Link } from "react-router-dom";
import { LayoutDashboard, BookOpen, Key, Database, Users, Activity, LogOut, GraduationCap } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminLayout() {
    const { user, logout } = useAuth();
    const userRoles = user?.roles || ["student"];

    const navItems =[
        { path: "dashboard", icon: LayoutDashboard, label: "Fleet Manager", allowedRoles:["creator", "admin", "super_admin"] },
        { path: "course-creator", icon: BookOpen, label: "Course Creator", allowedRoles: ["creator", "admin", "super_admin"] },
        { path: "command-center", icon: Key, label: "AI Command Center", allowedRoles: ["admin", "super_admin"] },
        { path: "vector-brain", icon: Database, label: "Vector Brain", allowedRoles:["admin", "super_admin"] },
        { path: "usage", icon: Activity, label: "Usage Analytics", allowedRoles: ["admin", "super_admin"] },
        { path: "users", icon: Users, label: "User Management", allowedRoles: ["super_admin"] },
    ];

    const visibleNavItems = navItems.filter((item) => {
        if (userRoles.includes("super_admin")) return true;
        return item.allowedRoles.some((role) => userRoles.includes(role));
    });

    return (
        <div className="flex h-screen bg-gray-50 font-sans">
            {/* Sidebar */}
            <aside className="w-72 bg-white border-r border-gray-200 flex flex-col z-10">
                <div className="p-8 border-b border-gray-100">
                    <h2 className="text-xl font-black text-gray-900">Mentor<span className="text-indigo-600">OS</span></h2>
                    <p className="text-[10px] uppercase text-gray-400 font-bold mt-1">Enterprise Admin</p>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {visibleNavItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) =>
                                `flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-sm transition-all ${
                                    isActive ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                }`
                            }
                        >
                            <item.icon size={18} /> {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <Link to="/student/dashboard" className="w-full flex items-center justify-center gap-2 px-4 py-2.5 mb-2 text-sm font-bold text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100">
                        <GraduationCap size={16} /> Student View
                    </Link>
                    <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-red-600 bg-red-50 rounded-xl hover:bg-red-100">
                        <LogOut size={16} /> Disconnect
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative">
                <div className="p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
}