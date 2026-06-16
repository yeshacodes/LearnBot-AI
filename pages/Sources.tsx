import React, { useMemo, useState } from "react";
import { FileText, Globe, MessageSquare, Search, Sparkles, Target, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { AppRoute } from "../types";
import { Badge, Button, Card, EmptyState, ErrorState, Input, PageHeader } from "../components/Common";
import { useLearningData } from "../src/contexts/LearningDataContext";
import { deleteSource as deleteRemoteSource } from "../src/lib/api";

const Sources: React.FC = () => {
  const data = useLearningData();
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const filteredSources = useMemo(
    () => data.sources.filter((source) => source.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [data.sources, searchTerm],
  );

  const handleDelete = async (id: string) => {
    data.deleteSource(id);
    setError(null);
    try {
      await deleteRemoteSource(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deleted locally. Remote delete did not complete.");
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <PageHeader
        breadcrumbs={[{ label: "App", href: "/app/dashboard" }, { label: "Sources" }]}
        eyebrow="Sources"
        title="Knowledge bank"
        description="Manage uploaded material, inspect AI-ready details, and jump into study workflows."
        action={<Input placeholder="Search sources" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="sm:w-80" />}
      />
      {error && <ErrorState title="Remote sync failed" message={error} />}

      {filteredSources.length === 0 ? (
        <EmptyState title={data.sources.length ? "No matching sources" : "No sources uploaded"} icon={Search} description={data.sources.length ? "Try another search or upload a new source." : "Upload a file or URL to start building your learning context."} action={<Link to={AppRoute.UPLOAD}><Button>Upload source</Button></Link>} />
      ) : (
        <div className="grid gap-5">
          {filteredSources.map((source) => (
            <Card key={source.id} className="p-6" interactive>
              <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface2 text-accent">
                    {source.type === "url" ? <Globe className="h-7 w-7" /> : <FileText className="h-7 w-7" />}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-primary">{source.name}</h2>
                      <Badge color={source.type === "url" ? "blue" : "purple"}>{source.type}</Badge>
                      <Badge color={source.status === "ready" ? "green" : source.status === "failed" ? "red" : "orange"}>{source.status}</Badge>
                    </div>
                    <p className="mt-2 text-sm font-medium leading-6 text-muted">{source.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {(source.keyConcepts ?? []).map((concept) => <Badge key={concept} color="gray">{concept}</Badge>)}
                    </div>
                    <p className="mt-4 text-xs font-semibold text-muted">Added {source.date}{source.size ? ` · ${source.size}` : ""}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link to={AppRoute.QUIZ}><Button variant="soft" icon={Target}>Quiz</Button></Link>
                  <Button variant="soft" icon={Sparkles} onClick={() => data.createDeckFromSource(source.id)}>Flashcards</Button>
                  <Link to={AppRoute.CHAT}><Button variant="soft" icon={MessageSquare}>Ask AI</Button></Link>
                  <Button variant="ghost" icon={Trash2} onClick={() => handleDelete(source.id)} aria-label="Delete source" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sources;
