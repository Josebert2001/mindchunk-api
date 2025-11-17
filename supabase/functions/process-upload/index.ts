import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Get environment variables - handle both Deno and Node environments
function getEnv(key: string): string | undefined {
  try {
    // @ts-ignore - Deno global
    if (typeof Deno !== 'undefined' && Deno.env) {
      // @ts-ignore - Deno env
      return Deno.env.get(key);
    }
  } catch (e) {
    // Fall through to process.env
  }
  return (globalThis as any).process?.env?.[key];
}

// Moonshot API configuration (for text extraction and vision analysis)
const MOONSHOT_API_URL = 'https://api.moonshot.ai/v1';
const MOONSHOT_API_KEY = getEnv('MOONSHOT_API_KEY');

// Log API key status (only log prefix for security)
if (MOONSHOT_API_KEY) {
  const keyPrefix = MOONSHOT_API_KEY.substring(0, 10);
  console.log(`[INIT] Moonshot API key found (starts with: ${keyPrefix}...)`);
} else {
  console.warn('[INIT] MOONSHOT_API_KEY environment variable is NOT set!');
}

/**
 * Extract text from file using Moonshot Chat API with vision capabilities
 * Supports: images (with OCR and vision), text files, PDFs
 */
async function extractTextWithMoonshot(file: File): Promise<string> {
  if (!MOONSHOT_API_KEY) {
    throw new Error('MOONSHOT_API_KEY environment variable is not set');
  }

  try {
    console.log(`[MOONSHOT] Extracting text from: ${file.name}`);

    // For images, use vision capabilities
    if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      return await extractTextFromImage(file);
    }

    // For PDFs, use vision capabilities (treat as image-like content)
    if (file.type === 'application/pdf') {
      return await extractTextFromPDF(file);
    }

    // For plain text files, read directly
    if (file.type === 'text/plain') {
      const text = await file.text();
      console.log(`[MOONSHOT] Plain text extracted. Length: ${text.length}`);
      return text;
    }

    throw new Error('Unsupported file type. Please use PDF, image files (JPG, PNG, WebP, GIF), or TXT files.');

  } catch (error) {
    console.error('[MOONSHOT-ERROR] Text extraction failed:', error);
    throw error;
  }
}

/**
 * Extract text from image using Moonshot Vision API with OCR
 */
async function extractTextFromImage(file: File): Promise<string> {
  if (!MOONSHOT_API_KEY) {
    throw new Error('MOONSHOT_API_KEY environment variable is not set');
  }

  try {
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binaryString = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binaryString);

    // Determine MIME type
    const mimeType = file.type || 'image/jpeg';

    console.log(`[MOONSHOT-VISION] Extracting text from image: ${file.name}`);

    // Call Moonshot vision API for text extraction
    const response = await fetch(`${MOONSHOT_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshot-v1-128k-vision-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at reading and extracting text from images. Extract all visible text accurately, preserving structure and formatting where possible.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              },
              {
                type: 'text',
                text: 'Extract all text from this image. Preserve the structure and formatting. If there are sections, headers, or lists, maintain that structure in your response.'
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 4096
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MOONSHOT-VISION-ERROR] Status: ${response.status}`);
      console.error(`[MOONSHOT-VISION-ERROR] Response: ${errorText}`);
      
      if (response.status === 401) {
        throw new Error(`Moonshot authentication failed (401): Invalid or missing API key. Check MOONSHOT_API_KEY in Supabase secrets.`);
      } else if (response.status === 429) {
        throw new Error(`Moonshot rate limit exceeded (429): Too many requests, please try again later.`);
      } else {
        throw new Error(`Moonshot text extraction failed: ${response.status}`);
      }
    }

    const data = await response.json();
    const extractedText = data.choices[0]?.message?.content || '';

    if (!extractedText) {
      throw new Error('Moonshot returned empty response for image text extraction');
    }

    console.log(`[MOONSHOT-VISION] Text extracted. Length: ${extractedText.length}`);
    return extractedText;

  } catch (error) {
    console.error('[MOONSHOT-VISION] Error extracting text from image:', error);
    throw error;
  }
}

