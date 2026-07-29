import { describe, expect, it } from 'vitest';
import config from '../wxt.config';

describe('production build handoff', () => {
  it('writes the unpacked extension to a visible top-level folder', () => {
    expect(config).toMatchObject({
      outDir: 'dist',
      outDirTemplate: 'unpacked-extension',
    });
  });
});
