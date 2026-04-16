
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
          <h1 className="text-5xl font-heading font-black text-primary tracking-tighter uppercase">Knowledge <span className="text-accent">Bank</span></h1>
          <p className="text-secondary font-bold text-[13px] tracking-widest mt-2 uppercase">Manage your active learning context.</p>
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

      <Card className="!rounded-[2.5rem] bg-card border-[4px] border-default shadow-brutal-lg overflow-hidden">
        {sourcesLoading && <div className="px-8 py-6 font-bold text-primary">Loading sources...</div>}
        {sourcesError && <div className="px-8 py-6 font-bold" style={{ color: "red" }}>{sourcesError}</div>}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-yellow border-b-[4px] border-default">
                <th className="px-8 py-6 text-[12px] font-black text-black uppercase tracking-widest">Source</th>
                <th className="px-8 py-6 text-[12px] font-black text-black uppercase tracking-widest">Format</th>
                <th className="px-8 py-6 text-[12px] font-black text-black uppercase tracking-widest">Added On</th>
                <th className="px-8 py-6 text-[12px] font-black text-black uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-[12px] font-black text-black uppercase tracking-widest text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y-[3px] divide-default">
              {filteredSources.map((source) => (
                <tr key={source.id} className="hover:bg-surface2 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-5">
                      <div className="p-3 rounded-2xl bg-card border-[3px] border-default shadow-sm text-primary group-hover:bg-purple group-hover:text-black group-hover:-translate-y-1 transition-all">
                        {source.type === 'pdf' ? <FileText className="w-6 h-6 text-current" /> : <Globe className="w-6 h-6 text-current" />}
                      </div>
                      <span className="text-base font-black font-heading uppercase text-primary truncate max-w-xs">{source.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <Badge color={source.type === 'pdf' ? 'purple' : 'blue'}>{source.type}</Badge>
                  </td>
                  <td className="px-8 py-6">
                    <span className="text-[13px] font-bold text-primary">{source.date}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full border-2 border-default ${source.status === 'ready' ? 'bg-accent animate-pulse' : 'bg-surface2'}`}></div>
                      <span className="text-[12px] font-black uppercase tracking-widest text-primary">{source.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button 
                      onClick={() => handleDelete(source.id)}
                      className="p-3 text-primary bg-card border-[3px] border-default rounded-xl hover:-translate-y-1 hover:shadow-brutal hover:bg-yellow hover:text-black transition-all"
                    >
                      <Trash2 className="w-5 h-5 text-current" />
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
