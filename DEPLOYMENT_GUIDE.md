# MindChunk MVP - Deployment & Testing Guide

## Quick Start

### Environment Setup

1. **Create `.env.local`** in project root:
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

2. **Set Supabase Edge Functions secrets** (via Supabase Dashboard):
   - `LOVABLE_API_KEY` - Your Lovable/Gemini API key
   - `SUPABASE_SERVICE_ROLE_KEY` - Service role key
   - `SUPABASE_URL` - Your Supabase URL

### Running Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

Dev server will be available at: `http://localhost:8080/`

## Testing Checklist

### 1. Authentication Flow
```
[ ] Visit app → redirects to /auth
[ ] Sign up with new email
[ ] Verify email confirmation message
[ ] Log in with credentials
[ ] Redirect to dashboard
[ ] Log out → redirects to home
```

### 2. File Upload
```
[ ] Click "Upload Material"
[ ] Drag & drop a PDF file
[ ] File appears in upload area
[ ] Click "Process & Create Chunks"
[ ] Progress bar shows 0-100%
[ ] Success message appears
[ ] Redirects to study page
```

### 3. Chunk Generation
```
[ ] "Processing..." spinner shows
[ ] Message: "Creating your learning chunks..."
[ ] Wait for processing (may take 30-60 seconds)
[ ] Success message with chunk count
[ ] Chunks appear on study page
```

### 4. Study Session
```
[ ] First chunk displays
[ ] Content shows formatted markdown
[ ] Difficulty badge visible
[ ] Key terms show at bottom
[ ] Progress bar indicates completion
[ ] Previous/Next buttons work
[ ] Can navigate to any chunk
```

### 5. Quiz Taking
```
[ ] Click "Take Quiz" button
[ ] 3 questions load
[ ] Can select an answer option
[ ] "Check Answer" button submits
[ ] Correct answer highlighted in green
[ ] Explanation shows below question
[ ] Can continue to next question
[ ] Final question shows "Complete" button
[ ] After quiz → chunk marked completed ✓
[ ] Toast: "You scored X%"
```

### 6. Dashboard View
```
[ ] Return to dashboard
[ ] Material shows in list
[ ] Progress bar shows completion %
[ ] Stats cards show numbers
[ ] Can navigate to study again
[ ] Streak counter visible
[ ] Achievement badges display
[ ] Can delete materials
```

### 7. Error Scenarios
```
[ ] Try uploading non-PDF file → Error message
[ ] Try uploading >10MB file → Error message
[ ] Lose network during upload → Retry message
[ ] AI timeout (wait >30 sec for chunks) → Graceful timeout
[ ] Quiz generation fails → Skip option still available
[ ] Try accessing without login → Redirect to auth
```

## Monitoring During Testing

### Console Logs to Watch For
```javascript
// Good signs:
"Generating chunks with AI..."
"Generated X chunks"
"Generating quiz for chunk Y"
"Processing material: [ID]"

// Check for warnings:
"Invalid chunkSize, clamped to range [1-10]"
"No quiz generated for chunk X"
"Failed to generate quiz for chunk X"

// These should NOT appear:
"Uncaught error" (without proper handling)
"Cannot read properties of undefined"
```

### Database Checks (Supabase Console)
1. Go to Supabase Dashboard → SQL Editor
2. Check data is being created:
```sql
-- Check materials uploaded
SELECT id, title, processing_status FROM study_materials LIMIT 5;

-- Check chunks created
SELECT id, chunk_number, title FROM study_chunks LIMIT 10;

-- Check quiz questions
SELECT id, question FROM quiz_questions LIMIT 10;

-- Check progress/completion
SELECT id, completed, quiz_score FROM study_progress LIMIT 10;
```

## Performance Metrics

### Expected Response Times
- **Page Load**: < 2 seconds
- **File Upload**: 10-30 seconds (depends on file size)
- **Chunk Generation**: 30-90 seconds (AI processing)
- **Quiz Generation**: 5-15 seconds per chunk
- **Dashboard Load**: < 1 second
- **Chunk Navigation**: < 100ms

### Load Testing (Basic)
1. Upload 3-5 different files
2. Generate chunks for each
3. Take quizzes on multiple chunks
4. Verify database has correct data
5. Dashboard stats should match manual count

## Troubleshooting

### Issue: "Unauthorized" on upload
**Solution**: Check authentication state, try logging in again

### Issue: "AI service is busy" message
**Solution**: This is expected - wait a moment and try again. The app will retry automatically.

### Issue: Chunks not generating
**Solution**: 
- Check LOVABLE_API_KEY is set in Supabase
- Check file content has > 100 characters
- Check browser console for specific error

### Issue: Quiz shows "No quiz available"
**Solution**:
- Quiz generation may have timed out
- Click "Continue" to move to next chunk
- Try that chunk's quiz again

### Issue: Streaks/Stats not updating
**Solution**:
- Refresh dashboard page (F5)
- Check study_progress table for entries
- Verify user_id matches current session

## Deployment Steps

### Option 1: Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY
```

### Option 2: Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist

# Add environment variables via Netlify dashboard
```

### Option 3: Docker/Custom Server
```bash
# Build
npm run build

# Serve dist folder on your server
# Add environment variables via .env or deployment config
```

## Post-Deployment

### Monitoring Setup (Priority Order)
1. **Error Tracking**: Add Sentry
2. **Uptime Monitoring**: Add Datadog/Pingdom
3. **Logging**: Add LogRocket
4. **Analytics**: Add Mixpanel/Amplitude

### Security Checklist
- [ ] CORS properly restricted to your domain
- [ ] HTTPS enforced
- [ ] Rate limiting enabled
- [ ] SQL injection protection verified
- [ ] XSS protection in place
- [ ] CSRF tokens enabled

### Performance Optimization (Post-MVP)
- Add Sentry for error tracking
- Implement request caching
- Optimize bundle size
- Add database query indexes
- Implement image compression
- Add CDN for static assets

## Support & Debugging

### Enable Debug Mode
Add to browser console:
```javascript
localStorage.setItem('debug', 'true');
```

### Check Network Tab (F12)
1. Open DevTools
2. Go to Network tab
3. Perform an action (upload, quiz, etc.)
4. Check request/response status
5. Look for 4xx/5xx errors

### Common API Endpoints (Edge Functions)
- `https://[SUPABASE_PROJECT].supabase.co/functions/v1/process-upload`
- `https://[SUPABASE_PROJECT].supabase.co/functions/v1/process-content`

## Success Criteria

### MVP is working when:
- ✅ Can signup and login
- ✅ Can upload files
- ✅ Chunks generate successfully
- ✅ Quizzes load and complete
- ✅ Progress tracks correctly
- ✅ Dashboard shows stats
- ✅ No crashes or unhandled errors
- ✅ All toast messages are user-friendly

## Next Steps

### Immediate (Week 1)
- [ ] Deploy to staging environment
- [ ] Run full UAT with 5+ test users
- [ ] Collect feedback
- [ ] Fix critical bugs

### Soon (Week 2-3)
- [ ] Deploy to production
- [ ] Set up monitoring
- [ ] Create support documentation
- [ ] Plan marketing launch

### Later (Week 4+)
- [ ] Add unit tests
- [ ] Implement rate limiting
- [ ] Add advanced analytics
- [ ] Plan feature roadmap

---

**MVP Status**: ✅ READY FOR DEPLOYMENT

For questions or issues, check the console logs and browser DevTools first. Most issues are networking or configuration related.
