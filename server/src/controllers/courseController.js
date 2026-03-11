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

        if (data.course_modules)
            data.course_modules.sort(
                (a, b) => a.sequence_number - b.sequence_number,
            );

        // FORMAT DRAFT DATA: If draft_data exists, we load it. If not, we construct it from the live modules so the editor can load seamlessly.
        let draft = data.draft_data;
        if (!draft) {
            const loadedContents = {};
            if (data.course_modules) {
                data.course_modules.forEach((mod) => {
                    loadedContents[mod.sequence_number - 1] = mod.content;
                });
            }
            draft = {
                blueprint: data.blueprint,
                moduleContents: loadedContents,
            };
        }

        res.json({ success: true, course: data, draft });
    } catch (error) {
        next(error);
    }
};

// 🔥 ISOLATED AUTO-SAVE (Fixes the deleting live modules bug)
export const saveCourseDraft = async (req, res, next) => {
    try {
        const { id, title, target_audience, blueprint, moduleContents } =
            req.body;
        const draft_data = { blueprint, moduleContents };
        let courseId = id;

        if (!courseId) {
            const { data, error } = await supabase
                .from("courses")
                .insert([
                    {
                        title: title || "Untitled Draft",
                        target_audience,
                        status: "draft",
                        draft_data,
                    },
                ])
                .select("id")
                .single();
            if (error) throw error;
            courseId = data.id;
        } else {
            // WE ONLY UPDATE THE DRAFT JSON. WE DO NOT TOUCH THE LIVE MODULES TABLE HERE.
            const { error } = await supabase
                .from("courses")
                .update({
                    title: title || "Untitled",
                    target_audience,
                    draft_data,
                })
                .eq("id", courseId);
            if (error) throw error;
        }

        res.json({ success: true, courseId });
    } catch (error) {
        next(error);
    }
};

// 🔥 PUBLISH ENGINE (Moves Draft to Live & Clears Draft)
export const publishCourse = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { data: course, error: fetchErr } = await supabase
            .from("courses")
            .select("draft_data")
            .eq("id", id)
            .single();
        if (fetchErr) throw fetchErr;

        const { blueprint, moduleContents } = course.draft_data || {};
        if (!blueprint) throw new Error("No draft data available to publish.");

        // 1. Overwrite public blueprint AND clear the draft_data so the Dashboard knows it's fully published
        const { error: updateErr } = await supabase
            .from("courses")
            .update({ blueprint, status: "published", draft_data: null })
            .eq("id", id);
        if (updateErr) throw updateErr;

        // 2. Delete old live modules and insert the new draft modules
        await supabase.from("modules").delete().eq("course_id", id);

        if (moduleContents && Object.keys(moduleContents).length > 0) {
            const modulesPayload = Object.entries(moduleContents).map(
                ([idx, content]) => ({
                    course_id: id,
                    sequence_number: parseInt(idx) + 1,
                    title:
                        blueprint.modules[idx]?.title ||
                        `Module ${parseInt(idx) + 1}`,
                    content: content,
                }),
            );
            await supabase.from("modules").insert(modulesPayload);
        }

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
// 🔥 DISCARD DRAFT ENGINE (Reverts to Published State)
export const discardDraft = async (req, res, next) => {
    try {
        const { error } = await supabase
            .from("courses")
            .update({ draft_data: null }) // Wiping draft_data forces the system to fall back to the live modules
            .eq("id", req.params.id);

        if (error) throw error;
        res.json({ success: true });
    } catch (error) {
        next(error);
    }
};
