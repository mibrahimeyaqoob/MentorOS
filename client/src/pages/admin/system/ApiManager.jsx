import React, { useState, useEffect } from "react";
import { api } from "../../../services/api";
import { useToast } from "../../../contexts/ToastContext";
import {
    Save,
    Brain,
    MousePointerClick,
    MessageSquare,
    Database,
    Cpu,
    Loader2,
    Cloud,
    Plus,
    Trash2,
    Search,
} from "lucide-react";

const ENGINES = [
    {
        id: "searcher",
        name: "Autonomous Searcher",
        icon: Search,
        description:
            "Finds missing tutorials on the web (Requires Google Gemini for Grounding).",
    },
    {
        id: "architect",
        name: "Course Architect",
        icon: Brain,
        description: "Generates Blueprints from data using deep reasoning.",
    },
    {
        id: "lesson",
        name: "Action Map Extractor",
        icon: MousePointerClick,
        description: "Extracts step-by-step UI actions.",
    },
    {
        id: "tutor",
        name: "Live Student Tutor",
        icon: MessageSquare,
        description: "Live desktop agent using Computer Use Vision.",
    },
    {
        id: "embedder",
        name: "Vector Embedder",
        icon: Database,
        description: "Converts text into vectors for RAG memory.",
    },
];

const DEFAULT_MODELS = [
    {
        id: "gemini-3.1-pro-preview",
        name: "Gemini 3.1 Pro",
        provider: "google",
    },
    {
        id: "gemini-3-flash-preview",
        name: "Gemini 3 Flash",
        provider: "google",
    },
    {
        id: "text-embedding-005",
        name: "Text Embedding 005",
        provider: "google",
    },
    {
        id: "claude-3-7-sonnet@20250219",
        name: "Claude 3.7 Sonnet",
        provider: "anthropic",
    },
];

export default function ApiManager() {
    const { showToast } = useToast();

    // routing structure matches database
    const [configData, setConfigData] = useState({
        routing: {
            searcher: { model: "gemini-3.1-pro-preview", provider: "google" },
            architect: { model: "gemini-3.1-pro-preview", provider: "google" },
            lesson: { model: "gemini-3-flash-preview", provider: "google" },
            tutor: { model: "gemini-3-flash-preview", provider: "google" },
            embedder: { model: "text-embedding-005", provider: "google" },
        },
        available_models: DEFAULT_MODELS,
    });

    const [newModel, setNewModel] = useState({
        id: "",
        name: "",
        provider: "google",
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        api.getRouting()
            .then((res) => {
                // Merge DB config with defaults if new
                if (res && res.routing) {
                    setConfigData(res);
                }
                setLoading(false);
            })
            .catch((err) => {
                showToast("Failed to load config: " + err.message, "error");
                setLoading(false);
            });
    }, []);

    const saveConfig = async () => {
        setSaving(true);
        try {
            await api.updateRouting(configData);
            showToast("System Architecture Updated!", "success");
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            setSaving(false);
        }
    };

    const handleRoutingChange = (engineId, modelId) => {
        const selectedModel = configData.available_models.find(
            (m) => m.id === modelId,
        );
        setConfigData((prev) => ({
            ...prev,
            routing: {
                ...prev.routing,
                [engineId]: {
                    model: selectedModel.id,
                    provider: selectedModel.provider,
                },
            },
        }));
    };

    const addModel = () => {
        if (!newModel.id || !newModel.name) return;
        setConfigData((prev) => ({
            ...prev,
            available_models: [...prev.available_models, newModel],
        }));
        setNewModel({ id: "", name: "", provider: "google" });
    };

    const removeModel = (idToRemove) => {
        setConfigData((prev) => ({
            ...prev,
            available_models: prev.available_models.filter(
                (m) => m.id !== idToRemove,
            ),
        }));
    };

    if (loading)
        return (
            <div className="p-10 text-center">
                <Loader2
                    className="animate-spin mx-auto text-indigo-600"
                    size={32}
                />
            </div>
        );

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in pb-20">
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3 mb-2">
                <Cpu size={32} className="text-indigo-600" /> AI Command Center
            </h1>
            <p className="text-gray-500 mb-8">
                Register LLMs and route them to specific system engines
                dynamically.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* MODEL REGISTRY */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">
                            Model Registry
                        </h2>
                        <p className="text-xs text-gray-500 mb-6">
                            Add Vertex-compatible models here.
                        </p>

                        <div className="space-y-3 mb-6">
                            <input
                                type="text"
                                placeholder="Model ID (e.g. claude-3-5-sonnet)"
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none"
                                value={newModel.id}
                                onChange={(e) =>
                                    setNewModel({
                                        ...newModel,
                                        id: e.target.value,
                                    })
                                }
                            />
                            <input
                                type="text"
                                placeholder="Display Name"
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none"
                                value={newModel.name}
                                onChange={(e) =>
                                    setNewModel({
                                        ...newModel,
                                        name: e.target.value,
                                    })
                                }
                            />
                            <select
                                className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm outline-none"
                                value={newModel.provider}
                                onChange={(e) =>
                                    setNewModel({
                                        ...newModel,
                                        provider: e.target.value,
                                    })
                                }
                            >
                                <option value="google">Google (Gemini)</option>
                                <option value="anthropic">
                                    Anthropic (Claude)
                                </option>
                            </select>
                            <button
                                onClick={addModel}
                                className="w-full bg-indigo-50 text-indigo-600 font-bold py-2.5 rounded-lg text-sm flex justify-center items-center gap-2 hover:bg-indigo-100"
                            >
                                <Plus size={16} /> Add Model
                            </button>
                        </div>

                        <div className="space-y-2 border-t pt-4">
                            {configData.available_models.map((model, idx) => (
                                <div
                                    key={idx}
                                    className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100"
                                >
                                    <div>
                                        <p className="text-xs font-bold text-gray-800">
                                            {model.name}
                                        </p>
                                        <p className="text-[10px] text-gray-400 font-mono">
                                            {model.id}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => removeModel(model.id)}
                                        className="text-red-400 hover:text-red-600 p-1"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ROUTING MATRIX */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold text-gray-900">
                            Task Routing Matrix
                        </h2>
                        <button
                            onClick={saveConfig}
                            disabled={saving}
                            className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-black transition-all shadow-md"
                        >
                            {saving ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}{" "}
                            Deploy Architecture
                        </button>
                    </div>

                    <div className="space-y-4">
                        {ENGINES.map((engine) => (
                            <div
                                key={engine.id}
                                className="border border-gray-100 rounded-xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center hover:border-indigo-200 transition-colors bg-gray-50/30"
                            >
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <engine.icon
                                            size={18}
                                            className="text-indigo-600"
                                        />
                                        <h3 className="font-bold text-gray-900">
                                            {engine.name}
                                        </h3>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {engine.description}
                                    </p>
                                </div>
                                <div className="w-full md:w-64 shrink-0">
                                    <select
                                        className="w-full border rounded-lg p-2.5 text-sm outline-none font-bold bg-white focus:border-indigo-500"
                                        value={
                                            configData.routing[engine.id]
                                                ?.model || ""
                                        }
                                        onChange={(e) =>
                                            handleRoutingChange(
                                                engine.id,
                                                e.target.value,
                                            )
                                        }
                                    >
                                        <option value="" disabled>
                                            -- Assign Model --
                                        </option>
                                        {configData.available_models.map(
                                            (m) => (
                                                <option key={m.id} value={m.id}>
                                                    {m.name} ({m.provider})
                                                </option>
                                            ),
                                        )}
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