/**
 * Extract text from PDF using Moonshot Vision API with OCR
 * PDFs are processed by converting to base64 and sending to vision API
 */
async function extractTextFromPDF(file: File): Promise<string> {
  if (!MOONSHOT_API_KEY) {
    throw new Error('MOONSHOT_API_KEY environment variable is not set');
  }

  try {
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binaryString = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binaryString);

    console.log(`[MOONSHOT-PDF] Extracting text from PDF: ${file.name}`);

    // Call Moonshot vision API for PDF text extraction
    const response = await fetch(`${MOONSHOT_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshot-v1-128k-vision-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at reading and extracting text from PDF documents. Extract all visible text accurately, preserving structure, formatting, headers, and organization. Handle multi-page PDFs by concatenating content with clear separation between pages.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:application/pdf;base64,${base64Data}`
                }
              },
              {
                type: 'text',
                text: 'Extract all text from this PDF document. Preserve the structure, formatting, headers, lists, and any visual organization. If there are multiple pages, separate them clearly. Include all readable text content.'
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 8192
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MOONSHOT-PDF-ERROR] Status: ${response.status}`);
      console.error(`[MOONSHOT-PDF-ERROR] Response: ${errorText}`);
      
      if (response.status === 401) {
        throw new Error(`Moonshot authentication failed (401): Invalid or missing API key. Check MOONSHOT_API_KEY in Supabase secrets.`);
      } else if (response.status === 429) {
        throw new Error(`Moonshot rate limit exceeded (429): Too many requests, please try again later.`);
      } else {
        throw new Error(`Moonshot PDF extraction failed: ${response.status}`);
      }
    }

    const data = await response.json();
    const extractedText = data.choices[0]?.message?.content || '';

    if (!extractedText) {
      throw new Error('Moonshot returned empty response for PDF text extraction');
    }

    console.log(`[MOONSHOT-PDF] Text extracted. Length: ${extractedText.length}`);
    return extractedText;

  } catch (error) {
    console.error('[MOONSHOT-PDF] Error extracting text from PDF:', error);
    throw error;
  }
}

/**
 * Analyze image with Moonshot Vision API to extract visual insights
 * Describes diagrams, charts, layouts, and other visual elements
 */
async function analyzeImageWithMoonshot(file: File): Promise<{ description: string; elements: string[]; visualType: string }> {
  if (!MOONSHOT_API_KEY) {
    console.warn('[VISION] MOONSHOT_API_KEY not set, skipping vision analysis');
    return { description: '', elements: [], visualType: 'unknown' };
  }

  // Only analyze actual image files
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
    return { description: '', elements: [], visualType: 'unknown' };
  }

  try {
    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binaryString = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    const base64Data = btoa(binaryString);

    // Determine MIME type
    const mimeType = file.type || 'image/jpeg';

    console.log(`[VISION] Analyzing image: ${file.name}`);

    // Call Moonshot vision API for analysis
    const response = await fetch(`${MOONSHOT_API_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MOONSHOT_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'moonshot-v1-128k-vision-preview',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing educational images, diagrams, charts, and visual content. Provide structured analysis of visual elements.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Data}`
                }
              },
              {
                type: 'text',
                text: `Analyze this image and provide:
1. A comprehensive description of what the image shows
2. A list of key visual elements (e.g., "bar chart showing revenue trends", "diagram of cellular structure")
3. The type of visual content (e.g., "diagram", "chart", "photograph", "screenshot", "infographic")

