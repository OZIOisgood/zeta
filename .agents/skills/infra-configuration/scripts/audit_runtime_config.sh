#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$root"

if (($#)); then
  variables=("$@")
else
  variables=()
  while IFS= read -r variable; do
    variables+=("$variable")
  done < <(sed -nE 's/^([A-Z][A-Z0-9_]*)=.*/\1/p' .env.example | sort -u)
fi

printf 'variable\tapp_reads\tenv_example\tplain_binding\tsecret_binding\tterraform\tdocs\n'

for variable in "${variables[@]}"; do
  lower_variable="$(printf '%s' "$variable" | tr '[:upper:]' '[:lower:]')"
  app_reads="$(rg -l --glob='*.go' --glob='*.ts' --glob='Dockerfile' --glob='*.sh' "$variable" internal cmd web 2>/dev/null || true)"
  env_example="$(rg -l "^${variable}=" .env.example 2>/dev/null || true)"
  plain_binding="$(rg -l --glob='*.yml' --glob='*.yaml' -- "--set-env-vars=.*${variable}" .github/workflows 2>/dev/null || true)"
  secret_binding="$(rg -l --glob='*.yml' --glob='*.yaml' -- "--set-secrets=.*${variable}" .github/workflows 2>/dev/null || true)"
  terraform="$(rg -l --glob='*.tf' "${variable}|${lower_variable}" infra/terraform 2>/dev/null || true)"
  docs="$(rg -l --glob='*.md' "$variable" README.md docs .agents 2>/dev/null || true)"

  app_reads="$(printf '%s\n' "$app_reads" | sed '/^$/d' | wc -l | tr -d ' ')"
  env_example="$(printf '%s\n' "$env_example" | sed '/^$/d' | wc -l | tr -d ' ')"
  plain_binding="$(printf '%s\n' "$plain_binding" | sed '/^$/d' | wc -l | tr -d ' ')"
  secret_binding="$(printf '%s\n' "$secret_binding" | sed '/^$/d' | wc -l | tr -d ' ')"
  terraform="$(printf '%s\n' "$terraform" | sed '/^$/d' | wc -l | tr -d ' ')"
  docs="$(printf '%s\n' "$docs" | sed '/^$/d' | wc -l | tr -d ' ')"

  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$variable" "$app_reads" "$env_example" "$plain_binding" "$secret_binding" "$terraform" "$docs"

  if ((plain_binding > 0 && secret_binding > 0)); then
    printf 'warning: %s has both plain and secret deployment bindings\n' "$variable" >&2
  fi
done
