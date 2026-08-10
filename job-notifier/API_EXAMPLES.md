# API Examples and Testing Guide

## Complete API Flow Example

### 1. User Registration

```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123",
    "fullName": "John Doe"
  }'
```

**Response (Success):**
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjk3MzY...",
  "type": "Bearer",
  "userId": 1,
  "email": "john.doe@example.com",
  "fullName": "John Doe"
}
```
**Status Code:** `200 OK`

**Error Responses:**

**Email Already Exists:**
```json
{
  "success": false,
  "message": "Email already exists!"
}
```
**Status Code:** `400 Bad Request`

**Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": "Invalid email format",
    "password": "Password is required",
    "fullName": "Full name is required"
  }
}
```
**Status Code:** `400 Bad Request`

### 2. User Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

**Response (Success):**
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiIxIiwiaWF0IjoxNjk3MzY...",
  "type": "Bearer",
  "userId": 1,
  "email": "john.doe@example.com",
  "fullName": "John Doe"
}
```
**Status Code:** `200 OK`

**Error Responses:**

**Invalid Credentials:**
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```
**Status Code:** `401 Unauthorized`

**Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "email": "Email is required",
    "password": "Password is required"
  }
}
```
**Status Code:** `400 Bad Request`

### 3. Forgot Password Flow

#### 3.1 Request Password Reset

User requests a password reset link to be sent to their email.

```bash
curl -X POST http://localhost:8080/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com"
  }'
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Reset link sent to email"
}
```
**Status Code:** `200 OK`

**Error Responses:**

**Rate Limit Exceeded:**
```json
{
  "success": false,
  "message": "Too many password reset requests. Please try again later."
}
```
**Status Code:** `400 Bad Request`

**User Not Found:**
```json
{
  "success": false,
  "message": "User not found with email: user@example.com"
}
```
**Status Code:** `500 Internal Server Error`

**Notes:**
- An email will be sent to the user with a password reset link
- The reset link contains a unique token that expires in 5 minutes
- The link format: `http://yourapp.com/reset-password?token=abc123`
- **Rate Limiting:** Each email can only request password reset once every 2 minutes (configurable)
- This prevents spam and abuse of the password reset functionality
- If rate limit is exceeded, user must wait before requesting again

#### 3.2 Validate Reset Token

Frontend validates the token when user clicks the reset link.

```bash
curl -X GET "http://localhost:8080/api/auth/validate-reset-token?token=abc123-def456-ghi789"
```

**Response (Valid Token):**
```json
{
  "valid": true
}
```

**Response (Invalid/Expired Token):**
```json
{
  "valid": false
}
```
**Status Code:** `400 Bad Request` for invalid tokens

**Notes:**
- Tokens expire after 5 minutes
- Tokens can only be used once
- Frontend should show password reset form only if token is valid

#### 3.3 Reset Password

User submits new password with the token.

```bash
curl -X POST http://localhost:8080/api/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "abc123-def456-ghi789",
    "newPassword": "newSecurePassword123"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

**Error Responses:**
- `400 Bad Request` - Invalid or expired token
- `400 Bad Request` - Password too short (minimum 6 characters)

**Notes:**
- Token is marked as used after successful password reset
- User can immediately login with the new password
- Frontend should redirect to login page after 3 seconds

### 4. Create a Notifier

Create a new job notifier profile with your preferences and resume.

**⚠️ Automatic PDF Generation:** If `resumeLatex` is provided, the system will automatically compile it to PDF and upload to Cloudinary. The PDF URL will be included in the response (`latexResumePdfUrl` field).

```bash
export TOKEN="your-jwt-token-here"

curl -X POST http://localhost:8080/api/notifiers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Senior Backend Engineer Profile",
    "role": "Senior Backend Engineer",
    "city": "San Francisco, CA",
    "salaryExpectation": "150k-200k USD",
    "companiesPreference": "Google, Amazon, Netflix, Microsoft, Meta, Apple",
    "experience": "6 years",
    "noticePeriod": "2 months",
    "skills": "Java, Spring Boot, Spring Cloud, Hibernate, Microservices, REST APIs, MySQL, PostgreSQL, MongoDB, Redis, AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes, Git, Jenkins, Maven, Gradle, JIRA, Event-Driven Architecture, CQRS, Python, Go, JavaScript, Node.js",
    "resumeLatex": "\\documentclass[11pt,a4paper,sans]{moderncv}\\moderncvstyle{banking}\\moderncvcolor{blue}\\usepackage[utf8]{inputenc}\\usepackage[scale=0.85]{geometry}\\name{John}{Doe}\\title{Senior Backend Engineer}\\address{San Francisco}{CA}{USA}\\phone[mobile]{+1~(555)~123~4567}\\email{john.doe@example.com}\\social[linkedin]{johndoe}\\social[github]{johndoe}\\begin{document}\\makecvtitle\\section{Professional Summary}Experienced Backend Engineer with 6+ years of expertise in designing and implementing scalable microservices architectures. Proven track record of leading technical projects and mentoring junior developers.\\section{Technical Skills}\\cvitem{Languages}{Java, Python, Go, JavaScript}\\cvitem{Frameworks}{Spring Boot, Spring Cloud, Hibernate, Node.js}\\cvitem{Databases}{MySQL, PostgreSQL, MongoDB, Redis}\\cvitem{Cloud}{AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes}\\cvitem{Tools}{Git, Jenkins, Maven, Gradle, JIRA}\\cvitem{Architecture}{Microservices, REST APIs, Event-Driven, CQRS}\\section{Work Experience}\\cventry{2021--Present}{Senior Backend Engineer}{Tech Giant Inc.}{San Francisco, CA}{}{\\begin{itemize}\\item Led development of high-traffic microservices serving 10M+ daily users\\item Architected event-driven system reducing processing time by 60\\%\\item Mentored team of 5 junior engineers, improving code quality by 40\\%\\item Implemented CI/CD pipelines reducing deployment time from 2 hours to 15 minutes\\item Technologies: Java, Spring Boot, Kubernetes, AWS, PostgreSQL\\end{itemize}}\\cventry{2019--2021}{Backend Engineer}{Innovative Startup}{Palo Alto, CA}{}{\\begin{itemize}\\item Built RESTful APIs processing 1M+ requests daily\\item Optimized database queries improving response time by 70\\%\\item Implemented caching strategies reducing server load by 50\\%\\item Technologies: Java, Spring Framework, MySQL, Redis, Docker\\end{itemize}}\\cventry{2018--2019}{Software Developer}{Software Solutions Corp}{San Jose, CA}{}{\\begin{itemize}\\item Developed and maintained enterprise web applications\\item Collaborated with cross-functional teams on feature development\\item Participated in code reviews and agile ceremonies\\item Technologies: Java, Spring MVC, Hibernate, Oracle Database\\end{itemize}}\\section{Education}\\cventry{2014--2018}{Bachelor of Science in Computer Science}{Stanford University}{Stanford, CA}{\\textit{GPA: 3.8/4.0}}{Relevant Coursework: Data Structures, Algorithms, Distributed Systems, Database Management}\\section{Certifications}\\cvlistitem{AWS Certified Solutions Architect - Associate}\\cvlistitem{Oracle Certified Professional, Java SE 11 Developer}\\cvlistitem{Certified Kubernetes Administrator (CKA)}\\section{Projects}\\cvitem{E-Commerce Platform}{Built scalable microservices platform handling 50k transactions/day using Spring Boot, Kafka, and MongoDB}\\cvitem{Real-time Analytics}{Developed real-time data processing pipeline using Apache Kafka and Spark, processing 100GB+ daily}\\cvitem{API Gateway}{Designed and implemented API gateway with rate limiting, authentication, and monitoring for 20+ microservices}\\section{Achievements}\\cvlistitem{Led migration from monolith to microservices, improving system reliability from 98\\% to 99.9\\%}\\cvlistitem{Reduced infrastructure costs by 30\\% through optimization and cloud resource management}\\cvlistitem{Published 3 technical blog posts on system design, garnering 50k+ views}\\section{Languages}\\cvitemwithcomment{English}{Native}{}\\cvitemwithcomment{Spanish}{Intermediate}{}\\end{document}",
    "additionalPreferences": "Prefer remote or hybrid work options. Looking for companies with strong engineering culture and opportunities for technical leadership. Interested in distributed systems, cloud architecture, and high-scale systems. Open to relocation for the right opportunity."
  }'
