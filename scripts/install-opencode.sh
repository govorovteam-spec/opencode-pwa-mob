#!/usr/bin/env bash
set -euo pipefail

if command -v opencode >/dev/null 2>&1; then
  echo "opencode уже установлен: $(opencode --version)"
  exit 0
fi

echo "Устанавливаю opencode (официальный установщик)..."
curl -fsSL https://opencode.ai/install | bash

# официальный установщик кладёт бинарь в ~/.opencode/bin
export PATH="$HOME/.opencode/bin:$PATH"
if ! command -v opencode >/dev/null 2>&1; then
  echo "Не удалось найти opencode после установки. Добавьте ~/.opencode/bin в PATH." >&2
  exit 1
fi

echo "Готово: $(opencode --version)"
