/// <reference types="vitest/globals" />
import '@testing-library/jest-dom/vitest';

// ---------- matchMedia ----------
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ---------- IntersectionObserver ----------
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(
    private callback: IntersectionObserverCallback,
    _options?: IntersectionObserverInit,
  ) {}

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: MockIntersectionObserver,
});

// ---------- ResizeObserver ----------
class MockResizeObserver implements ResizeObserver {
  constructor(private callback: ResizeObserverCallback) {}

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: MockResizeObserver,
});

// ---------- navigator.geolocation ----------
const mockGeolocation: Geolocation = {
  getCurrentPosition: vi.fn().mockImplementation((success: PositionCallback) =>
    success({
      coords: {
        latitude: 57.7089,
        longitude: 11.9746,
        accuracy: 10,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
        toJSON: () => ({}),
      },
      timestamp: Date.now(),
      toJSON: () => ({}),
    } as GeolocationPosition),
  ),
  watchPosition: vi.fn().mockReturnValue(1),
  clearWatch: vi.fn(),
};

Object.defineProperty(navigator, 'geolocation', {
  writable: true,
  value: mockGeolocation,
});

// ---------- navigator.mediaDevices ----------
const mockMediaDevices: Partial<MediaDevices> = {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: () => [],
    getVideoTracks: () => [],
    getAudioTracks: () => [],
    addTrack: vi.fn(),
    removeTrack: vi.fn(),
  } as unknown as MediaStream),
  enumerateDevices: vi.fn().mockResolvedValue([
    {
      deviceId: 'mock-camera',
      kind: 'videoinput',
      label: 'Mock Camera',
      groupId: 'mock-group',
      toJSON: () => ({}),
    },
  ]),
};

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  value: mockMediaDevices,
});

// ---------- URL.createObjectURL / revokeObjectURL ----------
if (typeof URL.createObjectURL === 'undefined') {
  URL.createObjectURL = vi.fn().mockReturnValue('blob:mock-url');
}
if (typeof URL.revokeObjectURL === 'undefined') {
  URL.revokeObjectURL = vi.fn();
}

// ---------- scrollTo ----------
Element.prototype.scrollTo = vi.fn();
window.scrollTo = vi.fn() as any;
