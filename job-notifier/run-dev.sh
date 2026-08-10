#!/usr/bin/env bash
# Run backend locally: loads ../.env safely (multi-line / quotes in prompts) and
# points Spring at MySQL in Docker on localhost:3307.
set -euo pipefail
cd "$(dirname "$0")"
REPO_ROOT="$(cd .. && pwd)"
export REPO_ROOT

eval "$(
  python3 - <<PY
import pathlib, shlex, os

path = pathlib.Path(os.environ["REPO_ROOT"]) / ".env"
for raw in path.read_text(encoding="utf-8").splitlines():
    line = raw.strip()
    if not line or line.startswith("#"):
        continue
    if "=" not in line:
        continue
    i = line.index("=")
    key, val = line[:i].strip(), line[i + 1 :]
    if not key or not key.replace("_", "").isalnum():
        continue
    print(f"export {key}={shlex.quote(val)}")
PY
)"

export SPRING_DATASOURCE_URL="jdbc:mysql://localhost:3307/${MYSQL_DATABASE}?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true"
export SPRING_DATASOURCE_USERNAME="${MYSQL_USER}"
export SPRING_DATASOURCE_PASSWORD="${MYSQL_PASSWORD}"

# Spring maps APP_FRONTEND_URL → app.frontend.url (used by EmailService, etc.)
export APP_FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
# Verification links in email hit the API first; must match where Spring Boot listens locally
export APP_API_PUBLIC_URL="${APP_API_PUBLIC_URL:-http://localhost:8080}"

# MySQL is not embedded → Spring defaults ddl-auto to "none" unless set (Docker sets this).
export SPRING_JPA_HIBERNATE_DDL_AUTO="${SPRING_JPA_HIBERNATE_DDL_AUTO:-update}"
export SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT="${SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT:-org.hibernate.dialect.MySQLDialect}"
export SPRING_JPA_PROPERTIES_HIBERNATE_JDBC_TIME_ZONE="${SPRING_JPA_PROPERTIES_HIBERNATE_JDBC_TIME_ZONE:-UTC}"

exec ./mvnw spring-boot:run "$@"
