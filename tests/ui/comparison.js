const { isDeepStrictEqual } = require("node:util");
const { expect } = require("@playwright/test");
const { pageContract, semanticImages } = require("./helpers");
const { compareImages } = require("./contracts");

async function comparePages(reference, candidate, testInfo) {
  const differences = [];
  const compare = (category, actual, expected) => {
    if (isDeepStrictEqual(actual, expected)) return;
    differences.push({ category, actual, expected });
    testInfo.annotations.push({ type: "reference-difference", description: category });
  };
  const expectedContract = await pageContract(reference);
  const actualContract = await pageContract(candidate);
  await testInfo.attach("reference-contract", { body: JSON.stringify(expectedContract, null, 2), contentType: "application/json" });
  await testInfo.attach("candidate-contract", { body: JSON.stringify(actualContract, null, 2), contentType: "application/json" });
  expect(expectedContract.metadata.title).not.toBe("");
  expect(expectedContract.metadata.canonical).toMatch(/^https?:\/\//);
  expect(expectedContract.metadata.tags.find(([name]) => name === "description")).toBeDefined();
  compare("Content/metadata/links/forms", actualContract, expectedContract);
  compare("Image semantics", await semanticImages(candidate), await semanticImages(reference));
  const mapSizes = page => page.locator(".mapboxgl-canvas").evaluateAll(canvases =>
    canvases.map(canvas => ({ width: canvas.clientWidth, height: canvas.clientHeight }))
  );
  compare("Map dimensions", await mapSizes(candidate), await mapSizes(reference));
  const options = { fullPage: true, animations: "disabled" };
  const expectedPath = testInfo.outputPath("reference.png");
  const actualPath = testInfo.outputPath("candidate.png");
  const expectedBuffer = await reference.screenshot({ ...options, path: expectedPath, mask: [reference.locator(".mapboxgl-canvas")] });
  const actualBuffer = await candidate.screenshot({ ...options, path: actualPath, mask: [candidate.locator(".mapboxgl-canvas")] });
  await testInfo.attach("reference", { path: expectedPath, contentType: "image/png" });
  await testInfo.attach("candidate", { path: actualPath, contentType: "image/png" });
  const result = await compareImages(expectedBuffer, actualBuffer);
  if (result.dimensions) {
    compare(`Screenshot dimensions: ${JSON.stringify(result.dimensions)}`, result.dimensions.actual, result.dimensions.expected);
  } else {
    await testInfo.attach("difference", { body: result.diff, contentType: "image/png" });
    const description = `${result.changedPixels} pixels (${(result.changedRatio * 100).toFixed(4)}%)`;
    testInfo.annotations.push({ type: "pixel-difference", description });
    if (!result.passed) compare(`Changed pixels: ${description}; limit 0.1%`, result.changedRatio, 0.001);
  }
  await testInfo.attach("comparison-differences", { body: JSON.stringify(differences, null, 2), contentType: "application/json" });
}

module.exports = { comparePages };
