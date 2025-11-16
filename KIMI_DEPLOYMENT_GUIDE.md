# Kimi Integration Deployment Guide

## Edge Function: process-upload with Kimi OCR

This guide covers deploying the updated `process-upload` Edge Function with Kimi AI integration for OCR capabilities.

### What's New
- ✅ Uses Kimi 1.5 for PDF text extraction
- ✅ Uses Kimi 1.5 for Image OCR (JPG, PNG)
- ✅ Automatic file cleanup after extraction
- ✅ Better error handling and logging
- ✅ Support for multiple file formats

### Prerequisites
1. Kimi API key already added to Supabase secrets (`KIMI_API_KEY`)
2. Supabase CLI installed, or access to Supabase Dashboard
3. Project synced with Supabase

---

## Deployment Options

### Option 1: Using Supabase CLI (Recommended)

**Install Supabase CLI:**
```bash
# Using npm
npm install -g supabase

# Or using brew (macOS)
brew install supabase/tap/supabase

# Or using scoop (Windows)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

**Deploy the function:**
```bash
cd /workspaces/mindchunk-api

# Login to Supabase
supabase login

# Deploy the function
supabase functions deploy process-upload

# Verify deployment
supabase functions list
```

**View logs:**
```bash
supabase functions logs process-upload
```

---

### Option 2: Using Supabase Dashboard (No CLI Required)

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Navigate to **Functions** → **process-upload**
4. Copy the entire contents of `/workspaces/mindchunk-api/supabase/functions/process-upload/index.ts`
5. Paste it into the dashboard editor
6. Click **Deploy**

---

### Option 3: Using GitHub Actions (CI/CD)

If your repo is connected to GitHub:

1. Create `.github/workflows/deploy-functions.yml`:
```yaml
name: Deploy Functions
on:
  push:
    branches: [main]
    paths:
      - 'supabase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: supabase/setup-cli@v1
        with:
          version: latest
      - run: supabase functions deploy process-upload
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
```

2. Add secrets to GitHub:
   - `SUPABASE_ACCESS_TOKEN` (from Supabase Settings → Access Tokens)
   - `SUPABASE_PROJECT_ID` (from your project URL)

---

## Verification Checklist

After deploying, verify everything is working:

### 1. Check Deployment Status
```bash
# Using CLI
supabase functions list

# Or check dashboard: Functions → process-upload → Status should be "Active"
```

### 2. Verify Environment Variable
- Dashboard → Settings → Edge Functions → Environment Variables
- Confirm `KIMI_API_KEY` is listed

### 3. Test the Function

**Via cURL:**
```bash
curl -X POST https://your-project-id.functions.supabase.co/process-upload \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@/path/to/test-image.jpg"
```

**Via your app:**
1. Navigate to Dashboard
2. Go to Study Materials section
3. Upload a test PDF or image
4. Verify text is extracted correctly
5. Check Supabase Functions logs for any errors

### 4. Monitor Logs
```bash
# Real-time logs
supabase functions logs process-upload --follow

# Or view in dashboard: Functions → process-upload → Logs
```

---

## Expected Behavior

### Successful Upload
```json
{
  "success": true,
  "material": {
    "id": "uuid",
    "title": "Document Title",
    "file_name": "document.pdf",
    "word_count": 2543,
    "estimated_read_time": 13,
    "full_text": "Extracted text from document...",
    "processing_status": "completed"
  },
  "textPreview": "Extracted text from document..."
}
```

### Error Cases

**Missing API Key:**
```json
{
  "error": "Failed to extract text from file",
  "details": "KIMI_API_KEY environment variable is not set"
}
```

**Invalid File Type:**
```json
{
  "error": "Invalid file type. Use PDF, TXT, JPG, or PNG."
}
```

**Extraction Failed:**
```json
{
  "error": "Failed to extract text from file",
  "details": "Kimi file upload failed: 401"
}
```

---

## Troubleshooting

### Issue: "KIMI_API_KEY not found"
**Solution:** 
```bash
# Add secret via CLI
supabase secrets set KIMI_API_KEY=your_kimi_api_key

# Or use Dashboard: Settings → Edge Functions → Environment Variables
```

### Issue: "File upload failed: 401"
**Possible causes:**
- Invalid or expired Kimi API key
- API key not properly set in Supabase secrets
- **Solution:** Regenerate key on Moonshot AI platform and update secrets

### Issue: "Content extraction failed: 404"
**Possible causes:**
- Kimi file was already deleted
- File ID invalid
- **Solution:** Check Kimi API status and retry with a new file

### Issue: Function timeout
**Possible causes:**
- Large file size
- Slow Kimi API response
- **Solution:** Increase timeout or split large files

---

## Rollback

If you need to revert to the previous version:

```bash
# Restore from git
git checkout HEAD~1 supabase/functions/process-upload/index.ts

# Re-deploy
supabase functions deploy process-upload
```

---

## Next Steps

1. Deploy using Option 1, 2, or 3 above
2. Run verification checklist
3. Test with sample files in your app
4. Monitor logs for any issues
5. Enable in production once validated

---

## Support

For issues:
- Check Kimi API documentation: https://platform.moonshot.ai/docs
- View Supabase Edge Functions docs: https://supabase.com/docs/guides/functions
- Check function logs: `supabase functions logs process-upload`
