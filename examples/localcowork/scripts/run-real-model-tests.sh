#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODELS_DIR="${LOCALCOWORK_REAL_MODEL_DIR:-${LOCALCOWORK_MODELS_DIR:-$PROJECT_ROOT/_models/ci-models}}"
MODEL_REPO="${LOCALCOWORK_REAL_MODEL_REPO:-}"
MODEL_FILE="${LOCALCOWORK_REAL_MODEL_FILE:-}"
MODEL_PORT="${LOCALCOWORK_REAL_MODEL_PORT:-18080}"
MODEL_CTX="${LOCALCOWORK_REAL_MODEL_CONTEXT:-8192}"
LOG_PATH="${LOCALCOWORK_REAL_MODEL_LOG:-/tmp/localcowork-real-model.log}"

if [[ -z "$MODEL_REPO" || -z "$MODEL_FILE" ]]; then
  cat <<'EOF'
Set LOCALCOWORK_REAL_MODEL_REPO and LOCALCOWORK_REAL_MODEL_FILE to run live model tests.

Example:
  LOCALCOWORK_REAL_MODEL_REPO=LiquidAI/LFM2.5-1.2B-Instruct-GGUF \
  LOCALCOWORK_REAL_MODEL_FILE=LFM2.5-1.2B-Instruct-Q8_0.gguf \
  npm run test:model-behavior:real
EOF
  exit 1
fi

if ! command -v llama-server >/dev/null 2>&1; then
  echo "llama-server is required to run live model tests." >&2
  exit 1
fi

mkdir -p "$MODELS_DIR"
MODEL_PATH="$MODELS_DIR/$MODEL_FILE"

if [[ ! -f "$MODEL_PATH" ]]; then
  if ! python3 - <<'PY'
import importlib.util
import sys

if importlib.util.find_spec("huggingface_hub") is None:
    sys.exit(1)
PY
  then
    python3 -m pip install huggingface-hub
  fi

  python3 - <<PY
from huggingface_hub import hf_hub_download

hf_hub_download(
    repo_id="${MODEL_REPO}",
    filename="${MODEL_FILE}",
    local_dir="${MODELS_DIR}",
)
PY
fi

cleanup() {
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "$SERVER_PID" >/dev/null 2>&1; then
    kill "$SERVER_PID"
  fi
}

trap cleanup EXIT

llama-server \
  --model "$MODEL_PATH" \
  --port "$MODEL_PORT" \
  --ctx-size "$MODEL_CTX" \
  >"$LOG_PATH" 2>&1 &
SERVER_PID=$!

for _ in $(seq 1 90); do
  if curl -sf "http://127.0.0.1:${MODEL_PORT}/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -sf "http://127.0.0.1:${MODEL_PORT}/health" >/dev/null 2>&1; then
  echo "Timed out waiting for llama-server. Server log:" >&2
  cat "$LOG_PATH" >&2
  exit 1
fi

cd "$PROJECT_ROOT"
LOCALCOWORK_MODEL_ENDPOINT="http://127.0.0.1:${MODEL_PORT}" \
  npm run test:model-behavior
