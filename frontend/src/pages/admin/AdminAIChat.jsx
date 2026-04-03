import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { Bot, Save, Trash2, Plus, Users, MessageSquare, ToggleLeft, ToggleRight, Settings, Activity } from 'lucide-react';

const AdminAIChat = () => {
    const [settings, setSettings] = useState({ isAiEnabled: 'true', aiWorkMode: 'online', aiPrompt: '' });
    const [faqs, setFaqs] = useState([]);
    const [leads, setLeads] = useState([]);
    
    const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [settingsRes, leadsRes, faqsRes] = await Promise.all([
                api.get('/settings'),
                api.get('/leads'),
                api.get('/faqs')
            ]);
            
            const fetchedSettings = {};
            settingsRes.data.forEach(s => fetchedSettings[s.key] = s.value);
            setSettings({
                isAiEnabled: fetchedSettings.isAiEnabled || 'true',
                aiWorkMode: fetchedSettings.aiWorkMode || 'online',
                aiPrompt: fetchedSettings.aiPrompt || 'You are a helpful assistant for Krishna Engineering...'
            });

            setLeads(leadsRes.data);
            setFaqs(faqsRes.data);
        } catch (err) {
            console.error("Failed to load AI data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        try {
            await api.put('/settings', { settings });
            alert("AI Settings updated successfully!");
        } catch (err) {
            console.error(err);
            alert("Failed to save settings");
        }
    };

    const handleAddFaq = async (e) => {
        e.preventDefault();
        try {
            const res = await api.post('/faqs', newFaq);
            setFaqs([res.data, ...faqs]);
            setNewFaq({ question: '', answer: '' });
        } catch (error) {
            console.error(error);
            alert("Failed to add FAQ");
        }
    };

    const handleDeleteFaq = async (id) => {
        if (!window.confirm("Delete this FAQ?")) return;
        try {
            await api.delete(`/faqs/${id}`);
            setFaqs(faqs.filter(f => f._id !== id));
        } catch (error) {
            console.error(error);
            alert("Failed to delete FAQ");
        }
    };

    const handleDeleteLead = async (id) => {
        if (!window.confirm("Delete this Lead?")) return;
        try {
            await api.delete(`/leads/${id}`);
            setLeads(leads.filter(l => l._id !== id));
        } catch (error) {
            console.error(error);
            alert("Failed to delete Lead");
        }
    };

    if (loading) return <div className="p-10">Loading...</div>;

    return (
        <div className="p-8 space-y-10 font-sans min-h-screen">
            
            <div className="flex items-center gap-4 border-b-4 border-slate-900 pb-6">
                <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center transform rotate-3 shadow-[8px_8px_0px_0px_#4f46e5]">
                    <Bot className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900">AI Support Agent</h1>
                    <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Chatbot Engine & Leads Network</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                
                {/* SETTINGS CARD */}
                <div className="bg-white border-4 border-slate-900 rounded-[2rem] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h2 className="text-xl font-black uppercase text-slate-900 mb-6 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-indigo-600" /> Neural System Directives
                    </h2>

                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                            <div>
                                <h3 className="font-bold text-sm uppercase text-slate-900">Bot Status</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Enable or disable website chat</p>
                            </div>
                            <button 
                                onClick={() => setSettings({ ...settings, isAiEnabled: settings.isAiEnabled === 'true' ? 'false' : 'true' })}
                                className={`${settings.isAiEnabled === 'true' ? 'text-green-500' : 'text-slate-400'}`}
                            >
                                {settings.isAiEnabled === 'true' ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl">
                            <div>
                                <h3 className="font-bold text-sm uppercase text-slate-900">Neural Connect</h3>
                                <p className="text-[10px] text-[#4f46e5] font-black uppercase tracking-widest">Flash AI vs Offline Brain</p>
                            </div>
                            <div className="flex bg-white border-4 border-slate-900 rounded-2xl p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                <button 
                                    onClick={() => setSettings({ ...settings, aiWorkMode: 'online' })}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${settings.aiWorkMode === 'online' ? 'bg-[#4f46e5] text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Online
                                </button>
                                <button 
                                    onClick={() => setSettings({ ...settings, aiWorkMode: 'offline' })}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${settings.aiWorkMode === 'offline' ? 'bg-[#4f46e5] text-white' : 'text-slate-400 hover:text-slate-600'}`}
                                >
                                    Offline
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">System Identity Prompt</label>
                            <textarea 
                                rows={6}
                                value={settings.aiPrompt}
                                onChange={e => setSettings({ ...settings, aiPrompt: e.target.value })}
                                className="w-full border-4 border-slate-200 p-4 rounded-2xl font-medium outline-none focus:border-indigo-600 transition"
                            />
                            
                            {/* Neural Diagnostic Button */}
                            <button 
                                onClick={async () => {
                                    try {
                                        const res = await api.post('/chat', { messages: [{ role: 'user', content: 'Connection Test' }] });
                                        if (res.data.reply.includes("trouble connecting") || res.data.reply.includes("[AI OFF-LINE]")) {
                                            alert("Neural Heartbeat Warning: " + res.data.reply);
                                        } else {
                                            alert("Neural Heartbeat Confirmed: " + res.data.reply.substring(0, 50) + "...");
                                        }
                                    } catch (err) {
                                        alert("Neural Critical Failure: " + (err.response?.data?.error || err.message));
                                    }
                                }}
                                className="w-full py-3 border-4 border-indigo-600/30 text-indigo-600 font-black rounded-xl hover:bg-indigo-50 transition uppercase text-[10px] tracking-widest"
                            >
                                <Activity className="w-3 h-3 inline mr-2" /> Verify Neural Heartbeat
                            </button>
                        </div>

                        <button 
                            onClick={handleSaveSettings}
                            className="bg-indigo-600 text-white font-black px-6 py-4 rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 transition w-full flex items-center justify-center gap-2 uppercase tracking-widest mt-6"
                        >
                            <Save className="w-4 h-4" /> Save Core Configuration
                        </button>

                        <div className="mt-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl border-dashed">
                            <h4 className="text-[10px] font-black uppercase text-blue-600 mb-2 flex items-center gap-2">
                                <Bot className="w-3 h-3" /> Pro Tip: Intelligent Free Tier
                            </h4>
                            <p className="text-[9px] font-bold text-slate-600 leading-relaxed uppercase">
                                To use AI for <span className="text-blue-600 underline font-black">FREE</span>, get a Gemini API Key from <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline">Google AI Studio</a> and add <code className="bg-white px-1">GEMINI_API_KEY</code> to your .env.
                            </p>
                        </div>
                    </div>
                </div>

                {/* FAQ MANAGER CARD */}
                <div className="bg-white border-4 border-slate-900 rounded-[2rem] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col max-h-[600px]">
                    <h2 className="text-xl font-black uppercase text-slate-900 mb-6 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-indigo-600" /> FAQ Knowledge Base
                    </h2>

                    <form onSubmit={handleAddFaq} className="flex gap-4 mb-8">
                        <div className="flex-1 space-y-2">
                            <input 
                                required placeholder="Question" 
                                value={newFaq.question} onChange={e => setNewFaq({...newFaq, question: e.target.value})}
                                className="w-full border-4 border-slate-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-indigo-600"
                            />
                            <input 
                                required placeholder="Answer" 
                                value={newFaq.answer} onChange={e => setNewFaq({...newFaq, answer: e.target.value})}
                                className="w-full border-4 border-slate-200 p-3 rounded-xl font-bold text-sm outline-none focus:border-indigo-600"
                            />
                        </div>
                        <button type="submit" className="bg-slate-900 text-white font-black p-4 rounded-xl shadow-[4px_4px_0px_0px_#4f46e5]">
                            <Plus className="w-6 h-6" />
                        </button>
                    </form>

                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 border-t-2 border-slate-100 pt-6">
                        {faqs.map(faq => (
                            <div key={faq._id} className="p-4 border-2 border-slate-200 rounded-2xl relative group hover:border-indigo-600 bg-slate-50">
                                <h4 className="font-bold text-sm uppercase text-slate-900 mb-1">Q: {faq.question}</h4>
                                <p className="text-xs font-semibold text-slate-600">A: {faq.answer}</p>
                                <button 
                                    onClick={() => handleDeleteFaq(faq._id)}
                                    className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition p-2 hover:bg-red-50 rounded"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* LEADS DATABASE */}
                <div className="lg:col-span-2 bg-white border-4 border-slate-900 rounded-[2rem] p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
                    <h2 className="text-xl font-black uppercase text-slate-900 mb-6 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-600" /> Captured AI Leads ({leads.length})
                    </h2>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b-4 border-slate-900">
                                    <th className="p-4 font-black uppercase tracking-widest text-xs text-slate-500">Date/Time</th>
                                    <th className="p-4 font-black uppercase tracking-widest text-xs text-slate-500">Prospect</th>
                                    <th className="p-4 font-black uppercase tracking-widest text-xs text-slate-500">Phone</th>
                                    <th className="p-4 font-black uppercase tracking-widest text-xs text-slate-500">Chat Context</th>
                                    <th className="p-4 font-black uppercase tracking-widest text-xs text-slate-500 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map(lead => (
                                    <tr key={lead._id} className="border-b-2 border-slate-100 hover:bg-slate-50">
                                        <td className="p-4 text-xs font-bold text-slate-500">
                                            {new Date(lead.createdAt).toLocaleString()}
                                        </td>
                                        <td className="p-4 font-black text-slate-900 uppercase">{lead.name}</td>
                                        <td className="p-4 font-bold text-indigo-600">{lead.phone}</td>
                                        <td className="p-4 text-xs font-semibold text-slate-600 max-w-sm">{lead.message}</td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => handleDeleteLead(lead._id)}
                                                className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {leads.length === 0 && (
                                    <tr>
                                        <td colSpan="5" className="p-10 text-center font-bold text-slate-400 uppercase tracking-widest">
                                            No leads captured yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default AdminAIChat;
