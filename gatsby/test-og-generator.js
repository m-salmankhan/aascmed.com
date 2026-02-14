/**
 * Test script for OG image generator
 * Run with: node gatsby/test-og-generator.js
 */

require('dotenv').config({ path: '.env.development' });
const path = require('path');
const { generateOGImage, downloadMapboxImage } = require('./og-image-generator');

async function test() {
  const outputPath = path.join(__dirname, '..', 'test-og-image.png');
  const logoPath = path.join(__dirname, '..', 'static', 'assets', 'logos', 'logo.png');
  const backgroundPath = path.join(__dirname, '..', 'static', 'assets', 'hero-bg.png');

  console.log('Generating test OG image...');
  console.log('Logo path:', logoPath);
  console.log('Background path:', backgroundPath);
  console.log('Output path:', outputPath);

  try {
    // Test 1: With background image
    await generateOGImage({
      title: 'How Do I Know If My Sinus Infection Is Bacterial or Viral?',
      backgroundImagePath: backgroundPath,
      logoPath: logoPath,
      outputPath: outputPath,
    });
    console.log('✓ Test 1 passed: Generated OG image with background');

    // Test 2: Without background (fallback)
    const outputPath2 = path.join(__dirname, '..', 'test-og-image-no-bg.png');
    await generateOGImage({
      title: 'A Very Long Title That Should Wrap Across Multiple Lines and Test the Text Sizing Algorithm',
      backgroundImagePath: null,
      logoPath: logoPath,
      outputPath: outputPath2,
    });
    console.log('✓ Test 2 passed: Generated OG image without background');

    // Test 3: Very long title (truncation)
    const outputPath3 = path.join(__dirname, '..', 'test-og-image-truncate.png');
    await generateOGImage({
      title: 'This Is An Extremely Long Title That Will Definitely Need To Be Truncated Because It Contains Way Too Many Words And Will Not Fit Within The Available Space No Matter How Small We Make The Font Size So We Need To Add Ellipsis At The End',
      backgroundImagePath: backgroundPath,
      logoPath: logoPath,
      outputPath: outputPath3,
    });
    console.log('✓ Test 3 passed: Generated OG image with truncated title');

    // Test 4: Mapbox static image as background (clinic example)
    if (process.env.GATSBY_MAPBOX_API_KEY) {
      const mapImagePath = path.join(__dirname, '..', 'test-mapbox-bg.png');
      const outputPath4 = path.join(__dirname, '..', 'test-og-image-mapbox.png');
      
      // Aurora clinic coordinates
      const lat = 41.7606;
      const lng = -88.32;
      
      console.log('Downloading Mapbox static image...');
      await downloadMapboxImage(lat, lng, mapImagePath);
      console.log('✓ Downloaded Mapbox image to:', mapImagePath);
      
      await generateOGImage({
        title: 'Aurora Clinic',
        backgroundImagePath: mapImagePath,
        outputPath: outputPath4,
      });
      console.log('✓ Test 4 passed: Generated OG image with Mapbox background');
    } else {
      console.log('⚠ Skipping Mapbox test (GATSBY_MAPBOX_API_KEY not set)');
    }

    console.log('\n✅ All tests passed! Check the generated images in the project root.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
