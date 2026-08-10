# Job Notifier Backend

A comprehensive job notification system that fetches jobs from a MySQL database, analyzes their relevance using AI, and generates customized resumes for matching opportunities.

## Features

- **User Authentication**: JWT-based authentication with signup/login
- **Notifier Management**: Create multiple job notifiers with custom preferences
- **AI-Powered Matching**: Uses OpenAI to analyze job relevance based on user preferences
- **Resume Generation**: Compiles LaTeX resumes to PDF for each relevant job
- **Cloud Storage**: Stores generated resumes on Cloudinary
- **Scheduled Processing**: Configurable scheduler that processes jobs at regular intervals
- **Deadline Reminders**: Daily scheduler sends email reminders 1 day before job deadlines
- **RESTful API**: Complete REST API for frontend integration

## Architecture

### Core Components

1. **Job Source**: External module adds jobs to `jobs` table
2. **Scheduler**: Runs at configurable intervals to process new jobs
3. **AI Analysis**: Each job is analyzed for relevance to user preferences
4. **Resume Generation**: LaTeX compilation to PDF for matching jobs
5. **Notification Storage**: Relevant jobs stored with resume links

### Database Schema

#### Tables
- **users**: User accounts
- **notifiers**: User job preferences/criteria
- **jobs**: Raw job postings from external source
- **notifications**: Relevant jobs matched to notifiers
- **scheduler_state**: Tracks scheduler execution

## Setup Instructions

### Prerequisites

- Java 17+
- Maven 3.6+
- MySQL 8.0+
- OpenAI API Key
- Cloudinary Account

### 1. Database Setup

```sql
CREATE DATABASE job_notifier_db;
```

### 2. Configuration

Update `src/main/resources/application.properties`:

```properties
# Database
spring.datasource.url=jdbc:mysql://localhost:3306/job_notifier_db
spring.datasource.username=your_username
spring.datasource.password=your_password

# JWT Secret (generate a secure random string)
jwt.secret=your-secret-key-here

# OpenAI
openai.api.key=sk-your-openai-key
openai.model=gpt-4

# Cloudinary
cloudinary.cloud-name=your-cloud-name
cloudinary.api-key=your-api-key
cloudinary.api-secret=your-api-secret

# Scheduler
scheduler.fixed-rate=3600000  # 1 hour in milliseconds
scheduler.max-runs=10
ai.relevance.threshold=0.7
```

### 3. Build and Run

```bash
# Build the project
./mvnw clean install

# Run the application
./mvnw spring-boot:run
```

The server will start on `http://localhost:8080`

## API Documentation

### Authentication Endpoints

#### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe"
}

Response:
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "type": "Bearer",
  "userId": 1,
  "email": "user@example.com",
  "fullName": "John Doe"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: Same as signup
```

### Notifier Endpoints

All notifier endpoints require authentication. Include the JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

#### Create Notifier
```http
POST /api/notifiers
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Senior Backend Developer",
  "city": "San Francisco",
  "salaryExpectation": "$120k-$180k",
  "companiesPreference": "Google, Amazon, Netflix",
  "experience": "5 years",
  "noticePeriod": "2 weeks",
  "college": "MIT",
  "resumeLatex": "\\documentclass{article}...",
  "additionalPreferences": "Remote work preferred"
}

Response:
{
  "id": 1,
  "name": "Senior Backend Developer",
  "city": "San Francisco",
  ...
  "unreadNotificationsCount": 0
}
```

#### Get All Notifiers
```http
GET /api/notifiers
Authorization: Bearer <token>

Response:
[
  {
    "id": 1,
    "name": "Senior Backend Developer",
    "unreadNotificationsCount": 5,
    ...
  }
]
```

#### Get Single Notifier
```http
GET /api/notifiers/{id}
Authorization: Bearer <token>

Response: Same as create notifier
```

#### Update Notifier
```http
PUT /api/notifiers/{id}
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "Updated Name",
  "city": "New York",
  ...
}

Response: Updated notifier object
```

#### Delete Notifier
```http
DELETE /api/notifiers/{id}
Authorization: Bearer <token>

Response:
{
  "success": true,
  "message": "Notifier deleted successfully"
}
```

### Notification Endpoints

#### Get Notifications for Notifier
```http
GET /api/notifications/notifier/{notifierId}
Authorization: Bearer <token>

Response:
[
  {
    "id": 1,
    "notifierId": 1,
    "timestamp": "2025-10-15T10:30:00",
    "schedulerRun": 3,
    "resumeLink": "https://cloudinary.com/...",
    "companyName": "Google",
    "experience": "5+ years",
    "location": "Mountain View, CA",
    "salary": "$150k-$200k",
    "jobDescription": "We are looking for...",
    "relevanceScore": 0.85,
    "relevanceReason": "Strong match based on...",
    "applied": false
  }
]
```

#### Mark Notification as Applied
```http
PUT /api/notifications/{id}/applied
Authorization: Bearer <token>

