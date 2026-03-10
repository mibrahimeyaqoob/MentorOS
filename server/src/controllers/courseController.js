import { supabase } from "../config/db.js";

export const getCourses = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from("courses")
            .select("*, course_modules:modules(count)")
            .order("created_at", { ascending: false });

        if (error) throw error;
        res.json({ success: true, courses: data });
    } catch (error) {
        next(error);
    }
};

export const getPublishedCourses = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from("courses")
            .select("*, course_modules:modules(count)")
            .neq("status", "draft")
            .order("created_at", { ascending: false });

        if (error) throw error;
        res.json({ success: true, courses: data });
    } catch (error) {
        next(error);
    }
};

export const getCourse = async (req, res, next) => {
    try {
        const { data, error } = await supabase
            .from("courses")
            .select("*, course_modules:modules(*)")
            .eq("id", req.params.id)
            .single();

        if (error) throw error;

        if (data.course_modules) {
            data.course_modules.sort(
                (a, b) => a.sequence_number - b.sequence_number,
            );
        }
        res.json({ success: true, course: data });
    } catch (error) {
        next(error);
    }
};

// --- NEW: THE AUTO-SAVE DRAFT ENGINE ---
export const saveCourseDraft = async (req, res, next) => {
    try {
        const { id, title, target_audience, blueprint, moduleContents } =
            req.body;
        let courseId = id;

        // 1. If no ID, create a new draft
        if (!courseId) {
            const { data, error } = await supabase
                .from("courses")
                .insert([
                    {
                        title: title || "Untitled Draft",
                        target_audience,
                        blueprint,
                        status: "draft",
                    },
                ])
                .select("id")
                .single();
            if (error) throw error;
            courseId = data.id;
        }
        // 2. If ID exists, update the existing draft/course
        else {
            const { error } = await supabase
                .from("courses")
                .update({ title, target_audience, blueprint })
                .eq("id", courseId);
            if (error) throw error;

            // Delete old modules to cleanly overwrite them
            await supabase.from("modules").delete().eq("course_id", courseId);
        }

        // 3. Insert Modules (Only the ones that have been extracted)
        if (moduleContents && Object.keys(moduleContents).length > 0) {
            const modulesPayload = Object.entries(moduleContents).map(
                ([idx, content]) => ({
                    course_id: courseId,
                    sequence_number: parseInt(idx) + 1,
                    title:
                        blueprint.modules[idx]?.title ||
                        `Module ${parseInt(idx) + 1}`,
                    content: content,
                }),
            );
            await supabase.from("modules").insert(modulesPayload);
        }

        res.json({ success: true, courseId });
    } catch (error) {
        next(error);
    }
};

// --- PUBLISH ENGINE ---
export const publishCourse = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Mark as published
        const { error } = await supabase
            .from("courses")
            .update({ status: "published" })
            .eq("id", id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};

export const deleteCourse = async (req, res, next) => {
    try {
        const { error } = await supabase
            .from("courses")
            .delete()
            .eq("id", req.params.id);
        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
