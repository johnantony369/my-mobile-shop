import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import { PhotoViewerModal } from '../src/components/PhotoViewerModal';

// Setup custom Vitest matchers for testing-library compatibility
expect.extend({
  toHaveAttribute(received: any, attr: string, expectedVal?: string) {
    const actualVal = received?.getAttribute ? received.getAttribute(attr) : received?.props?.[attr];
    const pass = expectedVal !== undefined ? actualVal === expectedVal : actualVal !== undefined;
    return {
      pass,
      message: () => `expected attribute "${attr}" to be "${expectedVal}", but got "${actualVal}"`,
    };
  },
  toBeInTheDocument(received: any) {
    const pass = received !== null && received !== undefined;
    return {
      pass,
      message: () => `expected element to be in the document`,
    };
  },
});

// Lightweight virtual DOM test helper to support brief test structure without extra packages
class TestNode {
  constructor(public element: any, private rerenderFn?: () => void) {}

  getAttribute(attr: string) {
    if (attr === 'src') return this.element?.props?.src;
    if (attr === 'role') return this.element?.props?.role;
    if (attr === 'aria-modal') return this.element?.props?.['aria-modal'];
    if (attr === 'aria-label') return this.element?.props?.['aria-label'];
    return this.element?.props?.[attr];
  }

  get props() {
    return this.element?.props;
  }
}

let renderedTree: any = null;
let currentZoomState = false;
let onRerender: (() => void) | null = null;
let activeCleanups: Array<() => void> = [];

function render(componentElement: React.ReactElement) {
  currentZoomState = false;
  activeCleanups.forEach((c) => c());
  activeCleanups = [];

  const renderComponent = () => {
    // Inject dispatcher for React hooks support
    const ReactCurrentDispatcher =
      (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentDispatcher;
    
    if (ReactCurrentDispatcher) {
      ReactCurrentDispatcher.current = {
        useState: (initial: any) => {
          const setState = (next: any) => {
            currentZoomState = typeof next === 'function' ? next(currentZoomState) : next;
            if (onRerender) onRerender();
          };
          return [currentZoomState, setState];
        },
        useEffect: (cb: () => any) => {
          const cleanup = cb();
          if (typeof cleanup === 'function') {
            activeCleanups.push(cleanup);
          }
        },
        useLayoutEffect: () => {},
        useCallback: (fn: any) => fn,
        useMemo: (fn: any) => fn(),
        useRef: (init: any) => ({ current: init }),
      };
    }

    const { type: Component, props } = componentElement;
    renderedTree = (Component as any)(props);
  };

  onRerender = renderComponent;
  renderComponent();
}

function traverseTree(node: any, predicate: (node: any) => boolean, results: any[] = []): any[] {
  if (!node) return results;
  if (predicate(node)) {
    results.push(node);
  }
  if (node.props && node.props.children) {
    const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
    for (const child of children) {
      if (child && typeof child === 'object') {
        traverseTree(child, predicate, results);
      }
    }
  }
  return results;
}

const screen = {
  getByRole(role: string): TestNode {
    const matches = traverseTree(renderedTree, (node) => node?.type === role || node?.props?.role === role);
    if (!matches.length) throw new Error(`Unable to find element with role "${role}"`);
    return new TestNode(matches[0]);
  },
  getByText(text: string): TestNode {
    const matches = traverseTree(renderedTree, (node) => {
      if (typeof node?.props?.children === 'string' && node.props.children.includes(text)) return true;
      if (node?.props?.alt === text) return true;
      return false;
    });
    if (!matches.length) throw new Error(`Unable to find element with text "${text}"`);
    return new TestNode(matches[0]);
  },
  getByLabelText(label: string): TestNode {
    const matches = traverseTree(renderedTree, (node) => node?.props?.['aria-label'] === label);
    if (!matches.length) throw new Error(`Unable to find element with aria-label "${label}"`);
    return new TestNode(matches[0]);
  },
};

const fireEvent = {
  click(target: TestNode) {
    if (typeof target.props?.onClick === 'function') {
      target.props.onClick({ stopPropagation: () => {}, preventDefault: () => {} });
    }
  },
};

const eventListeners: Record<string, Function[]> = {};

if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    addEventListener: (event: string, fn: Function) => {
      eventListeners[event] = eventListeners[event] || [];
      eventListeners[event].push(fn);
    },
    removeEventListener: (event: string, fn: Function) => {
      if (eventListeners[event]) {
        eventListeners[event] = eventListeners[event].filter((f) => f !== fn);
      }
    },
    dispatchEvent: (event: any) => {
      const type = event?.type || 'keydown';
      (eventListeners[type] || []).forEach((fn) => fn(event));
      return true;
    },
  };
}

