import { supabase } from '../config/db.js';

export const getCourses = async (req, res, next) => {
    try {
        // Fetch courses + count of modules
        const { data, error } = await supabase
            .from('courses')
            .select(`
                *,
                course_modules:modules(count)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, courses: data });
    } catch (error) { next(error); }
};

export const getPublishedCourses = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from('courses')
            .select(`
                *,
                course_modules:modules(count)
            `)
            .neq('status', 'draft') // Only published
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, courses: data });
    } catch (error) { next(error); }
};

export const getCourse = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('courses')
            .select(`
                *,
                course_modules:modules(*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        // Sort modules by sequence
        if (data.course_modules) {
            data.course_modules.sort((a, b) => a.sequence_number - b.sequence_number);
        }

        res.json({ success: true, course: data });
    } catch (error) { next(error); }
};

export const createCourse = async (req, res, next) => {
    try {
        const { title, target_audience, blueprint, moduleContents } = req.body;

        // 1. Create Course
        const { data: course, error: cError } = await supabase
            .from('courses')
            .insert([{ 
                title, 
                target_audience, 
                blueprint,
                status: 'published'
            }])
            .select()
            .single();

        if (cError) throw cError;

        // 2. Insert Modules (Batch)
        if (moduleContents && moduleContents.length > 0) {
            const modulesPayload = moduleContents.map((content, idx) => ({
                course_id: course.id,
                sequence_number: idx + 1,
                title: blueprint.modules[idx]?.title || `Module ${idx+1}`,
                content: content // The JSON array of steps
            }));

            const { error: mError } = await supabase.from('modules').insert(modulesPayload);
            if (mError) throw mError;
        }

        res.json({ success: true, courseId: course.id });
    } catch (error) { next(error); }
};

export const updateCourse = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { title, target_audience, blueprint, moduleContents } = req.body;

        // 1. Update Course Header
        await supabase
            .from('courses')
            .update({ title, target_audience, blueprint })
            .eq('id', id);

        // 2. Nuke old modules and re-insert (easiest way to handle reordering)
        // In production, you might want to do upsert, but this is safer for consistency
        await supabase.from('modules').delete().eq('course_id', id);

        if (moduleContents && moduleContents.length > 0) {
            const modulesPayload = moduleContents.map((content, idx) => ({
                course_id: id,
                sequence_number: idx + 1,
                title: blueprint.modules[idx]?.title || `Module ${idx+1}`,
                content: content
            }));

            await supabase.from('modules').insert(modulesPayload);
        }

        res.json({ success: true });
    } catch (error) { next(error); }
};

export const deleteCourse = async (req, res, next) => {
    try {
        const { error } = await supabase.from('courses').delete().eq('id', req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) { next(error); }
};