```

**Response (Success):**
```json
{
  "id": 1,
  "name": "Senior Backend Engineer Profile",
  "role": "Senior Backend Engineer",
  "city": "San Francisco, CA",
  "salaryExpectation": "150k-200k USD",
  "companiesPreference": "Google, Amazon, Netflix, Microsoft, Meta, Apple",
  "experience": "6 years",
  "noticePeriod": "2 months",
  "skills": "Java, Spring Boot, Spring Cloud, Hibernate, Microservices, REST APIs, MySQL, PostgreSQL, MongoDB, Redis, AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes, Git, Jenkins, Maven, Gradle, JIRA, Event-Driven Architecture, CQRS, Python, Go, JavaScript, Node.js",
  "resumeLatex": "\\documentclass[11pt,a4paper,sans]{moderncv}...",
  "additionalPreferences": "Prefer remote or hybrid work options. Looking for companies with strong engineering culture and opportunities for technical leadership...",
  "isActive": true,
  "isDraft": false,
  "latexResumePdfUrl": "https://res.cloudinary.com/your-cloud/resume_1.pdf",
  "createdAt": "2025-10-15T10:30:00",
  "updatedAt": "2025-10-15T10:30:00",
  "unreadNotificationsCount": 0
}
```
**Status Code:** `200 OK`

**Error Responses:**

**Unauthorized (No Token):**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```
**Status Code:** `401 Unauthorized`

**Active Notifier Limit Reached:**
```json
{
  "success": false,
  "message": "Maximum active notifier limit reached. You can only have up to 2 active notifiers. Deactivate an existing notifier first."
}
```
**Status Code:** `400 Bad Request`

**Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "name": "Name is required"
  }
}
```
**Status Code:** `400 Bad Request`

### 4. Get All Notifiers

```bash
curl -X GET http://localhost:8080/api/notifiers \
  -H "Authorization: Bearer $TOKEN"
```

**Response (Success):**
```json
[
  {
    "id": 1,
    "name": "Senior Java Developer",
    "unreadNotificationsCount": 3,
    ...
  },
  {
    "id": 2,
    "name": "Frontend Developer",
    "unreadNotificationsCount": 0,
    ...
  }
]
```
**Status Code:** `200 OK`

**Error Responses:**

**Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```
**Status Code:** `401 Unauthorized`

### 5. Get Single Notifier

