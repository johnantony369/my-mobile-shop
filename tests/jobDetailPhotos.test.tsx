import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { JobDetailSheet } from '../src/screens/JobDetailSheet';
import { db, saveJobPhotos } from '../src/db/db';
import { Job } from '../src/types';

// Ensure browser globals for Node test environment
if (typeof (globalThis as any).alert === 'undefined') {
  (globalThis as any).alert = vi.fn();
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    open: vi.fn(),
    location: { origin: 'https://mymobileshop.web.app' },
    navigator: { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } },
  };
}

// Custom matchers
expect.extend({
  toBeInTheDocument(received: any) {
    const pass = received !== null && received !== undefined;
    return {
      pass,
      message: () => `expected element to be in the document`,
    };
  },
  toHaveAttribute(received: any, attr: string, expectedVal?: string) {
    const actualVal = received?.getAttribute ? received.getAttribute(attr) : received?.props?.[attr];
    const pass = expectedVal !== undefined ? actualVal === expectedVal : actualVal !== undefined;
    return {
      pass,
      message: () => `expected attribute "${attr}" to be "${expectedVal}", but got "${actualVal}"`,
    };
  },
});

class TestNode {
  constructor(public element: any) {}

  getAttribute(attr: string): string | undefined {
    if (attr === 'src') return this.element?.props?.src;
    if (attr === 'role') return this.element?.props?.role;
    if (attr === 'aria-label') return this.element?.props?.['aria-label'];
    if (attr === 'aria-modal') return this.element?.props?.['aria-modal'];
    return this.element?.props?.[attr];
  }

  get props() {
    return this.element?.props;
  }

  get textContent(): string {
    return extractText(this.element);
  }
}

function extractText(node: any): string {
  if (!node) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join(' ');
  if (node.props) {
    let text = '';
    if (node.props.children) {
      const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
      text += children.map(extractText).join(' ');
    }
    return text;
  }
  return '';
}

