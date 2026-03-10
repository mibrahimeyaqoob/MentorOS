import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../services/api";
import { useToast } from "../../../contexts/ToastContext";
import { 
    Sparkles, ArrowRight, Loader2, Target, Youtube, PlayCircle, 
    Save, CheckCircle2, UploadCloud, X, FileText, MessageSquare, 
    MousePointerClick, MonitorCheck, Wand2, Edit3 
} from "lucide-react";

export default function CourseCreator() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    // Core State
    const[step, setStep] = useState(1);
    const [formData, setFormData] = useState({ topic: "", audience: "" });
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [files, setFiles] = useState([]);
    const fileInputRef = useRef(null);

    // AI Data State
    const [blueprint, setBlueprint] = useState(null);
    const [moduleContents, setModuleContents] = useState({});
    const[activeModuleIdx, setActiveModuleIdx] = useState(0);

    // Refinement Prompts
    const [blueprintPrompt, setBlueprintPrompt] = useState("");
    const [stepPrompt, setStepPrompt] = useState("");

    // System State
    const [loading, setLoading] = useState(false);
    const [generatingAll, setGeneratingAll] = useState(false);
    const [engineConfig, setEngineConfig] = useState(null);

    useEffect(() => {
        // Load routing config so we know which models to use
        api.getRouting().then(res => setEngineConfig(res)).catch(e => console.error(e));
    },[]);

    // --- FILE HANDLING ---
    const handleFileDrop = (e) => {
        e.preventDefault();
        const droppedFiles = Array.from(e.dataTransfer.files);
        setFiles(prev => [...prev, ...droppedFiles]);
    };
    const handleFileSelect = (e) => {
        setFiles(prev =>[...prev, ...Array.from(e.target.files)]);
    };
    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    // --- PHASE 1: GENERATE BLUEPRINT ---
    const handleGenerateBlueprint = async () => {
        if (!engineConfig?.architect?.model) return showToast("Go to AI Command Center and deploy routing config first.", "error");
        if (!youtubeUrl && files.length === 0) return showToast("Please provide a YouTube URL or upload context files.", "warning");

        setLoading(true);
        try {
            const res = await api.generateBlueprint(formData.topic, formData.audience, engineConfig.architect, youtubeUrl, files);
            setBlueprint(res.blueprint);
            setStep(2);
            showToast("Blueprint Generated Successfully!", "success");
        } catch (error) {
            showToast(error.message, "error");
        } finally { setLoading(false); }
    };

    // --- AI REVISION: BLUEPRINT ---
    const handleRefineBlueprint = async () => {
        if (!blueprintPrompt.trim()) return;
        setLoading(true);
        try {
            const res = await api.refineBlueprint(blueprint, blueprintPrompt, engineConfig.architect);
            setBlueprint(res.blueprint);
            setBlueprintPrompt("");
            showToast("Blueprint Revised!", "success");
        } catch (error) {
            showToast(error.message, "error");
        } finally { setLoading(false); }
    };

    // --- PHASE 2: EXTRACT UI ACTIONS ---
    const handleExtractAll = async () => {
        setGeneratingAll(true);
        try {
            const newContents = { ...moduleContents };
            for (let i = 0; i < blueprint.modules.length; i++) {
                if (newContents[i]) continue; // Skip if already extracted

                showToast(`Extracting Module ${i+1}/${blueprint.modules.length}...`, "info");
                const res = await api.extractModuleSteps(blueprint.modules[i].title, blueprint, engineConfig.lesson, "draft", "");
                newContents[i] = res.steps;
                setModuleContents({ ...newContents }); // Force render

                // Anti-Rate-Limit delay (2 seconds)
                await new Promise(r => setTimeout(r, 2000)); 
            }
            setStep(3);
            showToast("All modules extracted successfully!", "success");
        } catch (error) {
            showToast(error.message, "error");
        } finally { setGeneratingAll(false); }
    };

    // --- AI REVISION: STEPS ---
    const handleRefineSteps = async () => {
        if (!stepPrompt.trim()) return;
        setLoading(true);
        try {
            const currentSteps = moduleContents[activeModuleIdx];
            const res = await api.refineModuleSteps(currentSteps, stepPrompt, engineConfig.lesson);
            setModuleContents(prev => ({ ...prev, [activeModuleIdx]: res.steps }));
            setStepPrompt("");
            showToast("Steps Revised!", "success");
        } catch (error) {
            showToast(error.message, "error");
        } finally { setLoading(false); }
    };

    // --- MANUAL EDITING (Overrides) ---
    const handleUpdateStep = (stepIdx, field, value, isUiTarget = false) => {
        setModuleContents((prev) => {
            const newArray = [...prev[activeModuleIdx]];
            if (isUiTarget) {
                newArray[stepIdx].ui_target = { ...newArray[stepIdx].ui_target, [field]: value };
            } else {
                newArray[stepIdx][field] = value;
            }
            return { ...prev, [activeModuleIdx]: newArray };
        });
    };

    // --- PHASE 3: PUBLISH ---
    const handlePublish = async () => {
        setLoading(true);
        try {
            const data = {
                title: blueprint.title,
                target_audience: formData.audience,
                blueprint: blueprint,
                moduleContents: Object.values(moduleContents)
            };
            await api.saveCourseFinal(data);
            showToast("Course Published to Fleet!", "success");
            navigate('/hq-mentor-core/dashboard');
        } catch (error) {
            showToast(error.message, "error");
        } finally { setLoading(false); }
    };

    return (
        <div className="max-w-6xl mx-auto py-8 animate-in fade-in duration-500">

            {/* PROGRESS BAR */}
            <div className="flex items-center justify-between mb-8 relative px-4 max-w-2xl mx-auto">
                <div className="absolute top-5 left-0 w-full h-0.5 bg-gray-200 -z-0"></div>
                {[1, 2, 3].map((s, idx) => (
                    <div key={s} className={`z-10 flex items-center justify-center w-10 h-10 rounded-full font-bold transition-all shadow-sm ${step >= s ? "bg-indigo-600 text-white" : "bg-white border-2 border-gray-200 text-gray-400"}`}>
                        {step > s ? <CheckCircle2 size={20} /> : s}
                    </div>
                ))}
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
                            <p className="text-[10px] text-gray-400 mt-2 font-medium">Vertex AI will watch this video and map the timestamps natively.</p>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block flex items-center gap-2"><FileText size={16} className="text-indigo-500"/> Supporting Documents</label>
                            <div 
                                onDragOver={(e) => e.preventDefault()} 
                                onDrop={handleFileDrop}
                                onClick={() => fileInputRef.current.click()}
                                className="border-2 border-dashed border-indigo-200 bg-indigo-50/30 rounded-2xl p-8 text-center cursor-pointer hover:bg-indigo-50 transition-colors"
                            >
                                <UploadCloud size={32} className="text-indigo-400 mx-auto mb-3" />
                                <p className="font-bold text-indigo-900 text-sm">Drag & drop PDFs, TXT, or Code files</p>
                                <p className="text-xs text-indigo-500 mt-1">or click to browse (Max 30MB)</p>
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
                                <div key={i} className="p-5 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                                    <div className="bg-white text-indigo-600 w-10 h-10 rounded-xl flex items-center justify-center font-black shadow-sm shrink-0 border border-gray-100">{i+1}</div>
                                    <div className="flex-1">
                                        <h3 className="font-bold text-gray-900">{m.title}</h3>
                                        <p className="text-xs text-gray-500 mt-1">{m.objective}</p>
                                    </div>
                                    <div className="bg-indigo-100 text-indigo-700 text-[10px] font-mono px-2 py-1 rounded font-bold shrink-0">
                                        {m.start_time} - {m.end_time}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* AI Edit Bar */}
                        <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex gap-3 mb-8">
                            <Wand2 className="text-indigo-500 shrink-0 mt-2" size={20}/>
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-indigo-800 uppercase tracking-widest block mb-1">AI Revision Command</label>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="e.g. Combine module 2 and 3 into a single 4-minute chunk" className="flex-1 bg-white border border-indigo-200 p-2.5 rounded-lg text-sm outline-none focus:border-indigo-500" value={blueprintPrompt} onChange={e => setBlueprintPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRefineBlueprint()} disabled={loading} />
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

                    {/* Sidebar Modules */}
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

                    {/* Step Editor Area */}
                    <div className="flex-1 bg-white border border-gray-200 rounded-3xl shadow-sm flex flex-col overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-3">
                                <MonitorCheck className="text-indigo-600" size={24} />
                                <h3 className="font-bold text-gray-900">Step Extraction Engine</h3>
                            </div>
                            <button onClick={handlePublish} disabled={loading} className="bg-emerald-600 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-emerald-700 shadow-md">
                                {loading ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Publish Final
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-[#f8fafc]">
                            {!moduleContents[activeModuleIdx] ? (
                                <div className="h-full flex items-center justify-center text-gray-400 font-bold">Extraction pending for this module...</div>
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

                                            {/* MANUAL EDITING OVERRIDES */}
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

                        {/* AI Edit Bar for Steps */}
                        {moduleContents[activeModuleIdx] && (
                            <div className="p-4 border-t bg-white">
                                <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xl flex gap-3">
                                    <Wand2 className="text-indigo-500 shrink-0 mt-2" size={20}/>
                                    <div className="flex-1 flex gap-2">
                                        <input type="text" placeholder="AI Command: Make instructions more friendly..." className="flex-1 bg-white border border-indigo-200 p-2.5 rounded-lg text-sm outline-none focus:border-indigo-500" value={stepPrompt} onChange={e => setStepPrompt(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleRefineSteps()} disabled={loading} />
                                        <button onClick={handleRefineSteps} disabled={loading || !stepPrompt} className="bg-indigo-600 text-white px-5 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                                            {loading ? <Loader2 size={16} className="animate-spin"/> : "Revise"}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </div>
    );
}