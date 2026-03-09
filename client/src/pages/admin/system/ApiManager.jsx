import React, { useState, useEffect } from "react";
import { api } from "../../../services/api";
import { useToast } from "../../../contexts/ToastContext";
import { Key, ShieldCheck, Trash2, Save, CheckCircle2, ServerCrash, Brain, MousePointerClick, MessageSquare, Database, Cpu, Loader2 } from "lucide-react";

const ENGINES =[
    { id: "architect", name: "Course Architect", icon: Brain, description: "Analyzes raw context and generates the Curriculum Blueprint." },
    { id: "lesson", name: "Action Map Extractor", icon: MousePointerClick, description: "Extracts step-by-step UI actions from video chunks." },
    { id: "tutor", name: "Live Student Tutor", icon: MessageSquare, description: "Live desktop agent using Computer Use API." },
    { id: "embedder", name: "Vector Brain Embedder", icon: Database, description: "Converts text into vectors for RAG memory." }
];

const MODELS = {
    heavy:[
        { id: "gemini-3.1-pro-preview", name: "Gemini 3.1 Pro (Latest)", recommended: true },
        { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro" },
        { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash-Lite" },
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" }
    ],
    fast:[
        { id: "gemini-3-flash-preview", name: "Gemini 3 Flash (Fastest)", recommended: true },
        { id: "gemini-3.1-flash-lite-preview", name: "Gemini 3.1 Flash-Lite" },
        { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash" }
    ],
    embedding:[
        { id: "text-embedding-004", name: "Text Embedding 004", recommended: true }
    ]
};

export default function ApiManager() {
    const { showToast } = useToast();
    const[keys, setKeys] = useState([]);
    const [routing, setRouting] = useState({
        architect: { keyId: "", model: "gemini-3.1-pro-preview" },
        lesson: { keyId: "", model: "gemini-3.1-pro-preview" },
        tutor: { keyId: "", model: "gemini-3-flash-preview" },
        embedder: { keyId: "", model: "text-embedding-004" }
    });

    const[newKeyName, setNewKeyName] = useState("");
    const [newKeyValue, setNewKeyValue] = useState("");
    const[loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testResults, setTestResults] = useState({});

    useEffect(() => { loadData(); },[]);

    const loadData = async () => {
        try {
            const keysData = await api.getKeys();
            const routingData = await api.getRouting();
            setKeys(keysData ||[]);
            if (routingData && Object.keys(routingData).length > 0) setRouting(prev => ({ ...prev, ...routingData }));
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddKey = async (e) => {
        e.preventDefault();
        try {
            await api.addKey(newKeyName, newKeyValue);
            showToast("Key encrypted and stored.", "success");
            setNewKeyName(""); setNewKeyValue("");
            loadData();
        } catch (err) { showToast(err.message, "error"); }
    };

    const handleDeleteKey = async (id) => {
        try {
            await api.deleteKey(id);
            showToast("Key deleted securely.", "success");
            loadData();
        } catch (err) { showToast(err.message, "error"); }
    };

    const handleTestKey = async (id) => {
        setTestResults({ ...testResults,[id]: "testing" });
        try {
            await api.testKey(id);
            setTestResults({ ...testResults, [id]: "success" });
        } catch (err) {
            setTestResults({ ...testResults, [id]: "failed" });
        }
    };

    const saveRouting = async () => {
        setSaving(true);
        try {
            await api.updateRouting(routing);
            showToast("Engine Configuration Published!", "success");
        } catch (err) {
            showToast(err.message, "error");
        } finally { setSaving(false); }
    };

    if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" size={32}/></div>;

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in">
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 mb-2">
                <Cpu size={32} className="text-indigo-600" /> AI Command Center
            </h1>
            <p className="text-gray-500 mb-8">Manage API keys and route models for the AI Engine.</p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* VAULT */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gray-900 text-white p-6 rounded-2xl shadow-lg border border-gray-800">
                        <h2 className="text-lg font-bold flex items-center gap-2 mb-4"><ShieldCheck size={20} className="text-emerald-400"/> Encrypted Vault</h2>
                        <form onSubmit={handleAddKey} className="space-y-4">
                            <input type="text" placeholder="Provider Label (e.g. Gemini Pro)" className="w-full bg-black/50 border border-gray-700 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500" value={newKeyName} onChange={e => setNewKeyName(e.target.value)} required />
                            <input type="password" placeholder="API Key (AIzaSy...)" className="w-full bg-black/50 border border-gray-700 rounded-lg p-2.5 text-sm outline-none focus:border-indigo-500 font-mono" value={newKeyValue} onChange={e => setNewKeyValue(e.target.value)} required />
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 font-bold py-2.5 rounded-lg text-sm transition-colors">Store Securely</button>
                        </form>

                        <div className="mt-8 space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase">Active Keys</h3>
                            {keys.map(key => (
                                <div key={key.id} className="bg-black/40 border border-gray-800 p-3 rounded-xl">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-sm">{key.name}</span>
                                        <button onClick={() => handleDeleteKey(key.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={14}/></button>
                                    </div>
                                    <div className="text-xs font-mono text-gray-500">{key.masked_key}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ROUTING MATRIX */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">Task Routing Matrix</h2>
                        <button onClick={saveRouting} disabled={saving} className="bg-green-600 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-green-700 transition-all">
                            {saving ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} Deploy Config
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {ENGINES.map(engine => {
                            const options = engine.id === 'embedder' ? MODELS.embedding : (engine.id === 'tutor' ? MODELS.fast : MODELS.heavy);
                            return (
                                <div key={engine.id} className="border rounded-xl p-5 flex flex-col sm:flex-row gap-4 bg-gray-50/50">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1"><engine.icon size={18} className="text-indigo-600"/><h3 className="font-bold text-gray-900">{engine.name}</h3></div>
                                        <p className="text-xs text-gray-500">{engine.description}</p>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <select className="w-full border rounded-lg p-2 text-sm outline-none font-bold" value={routing[engine.id]?.keyId || ""} onChange={e => setRouting({...routing, [engine.id]: {...routing[engine.id], keyId: e.target.value}})}>
                                            <option value="">-- Select Key --</option>
                                            {keys.map(k => <option key={k.id} value={k.id}>{k.name}</option>)}
                                        </select>
                                        <select className="w-full border rounded-lg p-2 text-sm outline-none" value={routing[engine.id]?.model || ""} onChange={e => setRouting({...routing,[engine.id]: {...routing[engine.id], model: e.target.value}})}>
                                            {options.map(m => <option key={m.id} value={m.id}>{m.recommended ? `⭐ ${m.name}` : m.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}