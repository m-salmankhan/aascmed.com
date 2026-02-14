/**
 * Test script for OG image generator
 * Run with: node gatsby/test-og-generator.js
 */

const path = require('path');
const { generateOGImage } = require('./og-image-generator');

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

    console.log('\n✅ All tests passed! Check the generated images in the project root.');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

test();
