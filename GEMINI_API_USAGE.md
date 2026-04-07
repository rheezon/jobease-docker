# Gemini API Usage

## Configuration

| Variable | Description | Example |
|---|---|---|
| `GEMINI_API_KEY` | Your Google Gemini API key | `AIzaSy...` |
| `GEMINI_MODEL` | Model to use | `gemini-2.5-flash-lite` |
| `AI_RELEVANCE_THRESHOLD` | Minimum score (0-1) to consider a job relevant | `0.7` |

Get your API key from [Google AI Studio](https://aistudio.google.com/apikey).

## API Endpoint

```
POST https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={apiKey}
```

## Features Using Gemini

### 1. Job Relevance Scoring

Analyzes job postings against user preferences and returns structured data.

**Request Schema:**

```json
{
  "contents": [
    {
      "parts": [{ "text": "<prompt with job posting + user preferences>" }]
    }
  ],
  "generationConfig": {
    "temperature": 0.3,
    "maxOutputTokens": 4000
  }
}
```

**Expected Response Schema:**

```json
{
  "score": 0.85,
  "reason": "Strong match based on skills and role alignment",
  "company": "Company Name",
  "role": "Software Engineer",
  "experience": "2-4 years",
  "location": "Bangalore",
  "salary": "15-20 LPA",
  "batch": "2022",
  "jobType": "Full-Time | Internship | Part-Time | Contract",
  "deadline": "2026-12-31",
  "duration": "6 months",
  "description": "Comprehensive job description",
  "jobLink": "https://example.com/apply"
}
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `score` | number (0-1) | `0.0` | Relevance score based on user preferences |
| `reason` | string | `"No reason provided"` | Explanation of the score |
| `company` | string | `"Unknown"` | Company name |
| `role` | string | `"Not specified"` | Job title/position |
| `experience` | string | `"Not specified"` | Required experience |
| `location` | string | `"Not specified"` | Job location |
| `salary` | string | `"Not specified"` | Salary range |
| `batch` | string \| null | `null` | Graduation year requirement |
| `jobType` | string | `"Full-Time"` | One of: Full-Time, Internship, Part-Time, Contract |
| `deadline` | string \| null | `null` | Application deadline in `yyyy-MM-dd` format |
| `duration` | string \| null | `null` | Duration (for internships) |
| `description` | string | original posting | Full job description |
| `jobLink` | string \| null | `null` | Application URL |

### 2. Resume Modification

Makes minimal LaTeX resume edits to align with a job posting (adds 1-3 missing relevant skills).

**Request Schema:**

```json
{
  "contents": [
    {
      "parts": [{ "text": "<prompt with job posting + resume LaTeX>" }]
    }
  ],
  "generationConfig": {
    "temperature": 0.2,
    "maxOutputTokens": 8000
  }
}
```

**Response:** Raw LaTeX string (cleaned of any markdown code fences).

### 3. Interview Chat

Multi-turn conversation where Gemini acts as an interviewer for a specific company/role.

**Request Schema:**

```json
{
  "contents": [
    { "role": "user", "parts": [{ "text": "<system prompt with company, role, job description, resume>" }] },
    { "role": "model", "parts": [{ "text": "<acknowledgment>" }] },
    { "role": "user", "parts": [{ "text": "<candidate message>" }] },
    { "role": "model", "parts": [{ "text": "<interviewer response>" }] }
  ],
  "generationConfig": {
    "temperature": 0.7,
    "maxOutputTokens": 4000
  }
}
```

**Response:** Plain text interviewer message.

## User Preference Fields (Prompt Input)

| Field | Source | Description |
|---|---|---|
| `role` | Notifier config | Desired job role |
| `skills` | Notifier config | User's skill set |
| `city` | Notifier config | Preferred location |
| `salary` | Notifier config | Salary expectation |
| `companies` | Notifier config | Preferred companies |
| `experience` | Notifier config | Experience level |
| `noticePeriod` | Notifier config | Current notice period |
| `education` | Education records | Degree, institution, year |
