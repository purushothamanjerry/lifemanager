const cloudinary = require('cloudinary').v2;

// 1. Configure Cloudinary
cloudinary.config({ 
  cloud_name: 'sdybosxn', 
  api_key: '644852637911333', 
  api_secret: 'Am7S0OiCTiP8OwUPFg4dcyrpK1Q' 
});

(async function run() {
  try {
    // 2. Upload an image from Cloudinary's demo domains
    console.log('Uploading image...');
    const uploadResult = await cloudinary.uploader.upload('https://res.cloudinary.com/demo/image/upload/sample.jpg', {
      public_id: 'sample_image_onboarding'
    });
    
    console.log('\n--- Upload Result ---');
    console.log('Secure URL:', uploadResult.secure_url);
    console.log('Public ID:', uploadResult.public_id);
    
    // 3. Get image details
    // We can fetch details using the API resource method
    const details = await cloudinary.api.resource(uploadResult.public_id);
    console.log('\n--- Image Details ---');
    console.log('Width:', details.width);
    console.log('Height:', details.height);
    console.log('Format:', details.format);
    console.log('Size (bytes):', details.bytes);

    // 4. Transform the image
    // 'fetch_format: auto' (f_auto) automatically delivers the image in the most optimal format depending on the user's browser (e.g. WebP/AVIF).
    // 'quality: auto' (q_auto) analyzes the image and compresses it as much as possible without degrading human-perceivable visual quality.
    const transformedUrl = cloudinary.url(uploadResult.public_id, {
      fetch_format: 'auto',
      quality: 'auto'
    });
    
    console.log('\n--- Transformation ---');
    console.log('Done! Click link below to see optimized version of the image. Check the size and the format.');
    console.log(transformedUrl);

  } catch (error) {
    console.error('Error during execution:', error);
  }
})();
