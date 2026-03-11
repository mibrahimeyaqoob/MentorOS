import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../services/api";
import { useToast } from "../../../contexts/ToastContext";
import { 
    Sparkles, Loader2, Target, Youtube, PlayCircle, Save, CheckCircle2, 
    UploadCloud, X, FileText, MousePointerClick, MessageSquare, MonitorCheck, 
    Wand2, Edit3, Undo2, Redo2, Cpu, Activity, Zap, RefreshCw, Trash2 // <-- Added Trash2
} from "lucide-react";

// Helper key for SessionStorage
const getHistoryKey = (id) => `course_history_${id || 'new'}`;

export default function CourseCreator() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    // --- CORE STATE ---
    const [courseId, setCourseId] = useState(id || null);
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ topic: "", audience: "" });
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);

    // --- AI DATA STATE ---
    const [blueprint, setBlueprint] = useState(null);
    const [moduleContents, setModuleContents] = useState({});
    const[activeModuleIdx, setActiveModuleIdx] = useState(0);

    // --- SYSTEM & TELEMETRY STATE ---
    const [telemetry, setTelemetry] = useState({ model: "Idle", status: "ONLINE", tokens: 0 });
    const [blueprintPrompt, setBlueprintPrompt] = useState("");
    const[stepPrompt, setStepPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const[generatingAll, setGeneratingAll] = useState(false);
    const [engineConfig, setEngineConfig] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);

    // --- PERSISTENT UNDO / REDO ENGINE (SessionStorage) ---
    const [canUndo, setCanUndo] = useState(false);
    const [canRedo, setCanRedo] = useState(false);
    const isUndoingRef = useRef(false);
    const debounceTimer = useRef(null);

    // Load History from SessionStorage on Mount
    const getHistory = useCallback(() => {
        const stored = sessionStorage.getItem(getHistoryKey(courseId));
        return stored ? JSON.parse(stored) : { stack:[], index: -1 };
    }, [courseId]);

    const updateUndoRedoUI = useCallback(() => {
        const hist = getHistory();
        setCanUndo(hist.index > 0);
        setCanRedo(hist.index < hist.stack.length - 1);
    }, [getHistory]);

        // 🔥 NEW STATES FOR VERSION CONTROL
        const [isPublished, setIsPublished] = useState(false);
        const[hasUnpublishedEdits, setHasUnpublishedEdits] = useState(false);

    // Initialize UI state on mount
    useEffect(() => { updateUndoRedoUI(); }, [updateUndoRedoUI]);

    const saveToHistory = useCallback((newBlueprint, newModuleContents) => {
        if (isUndoingRef.current) return;

        const stateSnapshot = JSON.stringify({ blueprint: newBlueprint, moduleContents: newModuleContents });
        let hist = getHistory();

        // Prevent duplicate saves
        if (hist.index >= 0 && hist.stack[hist.index] === stateSnapshot) return;

        // Slice off "future" redo states if we made a new edit
        hist.stack = hist.stack.slice(0, hist.index + 1);
        hist.stack.push(stateSnapshot);

        // Keep max 30 to prevent massive memory bloat
        if (hist.stack.length > 30) hist.stack.shift(); 

        hist.index = hist.stack.length - 1;
        sessionStorage.setItem(getHistoryKey(courseId), JSON.stringify(hist));

        updateUndoRedoUI();
    }, [courseId, getHistory, updateUndoRedoUI]);

    // Debounced History Tracking (1.5s)
    useEffect(() => {
        if (!blueprint || isUndoingRef.current) return;
        clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            saveToHistory(blueprint, moduleContents);
        }, 1500); 
    },[blueprint, moduleContents, saveToHistory]);

    const handleUndo = useCallback(() => {
        let hist = getHistory();
        if (hist.index > 0) {
            isUndoingRef.current = true;
            clearTimeout(debounceTimer.current);

            hist.index -= 1;
            const prevState = JSON.parse(hist.stack[hist.index]);

            setBlueprint(prevState.blueprint);
            setModuleContents(prevState.moduleContents);

            sessionStorage.setItem(getHistoryKey(courseId), JSON.stringify(hist));
            updateUndoRedoUI();

            setTimeout(() => { isUndoingRef.current = false; }, 200);
        }
    },[courseId, getHistory, updateUndoRedoUI]);

    const handleRedo = useCallback(() => {
        let hist = getHistory();
        if (hist.index < hist.stack.length - 1) {
            isUndoingRef.current = true;
            clearTimeout(debounceTimer.current);

            hist.index += 1;
            const nextState = JSON.parse(hist.stack[hist.index]);

            setBlueprint(nextState.blueprint);
            setModuleContents(nextState.moduleContents);

            sessionStorage.setItem(getHistoryKey(courseId), JSON.stringify(hist));
            updateUndoRedoUI();

            setTimeout(() => { isUndoingRef.current = false; }, 200);
        }
    }, [courseId, getHistory, updateUndoRedoUI]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) handleRedo(); else handleUndo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);


    // 1. LOAD CONFIG & EXISTING DRAFTS
    useEffect(() => {
        api.getRouting().then(res => {
            setEngineConfig(res.routing ? res.routing : res);
        }).catch(e => console.error(e));

        if (id) {
            setLoading(true);
            api.getCourse(id).then(res => {
                setFormData({ topic: res.course.title, audience: res.course.target_audience });

                // Track Version Status
                setIsPublished(res.course.status === 'published');
                setHasUnpublishedEdits(!!res.course.draft_data); 

                if (res.draft) {
                    setBlueprint(res.draft.blueprint);
                    setModuleContents(res.draft.moduleContents || {});
                    setStep(3);
                }
            }).catch(e => showToast("Failed to load course", "error")).finally(() => setLoading(false));
        }
    },[id]);


    // 3. AUTO-SAVE ENGINE
    useEffect(() => {
        if (!blueprint) return;
        const autoSaveTimer = setTimeout(async () => {
            setIsSaving(true);
            try {
                const data = { id: courseId, title: blueprint.title || formData.topic, target_audience: formData.audience, blueprint, moduleContents };
                const res = await api.saveCourseDraft(data);

                setHasUnpublishedEdits(true); // 🔥 Mark that we have unsaved edits

                if (!courseId) {
                    setCourseId(res.courseId);
                    window.history.replaceState(null, '', `/hq-mentor-core/course-creator/${res.courseId}`);
                }
                setLastSaved(new Date());
            } catch (err) { console.error("Auto-save failed", err); } 
            finally { setIsSaving(false); }
        }, 3000); 
        return () => clearTimeout(autoSaveTimer);
    },[blueprint, moduleContents, formData, courseId]);


    // 🔥 NEW: DISCARD DRAFT HANDLER
    const handleDiscardDraft = async () => {
        if (isPublished) {
            // If it's an existing live course, we discard the edits and reload the page to pull the clean live version
            if (!window.confirm("Discard all unpublished edits and revert to the live published version?")) return;
            setLoading(true);
            try {
                await api.discardDraft(courseId);
                sessionStorage.removeItem(getHistoryKey(courseId)); // Clear undo memory
                window.location.reload(); 
            } catch(e) { showToast(e.message, "error"); setLoading(false); }
        } else {
            // If it was never published, discarding it just deletes it entirely
            if (!window.confirm("Delete this draft entirely?")) return;
            setLoading(true);
            try {
                await api.deleteCourse(courseId);
                sessionStorage.removeItem(getHistoryKey(courseId));
                navigate('/hq-mentor-core/dashboard');
            } catch(e) { showToast(e.message, "error"); setLoading(false); }
        }
    };

    // --- FILE HANDLING ---
    const handleFileDrop = (e) => { e.preventDefault(); setFiles(prev =>[...prev, ...Array.from(e.dataTransfer.files)]); };
    const handleFileSelect = (e) => { setFiles(prev =>[...prev, ...Array.from(e.target.files)]); };
    const removeFile = (index) => { setFiles(prev => prev.filter((_, i) => i !== index)); };

    // --- API CALLS WITH TELEMETRY ---
    const updateTelemetry = (modelName, status, addedTokens = 0) => {
        setTelemetry(prev => ({ model: modelName || prev.model, status, tokens: prev.tokens + addedTokens }));
    };

    const handleGenerateBlueprint = async () => {
        if (!engineConfig?.architect?.model) return showToast("Configure models in Command Center.", "error");
        setLoading(true);
        const targetModel = engineConfig.architect.model;
        updateTelemetry(targetModel, "ANALYZING DATA...");
        try {
            const res = await api.generateBlueprint(formData.topic, formData.audience, engineConfig, youtubeUrl, files);
            setBlueprint(res.blueprint);
            setStep(2);
            updateTelemetry(targetModel, "ONLINE", res.usage?.totalTokenCount || 0);
            showToast("Blueprint Generated!", "success");
        } catch (error) { showToast(error.message, "error"); updateTelemetry(targetModel, "FAILED"); } 
        finally { setLoading(false); }
    };

    const handleRefineBlueprint = async () => {
        if (!blueprintPrompt.trim()) return;
        setLoading(true);
        const targetModel = engineConfig.architect.model;
        updateTelemetry(targetModel, "REVISING BLUEPRINT...");
        try {
            const res = await api.refineBlueprint(blueprint, blueprintPrompt, engineConfig);
            setBlueprint(res.blueprint);
            setBlueprintPrompt("");
            updateTelemetry(targetModel, "ONLINE", res.usage?.totalTokenCount || 0);
        } catch (error) { showToast(error.message, "error"); updateTelemetry(targetModel, "FAILED"); } 
        finally { setLoading(false); }
    };

    const handleExtractAll = async () => {
        setGeneratingAll(true);
        const targetModel = engineConfig.lesson.model;
        updateTelemetry(targetModel, "BATCH EXTRACTING...");
        try {
            const newContents = { ...moduleContents };
            for (let i = 0; i < blueprint.modules.length; i++) {
                if (newContents[i] || blueprint.modules[i].is_static) continue;

                const res = await api.extractModuleSteps(blueprint.modules[i].title, blueprint, engineConfig, courseId || "draft", "");
                newContents[i] = res.steps;
                setModuleContents({ ...newContents }); 
                updateTelemetry(targetModel, `EXTRACTING ${i+1}/${blueprint.modules.length}...`, res.usage?.totalTokenCount || 0);

                await new Promise(r => setTimeout(r, 2000)); 
            }
            setStep(3);
            updateTelemetry(targetModel, "ONLINE", 0);
            showToast("Extraction complete!", "success");
        } catch (error) { showToast(error.message, "error"); updateTelemetry(targetModel, "FAILED"); } 
        finally { setGeneratingAll(false); }
    };

    const handleExtractSingle = async (index, isReExtract = false) => {
        setLoading(true);
        const targetModel = engineConfig.lesson.model;
        updateTelemetry(targetModel, isReExtract ? "RE-EXTRACTING..." : "EXTRACTING MODULE...");
        try {
            const res = await api.extractModuleSteps(blueprint.modules[index].title, blueprint, engineConfig, courseId, stepPrompt);
            setModuleContents(prev => ({ ...prev, [index]: res.steps }));
            if(!isReExtract) setStepPrompt(""); 
            updateTelemetry(targetModel, "ONLINE", res.usage?.totalTokenCount || 0);
            showToast(isReExtract ? "Module Re-Extracted!" : "Module Extracted!", "success");
        } catch (error) { showToast(error.message, "error"); updateTelemetry(targetModel, "FAILED"); } 
        finally { setLoading(false); }
    };

    const handleRefineSteps = async () => {
        if (!stepPrompt.trim()) return;
        setLoading(true);
        const targetModel = engineConfig.lesson.model;
        updateTelemetry(targetModel, "REVISING STEPS...");
        try {
            const currentSteps = moduleContents[activeModuleIdx];
            const res = await api.refineModuleSteps(currentSteps, stepPrompt, engineConfig);
            setModuleContents(prev => ({ ...prev, [activeModuleIdx]: res.steps }));
            setStepPrompt("");
            updateTelemetry(targetModel, "ONLINE", res.usage?.totalTokenCount || 0);
            showToast("Steps Revised!", "success");
        } catch (error) { showToast(error.message, "error"); updateTelemetry(targetModel, "FAILED"); } 
        finally { setLoading(false); }
    };

    const handleUpdateStep = (stepIdx, field, value, isUiTarget = false) => {
        setModuleContents((prev) => {
            const newArray =[...prev[activeModuleIdx]];
            if (isUiTarget) newArray[stepIdx].ui_target = { ...newArray[stepIdx].ui_target,[field]: value };
            else newArray[stepIdx][field] = value;
            return { ...prev, [activeModuleIdx]: newArray };
        });
    };

    const handlePublish = async () => {
        setLoading(true);
        try {
            await api.publishCourse(courseId);
            sessionStorage.removeItem(getHistoryKey(courseId)); // Clear session history on publish
            showToast("Course Published Live!", "success");
            navigate('/hq-mentor-core/dashboard');
        } catch (error) { showToast(error.message, "error"); } 
        finally { setLoading(false); }
    };

    return (
        <div className="max-w-6xl mx-auto py-8 animate-in fade-in duration-500 relative pb-24">

            {/* TOP BAR: AUTOSAVE, UNDO/REDO & DISCARD */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <button onClick={handleUndo} disabled={!canUndo} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all"><Undo2 size={18}/></button>
                    <button onClick={handleRedo} disabled={!canRedo} className="p-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-30 transition-all"><Redo2 size={18}/></button>

                    {/* 🔥 THE DISCARD DRAFT BUTTON */}
                    {courseId && (hasUnpublishedEdits || !isPublished) && (
                        <button onClick={handleDiscardDraft} className="ml-2 text-xs font-bold text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-2 rounded-lg transition-all flex items-center gap-1 shadow-sm">
                            <Trash2 size={14}/> {isPublished ? "Discard Edits & Revert" : "Delete Draft"}
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    {isSaving ? <><Loader2 size={12} className="animate-spin text-indigo-500" /> Saving draft...</> : lastSaved ? <><CheckCircle2 size={12} className="text-emerald-500" /> Draft Saved {lastSaved.toLocaleTimeString()}</> : null}
                </div>
            </div>

            {/* STEP 1: CONTEXT UPLOAD */}
            {step === 1 && (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
                    <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2"><Target className="text-indigo-600" /> Source Ingestion</h2>
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Course Topic</label>
                                <input type="text" placeholder="e.g. Master PowerBI DAX" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold focus:border-indigo-500" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Target Audience</label>
                                <input type="text" placeholder="e.g. Data Analysts" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl outline-none font-bold focus:border-indigo-500" value={formData.audience} onChange={e => setFormData({...formData, audience: e.target.value})} />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-2"><Youtube size={16} className="text-red-500"/> Core Video Reference</label>
                            <input type="url" placeholder="https://youtube.com/watch?v=..." className="w-full p-4 bg-red-50/50 border border-red-100 rounded-xl outline-none focus:border-red-300" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-2"><FileText size={16} className="text-indigo-500"/> Supporting Documents</label>
                            <div onDragOver={(e) => e.preventDefault()} onDrop={handleFileDrop} onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-2xl p-8 text-center cursor-pointer hover:bg-indigo-50 transition-colors">
                                <UploadCloud size={32} className="text-indigo-400 mx-auto mb-3" />
                                <p className="font-bold text-indigo-900 text-sm">Drag & drop PDFs, TXT, or Code files</p>
                                <input type="file" multiple ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
                            </div>
                            {files.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {files.map((file, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm">
                                            <span className="truncate max-w-[150px]">{file.name}</span>
                                            <button onClick={() => removeFile(i)} className="text-gray-400 hover:text-red-500"><X size={14}/></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button onClick={handleGenerateBlueprint} disabled={loading} className="w-full py-4 mt-4 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50 shadow-lg">
                            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={20} />} Generate Curriculum Blueprint
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 2: BLUEPRINT REFINEMENT */}
            {step === 2 && blueprint && (
                <div className="space-y-6">
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-indigo-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-3xl font-black text-gray-900">{blueprint.title}</h2>
                                <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest mt-1 block">AI Draft Blueprint</span>
                            </div>
                        </div>

                        <div className="space-y-3 mb-8">
                            {blueprint.modules.map((m, i) => (
                                <div key={i} className={`p-5 rounded-2xl border flex flex-col sm:flex-row gap-4 items-start sm:items-center ${m.is_static ? 'bg-amber-50/30 border-amber-100' : 'bg-gray-50 border-gray-100'}`}>
                                    <div className="bg-white text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-sm shrink-0 border border-gray-100">{i+1}</div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-gray-900">{m.title}</h3>
                                            {m.is_supplementary && <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest flex items-center gap-1"><Sparkles size={10}/> Auto-Sourced</span>}
                                            {m.is_static && <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest">Career Launchpad</span>}
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1">{m.objective}</p>
                                        {m.supplementary_url && <a href={m.supplementary_url} target="_blank" rel="noreferrer" className="text-[10px] text-blue-500 hover:underline mt-1 inline-block">Source: {m.supplementary_url}</a>}
                                    </div>
                                    <div className="bg-indigo-100 text-indigo-700 text-[10px] font-mono px-2 py-1 rounded font-bold shrink-0">{m.start_time} - {m.end_time}</div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex gap-3 mb-8">
                            <Wand2 className="text-indigo-500 shrink-0 mt-2" size={20}/>
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block mb-1">AI Revision Command</label>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="e.g. Combine module 2 and 3 into a single chunk" className="flex-1 bg-white border border-indigo-200 p-2.5 rounded-lg text-sm outline-none focus:border-indigo-500" value={blueprintPrompt} onChange={e => setBlueprintPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRefineBlueprint()} disabled={loading} />
                                    <button onClick={handleRefineBlueprint} disabled={loading || !blueprintPrompt} className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                                        {loading ? <Loader2 size={16} className="animate-spin"/> : "Revise"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleExtractAll} disabled={generatingAll} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50 shadow-xl">
                            {generatingAll ? <Loader2 className="animate-spin" /> : <PlayCircle />} Approve & Auto-Extract UI Action Maps
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: ACTION MAP STUDIO */}
            {step === 3 && (
                <div className="flex flex-col lg:flex-row gap-6 h-[800px]">

                    <div className="w-full lg:w-80 bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col overflow-hidden shrink-0">
                        <div className="p-6 border-b bg-gray-50/50">
                            <h3 className="font-black text-gray-900 truncate" title={blueprint.title}>{blueprint.title}</h3>
                            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Action Maps</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {blueprint.modules.map((mod, idx) => (
                                <button key={idx} onClick={() => setActiveModuleIdx(idx)} className={`w-full text-left p-4 rounded-xl border transition-all ${activeModuleIdx === idx ? "bg-indigo-50 border-indigo-200 shadow-sm" : "bg-white border-gray-100 hover:border-gray-300"}`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold text-indigo-600 uppercase">Module {idx + 1}</span>
                                        {moduleContents[idx] && <CheckCircle2 size={14} className="text-emerald-500"/>}
                                    </div>
                                    <h4 className={`font-bold text-sm ${activeModuleIdx === idx ? "text-indigo-900" : "text-gray-700"} line-clamp-2`}>{mod.title}</h4>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col overflow-hidden relative">
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <MonitorCheck className="text-indigo-600" size={24} />
                                <h3 className="font-bold text-gray-900">Step Extraction Engine</h3>
                            </div>
                            <button onClick={handlePublish} disabled={loading} className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-md">
                                {loading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Publish Final
                            </button>
                        </div>

                        {/* AI COMMAND BAR */}
                        {!blueprint.modules[activeModuleIdx]?.is_static && (
                            <div className="p-4 border-b bg-white z-10 shadow-sm">
                                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex gap-3">
                                    <Wand2 className="text-indigo-500 shrink-0 mt-2" size={20}/>
                                    <div className="flex-1 flex flex-col sm:flex-row gap-2">
                                        <input 
                                            type="text" 
                                            placeholder={moduleContents[activeModuleIdx] ? "AI Command: Make instructions more friendly..." : "AI Command: Focus heavily on keyboard shortcuts..."} 
                                            className="flex-1 bg-white border border-indigo-200 p-2.5 rounded-lg text-sm outline-none focus:border-indigo-500" 
                                            value={stepPrompt} 
                                            onChange={e => setStepPrompt(e.target.value)} 
                                            disabled={loading} 
                                        />

                                        {moduleContents[activeModuleIdx] ? (
                                            <>
                                                <button onClick={handleRefineSteps} disabled={loading || !stepPrompt} className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                                                    {loading ? <Loader2 size={16} className="animate-spin"/> : "Revise Steps"}
                                                </button>
                                                <button onClick={() => handleExtractSingle(activeModuleIdx, true)} disabled={loading} className="bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-200 disabled:opacity-50 flex items-center gap-1">
                                                    <RefreshCw size={14}/> Re-Extract
                                                </button>
                                            </>
                                        ) : (
                                            <button onClick={() => handleExtractSingle(activeModuleIdx, false)} disabled={loading} className="bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                                                {loading ? <Loader2 size={16} className="animate-spin"/> : "Extract Actions"}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
                            {blueprint.modules[activeModuleIdx]?.is_static ? (
                                <div className="h-full flex flex-col items-center justify-center text-amber-600 font-bold p-10 text-center">
                                    <Sparkles size={40} className="mb-4 text-amber-400" />
                                    <p>This is a Static Career Launchpad Module.</p>
                                    <p className="text-sm font-medium mt-2 text-gray-500">It does not require UI action extraction. It will act as a standard lesson in the Student Portal.</p>
                                </div>
                            ) : !moduleContents[activeModuleIdx] ? (
                                <div className="h-full flex items-center justify-center text-gray-400 font-bold flex-col gap-2">
                                    <MonitorCheck size={40} className="text-gray-300"/>
                                    Extraction pending for this module.
                                </div>
                            ) : (
                                <div className="space-y-4 max-w-3xl mx-auto">
                                    {moduleContents[activeModuleIdx].map((stepObj, sIdx) => (
                                        <div key={sIdx} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className={`px-4 py-2 border-b flex items-center gap-2 ${stepObj.step_type === "action_trigger" ? "bg-purple-50/50 border-purple-100" : "bg-blue-50/50 border-blue-100"}`}>
                                                <span className="bg-white text-gray-800 w-6 h-6 rounded-md flex items-center justify-center text-xs font-black shadow-sm border border-gray-100">{sIdx + 1}</span>
                                                {stepObj.step_type === "action_trigger" ? (
                                                    <><MousePointerClick size={14} className="text-purple-600"/><span className="text-xs font-bold text-purple-900 uppercase">UI Action</span></>
                                                ) : (
                                                    <><MessageSquare size={14} className="text-blue-600"/><span className="text-xs font-bold text-blue-900 uppercase">Dialogue</span></>
                                                )}
                                            </div>

                                            <div className="p-4 space-y-4">
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block flex items-center gap-1"><Edit3 size={10}/> AI Dialogue</label>
                                                    <textarea rows="2" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm outline-none focus:border-indigo-400 resize-none font-medium" value={stepObj.instruction_text} onChange={e => handleUpdateStep(sIdx, "instruction_text", e.target.value)} />
                                                </div>

                                                {stepObj.step_type === "action_trigger" && (
                                                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Visual Target (Computer Use AI)</label>
                                                            <input type="text" className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm font-mono text-indigo-700 outline-none" value={stepObj.ui_target?.description || ""} onChange={e => handleUpdateStep(sIdx, "description", e.target.value, true)} />
                                                        </div>
                                                        <div className="flex gap-4">
                                                            <div className="flex-1">
                                                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Action</label>
                                                                <select className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm font-bold outline-none" value={stepObj.required_action} onChange={e => handleUpdateStep(sIdx, "required_action", e.target.value)}>
                                                                    <option value="left_click">Left Click</option>
                                                                    <option value="double_click">Double Click</option>
                                                                    <option value="type_text">Type Text</option>
                                                                    <option value="drag_and_drop">Drag & Drop</option>
                                                                    <option value="none">None</option>
                                                                </select>
                                                            </div>
                                                            <div className="flex-1">
                                                                <label className="text-[10px] font-bold text-gray-500 uppercase mb-1 block">Success State</label>
                                                                <input type="text" className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-sm outline-none" value={stepObj.success_state || ""} onChange={e => handleUpdateStep(sIdx, "success_state", e.target.value)} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* LIVE TELEMETRY WATCHTOWER */}
            <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl border border-gray-700 flex items-center gap-6 text-xs font-bold z-50">
                <div className="flex items-center gap-2"><Cpu size={14} className="text-indigo-400"/> {telemetry.model}</div>
                <div className="w-px h-4 bg-gray-700"></div>
                <div className="flex items-center gap-2 text-emerald-400">
                    {telemetry.status.includes('ING') ? <Loader2 size={14} className="animate-spin"/> : <Activity size={14}/>} 
                    <span className="uppercase tracking-widest">{telemetry.status}</span>
                </div>
                <div className="w-px h-4 bg-gray-700"></div>
                <div className="flex items-center gap-2 text-amber-400 font-mono"><Zap size={14}/> {telemetry.tokens.toLocaleString()} TOKENS</div>
            </div>
        </div>
    );
}