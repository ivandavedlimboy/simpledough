// src/scripts/uploadImages.js

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// 1️⃣ Supabase credentials
const SUPABASE_URL = 'https://twkjirouquzgvpqorpus.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3a2ppcm91cXV6Z3ZwcW9ycHVzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ3MTY4NDUsImV4cCI6MjA4MDI5Mjg0NX0.26xAcU6XWj3dWhU8sIXOZTwL7ozVaj85-1ozyr6T_GU'; // use service role key for uploads
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 2️⃣ Local folder where your images are stored
const imagesFolder = path.join(process.cwd(), 'images'); // adjust if needed

// 3️⃣ List of images to upload (file names should match your product IDs)
const images = [
  'party-30.jpg',
  'party-40.jpg',
  'messy-8.jpg',
  'messy-10.jpg',
  'mini-6.jpg',
  'mini-12.jpg',
  'mini-25.jpg'
];

// 4️⃣ Array to store uploaded URLs
const uploadedImages = [];

// 5️⃣ Upload function
async function uploadImages() {
  for (const imageName of images) {
    const filePath = path.join(imagesFolder, imageName);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      continue;
    }

    const fileData = fs.readFileSync(filePath);

    const { data, error } = await supabase.storage
      .from('product-images') // ensure this bucket exists in Supabase
      .upload(imageName, fileData, { upsert: true });

    if (error) {
      console.error(`❌ Error uploading ${imageName}:`, error.message);
    } else {
      console.log(`✅ Uploaded: ${imageName}`);

      // Get public URL
      const { publicURL, error: urlError } = supabase
        .storage
        .from('product-images')
        .getPublicUrl(imageName);

      if (urlError) console.error(`❌ Error getting URL for ${imageName}:`, urlError.message);
      else {
        console.log(`🔗 Public URL: ${publicURL}\n`);
        // Store mapping: use filename (without extension) as product ID
        const productId = imageName.split('.')[0];
        uploadedImages.push({ id: productId, url: publicURL });
      }
    }
  }

  // Save uploaded URLs to JSON for frontend
  const outputPath = path.join(process.cwd(), 'src/data/uploadedImages.json');
  fs.writeFileSync(outputPath, JSON.stringify(uploadedImages, null, 2));
  console.log(`📄 All URLs saved to ${outputPath}`);
}

// Run the script
uploadImages()
  .then(() => console.log('🎉 All uploads complete!'))
  .catch(err => console.error('❌ Upload script error:', err));
