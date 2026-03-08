import { supabase } from "../config/db.js";
import { encrypt, decrypt } from "../utils/crypto.js";

// --- API KEYS ---
export const getKeys = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from("api_keys")
            .select("id, name, masked_key, created_at")
            .order("created_at", { ascending: false });
        if (error) throw error;
        res.json({ success: true, keys: data });
    } catch (error) {
        next(error);
    }
};

export const addKey = async (req, res, next) => {
    try {
        const { name, key } = req.body;

        // Ensure it's valid JSON (Service Account format)
        const parsedKey = JSON.parse(key);
        if (!parsedKey.project_id || !parsedKey.client_email) {
            return res
                .status(400)
                .json({
                    success: false,
                    error: "Invalid Google Cloud Service Account JSON.",
                });
        }

        // Mask: Show the Project ID so the admin knows which GCP project this is
        const masked_key = parsedKey.project_id;
        const encrypted_key = encrypt(key);

        const { data, error } = await supabase
            .from("api_keys")
            .insert([{ name, masked_key, encrypted_key }])
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, key: data });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            error: "Invalid Credentials format.",
        });
    }
};

export const deleteKey = async (req, res, next) => {
    try {
        const { error } = await supabase
            .from("api_keys")
            .delete()
            .eq("id", req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// --- ROUTING CONFIG ---
export const getRouting = async (req, res, next) => {
    try {
        let { data, error } = await supabase
            .from("routing_config")
            .select("*")
            .single();

        // Init config if not exists
        if (!data) {
            const { data: newData, error: newError } = await supabase
                .from("routing_config")
                .insert([{ id: 1, config: {} }])
                .select()
                .single();
            data = newData;
        }

        res.json({ success: true, routing: data.config });
    } catch (error) {
        next(error);
    }
};

export const updateRouting = async (req, res, next) => {
    try {
        const { config } = req.body;
        const { error } = await supabase
            .from("routing_config")
            .update({ config, updated_at: new Date() })
            .eq("id", 1);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

// --- ANALYTICS & LOGS ---
export const getAnalytics = async (req, res, next) => {
    try {
        // Simple counts for now
        const { count: users } = await supabase
            .from("users")
            .select("*", { count: "exact", head: true });
        const { count: courses } = await supabase
            .from("courses")
            .select("*", { count: "exact", head: true });

        // Mock token usage (Implement a 'usage_logs' table for real tracking)
        const stats = {
            users: users || 0,
            courses: courses || 0,
            totalTokens: 125000,
            estimatedCost: "0.45",
        };
        res.json({ success: true, stats });
    } catch (error) {
        next(error);
    }
};

export const getAuditLogs = async (req, res, next) => {
    try {
        // Mock Logs (Implement a real 'audit_logs' table in Supabase if needed)
        const logs = [
            {
                id: 1,
                created_at: new Date(),
                users: { name: "Admin" },
                action: "SYSTEM_INIT",
                entity_name: "MentorOS Core",
                tokens_used: 0,
            },
        ];
        res.json({ success: true, logs });
    } catch (error) {
        next(error);
    }
};
