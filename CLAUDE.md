# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JobKick (repo name: jobease) is an automated job notification platform with AI-powered relevance scoring and customized resume generation. It uses a microservices architecture with three main components orchestrated via Docker Compose.

## Architecture

Three services communicate through a shared MySQL 8.0 database on a Docker bridge network (`jobease-network`):

- **Backend (`job-notifier/`)** — Spring Boot 3.5.6 / Java 17 REST API (port 8080). Handles auth (JWT + Google OAuth), job processing with Google Gemini AI scoring, LaTeX resume generation via external compiler (latex.ytotech.com), Cloudinary PDF storage, and email notifications via Gmail SMTP. Package: `com.jobnotifer` (note: single 'i' typo is intentional throughout).
- **Frontend (`jobsease-frontend/`)** — React 19 + Vite 5 SPA served via Nginx (port 5173). Uses React Router v6, React Hook Form + Yup validation, Axios for API calls, Recharts for analytics. No TypeScript.
- **Jobs Fetcher (`jobs-fetcher/`)** — Python 3.11 service that fetches jobs from Jooble API (and optionally Telegram channels via Telethon) on a configurable interval, inserting directly into MySQL.

Data flow: Jobs Fetcher writes raw jobs to DB → Backend scheduler picks up unprocessed jobs, scores them via Gemini AI, generates tailored resumes, and emails users → Frontend displays matched jobs and notifications.

## Common Commands

### Full stack (Docker)
```bash
./jobease.sh start       # Start all services
./jobease.sh stop        # Stop all services
./jobease.sh restart     # Restart everything
./jobease.sh logs        # View all logs
./jobease.sh logs backend  # View specific service logs
./jobease.sh rebuild     # Rebuild after code changes
./jobease.sh health      # Run health checks
```

### Backend (Spring Boot)
```bash
cd job-notifier
./mvnw spring-boot:run              # Run locally
./mvnw test                          # Run all tests
./mvnw test -Dtest=ClassName         # Run single test class
./mvnw test -Dtest=ClassName#method  # Run single test method
./mvnw package -DskipTests           # Build JAR without tests
```

### Frontend (React/Vite)
```bash
cd jobsease-frontend
npm install         # Install dependencies
npm run dev         # Dev server with HMR
npm run build       # Production build
npm run lint        # ESLint
npm run preview     # Preview production build
```

### Jobs Fetcher (Python)
```bash
cd jobs-fetcher
pip install -r requirements.txt
python scheduler.py    # Run the fetcher scheduler
python ingest.py       # Run single ingestion
```

## Environment Setup

Copy `env.template` to `.env` at repo root. Required API keys: Gemini, Google OAuth Client ID, Cloudinary, Gmail app password. Optional: Telegram API credentials, Jooble API key.

## Key Conventions

- Backend base package is `com.jobnotifer` (not `com.jobnotifier`) — this is consistent throughout, do not "fix" it
- Backend uses Lombok extensively — entities/DTOs use `@Data`, `@Builder`, etc.
- Frontend has no TypeScript — all `.jsx` files
- API base path: `/api` (configured via `VITE_API_BASE_URL` env var)
- MySQL is exposed on host port 3307 (not 3306) to avoid conflicts with local MySQL
- Backend uses Spring profiles: `prod` is the default in Docker