Respond in JSON format:
{
  "description": "comprehensive description here",
  "elements": ["element 1", "element 2", "element 3"],
  "visualType": "diagram|chart|photograph|screenshot|infographic|mixed|other"
}`
              }
            ]
          }
        ],
        temperature: 0.3,
        max_tokens: 1024
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[VISION-ERROR] Status: ${response.status}`);
      console.error(`[VISION-ERROR] Response: ${errorText}`);
      
      if (response.status === 401) {
        console.warn('[VISION] Authentication failed - check MOONSHOT_API_KEY');
      }
      
      // Return empty analysis on error instead of throwing
      return { description: '', elements: [], visualType: 'unknown' };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      console.log(`[VISION] Analysis complete. Visual type: ${analysis.visualType}`);
      return {
        description: analysis.description || '',
        elements: analysis.elements || [],
        visualType: analysis.visualType || 'unknown'
      };
    }

    console.warn('[VISION] Could not parse vision analysis response');
    return { description: '', elements: [], visualType: 'unknown' };

  } catch (error) {
    console.error('[VISION] Error analyzing image:', error);
    // Return empty analysis on error - don't block the upload
    return { description: '', elements: [], visualType: 'unknown' };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = getEnv('SUPABASE_URL');
    const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase environment variables');
      return new Response(JSON.stringify({ 
        error: 'Server configuration error' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (formError) {
      console.error('FormData parsing error:', formError);
      return new Response(JSON.stringify({ error: 'Invalid form data' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const file = formData.get('file') as File;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: 'File too large. Maximum 10MB.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate file type
    const allowedTypes = ['text/plain', 'application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Use PDF, TXT, JPG, PNG, WebP, or GIF.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing file:', file.name, 'Type:', file.type, 'Size:', file.size);

    // Sanitize filename - remove special characters that aren't allowed in storage keys
    const sanitizedFileName = file.name.replace(/[^\w\s.-]/g, '_');
    
    // Upload to storage
    const fileName = `${user.id}/${Date.now()}-${sanitizedFileName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('study-materials')
      .upload(fileName, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('File uploaded:', uploadData.path);

    // Extract text using Moonshot AI
    let extractedText = '';
    let visionAnalysis = null;
    
    try {
      // Use Moonshot for all supported file types (images, text, PDFs)
      console.log('Using Moonshot for text extraction');
      extractedText = await extractTextWithMoonshot(file);
      
      // For images, also perform vision analysis
      if (['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
        console.log('Running vision analysis for image');
        const analysis = await analyzeImageWithMoonshot(file);
        visionAnalysis = analysis;
      }
    } catch (extractionError) {
      console.error('[EXTRACTION-ERROR]', extractionError);
      const errorMessage = extractionError instanceof Error ? extractionError.message : 'Unknown error';
      
      // Check if this is a Moonshot auth issue
      const isAuthError = errorMessage.includes('401') || errorMessage.includes('authentication failed');
      const clientMessage = isAuthError 
        ? 'Moonshot API authentication failed. Please check that MOONSHOT_API_KEY is set correctly in Supabase secrets.'
        : 'The file could not be processed. Please try a different file or contact support.';
      
      // Return error response
      return new Response(JSON.stringify({ 
        error: 'Failed to extract text from file',
        details: clientMessage
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Clean and validate text
    extractedText = extractedText.replace(/\s+/g, ' ').trim();
    
    if (extractedText.length < 50) {
      return new Response(JSON.stringify({ 
        error: 'File appears to be empty or text could not be extracted. Please try a different file.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Calculate stats
    const wordCount = extractedText.split(/\s+/).length;
    const estimatedReadTime = Math.ceil(wordCount / 200);

    // Create study material record
    const materialPayload: any = {
      user_id: user.id,
      title: file.name.replace(/\.[^/.]+$/, ''),
      file_name: file.name,
      file_path: uploadData.path,
      file_size: file.size,
      word_count: wordCount,
      estimated_read_time: estimatedReadTime,
      full_text: extractedText,
      processing_status: 'completed'
    };

    // Add vision analysis if available
    if (visionAnalysis && (visionAnalysis.description || visionAnalysis.elements.length > 0)) {
      materialPayload.vision_analysis = visionAnalysis;
    }

    const { data: materialData, error: materialError } = await supabase
      .from('study_materials')
      .insert(materialPayload)
      .select()
      .single();

    if (materialError) {
      console.error('Database error:', materialError);
      return new Response(JSON.stringify({ error: 'Failed to save material' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Material created:', materialData.id);

    return new Response(JSON.stringify({
      success: true,
      material: materialData,
      textPreview: extractedText.substring(0, 500) + '...'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ 
      error: 'An unexpected error occurred',
      details: errorMessage 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