```bash
curl -X GET http://localhost:8080/api/notifiers/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Response (Success):**
```json
{
  "id": 1,
  "name": "Senior Java Developer",
  "unreadNotificationsCount": 3,
  ...
}
```
**Status Code:** `200 OK`

**Error Responses:**

**Notifier Not Found:**
```json
{
  "success": false,
  "message": "Notifier not found"
}
```
**Status Code:** `400 Bad Request`

**Unauthorized Access:**
```json
{
  "success": false,
  "message": "Unauthorized access to notifier"
}
```
**Status Code:** `400 Bad Request`

### 6. Update Notifier

```bash
curl -X PUT http://localhost:8080/api/notifiers/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Senior Backend Engineer Profile (Updated)",
    "role": "Principal Backend Engineer / Tech Lead",
    "city": "San Francisco, Seattle, CA",
    "salaryExpectation": "160k-220k USD",
    "companiesPreference": "Google, Amazon, Netflix, Meta, Apple, Microsoft",
    "experience": "6-8 years",
    "noticePeriod": "1 month",
    "skills": "Java, Spring Boot, Spring Cloud, Hibernate, Microservices, REST APIs, MySQL, PostgreSQL, MongoDB, Redis, AWS (EC2, S3, Lambda, RDS, ECS), Docker, Kubernetes, Terraform, Git, Jenkins, Maven, Gradle, JIRA, Kafka, RabbitMQ, Event-Driven Architecture, CQRS, Python, Go, JavaScript, Node.js, GraphQL",
    "resumeLatex": "\\documentclass[11pt,a4paper,sans]{moderncv}\\moderncvstyle{banking}\\moderncvcolor{blue}\\usepackage[utf8]{inputenc}\\usepackage[scale=0.85]{geometry}\\name{John}{Doe}\\title{Senior Backend Engineer}\\address{San Francisco}{CA}{USA}\\phone[mobile]{+1~(555)~123~4567}\\email{john.doe@example.com}\\social[linkedin]{johndoe}\\social[github]{johndoe}\\begin{document}\\makecvtitle\\section{Professional Summary}Experienced Backend Engineer with 6+ years of expertise in designing and implementing scalable microservices architectures. Proven track record of leading technical projects and mentoring junior developers.\\section{Technical Skills}\\cvitem{Languages}{Java, Python, Go, JavaScript}\\cvitem{Frameworks}{Spring Boot, Spring Cloud, Hibernate, Node.js}\\cvitem{Databases}{MySQL, PostgreSQL, MongoDB, Redis}\\cvitem{Cloud}{AWS (EC2, S3, Lambda, RDS), Docker, Kubernetes}\\cvitem{Tools}{Git, Jenkins, Maven, Gradle, JIRA}\\cvitem{Architecture}{Microservices, REST APIs, Event-Driven, CQRS}\\section{Work Experience}\\cventry{2021--Present}{Senior Backend Engineer}{Tech Giant Inc.}{San Francisco, CA}{}{\\begin{itemize}\\item Led development of high-traffic microservices serving 10M+ daily users\\item Architected event-driven system reducing processing time by 60\\%\\item Mentored team of 5 junior engineers, improving code quality by 40\\%\\item Implemented CI/CD pipelines reducing deployment time from 2 hours to 15 minutes\\item Technologies: Java, Spring Boot, Kubernetes, AWS, PostgreSQL\\end{itemize}}\\cventry{2019--2021}{Backend Engineer}{Innovative Startup}{Palo Alto, CA}{}{\\begin{itemize}\\item Built RESTful APIs processing 1M+ requests daily\\item Optimized database queries improving response time by 70\\%\\item Implemented caching strategies reducing server load by 50\\%\\item Technologies: Java, Spring Framework, MySQL, Redis, Docker\\end{itemize}}\\cventry{2018--2019}{Software Developer}{Software Solutions Corp}{San Jose, CA}{}{\\begin{itemize}\\item Developed and maintained enterprise web applications\\item Collaborated with cross-functional teams on feature development\\item Participated in code reviews and agile ceremonies\\item Technologies: Java, Spring MVC, Hibernate, Oracle Database\\end{itemize}}\\section{Education}\\cventry{2014--2018}{Bachelor of Science in Computer Science}{Stanford University}{Stanford, CA}{\\textit{GPA: 3.8/4.0}}{Relevant Coursework: Data Structures, Algorithms, Distributed Systems, Database Management}\\section{Certifications}\\cvlistitem{AWS Certified Solutions Architect - Associate}\\cvlistitem{Oracle Certified Professional, Java SE 11 Developer}\\cvlistitem{Certified Kubernetes Administrator (CKA)}\\section{Projects}\\cvitem{E-Commerce Platform}{Built scalable microservices platform handling 50k transactions/day using Spring Boot, Kafka, and MongoDB}\\cvitem{Real-time Analytics}{Developed real-time data processing pipeline using Apache Kafka and Spark, processing 100GB+ daily}\\cvitem{API Gateway}{Designed and implemented API gateway with rate limiting, authentication, and monitoring for 20+ microservices}\\section{Achievements}\\cvlistitem{Led migration from monolith to microservices, improving system reliability from 98\\% to 99.9\\%}\\cvlistitem{Reduced infrastructure costs by 30\\% through optimization and cloud resource management}\\cvlistitem{Published 3 technical blog posts on system design, garnering 50k+ views}\\section{Languages}\\cvitemwithcomment{English}{Native}{}\\cvitemwithcomment{Spanish}{Intermediate}{}\\end{document}",
    "additionalPreferences": "Remote work mandatory. Looking for technical leadership opportunities and challenging distributed systems projects."
  }'
