# Database Seeding Guide

## Local Development

To seed your local database:

```bash
npm run build
npx tsx scripts/reset-and-seed.ts
```

This will:
- Clear all existing data
- Create 5 demo students with Supabase Auth users
- Create goals, sessions, practice attempts, etc.
- All demo accounts use password: `password123`

## Production (Vercel)

### Option 1: Via Admin API Endpoint

1. First, add an admin secret to Vercel:
```bash
vercel env add ADMIN_SEED_SECRET
# Enter a secure random string when prompted
# Select: Production
```

2. Deploy your changes:
```bash
git push
```

3. Call the seed endpoint:
```bash
curl -X POST https://your-app.vercel.app/api/admin/seed \
  -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"reset": true}'
```

Replace:
- `your-app.vercel.app` with your actual Vercel URL
- `YOUR_ADMIN_SECRET` with the secret you set in step 1

### Option 2: Via Local Script with Production Env

1. Pull production environment variables:
```bash
vercel env pull .env.production
```

2. Run seed script with production env:
```bash
NODE_ENV=production node -r dotenv/config scripts/reset-and-seed.ts dotenv_config_path=.env.production
```

## Demo Accounts

After seeding, you can log in with:

- **sarah@example.com** - High performer (completed SAT Math goal)
- **marcus@example.com** - New user needing nudge (<3 sessions)
- **emily@example.com** - Struggling student (needs tutor flag)
- **david@example.com** - Multi-goal user (3 active goals)
- **isabella@example.com** - Inactive user (60+ days old)

All accounts use password: `password123`

## Troubleshooting

### OpenAI API Key Issues

If you get OpenAI authentication errors during seeding, update your API key:

```bash
# For local
# Edit .env and update OPENAI_API_KEY

# For production
vercel env add OPENAI_API_KEY
# Paste your new key
# Select: Production
```

### Auth Users Already Exist

If you see "user already exists" errors, you need to reset first:
- Use the `{"reset": true}` option when calling the admin API
- Or manually delete users from Supabase Auth dashboard before re-seeding
