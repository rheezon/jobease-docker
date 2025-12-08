# API Keys & Credentials Setup Guide

This guide will help you obtain all the necessary API keys and credentials to run JobEase.

---

## 📋 Required Credentials Checklist

- [ ] Google Gemini API Key
- [ ] Cloudinary Account (Cloud Name, API Key, API Secret)
- [ ] Google OAuth Client ID
- [ ] Gmail App Password
- [ ] Telegram API (API ID, API Hash)
- [ ] MySQL Passwords (Root & User)
- [ ] JWT Secret Key

---

## 1️⃣ Google Gemini API Key

**Purpose**: AI-powered job matching and relevance scoring

### Steps:
1. Go to https://makersuite.google.com/app/apikey
2. Sign in with your Google account
3. Click **"Create API Key"**
4. Select or create a Google Cloud project
5. Copy the generated API key

### Add to .env:
```env
GEMINI_API_KEY=AIzaSyC...your_api_key_here
```

### Notes:
- Free tier includes 60 requests per minute
- Monitor usage at https://makersuite.google.com

---

## 2️⃣ Cloudinary Account

**Purpose**: Cloud storage for generated resume PDFs

### Steps:
1. Go to https://cloudinary.com/users/register/free
2. Sign up for a free account
3. After login, go to **Dashboard**
4. Find your credentials:
   - **Cloud Name**: At the top of dashboard
   - **API Key**: In Account Details
   - **API Secret**: Click "Reveal" next to API Key

### Add to .env:
```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=your_api_secret_here
```

### Notes:
- Free tier: 25GB storage, 25GB bandwidth
- Automatic backup and CDN
- Monitor usage in dashboard

---

## 3️⃣ Google OAuth Client ID

**Purpose**: Google Sign-In functionality

### Steps:
1. Go to https://console.cloud.google.com
2. Create a new project or select existing
3. Enable **Google+ API**:
   - Go to "APIs & Services" → "Library"
   - Search for "Google+ API"
   - Click "Enable"
4. Create OAuth Credentials:
   - Go to "APIs & Services" → "Credentials"
   - Click "Create Credentials" → "OAuth Client ID"
   - Choose "Web application"
   - Add Authorized JavaScript origins:
     - `http://localhost:5173`
     - `http://localhost:5173` (if using Vite dev server)
   - Add Authorized redirect URIs:
     - `http://localhost:5173/auth/callback`
   - Click "Create"
5. Copy the **Client ID**

### Add to .env:
```env
GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_ID=123456789-abcdefg.apps.googleusercontent.com
```

### Notes:
- Use the same Client ID in both variables
- For production, add your production URLs
- Keep Client Secret secure (not needed for frontend)

---

## 4️⃣ Gmail App Password

**Purpose**: Sending email notifications (password reset, job alerts)

### Prerequisites:
- Gmail account
- 2-Factor Authentication (2FA) enabled

### Steps:
1. Enable 2FA on your Google account:
   - Go to https://myaccount.google.com/security
   - Enable "2-Step Verification"
2. Generate App Password:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other" as device, name it "JobEase"
   - Click "Generate"
   - Copy the 16-character password (no spaces)

### Add to .env:
```env
SPRING_MAIL_USERNAME=your_email@gmail.com
SPRING_MAIL_PASSWORD=abcd efgh ijkl mnop
```

### Notes:
- Remove spaces when copying password
- Don't use your regular Gmail password
- For production, consider using a dedicated email service (SendGrid, SES)

---

## 5️⃣ Telegram API Credentials

**Purpose**: Fetching job postings from Telegram channels

### Steps:
1. Go to https://my.telegram.org/apps
2. Log in with your phone number
3. Fill in the application details:
   - **App title**: JobEase
   - **Short name**: jobease
   - **Platform**: Other
   - **Description**: Job notification system
4. Click "Create application"
5. Copy **API ID** and **API Hash**

### Add to .env:
```env
TELEGRAM_API_ID=12345678
TELEGRAM_API_HASH=abcdef1234567890abcdef1234567890
TELEGRAM_PHONE=+1234567890
TELEGRAM_CHANNELS=@channel1,@channel2,@channel3
```

### Notes:
- Phone number must include country code (e.g., +1 for US)
- You'll need to verify your phone on first run
- Add channel usernames or IDs to TELEGRAM_CHANNELS
- Channels must be public or you must be a member

