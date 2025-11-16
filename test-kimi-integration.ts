/**
 * Test script for Kimi API integration
 * Usage: deno run --allow-net --allow-env test-kimi-integration.ts
 * or: npx ts-node test-kimi-integration.ts
 */

const KIMI_API_URL = 'https://api.moonshot.cn/v1';
const KIMI_API_KEY = process.env.KIMI_API_KEY;

interface KimiFileResponse {
  id: string;
  object: string;
  bytes: number;
  created_at: number;
  filename: string;
  purpose: string;
}

/**
 * Test uploading a file to Kimi
 */
async function testFileUpload(filePath: string, mimeType: string): Promise<string> {
  if (!KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY environment variable is not set');
  }

  console.log(`\n📤 Testing file upload: ${filePath}`);
  console.log(`   MIME Type: ${mimeType}`);

  try {
    // Read file
    let fileBuffer: Buffer | Uint8Array;
    
    const fs = require('fs');
    fileBuffer = fs.readFileSync(filePath);

    console.log(`   File size: ${fileBuffer.length} bytes`);

    // Create FormData
    const formData = new FormData();
    const blob = new Blob([Buffer.from(fileBuffer)], { type: mimeType });
    formData.append('file', blob, filePath.split('/').pop());
    formData.append('purpose', 'file-extract');

    // Upload file
    const uploadResponse = await fetch(`${KIMI_API_URL}/files`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error(`   ❌ Upload failed: ${uploadResponse.status}`);
      console.error(`   Error: ${errorText}`);
      throw new Error(`Upload failed: ${uploadResponse.status}`);
    }

    const uploadData: KimiFileResponse = await uploadResponse.json();
    console.log(`   ✅ File uploaded successfully`);
    console.log(`   File ID: ${uploadData.id}`);
    console.log(`   Created at: ${new Date(uploadData.created_at * 1000).toISOString()}`);

    return uploadData.id;
  } catch (error) {
    console.error(`   ❌ Upload error: ${error}`);
    throw error;
  }
}

/**
 * Test extracting content from uploaded file
 */
async function testContentExtraction(fileId: string): Promise<string> {
  if (!KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY environment variable is not set');
  }

  console.log(`\n📖 Testing content extraction: ${fileId}`);

  try {
    const contentResponse = await fetch(`${KIMI_API_URL}/files/${fileId}/content`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
    });

    if (!contentResponse.ok) {
      console.error(`   ❌ Extraction failed: ${contentResponse.status}`);
      const errorText = await contentResponse.text();
      console.error(`   Error: ${errorText}`);
      throw new Error(`Extraction failed: ${contentResponse.status}`);
    }

    const extractedText = await contentResponse.text();
    console.log(`   ✅ Content extracted successfully`);
    console.log(`   Content length: ${extractedText.length} characters`);
    console.log(`   Preview (first 200 chars):`);
    console.log(`   ${extractedText.substring(0, 200)}...`);

    return extractedText;
  } catch (error) {
    console.error(`   ❌ Extraction error: ${error}`);
    throw error;
  }
}

/**
 * Test deleting file from Kimi
 */
async function testFileDelete(fileId: string): Promise<void> {
  if (!KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY environment variable is not set');
  }

  console.log(`\n🗑️  Testing file deletion: ${fileId}`);

  try {
    const deleteResponse = await fetch(`${KIMI_API_URL}/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
    });

    if (!deleteResponse.ok) {
      console.error(`   ❌ Deletion failed: ${deleteResponse.status}`);
      throw new Error(`Deletion failed: ${deleteResponse.status}`);
    }

    console.log(`   ✅ File deleted successfully`);
  } catch (error) {
    console.error(`   ❌ Deletion error: ${error}`);
    throw error;
  }
}

/**
 * List all files in Kimi storage
 */
async function listKimiFiles(): Promise<void> {
  if (!KIMI_API_KEY) {
    throw new Error('KIMI_API_KEY environment variable is not set');
  }

  console.log(`\n📋 Listing all Kimi files:`);

  try {
    const listResponse = await fetch(`${KIMI_API_URL}/files`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
      },
    });

    if (!listResponse.ok) {
      console.error(`   ❌ List failed: ${listResponse.status}`);
      return;
    }

    const data = await listResponse.json();
    const fileCount = data.data?.length || 0;
    console.log(`   Total files: ${fileCount}`);

    if (fileCount > 0) {
      console.log(`   Recent files:`);
      (data.data as KimiFileResponse[]).slice(0, 5).forEach((file) => {
        console.log(`     - ${file.filename} (${file.bytes} bytes, ID: ${file.id})`);
      });
    }
  } catch (error) {
    console.error(`   ❌ List error: ${error}`);
  }
}

/**
 * Main test function
 */
async function main() {
  console.log('🧪 Kimi Integration Test Suite');
  console.log('================================\n');

  if (!KIMI_API_KEY) {
    console.error('❌ KIMI_API_KEY environment variable is not set');
    console.error('Set it with: export KIMI_API_KEY=your_api_key');
    process.exit(1);
  }

  console.log('✅ KIMI_API_KEY is configured\n');

  try {
    // Test 1: List files
    await listKimiFiles();

    // Test 2: Upload and extract a test text file
    console.log('\n\n--- Test Case 1: Plain Text File ---');
    const testTextContent = 'This is a test file for Kimi integration.\n\nIt contains multiple lines of text.\n\nKimi should extract this text successfully.';
    
    // Create a temporary test file
    const testFilePath = '/tmp/test-kimi.txt';
    const fs = require('fs');
    fs.writeFileSync(testFilePath, testTextContent);

    const fileId1 = await testFileUpload(testFilePath, 'text/plain');
    const content1 = await testContentExtraction(fileId1);
    await testFileDelete(fileId1);

    // Test 3: Check final file count
    console.log('\n\n--- Final Status ---');
    await listKimiFiles();

    console.log('\n\n✅ All tests completed successfully!');
  } catch (error) {
    console.error('\n\n❌ Test failed:', error);
    process.exit(1);
  }
}

main();
