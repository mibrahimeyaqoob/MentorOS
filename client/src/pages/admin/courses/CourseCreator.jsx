import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../../../services/api";
import { useToast } from "../../../contexts/ToastContext";
import { Sparkles, ArrowRight, Loader2, Target, Youtube, PlayCircle, Save, CheckCircle2, MonitorCheck } from "lucide-react";

export default function CourseCreator() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { showToast } = useToast();

    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({ topic: "", audience: "" });
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [blueprint, setBlueprint] = useState(null);
    const [moduleContents, setModuleContents] = useState({});

    const [loading, setLoading] = useState(false);
    const [generatingAll, setGeneratingAll] = useState(false);
    const [engineConfig, setEngineConfig] = useState(null);

    useEffect(() => {
        api.getRouting().then(res => setEngineConfig(res)).catch(e => console.log(e));
    },[]);

    const handleGenerateBlueprint = async () => {
        if (!engineConfig?.architect?.keyId) return showToast("Please set an API key in the Command Center first.", "error");
        setLoading(true);
        try {
            const sources =[{ type: 'youtube', url: youtubeUrl }];
            const res = await api.generateBlueprint(formData.topic, formData.audience, engineConfig.architect, sources);
            setBlueprint(res.blueprint);
            setStep(3);
            showToast("Blueprint Generated!", "success");
        } catch (error) {
            showToast(error.message, "error");
        } finally { setLoading(false); }
    };

    const handleExtractAll = async () => {
        setGeneratingAll(true);
        try {
            showToast("Initializing High-Speed Batch Extraction...", "info");

            // 1. Call the new Parallel Batch Endpoint, passing the blueprint
            const res = await api.batchExtractSteps(youtubeUrl, blueprint, engineConfig.lesson);

            showToast(`Batch Complete! Found ${res.metrics.actionsFound} actions across ${res.metrics.chunks} modules.`, "success");

            // 2. The backend now returns the steps perfectly mapped to the module index!
            setModuleContents(res.stepsByModule);

        } catch (error) {
            showToast("Batch Extraction Failed: " + error.message, "error");
        } finally { setGeneratingAll(false); }
    };

    return (
        <div className="max-w-5xl mx-auto py-8">
            {/* STEP 1 & 2: Context */}
            {step === 1 && (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 animate-in fade-in">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Target className="text-indigo-600" /> AI Course Architect</h2>
                    <div className="space-y-4">
                        <input type="text" placeholder="Course Topic (e.g. Learn React)" className="w-full p-4 bg-gray-50 border rounded-xl outline-none font-bold" value={formData.topic} onChange={e => setFormData({...formData, topic: e.target.value})} />
                        <input type="text" placeholder="Target Audience (e.g. Beginners)" className="w-full p-4 bg-gray-50 border rounded-xl outline-none font-bold" value={formData.audience} onChange={e => setFormData({...formData, audience: e.target.value})} />

                        <div className="pt-4 border-t">
                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Provide Knowledge Context (YouTube URL)</label>
                            <div className="flex gap-2">
                                <Youtube size={48} className="text-red-500 bg-red-50 p-2 rounded-xl" />
                                <input type="url" placeholder="https://youtube.com/watch?v=..." className="w-full p-4 bg-gray-50 border rounded-xl outline-none" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} />
                            </div>
                        </div>

                        <button onClick={handleGenerateBlueprint} disabled={loading || !youtubeUrl} className="w-full py-4 mt-4 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />} Generate Curriculum Blueprint
                        </button>
                    </div>
                </div>
            )}

            {/* STEP 3: Review Blueprint */}
            {step === 3 && blueprint && (
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-200 animate-in slide-in-from-bottom-8">
                    <h2 className="text-2xl font-black text-gray-900 mb-6">{blueprint.title}</h2>
                    <div className="space-y-3 mb-8">
                        {blueprint.modules.map((m, i) => (
                            <div key={i} className="p-4 bg-gray-50 rounded-xl border flex items-center gap-3">
                                <span className="bg-indigo-100 text-indigo-600 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">{i+1}</span>
                                <span className="font-bold text-gray-800">{m.title}</span>
                            </div>
                        ))}
                    </div>

                    {Object.keys(moduleContents).length === 0 ? (
                        <button onClick={handleExtractAll} disabled={generatingAll} className="w-full py-4 bg-indigo-50 text-indigo-600 rounded-xl font-bold flex items-center justify-center gap-2 border border-indigo-200 hover:bg-indigo-100 disabled:opacity-50">
                            {generatingAll ? <Loader2 className="animate-spin" /> : <PlayCircle />} Auto-Extract UI Actions
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200 flex items-center gap-3 text-emerald-800 font-bold">
                                <CheckCircle2 /> Extraction Complete! JSON Action Maps generated.
                            </div>
                            <button onClick={handlePublish} disabled={loading} className="w-full py-4 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-black disabled:opacity-50 shadow-lg">
                                {loading ? <Loader2 className="animate-spin" /> : <Save />} Save & Publish to Fleet
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}