### Finding Channel Usernames:
- Public channels: Use @username format
- Private channels: Get channel ID using Telegram bots
- Multiple channels: Separate with commas

---

## 6️⃣ MySQL Passwords

**Purpose**: Database security

### Generate Strong Passwords:

Using command line:
```bash
# Generate random password
openssl rand -base64 32
```

Or use a password manager to generate strong passwords.

### Add to .env:
```env
MYSQL_ROOT_PASSWORD=your_very_secure_root_password_here
MYSQL_PASSWORD=your_secure_user_password_here
```

### Notes:
- Use different passwords for root and regular user
- Use at least 16 characters
- Include uppercase, lowercase, numbers, and symbols
- Never use default passwords in production

---

## 7️⃣ JWT Secret Key

**Purpose**: Signing and verifying authentication tokens

### Generate Strong Secret:

Using command line:
```bash
# Generate 64-character random string
openssl rand -base64 64 | tr -d '\n'
```

Or use online generator: https://randomkeygen.com/

### Add to .env:
```env
JWT_SECRET=your_super_long_random_string_at_least_64_characters_for_security_purposes
```

### Notes:
- Must be at least 64 characters
- Use completely random string
- Keep it secret and secure
- Rotate regularly in production

---

## 🔒 Security Best Practices

1. **Never commit credentials to Git**
   - Always use `.env` file
   - Add `.env` to `.gitignore`

2. **Use environment-specific configs**
   - Development: `.env.dev`
   - Production: `.env.prod`

3. **Rotate credentials regularly**
   - Change passwords every 90 days
   - Regenerate API keys periodically

4. **Use secrets management in production**
   - Docker Secrets
   - HashiCorp Vault
   - AWS Secrets Manager
   - Azure Key Vault

5. **Monitor API usage**
   - Set up billing alerts
   - Monitor rate limits
   - Track unusual activity

6. **Backup credentials securely**
   - Use password manager
   - Encrypted storage
   - Multiple secure locations

---

## ✅ Verification Checklist

After obtaining all credentials:

- [ ] All API keys added to `.env`
- [ ] No syntax errors in `.env` file
- [ ] `.env` is in `.gitignore`
- [ ] Test each API key:
  ```bash
  # Test Gemini API
  curl https://generativelanguage.googleapis.com/v1/models?key=YOUR_KEY
  
  # Test Cloudinary
  curl -u YOUR_API_KEY:YOUR_API_SECRET https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/resources/image
  ```
- [ ] Passwords are strong (16+ characters)
- [ ] JWT secret is 64+ characters
- [ ] Telegram channels are accessible

---

## 🆘 Troubleshooting

### Gemini API errors?
- Check API key is correct
- Verify billing is enabled
- Check rate limits

### Cloudinary upload failures?
- Verify all three credentials (name, key, secret)
- Check storage quota
- Ensure API is enabled

### Google OAuth not working?
- Verify authorized origins include your URL
- Check Client ID matches in both backend and frontend
- Ensure Google+ API is enabled

### Email not sending?
- Verify 2FA is enabled
- Check app password is correct (no spaces)
- Try generating new app password

### Telegram connection issues?
- Verify API ID and Hash
- Check phone number format (+country code)
- Ensure you're a member of private channels

---

## 📚 Additional Resources

- [Google Cloud Console](https://console.cloud.google.com)
- [Cloudinary Documentation](https://cloudinary.com/documentation)
- [Telegram API Documentation](https://core.telegram.org/api)
- [Gmail SMTP Settings](https://support.google.com/mail/answer/7126229)
- [OpenSSL Documentation](https://www.openssl.org/docs/)

---

## 💡 Pro Tips

1. **Use a password manager** (LastPass, 1Password, Bitwarden)
2. **Set up billing alerts** on all cloud services
3. **Enable API key restrictions** when possible
4. **Use separate credentials** for dev and production
5. **Document credential locations** for your team
6. **Test credentials** before full deployment
7. **Keep backup copy** in secure location

---

**Ready to proceed?** Make sure all credentials are in your `.env` file, then run:

```bash
./jobease.sh start
```

---

**Need Help?** 
- Check the main documentation: [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)
- Review the quick start: [QUICK_START.md](QUICK_START.md)

