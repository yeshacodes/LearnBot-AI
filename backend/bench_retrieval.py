# bench_retrieval.py - retrieval latency benchmark for LearnBot's FAISS store
# Run from LearnBot-AI/backend/ with the project venv active.
# Measures the FAISS top-k search latency (the retrieval step), no API keys needed.

import glob, time, statistics, sys
import numpy as np

try:
    import faiss
except ImportError:
    sys.exit("faiss not installed. Run: pip install faiss-cpu numpy")

K = 50            # LearnBot retrieves top-50 (matches app)
QUERIES = 300     # number of timed queries
WARMUP = 20       # discarded warm-up queries

# 1) Read the real index (if present) just to get the true embedding dimension
real_dim, real_ntotal = None, None
for path in glob.glob("data/**/faiss.index", recursive=True):
    try:
        idx = faiss.read_index(path)
        real_dim, real_ntotal = idx.d, idx.ntotal
        print(f"Found real index: {path}  dim={idx.d}  vectors={idx.ntotal}")
        break
    except Exception:
        continue

dim = real_dim or 768   # Gemini text-embedding default if no index found
if real_dim is None:
    print(f"No real index found; using dim={dim}")

def bench(n_vectors):
    rng = np.random.default_rng(42)
    index = faiss.IndexFlatL2(dim)
    index.add(rng.random((n_vectors, dim), dtype=np.float32))
    queries = rng.random((QUERIES + WARMUP, dim), dtype=np.float32)
    times = []
    for i in range(QUERIES + WARMUP):
        q = queries[i:i+1]
        t0 = time.perf_counter()
        index.search(q, min(K, n_vectors))
        dt = (time.perf_counter() - t0) * 1000.0
        if i >= WARMUP:
            times.append(dt)
    times.sort()
    p = lambda pct: times[int(len(times) * pct) - 1]
    return statistics.mean(times), p(0.50), p(0.95), p(0.99)

print(f"\nTop-{K} retrieval latency over IndexFlatL2 (dim={dim}), {QUERIES} queries each:\n")
print(f"{'index size':>12} | {'mean ms':>8} | {'p50 ms':>8} | {'p95 ms':>8} | {'p99 ms':>8}")
print("-" * 60)
sizes = [n for n in [real_ntotal, 1000, 5000, 10000] if n]
for n in sorted(set(sizes)):
    mean, p50, p95, p99 = bench(n)
    print(f"{n:>12} | {mean:8.3f} | {p50:8.3f} | {p95:8.3f} | {p99:8.3f}")