Response: Updated notification object
```

## Scheduler Configuration

The system includes two schedulers:

### 1. Job Processing Scheduler

Processes new jobs and matches them with user preferences. Configuration options:

- `scheduler.fixed-rate`: Interval between runs (milliseconds)
- `scheduler.enabled`: Enable/disable job processing scheduler

#### How Job Processing Works

1. Runs every `fixed-rate` milliseconds
2. Fetches unprocessed jobs from the last run window
3. For each job:
   - Analyzes relevance against all active notifiers
   - If relevance score > threshold:
     - Generates PDF from LaTeX (if provided)
     - Uploads PDF to Cloudinary
     - Creates notification with resume link
4. Marks jobs as processed
5. Updates scheduler state
6. Sends email notification to users with new relevant jobs

### 2. Deadline Reminder Scheduler

Sends email reminders to users 1 day before job application deadlines. Configuration options:

- `scheduler.deadline-reminder.cron`: Cron expression for when to run (default: "0 0 9 * * ?" = 9:00 AM daily)
- `scheduler.deadline-reminder.enabled`: Enable/disable deadline reminder scheduler

#### How Deadline Reminders Work

1. Runs once daily at the configured time (default 9:00 AM)
2. Checks all unapplied notifications with deadlines
3. Identifies jobs with deadlines tomorrow
4. Groups notifications by user
5. Sends reminder emails with job details and links
6. Updates scheduler state in database

#### Configuring Reminder Time

You can change when reminders are sent by modifying the cron expression:

```properties
# Run at 8:00 AM daily
scheduler.deadline-reminder.cron=0 0 8 * * ?

# Run at 6:30 PM daily
scheduler.deadline-reminder.cron=0 30 18 * * ?

# Run at 10:00 AM on weekdays only (Mon-Fri)
scheduler.deadline-reminder.cron=0 0 10 * * MON-FRI
```

Cron format: `second minute hour day month weekday`

## AI Prompt Configuration

Customize the AI prompt template in `application.properties`:

```properties
ai.prompt.template=Analyze the following job posting and user preferences. Score the relevance from 0 to 1.\n\nJob: {job}\n\nUser Preferences:\nCity: {city}\nSalary: {salary}\nCompanies: {companies}\nExperience: {experience}\nNotice Period: {noticePeriod}\nCollege: {college}\n\nProvide only a JSON response with keys: 'score' (number 0-1) and 'reason' (string).
```

Available placeholders:
- `{job}` - Job posting text
- `{city}` - User's preferred city
- `{salary}` - Salary expectation
- `{companies}` - Preferred companies
- `{experience}` - Years of experience
- `{noticePeriod}` - Notice period
- `{college}` - College/University

## External Module Integration

The external module should insert jobs into the `jobs` table:

```sql
INSERT INTO jobs (timestamp, job, processed, created_at)
VALUES (
  '2025-10-15 10:30:00',
  'Job posting text or JSON',
  false,
  NOW()
);
```

### Job Format

Jobs can be in plain text or JSON format:

**JSON Format (Recommended)**:
```json
{
  "company": "Google",
  "experience": "5+ years",
  "location": "Mountain View, CA",
  "salary": "$150k-$200k",
  "description": "Full job description..."
}
```

**Plain Text Format**:
```
Company: Google
Experience: 5+ years
Location: Mountain View, CA
Salary: $150k-$200k

Full job description...
```

## Frontend Integration

### Authentication Flow

1. User signs up/logs in
2. Store JWT token in localStorage
3. Include token in all subsequent requests

### Example Frontend Code

```javascript
// Login
const login = async (email, password) => {
  const response = await fetch('http://localhost:8080/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  localStorage.setItem('token', data.token);
  return data;
};

// Get Notifiers
const getNotifiers = async () => {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:8080/api/notifiers', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  return response.json();
};

// Create Notifier
const createNotifier = async (notifierData) => {
  const token = localStorage.getItem('token');
  const response = await fetch('http://localhost:8080/api/notifiers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(notifierData)
  });
  return response.json();
};
```

## LaTeX Resume Template

Example LaTeX template for resumes:

```latex
\\documentclass[letterpaper,11pt]{article}
\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\begin{document}

\\begin{center}
    \\textbf{\\Huge \\scshape Your Name} \\\\ \\vspace{1pt}
    \\small 123-456-7890 $|$ \\href{mailto:email@email.com}{\\underline{email@email.com}} $|$ 
    \\href{https://linkedin.com/in/username}{\\underline{linkedin.com/in/username}}
\\end{center}

\\section{Education}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {University Name}{City, State}
      {Bachelor of Science in Computer Science}{Sept. 2018 -- May 2022}
  \\resumeSubHeadingListEnd

\\section{Experience}
  \\resumeSubHeadingListStart
    \\resumeSubheading
      {Software Engineer}{June 2022 -- Present}
      {Company Name}{City, State}
      \\resumeItemListStart
        \\resumeItem{Developed and maintained backend services}
        \\resumeItem{Improved system performance by 40\\%}
      \\resumeItemListEnd
  \\resumeSubHeadingListEnd

\\section{Skills}
 \\begin{itemize}[leftmargin=0.15in, label={}]
    \\small{\\item{
     \\textbf{Languages}{: Java, Python, JavaScript, SQL} \\\\
     \\textbf{Frameworks}{: Spring Boot, React, Node.js} \\\\
     \\textbf{Tools}{: Git, Docker, AWS, Jenkins}
    }}
 \\end{itemize}

\\end{document}
```

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description"
}
```

For validation errors:

```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": "Email must be valid",
    "password": "Password must be at least 6 characters"
  }
}
```

## Development

### Run Tests
```bash
./mvnw test
```

### Check Logs
Logs are configured at DEBUG level for development. Check console output for detailed information about:
- Scheduler runs
- Job processing
- AI analysis results
- PDF generation
- API requests

## Production Considerations

1. **Security**:
   - Change JWT secret to a strong random string
   - Use HTTPS only
   - Configure CORS for your frontend domain
   - Enable rate limiting

2. **Database**:
   - Use connection pooling
   - Set up database backups
   - Add indexes for performance

3. **Scheduler**:
   - Monitor scheduler health
   - Set up alerts for failures
   - Consider distributed scheduling for scale

4. **External Services**:
   - Handle API rate limits
   - Implement retry logic
   - Monitor API usage and costs

## License

MIT License

## Support

For issues or questions, please create an issue in the repository.

