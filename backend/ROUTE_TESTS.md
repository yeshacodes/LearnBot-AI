# LearnBot Backend Route Checks

Set your deployed backend root first. This must be the Render FastAPI service URL, not the Vercel/frontend URL.

```bash
BACKEND_URL="https://your-render-service.onrender.com"
TOKEN="paste-supabase-access-token"
```

Health and deployed route inventory:

```bash
curl "$BACKEND_URL/api/health"
```

Authenticated source list:

```bash
curl -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/api/sources"
```

Source debug:

```bash
curl -H "Authorization: Bearer $TOKEN" "$BACKEND_URL/api/sources/{source_id}/debug"
```

PDF upload:

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/absolute/path/to/file.pdf" \
  "$BACKEND_URL/api/sources/upload"
```

Chat:

```bash
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"question":"Summarize this source in five study bullets","sourceIds":["{source_id}"]}' \
  "$BACKEND_URL/api/chat"
```

Deployment checklist:

- Render root directory should point at `backend` if the start command runs from that folder.
- Render start command should be equivalent to `uvicorn app.main:app --host 0.0.0.0 --port $PORT`.
- The frontend API base env var must point to the Render backend root, for example `VITE_API_BASE=https://your-render-service.onrender.com`.
- Do not point `VITE_API_BASE` at the Vercel frontend URL.
- If `/api/health` does not list `/api/sources/upload` and `/api/sources/{source_id}/debug`, Render is running old backend code.
