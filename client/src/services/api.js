export const API_BASE_URL = 'http://localhost:5000';

// Helper to get JWT headers
const getHeaders = (multipart = false) => {
    const headers = {};
    if (!multipart) {
        headers['Content-Type'] = 'application/json';
    }
    const stored = localStorage.getItem('mentorOS_user');
    if (stored) {
        try {
            const { token } = JSON.parse(stored);
            if (token) headers['Authorization'] = `Bearer ${token}`;
        } catch (e) {
            console.error("Error parsing stored auth data", e);
        }
    }
    return headers;
};

// Generic fetch wrapper
const fetchAPI = async (endpoint, options = {}) => {
    const headers = getHeaders(options.body instanceof FormData);

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: { ...headers, ...options.headers }
    });

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'An unexpected error occurred');
    }
    return data;
};

export const api = {
    // ============================================================
    // 🔐 AUTHENTICATION
    // ============================================================
    signup: async (name, username, email, password, securityQuestion, securityAnswer) => {
        const res = await fetchAPI('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({ name, username, email, password, securityQuestion, securityAnswer })
        });
        return { user: res.user, token: res.token };
    },

    login: async (identifier, password) => {
        const res = await fetchAPI('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ identifier, password })
        });
        return { user: res.user, token: res.token };
    },

    recoverPassword: async (username, email, securityAnswer, newPassword) => {
        return await fetchAPI('/api/auth/recover', {
            method: 'POST',
            body: JSON.stringify({ username, email, securityAnswer, newPassword })
        });
    },

    updateProfile: async (id, name, email, password, securityQuestion, securityAnswer) => {
        const res = await fetchAPI('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({ name, email, password, securityQuestion, securityAnswer })
        });
        return res.user;
    },

    getUsers: async () => {
        const res = await fetchAPI('/api/auth/users');
        return res.users;
    },

    updateUserRoles: async (userId, roles) => {
        return await fetchAPI(`/api/auth/users/${userId}/roles`, {
            method: 'PUT',
            body: JSON.stringify({ roles })
        });
    },

    // ============================================================
    // ⚙️ SYSTEM & API MANAGEMENT (Admin)
    // ============================================================
    getKeys: async () => {
        const res = await fetchAPI('/api/system/keys');
        return res.keys;
    },

    addKey: async (name, key) => {
        return await fetchAPI('/api/system/keys', {
            method: 'POST',
            body: JSON.stringify({ name, key })
        });
    },

    deleteKey: async (id) => {
        return await fetchAPI(`/api/system/keys/${id}`, { method: 'DELETE' });
    },

    testKey: async (id) => {
        return await fetchAPI(`/api/system/keys/${id}/test`, { method: 'POST' });
    },

    getRouting: async () => {
        const res = await fetchAPI('/api/system/routing');
        return res.routing; // Returns { architect: {}, lesson: {}, ... }
    },

    updateRouting: async (config) => {
        return await fetchAPI('/api/system/routing', {
            method: 'PUT',
            body: JSON.stringify({ config })
        });
    },

    getAnalytics: async () => {
        const res = await fetchAPI('/api/system/analytics');
        return res.stats;
    },

    getAuditLogs: async () => {
        const res = await fetchAPI('/api/system/logs');
        return res.logs;
    },

    // ============================================================
    // 🎓 COURSE MANAGEMENT
    // ============================================================
    getCourses: async () => {
        const res = await fetchAPI('/api/courses');
        return res.courses;
    },

    getPublishedCourses: async () => {
        const res = await fetchAPI('/api/courses/published');
        return res.courses;
    },

    getCourse: async (id) => {
        const res = await fetchAPI(`/api/courses/${id}`);
        return res.course;
    },

    saveCourseFinal: async (courseData) => {
        return await fetchAPI('/api/courses', {
            method: 'POST',
            body: JSON.stringify(courseData)
        });
    },

    updateCourseFinal: async (id, courseData) => {
        return await fetchAPI(`/api/courses/${id}`, {
            method: 'PUT',
            body: JSON.stringify(courseData)
        });
    },

    deleteCourse: async (id) => {
        return await fetchAPI(`/api/courses/${id}`, { method: 'DELETE' });
    },

    // ============================================================
    // 🧠 AI ENGINE (Architect, Extractor, Vector)
    // ============================================================

    // Generate Blueprint (Now uses FormData for File Uploads)
    generateBlueprint: async (topic, audience, engineConfig, youtubeUrl, files) => {
        const formData = new FormData();
        formData.append('topic', topic);
        formData.append('audience', audience);
        formData.append('engineConfig', JSON.stringify(engineConfig));
        if (youtubeUrl) formData.append('youtubeUrl', youtubeUrl);

        if (files && files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                formData.append('files', files[i]);
            }
        }

        const res = await fetchAPI('/api/ai/generate-blueprint', {
            method: 'POST',
            body: formData // Note: fetchAPI automatically handles removing 'Content-Type' so browser sets boundaries
        });
        return res; 
    },

    // AI Edit Blueprint
    refineBlueprint: async (currentBlueprint, prompt, engineConfig) => {
        const res = await fetchAPI('/api/ai/refine-blueprint', {
            method: 'POST',
            body: JSON.stringify({ currentBlueprint, prompt, engineConfig })
        });
        return res;
    },

    extractModuleSteps: async (moduleTitle, blueprint, engineConfig, courseId, command) => {
        const res = await fetchAPI('/api/ai/extract-steps', {
            method: 'POST',
            body: JSON.stringify({ moduleTitle, blueprint, engineConfig, courseId, command })
        });
        return res; 
    },

    // AI Edit Module Steps
    refineModuleSteps: async (currentSteps, prompt, engineConfig) => {
        const res = await fetchAPI('/api/ai/refine-steps', {
            method: 'POST',
            body: JSON.stringify({ currentSteps, prompt, engineConfig })
        });
        return res;
    },

    ingestKnowledge: async (courseId, engineConfig, sources, embedderConfig) => {
        return await fetchAPI('/api/ai/ingest', {
            method: 'POST',
            body: JSON.stringify({ courseId, engineConfig, sources, embedderConfig })
        });
    },

    getKnowledgeChunks: async (courseId) => {
        const res = await fetchAPI(`/api/ai/brain/${courseId}`);
        return res.chunks;
    },

    deleteKnowledgeChunk: async (chunkId) => {
        return await fetchAPI(`/api/ai/brain/chunk/${chunkId}`, { method: 'DELETE' });
    },

    testVectorSearch: async (courseId, query, engineConfig) => {
        const res = await fetchAPI('/api/ai/brain/search', {
            method: 'POST',
            body: JSON.stringify({ courseId, query, engineConfig })
        });
        return res.results;
    }
};