import React, { useState, useEffect } from "react";
import { api } from "../../../services/api";
import { useToast } from "../../../contexts/ToastContext";
import { Save, Brain, MousePointerClick, MessageSquare, Database, Cpu, Loader2, Cloud, Plus, Trash2, Search } from "lucide-react";

// ============================================================================
// SYSTEM ENGINES DEFINITION (Static UI Elements)
// ============================================================================
const ENGINES =[
    { id: "searcher", name: "Autonomous Searcher", icon: Search, description: "Finds missing tutorials on the web. Requires Google Gemini for native Google Search grounding." },
    { id: "architect", name: "Course Architect", icon: Brain, description: "Generates JSON Blueprints from multi-modal data using deep reasoning." },
    { id: "lesson", name: "Action Map Extractor", icon: MousePointerClick, description: "Extracts step-by-step UI actions. Claude Sonnet is highly recommended here." },
    { id: "tutor", name: "Live Student Tutor", icon: MessageSquare, description: "Live desktop agent using Computer Use Vision." },
    { id: "embedder", name: "Vector Embedder", icon: Database, description: "Converts text into vectors for RAG memory. Requires a Google Embedding model." }
];

export default function ApiManager() {
    const { showToast } = useToast();

    // ============================================================================
    // STATE: STRICTLY NO DEFAULT MODELS
    // ============================================================================
    const [configData, setConfigData] = useState({
        routing: {
            searcher: null,
            architect: null,
            lesson: null,
            tutor: null,
            embedder: null
        },
        available_models: [] // Starts completely empty
    });

    const [newModel, setNewModel] = useState({ id: "", name: "", provider: "google" });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // ============================================================================
    // INITIALIZATION
    // ============================================================================
    useEffect(() => {
        api.getRouting().then(res => {
            // Load existing configuration from Supabase
            if (res && res.routing) {
                setConfigData(res);
            } else if (res && Object.keys(res).length > 0 && !res.routing) {
                // Legacy DB Upgrader (if migrating from old flat structure)
                setConfigData({
                    routing: {
                        searcher: res.searcher || null,
                        architect: res.architect || null,
                        lesson: res.lesson || null,
                        tutor: res.tutor || null,
                        embedder: res.embedder || null
                    },
                    available_models:[]
                });
            }
            setLoading(false);
        }).catch(err => {
            showToast("Failed to load configuration: " + err.message, "error");
            setLoading(false);
        });
    }, [showToast]);

    // ============================================================================
    // HANDLERS
    // ============================================================================
    const saveConfig = async () => {
        setSaving(true);
        try {
            await api.updateRouting(configData);
            showToast("System Architecture Updated Successfully!", "success");
        } catch (err) {
            showToast(err.message, "error");
        } finally { setSaving(false); }
    };

    const handleRoutingChange = (engineId, modelId) => {
        const selectedModel = configData.available_models.find(m => m.id === modelId);
        if (!selectedModel) return;

        setConfigData(prev => ({
            ...prev,
            routing: {
                ...prev.routing,
                [engineId]: { model: selectedModel.id, provider: selectedModel.provider }
            }
        }));
    };

    const addModel = () => {
        if (!newModel.id.trim() || !newModel.name.trim()) {
            return showToast("Please provide both a Model ID and Display Name.", "error");
        }

        // Prevent duplicates
        if (configData.available_models.some(m => m.id === newModel.id.trim())) {
            return showToast("This model ID is already registered.", "warning");
        }

        setConfigData(prev => ({
            ...prev,
            available_models:[...prev.available_models, { 
                id: newModel.id.trim(), 
                name: newModel.name.trim(), 
                provider: newModel.provider 
            }]
        }));

        setNewModel({ id: "", name: "", provider: "google" });
        showToast("Model added to registry.", "success");
    };

    const removeModel = (idToRemove) => {
        setConfigData(prev => {
            // Remove from registry
            const updatedModels = prev.available_models.filter(m => m.id !== idToRemove);

            // Auto-clear any routing that relied on this model
            const updatedRouting = { ...prev.routing };
            Object.keys(updatedRouting).forEach(engine => {
                if (updatedRouting[engine] && updatedRouting[engine].model === idToRemove) {
                    updatedRouting[engine] = null; 
                }
            });

            return {
                ...prev,
                available_models: updatedModels,
                routing: updatedRouting
            };
        });
    };

    // ============================================================================
    // RENDER
    // ============================================================================
    if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" size={32}/></div>;

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in pb-20">
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 mb-2">
                <Cpu size={32} className="text-indigo-600" /> AI Command Center
            </h1>
            <p className="text-gray-500 mb-8">Register LLMs and route them to specific system engines dynamically.</p>

            {/* GCP Status Badge */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-4 mb-8">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600"><Cloud size={24} /></div>
                <div>
                    <h3 className="font-bold text-emerald-900">Google Cloud Service Account Active</h3>
                    <p className="text-xs text-emerald-700">Authentication is handled securely at the server level via GCP Application Default Credentials. No API keys required.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ------------------------------------------------------------- */}
                {/* MODEL REGISTRY */}
                {/* ------------------------------------------------------------- */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Model Registry</h2>
                        <p className="text-xs text-gray-500 mb-6">Add Vertex-compatible models here.</p>

                        <div className="space-y-3 mb-6">
                            <input 
                                type="text" 
                                placeholder="Model ID (e.g. claude-sonnet)" 
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none font-mono" 
                                value={newModel.id} 
                                onChange={e => setNewModel({...newModel, id: e.target.value})} 
                            />
                            <input 
                                type="text" 
                                placeholder="Display Name (e.g. Claude Sonnet)" 
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none" 
                                value={newModel.name} 
                                onChange={e => setNewModel({...newModel, name: e.target.value})} 
                            />
                            <select 
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none font-bold" 
                                value={newModel.provider} 
                                onChange={e => setNewModel({...newModel, provider: e.target.value})}
                            >
                                <option value="google">Google (Gemini)</option>
                                <option value="anthropic">Anthropic (Claude)</option>
                            </select>
                            <button 
                                onClick={addModel} 
                                className="w-full bg-indigo-50 text-indigo-600 font-bold py-2.5 rounded-lg text-sm flex justify-center items-center gap-2 hover:bg-indigo-100 transition-colors"
                            >
                                <Plus size={16}/> Add Model
                            </button>
                        </div>

                        <div className="space-y-2 border-t pt-4">
                            {configData.available_models.length === 0 && (
                                <p className="text-xs text-gray-400 text-center italic py-2">No models registered.</p>
                            )}
                            {configData.available_models.map((model, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                    <div className="overflow-hidden pr-2">
                                        <p className="text-xs font-bold text-gray-800 truncate">{model.name} <span className="text-[9px] font-normal uppercase text-indigo-500 bg-indigo-50 px-1 rounded ml-1">{model.provider}</span></p>
                                        <p className="text-[10px] text-gray-400 font-mono truncate">{model.id}</p>
                                    </div>
                                    <button onClick={() => removeModel(model.id)} className="text-red-400 hover:text-red-600 p-1 shrink-0 transition-colors"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ------------------------------------------------------------- */}
                {/* ROUTING MATRIX */}
                {/* ------------------------------------------------------------- */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Task Routing Matrix</h2>
                        <button 
                            onClick={saveConfig} 
                            disabled={saving} 
                            className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-md disabled:opacity-50"
                        >
                            {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Deploy Architecture
                        </button>
                    </div>

                    <div className="space-y-4">
                        {ENGINES.map(engine => (
                            <div key={engine.id} className={`border rounded-xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center transition-colors ${!configData.routing[engine.id] ? 'bg-amber-50/30 border-amber-200' : 'bg-gray-50/30 border-gray-100 hover:border-indigo-200'}`}>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <engine.icon size={18} className={!configData.routing[engine.id] ? "text-amber-500" : "text-indigo-600"}/>
                                        <h3 className="font-bold text-gray-900">{engine.name}</h3>
                                    </div>
                                    <p className="text-xs text-gray-500">{engine.description}</p>
                                </div>
                                <div className="w-full md:w-64 shrink-0">
                                    <select 
                                        className={`w-full border rounded-lg p-2.5 text-sm outline-none font-bold transition-colors ${!configData.routing[engine.id] ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white focus:border-indigo-500'}`}
                                        value={configData.routing[engine.id]?.model || ""} 
                                        onChange={e => handleRoutingChange(engine.id, e.target.value)}
                                    >
                                        <option value="" disabled>-- Assign Model --</option>
                                        {configData.available_models.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}