import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCcw, Tag } from 'lucide-react';

export default function KnowledgeBasePanel() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({ title: '', content: '', tags: '' });
  const [submitting, setSubmitting] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/ai-knowledge`);
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      setMessage('Failed to load knowledge base.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;
    setSubmitting(true);
    setMessage('');
    try {
      const res = await fetch(`${apiBase}/ai-knowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          content: form.content.trim(),
          tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      });
      if (!res.ok) throw new Error('Add failed');
      setForm({ title: '', content: '', tags: '' });
      await fetchItems();
      setMessage('Entry added successfully.');
    } catch (err) {
      setMessage('Failed to add entry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Tag size={16} className="text-teal-400" /> AI Knowledge Base
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Manage reference data used by EagleBot. Entries here are injected into chat and report prompts.
          </p>
        </div>
        <button
          onClick={fetchItems}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition cursor-pointer"
          title="Refresh"
        >
          <RefreshCcw size={14} />
        </button>
      </div>

      {message && (
        <div className="text-xs text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-lg px-4 py-2">
          {message}
        </div>
      )}

      {/* Add form */}
      <form onSubmit={handleAdd} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <h4 className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">Add New Entry</h4>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
          <input
            type="text"
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Title *"
            className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition"
            required
          />
          <input
            type="text"
            value={form.tags}
            onChange={e => setForm({ ...form, tags: e.target.value })}
            placeholder="Tags (comma-separated, e.g. pricing, sop)"
            className="bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition"
          />
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg transition active:scale-[0.98] disabled:opacity-50 whitespace-nowrap"
          >
            <Plus size={14} /> {submitting ? 'Adding...' : 'Add Entry'}
          </button>
        </div>
        <textarea
          value={form.content}
          onChange={e => setForm({ ...form, content: e.target.value })}
          placeholder="Content * — what the AI should know about this topic"
          rows={3}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg py-2 px-3 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-teal-500 transition"
          required
        />
      </form>

      {/* Entries list */}
      {loading ? (
        <div className="text-center py-10 text-slate-500 text-xs">Loading entries...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-slate-500 text-xs">No knowledge entries yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id || idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h5 className="text-sm font-bold text-slate-200">{item.title}</h5>
                  <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">{item.content}</p>
                  {item.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.map((tag, ti) => (
                        <span key={ti} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-850 border border-slate-800 text-slate-400">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