```

**Response (Success):**
```json
{
  "id": 1,
  "name": "Senior Backend Engineer Profile (Updated)",
  ...
}
```
**Status Code:** `200 OK`

**Error Responses:**

**Notifier Not Found:**
```json
{
  "success": false,
  "message": "Notifier not found"
}
```
**Status Code:** `400 Bad Request`

**Unauthorized Access:**
```json
{
  "success": false,
  "message": "Unauthorized access to notifier"
}
```
**Status Code:** `400 Bad Request`

### 7. Update Notifier Resume

Update only the resume LaTeX of a notifier. This is useful when you want to update just the resume without sending all other notifier fields.

**⚠️ Important:**
- **Rate Limited:** 1 update per hour (60 minutes cooldown, configurable)
- **Automatic Processing:** Deletes old PDF from Cloudinary, compiles new LaTeX, uploads new PDF
- **PDF URL Returned:** The new PDF URL is included in the response

```bash
curl -X PATCH http://localhost:8080/api/notifiers/1/resume \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "resumeLatex": "\\documentclass[11pt,a4paper,sans]{moderncv}\\moderncvstyle{banking}\\moderncvcolor{blue}\\usepackage[utf8]{inputenc}\\usepackage[scale=0.85]{geometry}\\name{Jane}{Smith}\\title{Lead Backend Engineer}\\address{Seattle}{WA}{USA}\\phone[mobile]{+1~(555)~987~6543}\\email{jane.smith@example.com}\\social[linkedin]{janesmith}\\social[github]{janesmith}\\begin{document}\\makecvtitle\\section{Professional Summary}Accomplished Lead Backend Engineer with 8+ years of expertise in architecting high-performance distributed systems. Expert in cloud-native technologies and leading engineering teams.\\section{Technical Skills}\\cvitem{Languages}{Java, Kotlin, Python, Go}\\cvitem{Frameworks}{Spring Boot, Spring Cloud, Micronaut, Quarkus}\\cvitem{Databases}{PostgreSQL, MySQL, MongoDB, Cassandra, Redis}\\cvitem{Cloud}{AWS, GCP, Azure, Docker, Kubernetes, Terraform}\\cvitem{Messaging}{Kafka, RabbitMQ, AWS SQS/SNS}\\cvitem{Architecture}{Microservices, Event-Driven, Domain-Driven Design, CQRS}\\section{Work Experience}\\cventry{2022--Present}{Lead Backend Engineer}{Cloud Solutions Inc.}{Seattle, WA}{}{\\begin{itemize}\\item Leading team of 10 engineers building cloud-native microservices platform\\item Architected multi-region deployment serving 50M+ users with 99.99\\% uptime\\item Reduced infrastructure costs by 40\\% through optimization and auto-scaling\\item Implemented observability stack (Prometheus, Grafana, ELK) improving incident response time by 80\\%\\item Technologies: Java, Spring Boot, Kubernetes, AWS, PostgreSQL, Kafka\\end{itemize}}\\cventry{2019--2022}{Senior Backend Engineer}{Tech Unicorn}{San Francisco, CA}{}{\\begin{itemize}\\item Designed and implemented event-driven architecture processing 100M+ events daily\\item Built real-time analytics pipeline reducing data latency from hours to seconds\\item Mentored 7 engineers, conducted technical interviews, and code reviews\\item Led migration from monolith to microservices, improving deployment frequency by 10x\\item Technologies: Java, Spring Cloud, Kafka, MongoDB, Redis, Docker\\end{itemize}}\\cventry{2017--2019}{Backend Engineer}{Fintech Startup}{New York, NY}{}{\\begin{itemize}\\item Developed payment processing system handling \\$100M+ transactions annually\\item Implemented fraud detection algorithms reducing fraud by 60\\%\\item Built RESTful APIs and integrated with third-party payment gateways\\item Technologies: Java, Spring Boot, MySQL, Redis, AWS\\end{itemize}}\\section{Education}\\cventry{2013--2017}{Bachelor of Science in Computer Science}{MIT}{Cambridge, MA}{\\textit{GPA: 3.9/4.0, Summa Cum Laude}}{Dean's List all semesters}\\section{Certifications}\\cvlistitem{AWS Certified Solutions Architect - Professional}\\cvlistitem{Certified Kubernetes Application Developer (CKAD)}\\cvlistitem{Google Cloud Professional Cloud Architect}\\cvlistitem{Oracle Certified Master, Java SE 17 Developer}\\section{Notable Projects}\\cvitem{Global Payment Platform}{Architected multi-region payment platform processing 10M transactions/day with sub-100ms latency}\\cvitem{Real-time Fraud Detection}{Built ML-powered fraud detection system using Kafka Streams and Python, saving \\$5M+ annually}\\cvitem{API Management Platform}{Designed API gateway and developer portal serving 1000+ external partners}\\section{Leadership \\& Achievements}\\cvlistitem{Tech Lead for platform engineering team (10 engineers)}\\cvlistitem{Speaker at KubeCon 2024, AWS re:Invent 2023}\\cvlistitem{Published 15+ technical articles with 200k+ cumulative views}\\cvlistitem{Open source contributor to Spring Framework and Kubernetes}\\cvlistitem{Reduced system latency by 70\\% through distributed tracing and optimization}\\section{Languages}\\cvitemwithcomment{English}{Native}{}\\cvitemwithcomment{Mandarin}{Fluent}{}\\cvitemwithcomment{French}{Intermediate}{}\\end{document}"
  }'
```

**Response (Success):**
```json
{
  "id": 1,
  "name": "Senior Backend Engineer Profile",
  "role": "Senior Backend Engineer",
  "city": "San Francisco, CA",
  "salaryExpectation": "150k-200k USD",
  "companiesPreference": "Google, Amazon, Netflix, Microsoft, Meta, Apple",
  "experience": "6 years",
  "noticePeriod": "2 months",
  "skills": "Java, Spring Boot, ...",
  "resumeLatex": "\\documentclass[11pt,a4paper,sans]{moderncv}...",
  "latexResumePdfUrl": "https://res.cloudinary.com/your-cloud/resumes/resume_1_1698765999.pdf",
  "additionalPreferences": "Prefer remote or hybrid work options...",
  "isDraft": false,
  "isActive": true,
  "createdAt": "2025-10-14T08:30:00",
  "updatedAt": "2025-10-30T17:15:00",
  "unreadNotificationsCount": 3
}
```
**Status Code:** `200 OK`

**Error Responses:**

**Rate Limit Exceeded:**
```json
{
  "success": false,
  "message": "Rate limit exceeded. You can update resume again in 45 minutes."
}
```
**Status Code:** `400 Bad Request`

**Invalid LaTeX Code:**
```json
{
  "success": false,
  "message": "Invalid LaTeX Code: LaTeX compilation failed due to syntax error"
}
```
**Status Code:** `400 Bad Request`

**Notifier Not Found:**
```json
{
  "success": false,
  "message": "Notifier not found"
}
```
**Status Code:** `400 Bad Request`

**Unauthorized Access:**
```json
{
  "success": false,
  "message": "Unauthorized access to notifier"
}
```
**Status Code:** `400 Bad Request`

**Rate Limit Configuration:**
```properties
# In application.properties
rate-limit.resume-update.cooldown-minutes=60  # Default: 60 minutes
```

**Behavior:**
1. **Rate limit check** → Ensures user hasn't updated resume within cooldown period
2. **Delete old PDF** → Removes previous PDF from Cloudinary if exists
3. **Compile LaTeX** → Generates new PDF from LaTeX code
4. **Upload to Cloudinary** → Uploads new PDF
5. **Update database** → Saves new LaTeX and PDF URL

**Error (Rate Limit):**
```json
{
  "timestamp": "2025-10-30T18:00:00.000+00:00",
  "status": 500,
  "error": "Internal Server Error",
  "message": "Rate limit exceeded. You can update resume again in 45 minutes.",
  "path": "/api/notifiers/1/resume"
}
```

**Benefits:**
- ✅ Update only resume without resending all fields
- ✅ Automatic PDF generation and Cloudinary management
- ✅ Old PDF automatically deleted (saves storage)
- ✅ Cleaner API for resume-specific updates
- ✅ Rate limiting prevents abuse
- ✅ Maintains all other notifier settings unchanged

### 8. Toggle Notifier Active Status

Toggle a notifier between active and inactive states. Only active notifiers are processed by the job scheduler.

```bash
curl -X PATCH http://localhost:8080/api/notifiers/1/toggle-active \
  -H "Authorization: Bearer $TOKEN"
