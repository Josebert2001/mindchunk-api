import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

// Kimi API configuration
// @ts-ignore - Deno environment
const KIMI_API_URL = 'https://api.moonshot.cn/v1';
// @ts-ignore - Deno environment
const KIMI_API_KEY = Deno.env.get('KIMI_API_KEY');

/**
 * Upload file to Kimi for text extraction
 * Supports: PDF, images (with OCR), documents
 */
async function uploadFileToKimi(file: File): Promise<string> {
  if (!KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY environment variable is not set');
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const blob = new Blob([uint8Array], { type: file.type });

    // Create FormData for file upload
    const formData = new FormData();
    formData.append('file', blob, file.name);
    formData.append('purpose', 'file-extract');

    // Upload file to Kimi
    console.log(`Uploading file to Kimi: ${file.name}`);
    const uploadResponse = await fetch(`${KIMI_API_URL}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('Kimi upload error:', uploadResponse.status, errorText);
      throw new Error(`Kimi file upload failed: ${uploadResponse.status}`);
    }

    const uploadData = await uploadResponse.json();
    const fileId = uploadData.id;

    console.log(`File uploaded to Kimi. File ID: ${fileId}`);

    // Extract content from uploaded file
    console.log(`Extracting content from Kimi file: ${fileId}`);
    const contentResponse = await fetch(`${KIMI_API_URL}/files/${fileId}/content`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
    });

    if (!contentResponse.ok) {
      console.error('Kimi content extraction error:', contentResponse.status);
      throw new Error(`Kimi content extraction failed: ${contentResponse.status}`);
    }

    const extractedText = await contentResponse.text();
    console.log(`Content extracted successfully. Length: ${extractedText.length}`);

    // Clean up: delete file from Kimi after extraction
    await deleteFileFromKimi(fileId);

    return extractedText;
  } catch (error) {
    console.error('Kimi file processing error:', error);
    throw error;
  }
}

/**
 * Delete file from Kimi to free up storage
 */
async function deleteFileFromKimi(fileId: string): Promise<void> {
  if (!KIMI_API_KEY) {
    console.warn('KIMI_API_KEY not set, skipping file cleanup');
    return;
  }

  try {
    console.log(`Deleting file from Kimi: ${fileId}`);
    const deleteResponse = await fetch(`${KIMI_API_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
    });

    if (!deleteResponse.ok) {
      console.warn(`Failed to delete Kimi file: ${deleteResponse.status}`);
      return;
    }

    console.log(`File deleted from Kimi: ${fileId}`);
  } catch (error) {
    console.error('Error deleting file from Kimi:', error);
    // Don't throw - cleanup failure shouldn't block the entire operation
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    const supabase = createClient(
      supabaseUrl ?? '',
      supabaseKey ?? ''
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

    // Extract text using Kimi AI
    let extractedText = '';
    
    try {
      // Use Kimi for all supported file types (PDF, images, documents)
      if (['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
        console.log('Using Kimi for text extraction');
        extractedText = await uploadFileToKimi(file);
      } else if (file.type === 'text/plain') {
        // For plain text, extract directly
        extractedText = await file.text();
      } else {
        // Try Kimi for unknown types if possible
        try {
          extractedText = await uploadFileToKimi(file);
        } catch (kimiError) {
          console.warn('Kimi extraction failed for unknown type, returning error');
          throw kimiError;
        }
      }
    } catch (extractionError) {
      console.error('Text extraction error:', extractionError);
      const errorMessage = extractionError instanceof Error ? extractionError.message : 'Unknown error';
      
      // Return error response
      return new Response(JSON.stringify({ 
        error: 'Failed to extract text from file',
        details: `The file could not be processed. ${errorMessage}` 
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
