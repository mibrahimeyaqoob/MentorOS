import React, { useState, useEffect } from "react";
import { api } from "../../../services/api";
import { useToast } from "../../../contexts/ToastContext";
import { Save, Brain, MousePointerClick, MessageSquare, Database, Cpu, Loader2, Cloud } from "lucide-react";

const ENGINES =[
    { id: "architect", name: "Course Architect", icon: Brain, description: "Generates Blueprints from YouTube URLs using deep reasoning." },
    { id: "lesson", name: "Action Map Extractor", icon: MousePointerClick, description: "Extracts step-by-step UI actions." },
    { id: "tutor", name: "Live Student Tutor", icon: MessageSquare, description: "Live desktop agent using Computer Use Vision." },
    { id: "embedder", name: "Vector Brain Embedder", icon: Database, description: "Converts text into vectors for RAG memory." }
];

const MODELS = {
    heavy:[
        { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro (Recommended)" },
        { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash-Lite" },
        { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" }
    ],
    fast:[
        { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Fastest / Vision)" },
        { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash-Lite" },
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" }
    ],
    embedding:[
        { id: "text-embedding-005", name: "Text Embedding 005 (Latest)" },
        { id: "gemini-embedding-001", name: "Gemini Embedding 001" }
    ]
};

export default function ApiManager() {
    const { showToast } = useToast();
    const [routing, setRouting] = useState({
        architect: { model: "gemini-3.1-pro-preview" },
        lesson: { model: "gemini-3-flash-preview" },
        tutor: { model: "gemini-3-flash-preview" },
        embedder: { model: "text-embedding-005" }
    });

    const [loading, setLoading] = useState(true);
    const[saving, setSaving] = useState(false);

    useEffect(() => {
        api.getRouting().then(res => {
            if (res && Object.keys(res).length > 0) setRouting(res);
            setLoading(false);
        }).catch(err => {
            showToast("Failed to load config: " + err.message, "error");
            setLoading(false);
        });
    },[]);

    const saveRouting = async () => {
        setSaving(true);
        try {
            await api.updateRouting(routing);
            showToast("AI Routing Configuration Saved!", "success");
        } catch (err) {
            showToast(err.message, "error");
        } finally { setSaving(false); }
    };

    if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" size={32}/></div>;

    return (
        <div className="max-w-4xl mx-auto animate-in fade-in">
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 mb-2">
                <Cpu size={32} className="text-indigo-600" /> AI Command Center
            </h1>
            <p className="text-gray-500 mb-8">Route specific Gemini 3 models to different system tasks.</p>

            {/* GCP Status Badge */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4 mb-8">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Cloud size={24} /></div>
                <div>
                    <h3 className="font-bold text-emerald-900">Google Cloud Service Account Active</h3>
                    <p className="text-xs text-emerald-700">Authentication is handled securely at the server level via GCP Application Default Credentials. No API keys required.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-900">Model Routing Matrix</h2>
                    <button onClick={saveRouting} disabled={saving} className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all">
                        {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Deploy Config
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                    {ENGINES.map(engine => {
                        const options = engine.id === 'embedder' ? MODELS.embedding : (engine.id === 'architect' ? MODELS.heavy : MODELS.fast);
                        return (
                            <div key={engine.id} className="border border-gray-100 rounded-xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center hover:border-indigo-200 transition-colors">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1"><engine.icon size={18} className="text-indigo-600"/><h3 className="font-bold text-gray-900">{engine.name}</h3></div>
                                    <p className="text-xs text-gray-500">{engine.description}</p>
                                </div>
                                <div className="w-full md:w-64 shrink-0">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Vertex AI Model</label>
                                    <select className="w-full border rounded-lg p-2.5 text-sm outline-none font-bold bg-gray-50 focus:border-indigo-500" 
                                        value={routing[engine.id]?.model || ""} 
                                        onChange={e => setRouting({...routing, [engine.id]: { model: e.target.value }})}
                                    >
                                        {options.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}