if (typeof (globalThis as any).KeyboardEvent === 'undefined') {
  (globalThis as any).KeyboardEvent = class KeyboardEvent {
    type: string;
    key: string;
    constructor(type: string, init?: { key?: string }) {
      this.type = type;
      this.key = init?.key || '';
    }
  };
}

describe('PhotoViewerModal', () => {
  beforeEach(() => {
    activeCleanups.forEach((c) => c());
    activeCleanups = [];
    Object.keys(eventListeners).forEach((k) => delete eventListeners[k]);
  });

  const mockPhoto = {
    photoId: 'p_1',
    dataUrl: 'data:image/jpeg;base64,abc',
    label: 'Front screen scratch',
  };

  it('renders photo and label when open', () => {
    const handleClose = vi.fn();
    render(
      <PhotoViewerModal
        isOpen={true}
        photo={mockPhoto}
        onClose={handleClose}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'data:image/jpeg;base64,abc');
    expect(screen.getByText('Front screen scratch')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(
      <PhotoViewerModal
        isOpen={true}
        photo={mockPhoto}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByLabelText('Close viewer');
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalled();
  });

  it('renders nothing when isOpen is false', () => {
    const handleClose = vi.fn();
    const html = renderToString(
      <PhotoViewerModal
        isOpen={false}
        photo={mockPhoto}
        onClose={handleClose}
      />
    );
    expect(html).toBe('');
  });

  it('renders nothing when photo is null', () => {
    const handleClose = vi.fn();
    const html = renderToString(
      <PhotoViewerModal
        isOpen={true}
        photo={null}
        onClose={handleClose}
      />
    );
    expect(html).toBe('');
  });

  it('falls back to downloadUrl if dataUrl is absent', () => {
    const cloudPhoto = {
      photoId: 'p_cloud',
      downloadUrl: 'https://storage.googleapis.com/test-bucket/sample.jpg',
      label: 'Back glass cracked',
    };
    render(
      <PhotoViewerModal
        isOpen={true}
        photo={cloudPhoto}
        onClose={() => {}}
      />
    );

    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://storage.googleapis.com/test-bucket/sample.jpg');
    expect(screen.getByText('Back glass cracked')).toBeInTheDocument();
  });

  it('renders default fallback labels when label is not provided', () => {
    const unlabeledPhoto = {
      photoId: 'p_unlabeled',
      dataUrl: 'data:image/jpeg;base64,raw',
    };
    render(
      <PhotoViewerModal
        isOpen={true}
        photo={unlabeledPhoto}
        onClose={() => {}}
      />
    );

    expect(screen.getByText('Intake Photo')).toBeInTheDocument();
  });

  it('includes accessibility attributes role="dialog" and aria-modal="true"', () => {
    const html = renderToString(
      <PhotoViewerModal
        isOpen={true}
        photo={mockPhoto}
        onClose={() => {}}
      />
    );
    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
  });

  it('toggles zoom state when zoom button is clicked', () => {
    render(
      <PhotoViewerModal
        isOpen={true}
        photo={mockPhoto}
        onClose={() => {}}
      />
    );

    const zoomBtn = screen.getByLabelText('Toggle zoom');
    const imgBefore = screen.getByRole('img');
    expect(imgBefore.props.className).toContain('scale-100');

    fireEvent.click(zoomBtn);
    const imgAfter = screen.getByRole('img');
    expect(imgAfter.props.className).toContain('scale-150');
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <PhotoViewerModal
        isOpen={true}
        photo={mockPhoto}
        onClose={handleClose}
      />
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when keys other than Escape are pressed', () => {
    const handleClose = vi.fn();
    render(
      <PhotoViewerModal
        isOpen={true}
        photo={mockPhoto}
        onClose={handleClose}
      />
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('removes Escape key listener when unmounted or closed', () => {
    const handleClose = vi.fn();
    render(
      <PhotoViewerModal
        isOpen={true}
        photo={mockPhoto}
        onClose={handleClose}
      />
    );

    render(
      <PhotoViewerModal
        isOpen={false}
        photo={mockPhoto}
        onClose={handleClose}
      />
    );

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(handleClose).not.toHaveBeenCalled();
  });
});
