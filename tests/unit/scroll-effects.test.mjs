import assert from 'node:assert/strict';
import test from 'node:test';
import {
  observeParallax,
  parallaxValues,
} from '../../src/components/header/parallax.ts';
import { thresholdTracker } from '../../src/components/zocdoc/scroll-threshold.ts';

function viewport(reducedMotion = false) {
  const listeners = new Map(),
    frames = new Map(),
    changes = new Set();
  let id = 0;
  const motion = {
    matches: reducedMotion,
    addEventListener: (_type, fn) => changes.add(fn),
    removeEventListener: (_type, fn) => changes.delete(fn),
  };
  const view = {
    scrollY: 50,
    matchMedia: () => motion,
    addEventListener: (type, fn, options) => {
      if (type === 'scroll') assert.equal(options.passive, true);
      listeners.set(type, fn);
    },
    removeEventListener: (type) => listeners.delete(type),
    requestAnimationFrame: (fn) => {
      frames.set(++id, fn);
      return id;
    },
    cancelAnimationFrame: (id) => frames.delete(id),
  };
  return { view, motion, listeners, frames, changes };
}

test('parallax coalesces passive events and cancels work on live reduced-motion changes and cleanup', () => {
  const v = viewport(),
    applied = [];
  const cleanup = observeParallax(v.view, (reduced) => applied.push(reduced));
  for (let i = 0; i < 10; i++) v.listeners.get('scroll')();
  assert.equal(v.frames.size, 1);
  const render = v.frames.values().next().value;
  v.frames.clear();
  render();
  assert.deepEqual(applied, [false]);
  v.listeners.get('resize')();
  v.motion.matches = true;
  for (const change of v.changes) change();
  assert.equal(v.frames.size, 0);
  assert.deepEqual(applied, [false, true]);
  v.listeners.get('scroll')();
  assert.equal(v.frames.size, 0);
  v.motion.matches = false;
  for (const change of v.changes) change();
  assert.equal(v.frames.size, 1);
  cleanup();
  assert.equal(v.frames.size, 0);
  assert.equal(v.listeners.size, 0);
  assert.equal(v.changes.size, 0);
});

test('parallax is disabled when reduced motion is already requested at mount', () => {
  const v = viewport(true),
    applied = [];
  const cleanup = observeParallax(v.view, (reduced) => applied.push(reduced));
  assert.equal(v.frames.size, 0);
  assert.deepEqual(applied, [true]);
  cleanup();
});

test('parallax values preserve the effect and clamp zero height and overscroll', () => {
  assert.equal(parallaxValues(50, 100).textTranslation, 15);
  assert.deepEqual(parallaxValues(200, 100), {
    textTranslation: 100,
    backgroundOpacity: 1,
  });
  assert.deepEqual(parallaxValues(-10, 100), {
    textTranslation: 0,
    backgroundOpacity: 0,
  });
  assert.deepEqual(parallaxValues(0, 0), {
    textTranslation: 0,
    backgroundOpacity: 0,
  });
});

test('threshold tracker returns updates only when crossing 600 pixels', () => {
  const track = thresholdTracker(600);
  assert.deepEqual(
    [0, 100, 600, 601, 700, 800, 500, 0]
      .map(track)
      .filter((value) => value !== undefined),
    [true, false],
  );
});
