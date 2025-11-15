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

    const formData = await req.formData();
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
    const allowedTypes = ['application/pdf', 'text/plain', 'image/jpeg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Use PDF, TXT, JPG, or PNG.' }), {
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

    // Extract text based on file type
    let extractedText = '';
    
    if (file.type === 'text/plain') {
      extractedText = await file.text();
    } else if (file.type === 'application/pdf') {
      // For PDF, we'll return a simplified extraction
      // In production, you'd use a PDF parsing library
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const text = new TextDecoder().decode(uint8Array);
      
      // Basic text extraction (this is simplified)
      extractedText = text.replace(/[\x00-\x1F\x7F-\x9F]/g, ' ').trim();
      
      if (extractedText.length < 100) {
        extractedText = `[PDF Content: ${file.name}]\n\nThis PDF has been uploaded successfully. For better text extraction, consider uploading a text file or image with clear text.`;
      }
    } else if (file.type.startsWith('image/')) {
      // For images, we'll return a placeholder
      // In production, you'd use OCR (e.g., Tesseract)
      extractedText = `[Image Content: ${file.name}]\n\nThis image has been uploaded successfully. Text extraction from images requires OCR processing.`;
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
    const { data: materialData, error: materialError } = await supabase
      .from('study_materials')
      .insert({
        user_id: user.id,
        title: file.name.replace(/\.[^/.]+$/, ''),
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        word_count: wordCount,
        estimated_read_time: estimatedReadTime,
        full_text: extractedText,
        processing_status: 'completed'
      })
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
