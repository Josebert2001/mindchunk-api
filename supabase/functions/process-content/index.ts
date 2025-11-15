import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { materialId, chunkSize = 5 } = await req.json();

    if (!materialId) {
      return new Response(JSON.stringify({ error: 'Material ID required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing material:', materialId, 'Chunk size:', chunkSize);

    // Fetch material
    const { data: material, error: fetchError } = await supabase
      .from('study_materials')
      .select('*')
      .eq('id', materialId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !material) {
      console.error('Material fetch error:', fetchError);
      return new Response(JSON.stringify({ error: 'Material not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const content = material.full_text;
    if (!content || content.length < 100) {
      return new Response(JSON.stringify({ error: 'Content too short for processing' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate chunks using AI
    console.log('Generating chunks with AI...');
    const chunks = await generateChunks(content, chunkSize);
    console.log('Generated', chunks.length, 'chunks');

    // Save chunks to database
    const savedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      const { data: chunkData, error: chunkError } = await supabase
        .from('study_chunks')
        .insert({
          material_id: materialId,
          chunk_number: i + 1,
          title: chunk.title,
          content: chunk.content,
          main_concept: chunk.mainConcept,
          estimated_minutes: chunk.estimatedMinutes || chunkSize,
          difficulty: chunk.difficulty,
          key_terms: chunk.keyTerms
        })
        .select()
        .single();

      if (chunkError) {
        console.error('Chunk save error:', chunkError);
        continue;
      }

      console.log('Generating quiz for chunk', i + 1);
      const quiz = await generateQuiz(chunk.content, chunk.title);
      
      // Save quiz questions
      for (const question of quiz) {
        const { error: quizError } = await supabase
          .from('quiz_questions')
          .insert({
            chunk_id: chunkData.id,
            question: question.question,
            options: question.options,
            correct_answer: question.correctAnswer,
            explanation: question.explanation
          });

        if (quizError) {
          console.error('Quiz save error:', quizError);
        }
      }

      savedChunks.push({
        ...chunkData,
        quiz
      });
    }

    const totalTime = savedChunks.reduce((acc, c) => acc + (c.estimated_minutes || 0), 0);

    return new Response(JSON.stringify({
      success: true,
      chunks: savedChunks,
      totalChunks: savedChunks.length,
      estimatedTotalTime: totalTime
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: 'Processing failed',
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateChunks(content: string, chunkSize: number) {
  const wordsPerMinute = 100;
  const targetWords = chunkSize * wordsPerMinute;

  const prompt = `You are an educational AI assistant specializing in ADHD-friendly learning content.

Break this study material into optimal learning chunks.

REQUIREMENTS:
- Each chunk should be ~${targetWords} words (readable in ${chunkSize} minutes)
- Each chunk focuses on ONE main concept
- Maintain logical flow between chunks
- Use clear, simple language
- Format with markdown (headers, bullets, bold for key terms)
- Rate difficulty: easy, medium, or hard

CONTENT:
${content.substring(0, 10000)}

Return ONLY valid JSON (no markdown fences):
[
  {
    "title": "Clear title",
    "content": "Formatted content...",
    "mainConcept": "One sentence summary",
    "estimatedMinutes": ${chunkSize},
    "difficulty": "easy",
    "keyTerms": ["term1", "term2"]
  }
]`;

  return retryWithBackoff(async () => {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI error:', response.status, error);
      
      if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      }
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '[]';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  }, 3);
}

async function generateQuiz(chunkContent: string, chunkTitle: string) {
  const prompt = `Create 3 multiple-choice questions for this learning chunk.

CHUNK: ${chunkTitle}
CONTENT: ${chunkContent.substring(0, 2000)}

REQUIREMENTS:
- Test understanding, not just memory
- 4 options each (A, B, C, D)
- Mix difficulty: 1 easy, 1 medium, 1 harder
- Provide brief explanations

Return ONLY valid JSON:
[
  {
    "question": "Question text?",
    "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
    "correctAnswer": "B",
    "explanation": "Why B is correct..."
  }
]`;

  return retryWithBackoff(async () => {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('AI error:', response.status, error);
      
      if (response.status === 429) {
        throw new Error('RATE_LIMIT');
      }
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '[]';
    const cleaned = text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleaned);
  }, 3).catch(() => []);
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`Max retries (${maxAttempts}) exceeded`);
        throw error;
      }
      
      const isRateLimit = error instanceof Error && error.message === 'RATE_LIMIT';
      const delay = isRateLimit 
        ? Math.pow(2, attempt) * 1000  // Exponential: 2s, 4s, 8s
        : 1000;  // Fixed 1s for other errors
      
      console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Retry logic failed');
}
