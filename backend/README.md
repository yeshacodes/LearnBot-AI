# LearnBot Backend (FastAPI + Supabase Auth + Gemini)

## 1) Setup

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
# source .venv/bin/activate

pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in at least:

- `GOOGLE_API_KEY`
- `SUPABASE_JWT_SECRET` (or `SUPABASE_PROJECT_URL`/`SUPABASE_JWKS_URL`)

## 2) Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## 3) Frontend integration

- CORS is enabled for `http://localhost:5173`
- Pass Supabase access token as:

```http
Authorization: Bearer <token>
```

## 4) Storage

- Files: `./data/{user_id}/`
- FAISS index: `./data/{user_id}/faiss.index`
- Vector id map: `./data/{user_id}/faiss_ids.json`
- SQLite DB: `./data/learnbot.db` (configurable via `DATABASE_PATH`)
