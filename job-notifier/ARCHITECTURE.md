# Job Notifier - System Architecture

## Overview

The Job Notifier is a sophisticated backend system that automatically matches job postings with user preferences using AI, generates customized resumes, and provides a RESTful API for frontend integration.

## High-Level Architecture

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  External       │      │   Job Notifier  │      │   Frontend      │
│  Telegram       │─────▶│   Backend       │◀─────│   Application   │
│  Module         │      │   (Spring Boot) │      │   (React/Vue)   │
└─────────────────┘      └─────────────────┘      └─────────────────┘
                                 │
                    ┌────────────┼────────────┐
                    │            │            │
                    ▼            ▼            ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │  MySQL   │  │ OpenAI   │  │Cloudinary│
            │ Database │  │   API    │  │  Storage │
            └──────────┘  └──────────┘  └──────────┘
```

## Core Components

### 1. Data Layer (MySQL Database)

#### Tables

**users**
- Stores user account information
- Fields: id, email, password (encrypted), full_name, created_at, updated_at

**notifiers**
- Stores user job preferences/criteria
- Fields: id, user_id, name, city, salary_expectation, companies_preference, experience, notice_period, college, resume_latex, additional_preferences, created_at, updated_at

**jobs**
- Raw job postings from external module
- Fields: id, timestamp, job (text/JSON), processed (boolean), created_at
- Source: External Telegram module

**notifications**
- Relevant jobs matched to notifiers
- Fields: id, notifier_id, timestamp, scheduler_run, resume_link, company_name, experience, location, salary, job_description, relevance_score, relevance_reason, original_job_posting, created_at, viewed

**scheduler_state**
- Tracks scheduler execution state
- Fields: id, scheduler_name, current_run, max_runs, last_run_timestamp, enabled

### 2. Security Layer

#### JWT Authentication

```
┌──────────┐         ┌──────────────┐         ┌──────────────┐
│  Client  │────────▶│ Auth Filter  │────────▶│  Controller  │
│          │         │ (JWT Verify) │         │              │
└──────────┘         └──────────────┘         └──────────────┘
     │                      │                        │
     │                      ▼                        │
     │              ┌────────────────┐               │
     │              │ Security       │               │
     │              │ Context        │               │
     └──────────────│ (User Info)    │◀──────────────┘
                    └────────────────┘
