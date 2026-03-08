import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/db.js';

const generateToken = (user) => {
    return jwt.sign({ id: user.id, roles: user.roles }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

export const signup = async (req, res, next) => {
    try {
        const { name, username, email, password, securityQuestion, securityAnswer } = req.body;

        // Auto-assign Super Admin if it's your specific username
        const normalizedUsername = username.toLowerCase().trim();
        const initialRoles = (normalizedUsername === 'ibrahimeyaqoob' || normalizedUsername === 'admin') 
            ? ['super_admin'] 
            :['student'];

        // Hash password & security answer
        const password_hash = await bcrypt.hash(password, 10);
        const normalizedAnswer = securityAnswer.trim().toLowerCase();
        const security_answer_hash = await bcrypt.hash(normalizedAnswer, 10);

        const { data, error } = await supabase
            .from('users')
            .insert([{
                name,
                username: normalizedUsername,
                email: email.toLowerCase().trim(),
                password_hash,
                security_question: securityQuestion,
                security_answer_hash,
                roles: initialRoles
            }])
            .select('id, name, username, email, roles')
            .single();

        if (error) {
            if (error.code === '23505') return res.status(400).json({ success: false, error: 'Username or Email already exists.' });
            throw error;
        }

        const token = generateToken(data);
        res.status(201).json({ success: true, token, user: data });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const { identifier, password } = req.body; // identifier can be email or username
        const normalizedIdentifier = identifier.toLowerCase().trim();

        // Find user by email OR username
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .or(`email.eq.${normalizedIdentifier},username.eq.${normalizedIdentifier}`)
            .single();

        if (error || !user) return res.status(401).json({ success: false, error: 'Invalid credentials.' });

        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ success: false, error: 'Invalid credentials.' });

        const token = generateToken(user);

        // Remove hashes before sending to client
        delete user.password_hash;
        delete user.security_answer_hash;

        res.json({ success: true, token, user });
    } catch (error) {
        next(error);
    }
};

export const recoverPassword = async (req, res, next) => {
    try {
        const { username, email, securityAnswer, newPassword } = req.body;

        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username.toLowerCase().trim())
            .eq('email', email.toLowerCase().trim())
            .single();

        if (error || !user) return res.status(404).json({ success: false, error: 'Identity verification failed.' });

        const normalizedAnswer = securityAnswer.trim().toLowerCase();
        const isMatch = await bcrypt.compare(normalizedAnswer, user.security_answer_hash);
        if (!isMatch) return res.status(403).json({ success: false, error: 'Security answer is incorrect.' });

        const password_hash = await bcrypt.hash(newPassword, 10);

        await supabase.from('users').update({ password_hash }).eq('id', user.id);

        res.json({ success: true, message: 'Password reset successful.' });
    } catch (error) {
        next(error);
    }
};

export const updateProfile = async (req, res, next) => {
    try {
        const { name, email, password, securityQuestion, securityAnswer } = req.body;
        const updates = { name, email: email.toLowerCase().trim() };

        if (password) {
            updates.password_hash = await bcrypt.hash(password, 10);
        }
        if (securityQuestion && securityAnswer) {
            updates.security_question = securityQuestion;
            updates.security_answer_hash = await bcrypt.hash(securityAnswer.trim().toLowerCase(), 10);
        }

        const { data, error } = await supabase
            .from('users')
            .update(updates)
            .eq('id', req.user.id)
            .select('id, name, username, email, roles')
            .single();

        if (error) throw error;
        res.json({ success: true, user: data });
    } catch (error) {
        next(error);
    }
};

export const getUsers = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, name, username, email, roles, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, users: data });
    } catch (error) {
        next(error);
    }
};

export const updateUserRoles = async (req, res, next) => {
    try {
        const { roles } = req.body;
        const { data, error } = await supabase
            .from('users')
            .update({ roles })
            .eq('id', req.params.id)
            .select('id, name, roles')
            .single();

        if (error) throw error;
        res.json({ success: true, user: data });
    } catch (error) {
        next(error);
    }
};