```

**Response (Successfully toggled to inactive):**
```json
{
  "id": 1,
  "name": "Senior Backend Engineer Profile (Updated)",
  "role": "Principal Backend Engineer / Tech Lead",
  "city": "San Francisco, Seattle, CA",
  "salaryExpectation": "160k-220k USD",
  "companiesPreference": "Google, Amazon, Netflix, Meta, Apple, Microsoft",
  "experience": "6-8 years",
  "noticePeriod": "1 month",
  "skills": "Java, Spring Boot, Spring Cloud, Hibernate...",
  "resumeLatex": "\\documentclass[11pt,a4paper,sans]{moderncv}...",
  "additionalPreferences": "Remote work mandatory...",
  "isActive": false,
  "createdAt": "2025-10-15T10:30:00",
  "updatedAt": "2025-10-30T16:45:00",
  "unreadNotificationsCount": 5
}
```

**Behavior:**
- Toggles the current status (active → inactive, inactive → active)
- **Cannot toggle draft notifiers** - must complete draft first (set `isDraft: false`)
- When toggling **from inactive to active**:
  - Checks if active limit is reached
  - If at limit, returns error (see below)
  - If space available, activates successfully
- When toggling **from active to inactive**:
  - Always succeeds (no validation needed)

**Error (when trying to toggle draft notifier):**
```json
{
  "timestamp": "2025-10-30T16:45:00.000+00:00",
  "status": 500,
  "error": "Internal Server Error",
  "message": "Cannot activate a draft notifier. Please complete the draft first by setting isDraft to false.",
  "path": "/api/notifiers/3/toggle-active"
}
```

**Error (when trying to activate at limit):**
```json
{
  "timestamp": "2025-10-30T16:45:00.000+00:00",
  "status": 500,
  "error": "Internal Server Error",
  "message": "Maximum active notifier limit reached. You can only have up to 2 active notifiers. Deactivate an existing notifier first.",
  "path": "/api/notifiers/3/toggle-active"
}
```

### 9. Get Notifier Limit Information

Check how many active notifiers the user has and how many more they can activate. Users can create unlimited notifiers, but only a configured number can be active at a time.

```bash
curl -X GET http://localhost:8080/api/notifiers/limit-info \
  -H "Authorization: Bearer $TOKEN"
```

**Response (Success):**
```json
{
  "totalNotifiers": 5,
  "activeNotifiers": 2,
  "maxActiveNotifiers": 2,
  "remainingActiveSlots": 0,
  "canActivateMore": false
}
```
**Status Code:** `200 OK`

**Error Responses:**

**Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```
**Status Code:** `401 Unauthorized`

**Response Fields:**
- `totalNotifiers`: Total number of notifiers created by the user (no limit)
- `activeNotifiers`: Number of currently active notifiers
- `maxActiveNotifiers`: Maximum number of active notifiers allowed (configurable via `notifier.max-per-user`)
- `remainingActiveSlots`: Number of notifiers that can still be activated
- `canActivateMore`: Boolean indicating if the user can activate more notifiers

**Important Notes:**
- Users can create **unlimited** notifiers
- Only **active** notifiers are processed by the job scheduler
- The limit (`notifier.max-per-user`) applies only to **active** notifiers

**Draft Mode:**
- `isDraft` field: Use this to save incomplete notifiers as drafts
- **Draft notifiers are ALWAYS inactive** (cannot be activated until completed)
- To activate a draft: Set `"isDraft": false` via update, then use toggle endpoint

**Active Status Behavior:**
- `isActive` field behavior:
  - **If `"isDraft": true`** → Always **inactive** (draft mode)
  - **If `"isActive": false`** → Created as **inactive** (limit not checked)
  - **If omitted or `"isActive": true`** → Backend checks available slots:
    - Active slots available → created as **active** ✅
    - At active limit → created as **inactive** automatically
- To change active status later, use the **Toggle Active** endpoint (Section 7)

**Active Status Behavior Examples:**

**1. Creating notifiers without specifying isActive (limit is 2):**

1st notifier (1/2 slots used):
```json
{
  "name": "My Notifier",
  "role": "Backend Engineer",
  ...
  // No isActive field
}
```
→ Created as **active** ✅

3rd notifier (already at 2/2 limit):
```json
{
  "name": "Another Notifier",
  "role": "Frontend Engineer",
  ...
  // No isActive field
}
```
→ Created as **inactive** automatically (limit reached)

**2. Explicitly creating inactive notifier:**
```json
{
  "name": "Future Notifier",
  "role": "DevOps Engineer",
  ...
  "isActive": false  // Explicitly set to false
}
```
→ Created as **inactive** (regardless of available slots)

### 10. Get Notifier by ID

Get details of a specific notifier.