```

**Components:**
- `JwtTokenProvider`: Generate and validate JWT tokens
- `JwtAuthenticationFilter`: Intercept requests and validate tokens
- `CustomUserDetailsService`: Load user details from database
- `UserPrincipal`: Spring Security user details implementation
- `SecurityConfig`: Configure security rules and endpoints

**Flow:**
1. User signs up/logs in
2. Server generates JWT token
3. Client includes token in Authorization header
4. Filter validates token and loads user context
5. Controller accesses authenticated user

### 3. Business Logic Layer

#### Service Components

**AuthService**
- User registration with password encryption
- User authentication with JWT token generation
- Password validation

**NotifierService**
- CRUD operations for notifiers
- User authorization checks
- Unread notification count aggregation

**NotificationService**
- Fetch notifications for notifiers
- Mark notifications as viewed
- Authorization validation

**JobProcessingService** (Core Scheduler)
- Scheduled job processing
- Job-notifier matching
- AI relevance analysis coordination
- Resume generation coordination
- Notification creation

**OpenAIService**
- Job relevance analysis using GPT models
- Configurable prompt templates
- JSON response parsing
- Error handling and fallbacks

**LatexCompilerService**
- LaTeX to PDF compilation
- Integration with online compiler
- Temporary file management

**CloudinaryService**
- PDF upload to cloud storage
- Secure URL generation
- File deletion

### 4. API Layer (REST Controllers)

```
/api/auth/*              - Authentication endpoints (public)
    POST /signup         - User registration
    POST /login          - User login
    GET  /test           - Health check

/api/notifiers/*         - Notifier management (authenticated)
    GET    /             - List all user notifiers
    POST   /             - Create new notifier
    GET    /{id}         - Get single notifier
    PUT    /{id}         - Update notifier
    DELETE /{id}         - Delete notifier

/api/notifications/*     - Notification management (authenticated)
    GET /notifier/{id}   - Get notifications for notifier
    PUT /{id}/viewed     - Mark notification as viewed
```

## System Workflows

### Workflow 1: User Registration and Notifier Creation

```
┌────────┐     ┌────────┐     ┌─────────┐     ┌──────────┐
│ Client │     │  Auth  │     │  User   │     │ Database │
│        │     │Controller│    │ Service │     │          │
└───┬────┘     └───┬────┘     └────┬────┘     └────┬─────┘
    │              │               │               │
    │ POST signup  │               │               │
    │─────────────▶│               │               │
    │              │ register()    │               │
    │              │──────────────▶│               │
    │              │               │ encrypt pwd   │
    │              │               │ save user     │
    │              │               │──────────────▶│
    │              │               │               │
    │              │               │◀──────────────│
    │              │  generate JWT │               │
    │              │◀──────────────│               │
    │              │               │               │
    │◀─────────────│               │               │
    │ {token, user}│               │               │
    │              │               │               │
    │ POST /notifiers with token   │               │
    │─────────────────────────────▶│               │
    │              │               │ create        │
    │              │               │ notifier      │
    │              │               │──────────────▶│
    │◀─────────────────────────────│               │
    │              │               │               │
```

### Workflow 2: Job Processing (Scheduler)

```
┌───────────┐  ┌──────────┐  ┌─────────┐  ┌────────┐  ┌───────────┐
│ Scheduler │  │   Job    │  │ OpenAI  │  │ LaTeX  │  │Cloudinary │
│           │  │Repository│  │ Service │  │Service │  │  Service  │
└─────┬─────┘  └────┬─────┘  └────┬────┘  └───┬────┘  └─────┬─────┘
      │             │              │            │             │
      │ Execute     │              │            │             │
      │ (every hour)│              │            │             │
      │─────────────▶              │            │             │
      │             │              │            │             │
      │ Get unprocessed jobs       │            │             │
      │────────────▶│              │            │             │
      │             │              │            │             │
      │◀────────────│              │            │             │
      │ [Job List]  │              │            │             │
      │             │              │            │             │
      │ For each job + notifier:   │            │             │
      │                            │            │             │
      │ Analyze relevance          │            │             │
      │────────────────────────────▶│           │             │
      │                            │            │             │
      │◀────────────────────────────│           │             │
      │ {score: 0.85, reason: "..."│           │             │
      │                            │            │             │
      │ If score >= threshold:     │            │             │
      │                            │            │             │
      │ Compile LaTeX              │            │             │
      │─────────────────────────────────────────▶│            │
      │                            │            │             │
      │◀─────────────────────────────────────────│            │
      │ PDF file                   │            │             │
      │                            │            │             │
      │ Upload PDF                 │            │             │
      │──────────────────────────────────────────────────────▶│
      │                            │            │             │
      │◀──────────────────────────────────────────────────────│
      │ PDF URL                    │            │             │
      │                            │            │             │
      │ Save notification          │            │             │
      │────────────▶│              │            │             │
      │             │              │            │             │
      │ Mark job as processed      │            │             │
      │────────────▶│              │            │             │
      │             │              │            │             │
```

### Workflow 3: Notification Retrieval

```
┌────────┐   ┌──────────────┐   ┌──────────────┐   ┌──────────┐
│ Client │   │ Notification │   │ Notification │   │ Database │
│        │   │  Controller  │   │   Service    │   │          │
└───┬────┘   └──────┬───────┘   └──────┬───────┘   └────┬─────┘
    │               │                  │                │
    │ GET /notifications/notifier/{id} │                │
    │──────────────▶│                  │                │
    │               │ Verify ownership │                │
    │               │─────────────────▶│                │
    │               │                  │ Check user_id  │
    │               │                  │───────────────▶│
    │               │                  │                │
    │               │                  │ Fetch notifs   │
    │               │                  │───────────────▶│
    │               │                  │                │
    │               │                  │◀───────────────│
    │               │◀─────────────────│                │
    │◀──────────────│                  │                │
    │ [Notifications with resume links] │               │
    │               │                  │                │
    │ PUT /notifications/{id}/viewed   │                │
    │──────────────▶│                  │                │
    │               │─────────────────▶│                │
    │               │                  │ Update viewed  │
    │               │                  │───────────────▶│
    │◀──────────────│                  │                │
```

## External Integrations

### 1. Telegram Module (Data Source)

**Integration Point:** MySQL `jobs` table

**Expected Behavior:**
- External module fetches jobs from Telegram channels
- Inserts jobs into `jobs` table
- Format: JSON or plain text
- Runs independently of main application

**Schema:**
```sql
INSERT INTO jobs (timestamp, job, processed, created_at) 
VALUES (NOW(), '{"company":"...", ...}', false, NOW());
```

### 2. OpenAI API

**Purpose:** Job relevance analysis

**Configuration:**
- API Key: Required
- Model: gpt-4 or gpt-3.5-turbo
- Prompt Template: Customizable

**Request:**
- System message: Role definition
- User message: Job + preferences
- Temperature: 0.3 (deterministic)
- Max tokens: 500

**Response:**
```json
{
  "score": 0.85,
  "reason": "Strong match based on..."
}
```

**Error Handling:**
- Returns score 0.0 on API failure
- Logs error details
- Continues processing other jobs

### 3. LaTeX Online Compiler

**Purpose:** Convert LaTeX to PDF

**Endpoint:** `https://latexonline.cc/compile`

**Process:**
1. Send LaTeX code as plain text
2. Receive PDF binary
3. Save to temporary file

**Alternatives:**
- Local pdflatex installation
- Overleaf API
- Custom LaTeX Docker container

### 4. Cloudinary

**Purpose:** Cloud storage for PDFs

**Operations:**
- Upload: Store resume PDFs
- Retrieve: Public URLs for downloads
- Delete: Cleanup old files

**Configuration:**
- Cloud name
- API key
- API secret

**File naming:** `resumes/resume_{notifier_id}_{job_id}_{random}.pdf`

## Configuration

### Application Properties

**Critical Settings:**

1. **Database:**
   - Connection URL, credentials
   - Connection pooling (production)

2. **JWT:**
   - Secret key (minimum 64 chars)
   - Expiration time

3. **Scheduler:**
   - Execution interval
   - Maximum runs
   - Enable/disable flag

4. **AI:**
   - OpenAI API key
   - Model selection
   - Relevance threshold
   - Prompt template

5. **Cloud Storage:**
   - Cloudinary credentials

### Environment Variables (Production)

```bash
export SPRING_DATASOURCE_PASSWORD=xxx
export JWT_SECRET=xxx
export OPENAI_API_KEY=xxx
export CLOUDINARY_CLOUD_NAME=xxx
export CLOUDINARY_API_KEY=xxx
export CLOUDINARY_API_SECRET=xxx
```

## Scalability Considerations

### Current Implementation (Single Instance)

- Suitable for: 1-1000 users, 100-10000 jobs/day
- Scheduler runs on single instance
- Stateless API (easy to scale)

### Scaling Strategies

**Horizontal Scaling (Multiple Instances):**

1. **API Layer:**
   - Load balancer in front
   - Stateless design enables easy scaling
   - JWT validation on each instance

2. **Scheduler:**
   - Distributed locking (Redis, Database)
   - Leader election
   - Quartz Scheduler with database clustering

3. **Database:**
   - Read replicas for queries
   - Master-slave replication
   - Connection pooling

4. **AI Processing:**
   - Queue-based processing (RabbitMQ, Kafka)
   - Separate worker processes
   - Rate limiting for API costs

**Vertical Scaling:**
- Increase database resources
- Optimize queries (indexes, caching)
- Batch processing optimization

### Performance Optimizations

1. **Database:**
   - Indexes on frequently queried fields
   - Query optimization
   - Connection pooling

2. **Caching:**
   - User sessions (Redis)
   - Notifier preferences during scheduler run
   - AI responses for identical inputs

3. **Async Processing:**
   - Resume generation in background
   - Parallel job processing
   - Non-blocking AI API calls

4. **Resource Management:**
   - Limit concurrent AI API calls
   - Temporary file cleanup
   - Database connection limits

## Security Considerations

### Current Implementation

1. **Authentication:**
   - JWT-based stateless auth
   - BCrypt password hashing
   - Token expiration

2. **Authorization:**
   - User ownership verification
   - Endpoint protection
   - Role-based (single role: USER)

3. **CORS:**
   - Configured for specific origins
   - Development: localhost:3000, localhost:5173

### Production Hardening

1. **HTTPS Only:**
   - SSL/TLS certificates
   - Redirect HTTP to HTTPS

2. **Rate Limiting:**
   - API rate limits per user
   - Brute force protection

3. **Input Validation:**
   - Already implemented via Bean Validation
   - SQL injection prevention (JPA)

4. **Secrets Management:**
   - Use secrets manager
   - Rotate credentials regularly
   - Environment variables

5. **Logging & Monitoring:**
   - Audit logs for security events
   - Error tracking
   - Performance monitoring

## Monitoring & Observability

### Recommended Metrics

1. **Application:**
   - Scheduler execution time
   - Jobs processed per run
   - AI API latency
   - PDF generation success rate

2. **API:**
   - Request rate
   - Response time
   - Error rate
   - Active users

3. **Database:**
   - Connection pool usage
   - Query execution time
   - Table sizes

4. **External Services:**
   - OpenAI API usage/costs
   - Cloudinary storage usage
   - LaTeX compilation failures

### Logging

- **Levels:** DEBUG (dev), INFO (prod)
- **Key Events:**
  - Scheduler runs
  - Job matches found
  - Resume generation
  - Authentication events
  - Errors and exceptions

## Testing Strategy

### Unit Tests
- Service layer logic
- JWT token generation/validation
- Business rules

### Integration Tests
- API endpoint tests
- Database operations
- External service mocks

### End-to-End Tests
- Complete user flows
- Scheduler execution
- Job matching accuracy

## Future Enhancements

1. **Multi-tenancy:**
   - Organization support
   - Team notifiers
   - Shared resume templates

2. **Advanced Matching:**
   - ML model training
   - Historical match data
   - User feedback loop

3. **Notifications:**
   - Email notifications
   - Push notifications
   - Webhook integrations

4. **Analytics:**
   - Match success rate
   - User engagement metrics
   - Job market insights

5. **Resume Management:**
   - Multiple resume templates
   - Resume builder UI
   - Version history

6. **Job Sourcing:**
   - Multiple job sources
   - LinkedIn integration
   - Indeed API

## Technology Stack

- **Framework:** Spring Boot 3.5.6
- **Language:** Java 17
- **Database:** MySQL 8.0
- **Security:** Spring Security + JWT
- **ORM:** Hibernate/JPA
- **AI:** OpenAI GPT-4
- **Storage:** Cloudinary
- **Build Tool:** Maven
- **Logging:** SLF4J + Logback

## Conclusion

The Job Notifier backend is a production-ready, scalable system that combines modern technologies to provide intelligent job matching. Its modular architecture allows for easy extension and customization based on specific requirements.

