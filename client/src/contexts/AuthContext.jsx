import React, { createContext, useState, useContext, useEffect } from "react";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const stored = localStorage.getItem("mentorOS_user");
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Handle structure { user: {...}, token: ... } or just user object
                const actualUser = parsed.user ? parsed.user : parsed;
                if (actualUser && actualUser.id) {
                    setUser(actualUser);
                }
            } catch (e) {
                console.error("Auth Load Error:", e);
                localStorage.removeItem("mentorOS_user");
            }
        }
        setLoading(false);
    }, []);

    const login = (userData) => {
        // userData comes from API as { success, token, user }
        // We want to store everything needed for requests
        const storagePayload = {
            token: userData.token,
            user: userData.user
        };
        setUser(userData.user);
        localStorage.setItem("mentorOS_user", JSON.stringify(storagePayload));
    };

    const logout = () => {
        localStorage.removeItem("mentorOS_user");
        setUser(null);
    };

    if (loading) return <div className="h-screen w-full flex items-center justify-center text-indigo-600 font-bold">Loading Identity...</div>;

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);