function traverse(node: any, predicate: (node: any) => boolean, results: any[] = []): any[] {
  if (!node) return results;
  if (Array.isArray(node)) {
    for (const item of node) traverse(item, predicate, results);
    return results;
  }
  if (predicate(node)) {
    results.push(node);
  }
  if (typeof node.type === 'function') {
    try {
      const prev = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentDispatcher?.current;
      (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = {
        useState: (init: any) => [typeof init === 'function' ? init() : init, () => {}],
        useEffect: () => {},
        useRef: (init: any) => ({ current: init }),
        useCallback: (fn: any) => fn,
        useMemo: (fn: any) => fn(),
      };
      const expanded = node.type(node.props);
      (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = prev;
      traverse(expanded, predicate, results);
    } catch (e) {}
  }
  if (node.props) {
    if (node.props.children) {
      const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
      for (const child of children) {
        traverse(child, predicate, results);
      }
    }
    if (node.props.footer) {
      traverse(node.props.footer, predicate, results);
    }
  }
  return results;
}

let activeRenderTree: any = null;
let currentDispatcher: any = null;
let rerenderActiveComponent: (() => void) | null = null;

function render(componentElement: React.ReactElement) {
  const hookSlots: any[] = [];
  let hookIdx = 0;
  let effectQueue: Array<() => any> = [];

  const dispatcher = {
    useState: (initial: any) => {
      const idx = hookIdx++;
      if (!(idx in hookSlots)) {
        hookSlots[idx] = typeof initial === 'function' ? initial() : initial;
      }
      const setState = (next: any) => {
        hookSlots[idx] = typeof next === 'function' ? next(hookSlots[idx]) : next;
        rerender();
      };
      return [hookSlots[idx], setState];
    },
    useRef: (initial: any) => {
      const idx = hookIdx++;
      if (!(idx in hookSlots)) {
        hookSlots[idx] = { current: initial };
      }
      return hookSlots[idx];
    },
    useEffect: (fn: any, deps?: any[]) => {
      const idx = hookIdx++;
      const prevDeps = hookSlots[idx];
      let hasChanged = true;
      if (prevDeps && deps) {
        hasChanged = deps.some((d: any, i: number) => !Object.is(d, prevDeps[i]));
      }
      if (hasChanged) {
        hookSlots[idx] = deps;
        effectQueue.push(fn);
      }
    },
    useCallback: (fn: any) => fn,
    useMemo: (fn: any) => fn(),
    useLayoutEffect: (fn: any) => {
      effectQueue.push(fn);
    },
    useSyncExternalStore: (_sub: any, snap: any, ssnap: any) => (ssnap ? ssnap() : snap ? snap() : undefined),
  };

  currentDispatcher = dispatcher;

  const rerender = () => {
    hookIdx = 0;
    const prev = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current;
    (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = dispatcher;
    try {
      const { type: Component, props } = componentElement;
      activeRenderTree = (Component as any)(props);
    } finally {
      (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = prev;
    }
    const effects = [...effectQueue];
    effectQueue = [];
    for (const eff of effects) {
      try {
        eff();
      } catch (e) {
        console.error('Effect execution error:', e);
      }
    }
  };

  rerenderActiveComponent = rerender;
  rerender();
}

const screen = {
  getByText(textOrRegex: string | RegExp): TestNode {
    const matches = traverse(activeRenderTree, (node) => {
      if (typeof node?.props?.children === 'string') {
        return typeof textOrRegex === 'string'
          ? node.props.children.includes(textOrRegex)
          : textOrRegex.test(node.props.children);
      }
      const text = extractText(node);
      return typeof textOrRegex === 'string' ? text.includes(textOrRegex) : textOrRegex.test(text);
    });
    if (!matches.length) {
      throw new Error(`Unable to find element matching text: ${textOrRegex}`);
    }
    return new TestNode(matches[0]);
  },

  queryByText(textOrRegex: string | RegExp): TestNode | null {
    try {
      return screen.getByText(textOrRegex);
    } catch {
      return null;
    }
  },

  getByRole(role: string): TestNode {
    const matches = traverse(activeRenderTree, (node) => {
      if (node?.type === role) return true;
      if (node?.props?.role === role) return true;
      return false;
    });
    if (!matches.length) {
      throw new Error(`Unable to find element with role: ${role}`);
    }
    return new TestNode(matches[0]);
  },

  getAllByRole(role: string): TestNode[] {
    const matches = traverse(activeRenderTree, (node) => {
      if (node?.type === role) return true;
      if (node?.props?.role === role) return true;
      return false;
    });
    return matches.map((m) => new TestNode(m));
  },

  queryByRole(role: string): TestNode | null {
    try {
      return screen.getByRole(role);
    } catch {
      return null;
    }
  },

  getByLabelText(label: string): TestNode {
    const matches = traverse(activeRenderTree, (node) => node?.props?.['aria-label'] === label);
    if (!matches.length) {
      throw new Error(`Unable to find element with aria-label: ${label}`);
    }
    return new TestNode(matches[0]);
  },
};

const fireEvent = {
  click(node: TestNode) {
    if (typeof node.element?.props?.onClick === 'function') {
      node.element.props.onClick({ stopPropagation: () => {}, preventDefault: () => {} });
    }
  },
};

async function waitFor(callback: () => void | Promise<void>, options = { timeout: 1500, interval: 25 }): Promise<void> {
  const start = Date.now();
  while (true) {
    try {
      await callback();
      return;
    } catch (err) {
      if (Date.now() - start >= options.timeout) {
        throw err;
      }
      await new Promise((res) => setTimeout(res, options.interval));
    }
  }
}

describe('Condition photos in JobDetailSheet', () => {
  beforeEach(async () => {
    if (db.jobPhotos) await db.jobPhotos.clear();
  });

  const sampleJob: Job = {
    id: 1,
    cloudId: 'job_detail_test',
    customerName: 'Anil Kumar',
    phone: '9876543210',
    model: 'iPhone 13',
    complaint: 'Cracked back glass',
    status: 'received',
    advance: 0,
    receivedAt: Date.now(),
  };

  it('loads and displays attached photos for the job', async () => {
    await saveJobPhotos('job_detail_test', [
      { photoId: 'p_test_1', dataUrl: 'data:image/jpeg;base64,photo1', label: 'Back glass' },
    ]);

    render(
      <JobDetailSheet
        isOpen={true}
        onClose={vi.fn()}
        job={sampleJob}
        shopName="Test Shop"
        language="en"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenDelivery={vi.fn()}
        onJobUpdated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Condition Photos/i)).toBeInTheDocument();
      expect(screen.getByRole('img')).toBeInTheDocument();
    });
  });

  it('hides condition photos section when job has no photos', async () => {
    render(
      <JobDetailSheet
        isOpen={true}
        onClose={vi.fn()}
        job={sampleJob}
        shopName="Test Shop"
        language="en"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenDelivery={vi.fn()}
        onJobUpdated={vi.fn()}
      />
    );

    // Wait a brief moment for query to complete
    await new Promise((res) => setTimeout(res, 50));
    expect(screen.queryByText(/Condition Photos/i)).toBeNull();
  });

  it('opens PhotoViewerModal when a thumbnail is clicked and closes on close button', async () => {
    await saveJobPhotos('job_detail_test', [
      { photoId: 'p_test_modal', dataUrl: 'data:image/jpeg;base64,modal_img', label: 'Camera glass crack' },
    ]);

    render(
      <JobDetailSheet
        isOpen={true}
        onClose={vi.fn()}
        job={sampleJob}
        shopName="Test Shop"
        language="en"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenDelivery={vi.fn()}
        onJobUpdated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Condition Photos/i)).toBeInTheDocument();
    });

    // Find and click thumbnail button
    const imgThumbnail = screen.getByRole('img');
    expect(imgThumbnail).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    const thumbButton = buttons.find((b) => b.props.children?.some?.((c: any) => c?.type === 'img'));
    expect(thumbButton).toBeDefined();

    fireEvent.click(thumbButton!);

    // Modal should now be open
    const modalDialog = screen.getByRole('dialog');
    expect(modalDialog).toBeInTheDocument();
    expect(screen.getByText('Camera glass crack')).toBeInTheDocument();

    // Close button dismisses modal
    const closeBtn = screen.getByLabelText('Close viewer');
    fireEvent.click(closeBtn);

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders clean thumbnails without sync badges or clock icons', async () => {
    await saveJobPhotos('job_detail_test', [
      { photoId: 'p_clean_1', dataUrl: 'data:image/jpeg;base64,clean1', label: 'Screen' },
    ]);

    render(
      <JobDetailSheet
        isOpen={true}
        onClose={vi.fn()}
        job={sampleJob}
        shopName="Test Shop"
        language="en"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenDelivery={vi.fn()}
        onJobUpdated={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Condition Photos/i)).toBeInTheDocument();
    });

    // Ensure thumbnails don't render sync status text or clock icons
    expect(screen.queryByText(/pending/i)).toBeNull();
    expect(screen.queryByText(/synced/i)).toBeNull();
    expect(screen.queryByText(/uploading/i)).toBeNull();
  });
});
