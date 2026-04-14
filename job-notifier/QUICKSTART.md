# Quick Start Guide

Get your Job Notifier backend up and running in 5 minutes!

## Prerequisites Checklist

- [ ] Java 17 or higher installed
- [ ] Maven 3.6+ installed
- [ ] MySQL 8.0+ installed and running
- [ ] OpenAI API key ([Get one here](https://platform.openai.com/api-keys))
- [ ] Cloudinary account ([Sign up free](https://cloudinary.com/users/register/free))

## Step-by-Step Setup

### 1. Database Setup (2 minutes)

```bash
# Login to MySQL
mysql -u root -p

# Create database
CREATE DATABASE job_notifier_db;
exit;
```

### 2. Configure Application (2 minutes)

Edit `src/main/resources/application.properties`:

```properties
# Update these values:
spring.datasource.username=YOUR_MYSQL_USERNAME
spring.datasource.password=YOUR_MYSQL_PASSWORD

# Add your API keys:
jwt.secret=YOUR_SECURE_RANDOM_STRING_AT_LEAST_64_CHARS
openai.api.key=sk-YOUR_OPENAI_API_KEY
cloudinary.cloud-name=YOUR_CLOUD_NAME
cloudinary.api-key=YOUR_CLOUDINARY_API_KEY
cloudinary.api-secret=YOUR_CLOUDINARY_API_SECRET
```

**Generate JWT Secret:**
```bash
# On macOS/Linux:
openssl rand -base64 64

# Or use any random string generator (min 64 characters)
```

### 3. Build and Run (1 minute)

```bash
# Build the project
./mvnw clean install

# Run the application
./mvnw spring-boot:run
```

**Expected Output:**
```
Started JobNotifierApplication in X.XXX seconds
```

Server is now running on `http://localhost:8080`!

## First API Test

### Test the Server

```bash
curl http://localhost:8080/api/auth/test
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Auth endpoints are working!"
}
```

### Create Your First User

```bash
curl -X POST http://localhost:8080/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test123",
    "fullName": "Test User"
  }'
```

**Save the token from the response!**

### Create a Notifier

```bash
# Replace YOUR_TOKEN with the token from previous step
export TOKEN="YOUR_TOKEN_HERE"

curl -X POST http://localhost:8080/api/notifiers \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "My First Notifier",
    "city": "San Francisco",
    "salaryExpectation": "$100k+",
    "experience": "5 years",
    "companiesPreference": "Google, Amazon",
    "noticePeriod": "2 weeks"
  }'
```

### Add Sample Jobs

```bash
# Login to MySQL
mysql -u root -p job_notifier_db

# Insert a test job
INSERT INTO jobs (timestamp, job, processed, created_at) VALUES
(NOW(), '{
  "company": "Google",
  "experience": "5 years",
  "location": "San Francisco",
  "salary": "$120k-$160k",
  "description": "Looking for a Software Engineer..."
}', false, NOW());

exit;
```

### Trigger Scheduler Manually

The scheduler runs automatically every hour. To test immediately:

1. **Wait for the next scheduled run**, OR
2. **Restart the application** to trigger processing:
   - Stop the app (Ctrl+C)
   - Run `./mvnw spring-boot:run` again

### Check Results

```bash
# Get notifications
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/notifications/notifier/1
```

## Troubleshooting

### Problem: "Connection refused" to MySQL

**Solution:**
```bash
# Check if MySQL is running
mysql --version
sudo service mysql start  # Linux
brew services start mysql  # macOS
```

### Problem: "Invalid JWT signature"

**Solution:**
- Make sure you're using the correct token
- Check that jwt.secret is set in application.properties
- Token might be expired (24 hours default)

### Problem: Scheduler not running

**Solution:**
1. Check logs for "Starting scheduler run"
2. Verify `scheduler.enabled=true` in application.properties
3. Check scheduler state:
```sql
SELECT * FROM scheduler_state;
```

### Problem: OpenAI API errors

**Solution:**
- Verify API key is correct
- Check you have API credits
- Try with gpt-3.5-turbo instead of gpt-4 (cheaper):
```properties
openai.model=gpt-3.5-turbo
```

## What's Next?

1. **Test the full flow:**
   - Create multiple notifiers
   - Add various job postings
   - Check relevance matching
   - Test resume generation

2. **Customize AI prompt:**
   - Edit `ai.prompt.template` in application.properties
   - Adjust `ai.relevance.threshold` (default: 0.7)

3. **Build a frontend:**
   - Use React, Vue, or Angular
   - See `API_EXAMPLES.md` for integration code
   - API is CORS-enabled for localhost:3000 and localhost:5173

4. **Configure scheduler:**
   - Change `scheduler.fixed-rate` (default: 1 hour)
   - Set `scheduler.max-runs` (default: 10)

## Development Tips

### Hot Reload
```bash
# Use Spring DevTools (already included)
# Changes will auto-reload on save
./mvnw spring-boot:run
```

### View Logs
```bash
# Application logs are printed to console
# To save logs to file:
./mvnw spring-boot:run > app.log 2>&1
```

### Reset Scheduler
```sql
-- Reset scheduler to run again
UPDATE scheduler_state 
SET current_run = 0, last_run_timestamp = NOW() 
WHERE scheduler_name = 'job-processor';
```

### Mark Jobs as Unprocessed
```sql
-- Re-process jobs for testing
UPDATE jobs SET processed = false WHERE id IN (1,2,3);
```

## Project Structure

```
src/main/java/com/jobnotifer/
├── config/              # Security and app configuration
├── controller/          # REST API endpoints
├── dto/                 # Request/Response objects
├── entity/              # Database models
├── repository/          # Database access layer
├── security/            # JWT and authentication
└── service/             # Business logic
    ├── AuthService
    ├── NotifierService
    ├── NotificationService
    ├── JobProcessingService    # Main scheduler
    ├── OpenAIService          # AI integration
    ├── LatexCompilerService   # PDF generation
    └── CloudinaryService      # File storage
```

## API Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/signup` | Create account | No |
| POST | `/api/auth/login` | Login | No |
| GET | `/api/notifiers` | List notifiers | Yes |
| POST | `/api/notifiers` | Create notifier | Yes |
| GET | `/api/notifiers/{id}` | Get notifier | Yes |
| PUT | `/api/notifiers/{id}` | Update notifier | Yes |
| DELETE | `/api/notifiers/{id}` | Delete notifier | Yes |
| GET | `/api/notifications/notifier/{id}` | Get notifications | Yes |
| PUT | `/api/notifications/{id}/viewed` | Mark as viewed | Yes |

## Support

- 📖 Full documentation: `README.md`
- 🧪 API examples: `API_EXAMPLES.md`
- 💾 Sample data: `sample_data.sql`

## Success! 🎉

You now have a fully functional Job Notifier backend! The system will:
- ✅ Process jobs automatically every hour
- ✅ Match jobs to your preferences using AI
- ✅ Generate custom resumes
- ✅ Store notifications for frontend access

Happy coding! 🚀