```bash
curl -X GET http://localhost:8080/api/notifiers/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Response (Success):**
```json
{
  "id": 1,
  "name": "Senior Backend Engineer Profile",
  ...
}
```
**Status Code:** `200 OK`

**Error Responses:**

**Notifier Not Found:**
```json
{
  "success": false,
  "message": "Notifier not found"
}
```
**Status Code:** `400 Bad Request`

**Unauthorized Access:**
```json
{
  "success": false,
  "message": "Unauthorized access to notifier"
}
```
**Status Code:** `400 Bad Request`

### 11. Delete Notifier

Delete a specific notifier. This will also delete all associated notifications.

```bash
curl -X DELETE http://localhost:8080/api/notifiers/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Notifier deleted successfully"
}
```
**Status Code:** `200 OK`

**Error Responses:**

**Notifier Not Found:**
```json
{
  "success": false,
  "message": "Notifier not found"
}
```
**Status Code:** `400 Bad Request`

**Unauthorized Access:**
```json
{
  "success": false,
  "message": "Unauthorized access to notifier"
}
```
**Status Code:** `400 Bad Request`

## Notification Management

### 12. Get Notifications for Notifier

```bash
curl -X GET http://localhost:8080/api/notifications/notifier/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Response (Success):**
```json
[
  {
    "id": 1,
    "notifierId": 1,
    "timestamp": "2025-10-15T09:00:00",
    "schedulerRun": 1,
    "resumeLink": "https://res.cloudinary.com/your-cloud/resume_1_5_abc123.pdf",
    "jobLink": "https://careers.google.com/jobs/123456",
    "companyName": "Google",
    "role": "Senior Java Developer",
    "experience": "5-8 years",
    "location": "Mountain View, CA",
    "salary": "$150k-$200k",
    "batch": null,
    "jobType": "Full-Time",
    "deadline": "2025-11-30",
    "duration": null,
    "jobDescription": "We are looking for a Senior Java Developer with strong experience in Spring Boot and microservices. You will work on building scalable distributed systems, lead technical design decisions, and mentor junior developers. Requirements include expertise in Java, Spring ecosystem, AWS, Docker, and Kubernetes.",
    "relevanceScore": 0.92,
    "relevanceReason": "Excellent match. Company preference matched (Google), salary range aligns ($150k-$200k vs $130k-$200k), experience requirement matches (5-8 years), location in preferred city.",
    "originalJobPosting": "{\"company\":\"Google\",\"experience\":\"5-8 years\"...}",
    "createdAt": "2025-10-15T09:15:00",
    "viewed": false
  },
  {
    "id": 2,
    "notifierId": 1,
    "timestamp": "2025-10-15T09:30:00",
    "schedulerRun": 1,
    "resumeLink": "https://res.cloudinary.com/your-cloud/resume_1_8_def456.pdf",
    "jobLink": "https://amazon.jobs/en/jobs/567890",
    "companyName": "Amazon",
    "role": "Backend Software Engineer",
    "experience": "6+ years",
    "location": "Seattle, WA",
    "salary": "$140k-$180k",
    "batch": null,
    "jobType": "Full-Time",
    "deadline": null,
    "duration": null,
    "jobDescription": "Amazon Web Services is hiring Backend Software Engineers to build and scale cloud services. Work on distributed systems handling millions of requests per day. Strong knowledge of Java, microservices, and AWS required. You'll design APIs, optimize performance, and collaborate with cross-functional teams.",
    "relevanceScore": 0.85,
    "relevanceReason": "Strong match. Company preference matched (Amazon), experience aligns, location matches preference.",
    "originalJobPosting": "{\"company\":\"Amazon\"...}",
    "createdAt": "2025-10-15T09:45:00",
    "viewed": false
  }
]
```
**Status Code:** `200 OK`

**Error Responses:**

**Notifier Not Found:**
```json
{
  "success": false,
  "message": "Notifier not found"
}
```
**Status Code:** `400 Bad Request`

**Unauthorized Access:**
```json
{
  "success": false,
  "message": "Unauthorized access to notifications"
}
```
**Status Code:** `400 Bad Request`

### 13. Mark Notification as Viewed

```bash
curl -X PUT http://localhost:8080/api/notifications/1/viewed \
  -H "Authorization: Bearer $TOKEN"
```

**Response (Success):**
```json
{
  "id": 1,
  "notifierId": 1,
  "timestamp": "2025-10-15T09:00:00",
  "schedulerRun": 1,
  "resumeLink": "https://res.cloudinary.com/your-cloud/resume_1_5_abc123.pdf",
  "jobLink": "https://careers.google.com/jobs/123456",
  "companyName": "Google",
  "role": "Senior Java Developer",
  "experience": "5-8 years",
  "location": "Mountain View, CA",
  "salary": "$150k-$200k",
  "batch": null,
  "jobType": "Full-Time",
  "deadline": "2025-11-30",
  "duration": null,
  "jobDescription": "We are looking for a Senior Java Developer with strong experience in Spring Boot and microservices. You will work on building scalable distributed systems, lead technical design decisions, and mentor junior developers. Requirements include expertise in Java, Spring ecosystem, AWS, Docker, and Kubernetes.",
  "relevanceScore": 0.92,
  "relevanceReason": "Excellent match. Company preference matched (Google), salary range aligns ($150k-$200k vs $130k-$200k), experience requirement matches (5-8 years), location in preferred city.",
  "originalJobPosting": "{\"company\":\"Google\",\"experience\":\"5-8 years\"...}",
  "createdAt": "2025-10-15T09:15:00",
  "viewed": true
}
```
**Status Code:** `200 OK`

**Error Responses:**

**Notification Not Found:**
```json
{
  "success": false,
  "message": "Notification not found"
}
```
**Status Code:** `400 Bad Request`

**Unauthorized Access:**
```json
{
  "success": false,
  "message": "Unauthorized access to notification"
}
```
**Status Code:** `400 Bad Request`

### 14. Delete Notification

Delete a specific notification.

```bash
curl -X DELETE http://localhost:8080/api/notifications/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
- **Status Code:** `204 No Content` (success, no body returned)

**Error Responses:**
- `404 Not Found` - Notification not found
- `403 Forbidden` - Unauthorized access to notification (belongs to different user)

**Important Notes:**
- Only the user who owns the notifier can delete its notifications
- The notification is permanently deleted from the database
- This action cannot be undone

---

## User Info Management

### 15. Add User Info Record

Add a new user info record to the user's profile. Users can have multiple degree/education records.

```bash
curl -X POST http://localhost:8080/api/user-info \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "degreeName": "Bachelor of Science in Computer Science",
    "collegeType": "Tier1",
    "batchPassout": 2018,
    "major": "Computer Science"
  }'
