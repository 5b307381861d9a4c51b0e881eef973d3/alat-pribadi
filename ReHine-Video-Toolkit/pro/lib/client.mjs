// Local-only router: every method runs on this device. No network requests are made.
export async function patchVideo(file, { signal, onStatus = () => {}, postingDevice = 'obx' } = {}) {
  if (postingDevice === 'obx' || postingDevice === 'editing-news' || postingDevice === 'sl-sr') {
    const { patchObx } = await import('./obx.mjs');
    return patchObx(file, { signal, onStatus });
  }
  if (postingDevice === 'patchbox' || postingDevice === 'zilem') {
    const { patchBoxVideo } = await import('./patchbox.mjs');
    return patchBoxVideo(file, { signal, onStatus, assetsBaseURL: new URL('../', import.meta.url).href });
  }
  if (postingDevice === 'legacy-sl-sr') {
    signal?.throwIfAborted();
    onStatus('Applying Quality + FPS locally…');
    const { patchSlSr } = await import('./sl-sr.mjs');
    const output = await patchSlSr(file);
    signal?.throwIfAborted();
    return output;
  }
  throw new Error('Unknown method: ' + postingDevice);
}
