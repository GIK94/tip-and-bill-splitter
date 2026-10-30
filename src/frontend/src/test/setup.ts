import '@testing-library/jest-dom/vitest';

// jsdom lacks these browser APIs, which Ant Design uses for responsive layout.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver ??= ResizeObserverStub;

// jsdom throws "Not implemented" when a pseudo-element is passed (antd measures scrollbars that way).
const getComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (elt: Element) => getComputedStyle(elt);
