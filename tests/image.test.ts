import { describe, it, expect, vi, afterEach } from 'vitest';
import { dataUrlToBlob, compressImageFile } from '../src/utils/image';

describe('Image utilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('dataUrlToBlob', () => {
    it('converts dataUrl to Blob correctly', () => {
      const dataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
      const blob = dataUrlToBlob(dataUrl);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/jpeg');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('handles png dataUrl properly', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
      const blob = dataUrlToBlob(dataUrl);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(blob.size).toBeGreaterThan(0);
    });

    it('rejects invalid dataUrl strings gracefully', () => {
      expect(() => dataUrlToBlob('invalid-data-url')).toThrow('Invalid data URL');
    });
  });

  describe('compressImageFile', () => {
    it('rejects non-image files immediately', async () => {
      const textFile = new File(['hello world'], 'test.txt', { type: 'text/plain' });
      await expect(compressImageFile(textFile)).rejects.toThrow('Selected file is not an image');
    });

    it('compresses and resizes landscape images where width exceeds maxDimension', async () => {
      const sampleJpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

      class MockFileReader {
        onload: any = null;
        onerror: any = null;
        result: string = '';
        readAsDataURL() {
          this.result = 'data:image/jpeg;base64,rawimage';
          setTimeout(() => this.onload && this.onload(), 0);
        }
      }

      class MockImage {
        onload: any = null;
        onerror: any = null;
        width = 2400;
        height = 1200;
        set src(_val: string) {
          setTimeout(() => this.onload && this.onload(), 0);
        }
      }

      const mockCtx = {
        drawImage: vi.fn(),
      };
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockCtx),
        toDataURL: vi.fn().mockReturnValue(sampleJpegDataUrl),
      };

      vi.stubGlobal('FileReader', MockFileReader);
      vi.stubGlobal('Image', MockImage);
      vi.stubGlobal('document', {
        createElement: vi.fn((tag: string) => {
          if (tag === 'canvas') return mockCanvas;
          return {};
        }),
      });

      const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
      const result = await compressImageFile(file, 1200, 0.75);

      expect(mockCanvas.width).toBe(1200);
      expect(mockCanvas.height).toBe(600);
      expect(mockCtx.drawImage).toHaveBeenCalled();
      expect(mockCanvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.75);
      expect(result.dataUrl).toBe(sampleJpegDataUrl);
      expect(result.blob).toBeInstanceOf(Blob);
      expect(result.blob.type).toBe('image/jpeg');
    });

    it('compresses and resizes portrait images where height exceeds maxDimension', async () => {
      const sampleJpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

      class MockFileReader {
        onload: any = null;
        onerror: any = null;
        result: string = '';
        readAsDataURL() {
          this.result = 'data:image/jpeg;base64,rawimage';
          setTimeout(() => this.onload && this.onload(), 0);
        }
      }

      class MockImage {
        onload: any = null;
        onerror: any = null;
        width = 800;
        height = 1600;
        set src(_val: string) {
          setTimeout(() => this.onload && this.onload(), 0);
        }
      }

      const mockCtx = {
        drawImage: vi.fn(),
      };
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockCtx),
        toDataURL: vi.fn().mockReturnValue(sampleJpegDataUrl),
      };

      vi.stubGlobal('FileReader', MockFileReader);
      vi.stubGlobal('Image', MockImage);
      vi.stubGlobal('document', {
        createElement: vi.fn((tag: string) => {
          if (tag === 'canvas') return mockCanvas;
          return {};
        }),
      });

      const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
      await compressImageFile(file, 1200, 0.75);

      expect(mockCanvas.width).toBe(600);
      expect(mockCanvas.height).toBe(1200);
    });

    it('does not upscale images smaller than maxDimension', async () => {
      const sampleJpegDataUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

      class MockFileReader {
        onload: any = null;
        onerror: any = null;
        result: string = '';
        readAsDataURL() {
          this.result = 'data:image/jpeg;base64,rawimage';
          setTimeout(() => this.onload && this.onload(), 0);
        }
      }

      class MockImage {
        onload: any = null;
        onerror: any = null;
        width = 400;
        height = 300;
        set src(_val: string) {
          setTimeout(() => this.onload && this.onload(), 0);
        }
      }

      const mockCtx = {
        drawImage: vi.fn(),
      };
      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(mockCtx),
        toDataURL: vi.fn().mockReturnValue(sampleJpegDataUrl),
      };

      vi.stubGlobal('FileReader', MockFileReader);
      vi.stubGlobal('Image', MockImage);
      vi.stubGlobal('document', {
        createElement: vi.fn((tag: string) => {
          if (tag === 'canvas') return mockCanvas;
          return {};
        }),
      });

      const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
      await compressImageFile(file, 1200, 0.75);

      expect(mockCanvas.width).toBe(400);
      expect(mockCanvas.height).toBe(300);
    });

    it('rejects if FileReader encounters an error', async () => {
      class FailingFileReader {
        onload: any = null;
        onerror: any = null;
        readAsDataURL() {
          setTimeout(() => this.onerror && this.onerror(), 0);
        }
      }

      vi.stubGlobal('FileReader', FailingFileReader);
      const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
      await expect(compressImageFile(file)).rejects.toThrow('Failed to read file');
    });

    it('rejects if Image fails to load', async () => {
      class MockFileReader {
        onload: any = null;
        onerror: any = null;
        result: string = '';
        readAsDataURL() {
          this.result = 'data:image/jpeg;base64,broken';
          setTimeout(() => this.onload && this.onload(), 0);
        }
      }

      class FailingImage {
        onload: any = null;
        onerror: any = null;
        set src(_val: string) {
          setTimeout(() => this.onerror && this.onerror(), 0);
        }
      }

      vi.stubGlobal('FileReader', MockFileReader);
      vi.stubGlobal('Image', FailingImage);

      const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
      await expect(compressImageFile(file)).rejects.toThrow('Failed to load image');
    });

    it('rejects if canvas 2D context cannot be acquired', async () => {
      class MockFileReader {
        onload: any = null;
        onerror: any = null;
        result: string = '';
        readAsDataURL() {
          this.result = 'data:image/jpeg;base64,rawimage';
          setTimeout(() => this.onload && this.onload(), 0);
        }
      }

      class MockImage {
        onload: any = null;
        onerror: any = null;
        width = 500;
        height = 500;
        set src(_val: string) {
          setTimeout(() => this.onload && this.onload(), 0);
        }
      }

      const mockCanvas = {
        width: 0,
        height: 0,
        getContext: vi.fn().mockReturnValue(null),
      };

      vi.stubGlobal('FileReader', MockFileReader);
      vi.stubGlobal('Image', MockImage);
      vi.stubGlobal('document', {
        createElement: vi.fn((tag: string) => {
          if (tag === 'canvas') return mockCanvas;
          return {};
        }),
      });

      const file = new File(['dummy'], 'photo.jpg', { type: 'image/jpeg' });
      await expect(compressImageFile(file)).rejects.toThrow('Could not get canvas context');
    });
  });
});
