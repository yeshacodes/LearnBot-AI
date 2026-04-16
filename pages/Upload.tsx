
import React, { useEffect, useState } from 'react';
import { FileUp, Link as LinkIcon, CheckCircle2, FileText, Loader2, Globe, Sparkles } from 'lucide-react';
import { Button, Input, Card, Badge } from '../components/Common';
import { Source } from '../types';
import { apiFetch, normalizeSources, parseSourcesList } from '../src/lib/api';

const Upload: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pdf' | 'url'>('pdf');
  const [url, setUrl] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [files, setFiles] = useState<{ name: string; size: string; progress: number }[]>([]);
  const [sourcesError, setSourcesError] = useState<string | null>(null);

  async function fetchSources() {
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

      setFiles(
        normalized.map((s) => ({
          name: s.name,
          size: "",
          progress: 100,
        }))
      );
    } catch (e: any) {
      setSourcesError(`Failed to load sources: ${e?.message ?? "Unknown error"}`);
    }
  }

  useEffect(() => {
    fetchSources();
  }, []);

  const handleUrlIngest = async () => {
    if (!url) return;
    setIsIngesting(true);
    setStatus('idle');
    setSourcesError(null);
    try {
      const res = await apiFetch('/api/sources/web', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Web sync failed (${res.status}): ${text}`);
      }

      await fetchSources();
      setIsIngesting(false);
      setStatus('success');
      setUrl('');
    } catch (err: any) {
      setIsIngesting(false);
      setStatus('error');
      setSourcesError(err?.message ?? 'Web sync failed');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setIsIngesting(true);
      setStatus('idle');
      setSourcesError(null);
      try {
        for (const file of Array.from(e.target.files as FileList) as File[]) {
          const form = new FormData();
          form.append("file", file);

          const res = await apiFetch('/api/sources/pdf', {
            method: "POST",
            body: form,
            credentials: "include",
          });

          if (!res.ok) {
            const text = await res.text();
            throw new Error(`Upload failed (${res.status}): ${text}`);
          }
        }

        await fetchSources();
        setStatus('success');
      } catch (err: any) {
        setStatus('error');
        setSourcesError(err?.message ?? 'Upload failed');
      } finally {
        setIsIngesting(false);
        e.target.value = '';
      }
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-16 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-5">
        <Badge color="green">Knowledge Base</Badge>
        <h1 className="text-5xl font-heading font-black text-primary tracking-tighter uppercase">Expand Your <span className="text-accent">Mind</span></h1>
        <p className="text-secondary font-bold text-sm tracking-widest uppercase">Sync your PDFs and web resources.</p>
      </div>

      <div className="flex justify-center">
        <div className="inline-flex p-2 bg-card rounded-[2.5rem] border-[4px] border-default shadow-brutal">
          <button 
            onClick={() => setActiveTab('pdf')}
            className={`flex items-center gap-3 px-10 py-4 rounded-[2rem] transition-all duration-300 font-black text-[12px] uppercase tracking-widest border-[3px] border-transparent ${activeTab === 'pdf' ? 'bg-secondary text-black border-default shadow-sm' : 'text-primary hover:bg-surface2'}`}
          >
            <FileUp className={`w-5 h-5 ${activeTab === 'pdf' ? 'text-black' : 'text-primary'}`} />
            PDF Library
          </button>
          <button 
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-3 px-10 py-4 rounded-[2rem] transition-all duration-300 font-black text-[12px] uppercase tracking-widest border-[3px] border-transparent ${activeTab === 'url' ? 'bg-secondary text-black border-default shadow-sm' : 'text-primary hover:bg-surface2'}`}
          >
            <LinkIcon className={`w-5 h-5 ${activeTab === 'url' ? 'text-black' : 'text-primary'}`} />
            Web Sync
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <Card className="p-12 flex flex-col items-center justify-center min-h-[450px] group">
          {activeTab === 'pdf' ? (
            <div className="w-full text-center space-y-8">
              <div className="w-24 h-24 bg-yellow border-[3px] border-default rounded-[3rem] text-black flex items-center justify-center mx-auto mb-6 transform transition-transform group-hover:-translate-y-2 shadow-brutal">
                <FileUp className="w-12 h-12 text-black" />
              </div>
              <h3 className="text-3xl font-heading font-black text-primary tracking-tight uppercase">Upload Documents</h3>
              <p className="text-primary text-[13px] font-bold leading-relaxed max-w-xs mx-auto">Upload PDF or DOCX research papers, textbooks, or notes.</p>
              <input type="file" multiple accept=".pdf,.docx" onChange={handleFileChange} className="hidden" id="file-upload" />
              <label htmlFor="file-upload" className="inline-flex items-center justify-center px-12 py-5 bg-accent text-black border-[4px] border-default rounded-[2rem] font-black uppercase tracking-widest text-[12px] cursor-pointer transition-all hover:-translate-y-1 hover:shadow-brutal-lg shadow-sm active:scale-95 shadow-brutal">
                Browse System
              </label>
              {isIngesting && <div>Loading sources...</div>}
              {sourcesError && <div style={{ color: "red" }}>{sourcesError}</div>}
            </div>
          ) : (
            <div className="w-full space-y-10">
              <div className="text-center">
                <div className="w-24 h-24 bg-purple border-[3px] border-default rounded-[3rem] text-black flex items-center justify-center mx-auto mb-6 shadow-brutal hover:-translate-y-2 transition-transform">
                  <Globe className="w-12 h-12 text-black" />
                </div>
                <h3 className="text-3xl font-heading font-black text-primary tracking-tight uppercase">URL Ingestion</h3>
                <p className="text-primary text-[13px] font-bold">Paste a link to crawl web knowledge.</p>
              </div>
              <div className="space-y-5">
                <Input placeholder="https://wikipedia.org/wiki/Science" value={url} onChange={(e) => setUrl(e.target.value)} />
                <Button onClick={handleUrlIngest} disabled={isIngesting || !url} className="w-full !py-5 !rounded-[2rem] !font-black !uppercase !tracking-widest !text-[11px]">
                  {isIngesting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Initiate Sync"}
                </Button>
              </div>
              {status === 'success' && (
                <div className="flex items-center justify-center gap-3 p-4 bg-yellow text-black rounded-[2rem] border-[3px] border-default shadow-sm animate-in zoom-in">
                  <CheckCircle2 className="w-5 h-5 text-black" />
                  <span className="text-[12px] font-black uppercase tracking-widest">Source indexed.</span>
                </div>
              )}
              {sourcesError && <div style={{ color: "red" }}>{sourcesError}</div>}
            </div>
          )}
        </Card>

        <div className="space-y-8">
          <h3 className="text-[12px] font-black text-primary uppercase tracking-[0.25em] px-4 font-heading">Recently Synced</h3>
          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2 custom-scrollbar">
            {files.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-primary bg-card border-[4px] border-dashed border-default rounded-[3rem]">
                <p className="font-black text-[12px] uppercase tracking-widest opacity-50">Context is empty</p>
              </div>
            ) : (
              files.map((file, idx) => (
                <Card key={idx} className="p-5 flex items-center gap-6 animate-in slide-in-from-right duration-500 !rounded-[2rem]">
                  <div className="p-4 bg-card border-[3px] border-default text-primary rounded-[1.5rem] shadow-sm">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[14px] font-black text-primary truncate max-w-[150px] uppercase tracking-tighter">{file.name}</span>
                      <Badge color="green">Ready</Badge>
                    </div>
                    <div className="w-full bg-card border-2 border-default rounded-full h-3 mt-3">
                      <div className="bg-accent h-full border-r-2 border-default transition-all duration-1000" style={{ width: `${file.progress}%` }}></div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;