```

**Response (Success):**
```json
{
  "id": 1,
  "userId": 1,
  "degreeName": "Bachelor of Science in Computer Science",
  "collegeType": "Tier1",
  "batchPassout": 2018,
  "major": "Computer Science",
  "createdAt": "2025-11-02T10:30:00",
  "updatedAt": "2025-11-02T10:30:00"
}
```
**Status Code:** `200 OK`

**Error Responses:**

**Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "degreeName": "Degree name is required",
    "collegeType": "College type is required",
    "batchPassout": "Batch passout year must be after 1950",
    "major": "Major is required"
  }
}
```
**Status Code:** `400 Bad Request`

**Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```
**Status Code:** `401 Unauthorized`

### 16. Get All User Info Records

Get all user info records for the authenticated user, sorted by batch passout year (most recent first).

```bash
curl -X GET http://localhost:8080/api/user-info \
  -H "Authorization: Bearer $TOKEN"
```

**Response (Success):**
```json
[
  {
    "id": 2,
    "userId": 1,
    "degreeName": "Master of Science in Software Engineering",
    "collegeType": "Tier1",
    "batchPassout": 2020,
    "major": "Software Engineering",
    "createdAt": "2025-11-02T10:35:00",
    "updatedAt": "2025-11-02T10:35:00"
  },
  {
    "id": 1,
    "userId": 1,
    "degreeName": "Bachelor of Science in Computer Science",
    "collegeType": "Tier1",
    "batchPassout": 2018,
    "major": "Computer Science",
    "createdAt": "2025-11-02T10:30:00",
    "updatedAt": "2025-11-02T10:30:00"
  }
]
```
**Status Code:** `200 OK`

**Error Responses:**

**Unauthorized:**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```
**Status Code:** `401 Unauthorized`

### 17. Get User Info Record by ID

Get a specific user info record by its ID.

```bash
curl -X GET http://localhost:8080/api/user-info/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Response (Success):**
```json
{
  "id": 1,
  "userId": 1,
  "degreeName": "Bachelor of Science in Computer Science",
  "collegeType": "Tier1",
  "batchPassout": 2018,
  "major": "Computer Science",
  "createdAt": "2025-11-02T10:30:00",
  "updatedAt": "2025-11-02T10:30:00"
}
```
**Status Code:** `200 OK`

**Error Responses:**

**User Info Not Found:**
```json
{
  "success": false,
  "message": "User info record not found"
}
```
**Status Code:** `400 Bad Request`

### 18. Update User Info Record

Update an existing user info record.

```bash
curl -X PUT http://localhost:8080/api/user-info/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "degreeName": "Bachelor of Technology in Computer Science",
    "collegeType": "Tier2",
    "batchPassout": 2018,
    "major": "Computer Science and Engineering"
  }'
```

**Response (Success):**
```json
{
  "id": 1,
  "userId": 1,
  "degreeName": "Bachelor of Technology in Computer Science",
  "collegeType": "Tier2",
  "batchPassout": 2018,
  "major": "Computer Science and Engineering",
  "createdAt": "2025-11-02T10:30:00",
  "updatedAt": "2025-11-02T11:15:00"
}
```
**Status Code:** `200 OK`

**Error Responses:**

**Education Not Found:**
```json
{
  "success": false,
  "message": "Education record not found or unauthorized access"
}
```
**Status Code:** `400 Bad Request`

**Validation Error:**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": {
    "batchPassout": "Batch passout year must be before 2100"
  }
}
```
**Status Code:** `400 Bad Request`

### 19. Delete Education Record

Delete an education record.

```bash
curl -X DELETE http://localhost:8080/api/education/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Education record deleted successfully"
}
```
**Status Code:** `200 OK`

**Error Responses:**

**Education Not Found:**
```json
{
  "success": false,
  "message": "Education record not found or unauthorized access"
}
```
**Status Code:** `400 Bad Request`

**Important Notes:**
- Users can have multiple education records (e.g., Bachelor's, Master's, PhD)
- `collegeType` values: Tier1, Tier2, Tier3, etc.
- `batchPassout` must be between 1950 and 2100
- Records are automatically sorted by batch passout year (most recent first)
- Only the user who owns the education record can update or delete it

---

```bash
curl -X DELETE http://localhost:8080/api/notifiers/1 \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Notifier deleted successfully"
}
```

## Testing the External Module Integration

### Insert Test Jobs

```sql
-- Insert sample jobs for testing
INSERT INTO jobs (timestamp, job, processed, created_at) VALUES
('2025-10-15 09:00:00', '{
  "company": "Google",
  "experience": "5-8 years",
  "location": "Mountain View, CA",
  "salary": "$150k-$200k",
  "description": "We are looking for a Senior Java Developer to join our Cloud Platform team. You will work on building scalable microservices using Spring Boot and Kubernetes. Strong background in distributed systems required. Excellent benefits and work-life balance."
}', false, NOW()),

('2025-10-15 09:30:00', '{
  "company": "Amazon",
  "experience": "6+ years",
  "location": "Seattle, WA",
  "salary": "$140k-$180k",
  "description": "Amazon Web Services is hiring Senior Backend Engineers. Work on high-performance systems serving millions of customers. Expertise in Java, Spring Boot, and AWS services required. Remote options available."
}', false, NOW()),

('2025-10-15 10:00:00', '{
  "company": "Netflix",
  "experience": "7+ years",
  "location": "Los Gatos, CA",
  "salary": "$170k-$230k",
  "description": "Netflix is seeking experienced Java developers to build the next generation of streaming technology. Must have strong experience with microservices, reactive programming, and distributed systems."
}', false, NOW()),

('2025-10-15 10:30:00', '{
  "company": "Meta",
  "experience": "4-6 years",
  "location": "Menlo Park, CA",
  "salary": "$130k-$190k",
  "description": "Meta is hiring Backend Engineers for our Infrastructure team. Work on systems that support billions of users. Java, Spring, and large-scale systems experience required."
}', false, NOW()),

('2025-10-15 11:00:00', '{
  "company": "Startup XYZ",
  "experience": "2-3 years",
  "location": "Austin, TX",
  "salary": "$80k-$100k",
  "description": "Early-stage startup looking for junior backend developers. Learn and grow with us!"
}', false, NOW());
```

