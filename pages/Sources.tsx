
import React, { useEffect, useState } from 'react';
import { Database, FileText, Globe, MoreVertical, Trash2, Search, ExternalLink, Calendar } from 'lucide-react';
import { Card, Input, Badge, Button } from '../components/Common';
import { Source } from '../types';
import { apiFetch, deleteSource, normalizeSources, parseSourcesList } from '../src/lib/api';

const Sources: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  async function fetchSources() {
    setSourcesLoading(true);
    setSourcesError(null);

    try {
      const res = await apiFetch('/api/sources', { credentials: "include" });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to load sources (${res.status}): ${text}`);
      }

      const data = await res.json();
      const rawList = parseSourcesList(data);
      const normalized: Source[] = normalizeSources(rawList);

      setSources(normalized);
    } catch (e: any) {
      setSourcesError(`Failed to load sources: ${e?.message ?? "Unknown error"}`);
    } finally {
      setSourcesLoading(false);
    }
  }

  useEffect(() => {
    fetchSources();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this source?')) return;

    const prevSources = sources;
    setSources((prev) => prev.filter((s) => s.id !== id));
    setSourcesError(null);

    try {
      await deleteSource(id);
      await fetchSources();
    } catch (e: any) {
      setSources(prevSources);
      setSourcesError(e?.message ?? "Failed to delete source");
    }
  };

  const filteredSources = sources.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-primary tracking-tighter uppercase">Knowledge Bank</h1>
          <p className="text-muted font-bold text-xs tracking-widest mt-1">Manage your active learning context.</p>
        </div>
        <div className="w-full sm:w-80">
          <Input 
            placeholder="Search documents..." 
            className="!pl-12 !rounded-[1.5rem]" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <Card className="!rounded-[2.5rem] border-none shadow-2xl shadow-black/10 overflow-hidden">
        {sourcesLoading && <div className="px-8 py-4">Loading sources...</div>}
        {sourcesError && <div className="px-8 py-4" style={{ color: "red" }}>{sourcesError}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface2">
                <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-widest">Source</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-widest">Format</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-widest">Added On</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-widest">Status</th>
                <th className="px-8 py-5 text-[10px] font-black text-muted uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-default">
              {filteredSources.map((source) => (
                <tr key={source.id} className="hover:bg-surface2 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${source.type === 'pdf' ? 'bg-surface2 text-accent' : 'bg-surface2 text-accent'}`}>
                        {source.type === 'pdf' ? <FileText className="w-5 h-5" /> : <Globe className="w-5 h-5" />}
                      </div>
                      <span className="text-sm font-bold text-primary truncate max-w-xs">{source.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <Badge color={source.type === 'pdf' ? 'purple' : 'blue'}>{source.type}</Badge>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-xs font-bold text-muted">{source.date}</span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${source.status === 'ready' ? 'bg-accent animate-pulse' : 'bg-muted/60'}`}></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted">{source.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <button 
                      onClick={() => handleDelete(source.id)}
                      className="p-3 text-muted hover:text-accent hover:bg-surface2 rounded-2xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default Sources;