### Plain Text Format Example

```sql
INSERT INTO jobs (timestamp, job, processed, created_at) VALUES
('2025-10-15 12:00:00', 
'Company: Apple
Experience: 5-10 years
Location: Cupertino, CA
Salary: $160k-$220k

Apple Inc. is looking for a Senior Software Engineer to join our Services team.

Responsibilities:
- Design and implement scalable backend services
- Work with cross-functional teams
- Mentor junior engineers

Requirements:
- 5+ years experience with Java/Spring Boot
- Strong understanding of distributed systems
- Experience with cloud platforms (AWS/GCP)

Benefits:
- Competitive salary and equity
- Comprehensive health coverage
- Flexible work arrangements', 
false, NOW());
```

## Frontend Integration Examples

### React Example

```javascript
// services/api.js
const API_BASE_URL = 'http://localhost:8080/api';

export const authService = {
  signup: async (email, password, fullName) => {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, fullName })
    });
    if (!response.ok) throw new Error('Signup failed');
    return response.json();
  },

  login: async (email, password) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!response.ok) throw new Error('Login failed');
    return response.json();
  }
};

export const notifierService = {
  getAll: async (token) => {
    const response = await fetch(`${API_BASE_URL}/notifiers`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch notifiers');
    return response.json();
  },

  create: async (token, notifierData) => {
    const response = await fetch(`${API_BASE_URL}/notifiers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(notifierData)
    });
    if (!response.ok) throw new Error('Failed to create notifier');
    return response.json();
  },

  update: async (token, id, notifierData) => {
    const response = await fetch(`${API_BASE_URL}/notifiers/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(notifierData)
    });
    if (!response.ok) throw new Error('Failed to update notifier');
    return response.json();
  },

  delete: async (token, id) => {
    const response = await fetch(`${API_BASE_URL}/notifiers/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to delete notifier');
    return response.json();
  }
};

export const notificationService = {
  getForNotifier: async (token, notifierId) => {
    const response = await fetch(
      `${API_BASE_URL}/notifications/notifier/${notifierId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!response.ok) throw new Error('Failed to fetch notifications');
    return response.json();
  },

  markAsViewed: async (token, notificationId) => {
    const response = await fetch(
      `${API_BASE_URL}/notifications/${notificationId}/viewed`,
      {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    if (!response.ok) throw new Error('Failed to mark as viewed');
    return response.json();
  }
};
```

### React Component Example

```javascript
// components/NotifierList.jsx
import { useState, useEffect } from 'react';
import { notifierService } from '../services/api';

export default function NotifierList() {
  const [notifiers, setNotifiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem('token');

  useEffect(() => {
    loadNotifiers();
  }, []);

  const loadNotifiers = async () => {
    try {
      const data = await notifierService.getAll(token);
      setNotifiers(data);
    } catch (error) {
      console.error('Error loading notifiers:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="notifier-list">
      <h2>My Notifiers</h2>
      {notifiers.map(notifier => (
        <div key={notifier.id} className="notifier-card">
          <h3>{notifier.name}</h3>
          <p>City: {notifier.city}</p>
          <p>Experience: {notifier.experience}</p>
          <p>Salary: {notifier.salaryExpectation}</p>
          {notifier.unreadNotificationsCount > 0 && (
            <span className="badge">
              {notifier.unreadNotificationsCount} new
            </span>
          )}
          <button onClick={() => viewNotifier(notifier.id)}>
            View Notifications
          </button>
        </div>
      ))}
    </div>
  );
}
```

## Testing Checklist

- [ ] Sign up a new user
- [ ] Login with the user
- [ ] Create a notifier with preferences
- [ ] Insert test jobs into database
- [ ] Wait for scheduler to run (or trigger manually)
- [ ] Check notifications for the notifier
- [ ] Verify resume PDFs are generated and uploaded
- [ ] Test relevance scoring with different job/preference combinations
- [ ] Mark notifications as viewed
- [ ] Update notifier preferences
- [ ] Delete notifier
- [ ] Test authentication errors (wrong password, etc.)
- [ ] Test validation errors (missing fields, etc.)

## Common Issues and Solutions

### 1. Scheduler Not Running

**Problem:** Jobs are not being processed

**Solutions:**
- Check `scheduler.enabled=true` in application.properties
- Verify `@EnableScheduling` is present in main application class
- Check scheduler state in database: `SELECT * FROM scheduler_state`
- Check logs for scheduler execution

### 2. Resume Generation Failing

**Problem:** Resume links are null

**Solutions:**
- Verify LaTeX syntax is correct
- Check LaTeX compiler service is accessible
- Verify Cloudinary credentials are correct
- Check logs for PDF generation errors

### 3. Low Relevance Scores

**Problem:** No jobs matching even with good criteria

**Solutions:**
- Lower `ai.relevance.threshold` (e.g., from 0.7 to 0.5)
- Improve AI prompt template
- Check OpenAI API is working
- Review job posting format

### 4. Authentication Errors

**Problem:** JWT token not working

**Solutions:**
- Check JWT secret is configured
- Verify token is being sent in Authorization header
- Check token hasn't expired
- Ensure Bearer prefix is included

## Performance Tips

1. **Database Indexing:**
```sql
CREATE INDEX idx_jobs_processed_timestamp ON jobs(processed, timestamp);
CREATE INDEX idx_notifications_notifier_viewed ON notifications(notifier_id, viewed);
CREATE INDEX idx_notifiers_user ON notifiers(user_id);
```

2. **Batch Processing:**
   - Process jobs in batches to reduce memory usage
   - Limit concurrent AI API calls

3. **Caching:**
   - Cache notifier preferences during scheduler run
   - Cache AI responses for identical jobs

4. **Monitoring:**
   - Track scheduler execution time
   - Monitor AI API latency
   - Alert on PDF generation failures

