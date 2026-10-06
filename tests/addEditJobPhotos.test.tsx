import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderToString } from 'react-dom/server';
import 'fake-indexeddb/auto';
import { AddEditJobSheet } from '../src/screens/AddEditJobSheet';
import { db, saveJobPhotos, getJobPhotos } from '../src/db/db';
import { compressImageFile } from '../src/utils/image';
import { Job } from '../src/types';

// Ensure browser globals used during notifications/alerts exist in Node environment
if (typeof (globalThis as any).alert === 'undefined') {
  (globalThis as any).alert = vi.fn();
}
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = {
    open: vi.fn(),
    location: { origin: 'https://mymobileshop.web.app' },
  };
}

vi.mock('dexie-react-hooks', () => ({
  useLiveQuery: (_fn: any, _deps: any, defaultVal: any) => defaultVal ?? [],
}));

vi.mock('../src/utils/image', () => ({
  compressImageFile: vi.fn().mockImplementation((file: File) =>
    Promise.resolve({
      dataUrl: 'data:image/jpeg;base64,mockphoto_' + file.name,
      blob: new Blob(['mock'], { type: 'image/jpeg' }),
    })
  ),
}));

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

interface MockElement {
  textContent?: string;
  getAttribute: (attr: string) => string | undefined;
  props?: any;
}

let lastRenderedHtml = '';

function render(componentElement: React.ReactElement) {
  lastRenderedHtml = renderToString(componentElement);
}

const screen = {
  getByText(textOrRegex: string | RegExp): MockElement {
    const stripHtml = lastRenderedHtml.replace(/<[^>]*>/g, ' ');
    const isMatch = typeof textOrRegex === 'string'
      ? stripHtml.includes(textOrRegex)
      : textOrRegex.test(stripHtml);

    if (!isMatch) {
      throw new Error(`Unable to find element with text: ${textOrRegex}`);
    }
    return {
      textContent: typeof textOrRegex === 'string' ? textOrRegex : textOrRegex.source,
      getAttribute: () => undefined,
    };
  },

  getByLabelText(labelOrRegex: string | RegExp): MockElement {
    const regex = typeof labelOrRegex === 'string'
      ? new RegExp(`aria-label=["']([^"']*${labelOrRegex}[^"']*)["']`, 'i')
      : new RegExp(`aria-label=["']([^"']*${labelOrRegex.source}[^"']*)["']`, 'i');

    const match = lastRenderedHtml.match(regex);
    if (!match) {
      throw new Error(`Unable to find element with aria-label: ${labelOrRegex}`);
    }
    return {
      textContent: match[1],
      getAttribute: (attr: string) => (attr === 'aria-label' ? match[1] : undefined),
    };
  },

  queryByLabelText(labelOrRegex: string | RegExp): MockElement | null {
    try {
      return screen.getByLabelText(labelOrRegex);
    } catch {
      return null;
    }
  },
};

// Interactive test harness for simulating state and user interactions
function mountJobSheet(props: any) {
  const hookSlots: any[] = [];
  let hookIdx = 0;
  let effectQueue: Array<() => any> = [];
  let currentTree: any = null;

  const dispatcher = {
    useState: (init: any) => {
      const idx = hookIdx++;
      if (!(idx in hookSlots)) {
        hookSlots[idx] = typeof init === 'function' ? init() : init;
      }
      const setState = (next: any) => {
        hookSlots[idx] = typeof next === 'function' ? next(hookSlots[idx]) : next;
        rerender();
      };
      return [hookSlots[idx], setState];
    },
    useRef: (init: any) => {
      const idx = hookIdx++;
      if (!(idx in hookSlots)) {
        hookSlots[idx] = { current: init };
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

  const rerender = () => {
    hookIdx = 0;
    const prevDispatcher = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current;
    (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = dispatcher;
    try {
      currentTree = AddEditJobSheet(props);
    } finally {
      (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = prevDispatcher;
    }
    const effects = [...effectQueue];
    effectQueue = [];
    for (const eff of effects) {
      try { eff(); } catch (e) {}
    }
  };

  rerender();

  const findNodes = (predicate: (node: any) => boolean): any[] => {
    const results: any[] = [];
    const traverse = (n: any) => {
      if (!n) return;
      if (Array.isArray(n)) {
        for (const item of n) traverse(item);
        return;
      }
      if (predicate(n)) results.push(n);
      if (n.props) {
        if (n.props.children) {
          const children = Array.isArray(n.props.children) ? n.props.children : [n.props.children];
          for (const c of children) {
            if (c) traverse(c);
          }
        }
        if (n.props.footer) {
          traverse(n.props.footer);
        }
      }
    };
    traverse(currentTree);
    return results;
  };

  return {
    getTree: () => currentTree,
    rerender,
    findNodes,
    findNode: (predicate: (node: any) => boolean) => findNodes(predicate)[0] || null,
    changeInput: (placeholderMatcher: string, value: string) => {
      const inputs = findNodes((n) => n.type === 'input');
      const input = inputs.find((n) => n.props?.placeholder?.includes?.(placeholderMatcher));
      if (!input) throw new Error(`Could not find input with placeholder matching ${placeholderMatcher}`);
      input.props.onChange({ target: { value } });
    },
    submit: async () => {
      const form = findNodes((n) => n.type === 'form')[0];
      if (!form?.props?.onSubmit) throw new Error('Form not found');
      await form.props.onSubmit({ preventDefault: () => {} });
    },
  };
}

describe('Intake Photos in AddEditJobSheet', () => {
  beforeEach(async () => {
    if (db.jobs) await db.jobs.clear();
    if (db.jobPhotos) await db.jobPhotos.clear();
    if (db.entries) await db.entries.clear();
    (globalThis as any).alert = vi.fn();
    (globalThis as any).window = {
      open: vi.fn(),
      location: { origin: 'https://mymobileshop.web.app' },
    };
    vi.clearAllMocks();
  });

  it('renders intake photo section with add photo button', () => {
    render(
      <AddEditJobSheet
        isOpen={true}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        jobToEdit={null}
        language="en"
      />
    );

    expect(screen.getByText(/Condition Photos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Add intake photo/i)).toBeInTheDocument();
  });

  it('provides hidden file input configured for image capture', () => {
    render(
      <AddEditJobSheet
        isOpen={true}
        onClose={vi.fn()}
        onSaved={vi.fn()}
        jobToEdit={null}
        language="en"
      />
    );

    expect(lastRenderedHtml).toContain('type="file"');
    expect(lastRenderedHtml).toContain('accept="image/*"');
    expect(lastRenderedHtml).toContain('multiple');
    expect(lastRenderedHtml).toContain('class="hidden"');
  });

  it('compresses and appends photos when a file is selected', async () => {
    const mounted = mountJobSheet({
      isOpen: true,
      onClose: vi.fn(),
      onSaved: vi.fn(),
      jobToEdit: null,
      language: 'en',
    });

    const fileInput = mounted.findNode((n) => n.type === 'input' && n.props?.type === 'file');
    expect(fileInput).not.toBeNull();

    const mockFile = new File(['fake content'], 'screen_crack.jpg', { type: 'image/jpeg' });
    await fileInput.props.onChange({
      target: { files: [mockFile] },
    });

    expect(compressImageFile).toHaveBeenCalledWith(mockFile);

    // After state update, thumbnail image is rendered
    const imgNode = mounted.findNode((n) => n.type === 'img' && n.props?.src?.includes('data:image/jpeg'));
    expect(imgNode).not.toBeNull();
    expect(imgNode.props.src).toBe('data:image/jpeg;base64,mockphoto_screen_crack.jpg');

    // Delete button exists for thumbnail
    const deleteBtn = mounted.findNode((n) => n.type === 'button' && n.props?.['aria-label'] === 'Remove photo 1');
    expect(deleteBtn).not.toBeNull();
  });

  it('removes photo from list when (X) delete button is clicked', async () => {
    const mounted = mountJobSheet({
      isOpen: true,
      onClose: vi.fn(),
      onSaved: vi.fn(),
      jobToEdit: null,
      language: 'en',
    });

    const fileInput = mounted.findNode((n) => n.type === 'input' && n.props?.type === 'file');
    const mockFile = new File(['fake content'], 'test.jpg', { type: 'image/jpeg' });
    await fileInput.props.onChange({
      target: { files: [mockFile] },
    });

    let deleteBtn = mounted.findNode((n) => n.type === 'button' && n.props?.['aria-label'] === 'Remove photo 1');
    expect(deleteBtn).not.toBeNull();

    // Click delete
    deleteBtn.props.onClick();

    // Verify thumbnail is gone
    const imgAfterDelete = mounted.findNode((n) => n.type === 'img' && n.props?.src?.includes('data:image/jpeg'));
    expect(imgAfterDelete).toBeNull();
  });

  it('enforces maximum 4 photos limit and alerts user', async () => {
    const alertMock = vi.fn();
    (globalThis as any).alert = alertMock;

    const mounted = mountJobSheet({
      isOpen: true,
      onClose: vi.fn(),
      onSaved: vi.fn(),
      jobToEdit: null,
      language: 'en',
    });

    // Add 4 photos by querying the input freshly on each iteration
    for (let i = 1; i <= 4; i++) {
      const input = mounted.findNode((n) => n.type === 'input' && n.props?.type === 'file');
      await input.props.onChange({
        target: { files: [new File([''], `photo${i}.jpg`, { type: 'image/jpeg' })] },
      });
    }

    const imgs = mounted.findNodes((n) => n.type === 'img' && n.props?.src?.includes('data:image/jpeg'));
    expect(imgs).toHaveLength(4);

    // Try adding a 5th photo
    const input5 = mounted.findNode((n) => n.type === 'input' && n.props?.type === 'file');
    await input5.props.onChange({
      target: { files: [new File([''], 'photo5.jpg', { type: 'image/jpeg' })] },
    });

    expect(alertMock).toHaveBeenCalledWith('Maximum 4 photos allowed');
    const imgsAfter = mounted.findNodes((n) => n.type === 'img' && n.props?.src?.includes('data:image/jpeg'));
    expect(imgsAfter).toHaveLength(4);
  });

  it('saves attached photos into db via saveJobPhotos on job creation', async () => {
    const handleSaved = vi.fn();
    const handleClose = vi.fn();

    const mounted = mountJobSheet({
      isOpen: true,
      onClose: handleClose,
      onSaved: handleSaved,
      jobToEdit: null,
      language: 'en',
    });

    // Populate required inputs
    mounted.changeInput('Rajesh', 'Deepak');
    mounted.changeInput('9876543210', '9876543210');
    mounted.changeInput('Redmi Note', 'OnePlus 9R');
    mounted.changeInput('Screen broken', 'Broken AMOLED display');

    // Attach 2 intake photos
    const fileInput = mounted.findNode((n) => n.type === 'input' && n.props?.type === 'file');
    await fileInput.props.onChange({
      target: {
        files: [
          new File(['content1'], 'damage1.jpg', { type: 'image/jpeg' }),
          new File(['content2'], 'damage2.jpg', { type: 'image/jpeg' }),
        ],
      },
    });

    // Submit form
    await mounted.submit();

    expect(handleSaved).toHaveBeenCalled();
    const createdJob = await db.jobs.toCollection().first();
    expect(createdJob).toBeDefined();
    expect(createdJob?.cloudId).toBeDefined();

    const savedPhotos = await getJobPhotos(createdJob!.cloudId!);
    expect(savedPhotos).toHaveLength(2);
    expect(savedPhotos[0].dataUrl).toContain('mockphoto_damage1.jpg');
    expect(savedPhotos[1].dataUrl).toContain('mockphoto_damage2.jpg');
    expect(savedPhotos[0].uploadStatus).toBe('pending');
  });

  it('loads existing photos when editing a job with jobToEdit and getJobPhotos', async () => {
    const cloudId = 'job_edit_cloud_123';
    await saveJobPhotos(cloudId, [
      { photoId: 'photo_existing_1', dataUrl: 'data:image/jpeg;base64,existing1' },
      { photoId: 'photo_existing_2', dataUrl: 'data:image/jpeg;base64,existing2' },
    ]);

    const jobToEdit: Job = {
      id: 99,
      cloudId,
      customerName: 'Kavitha',
      phone: '9876543210',
      model: 'iPhone 12',
      complaint: 'Cracked back glass',
      estimate: 3500,
      advance: 500,
      status: 'received',
      receivedAt: Date.now(),
    };

    const mounted = mountJobSheet({
      isOpen: true,
      onClose: vi.fn(),
      onSaved: vi.fn(),
      jobToEdit,
      language: 'en',
    });

    // Allow promise from getJobPhotos to resolve
    await new Promise((res) => setTimeout(res, 50));
    mounted.rerender();

    const imgs = mounted.findNodes((n) => n.type === 'img' && n.props?.src?.includes('data:image/jpeg'));
    expect(imgs).toHaveLength(2);
    expect(imgs[0].props.src).toBe('data:image/jpeg;base64,existing1');
    expect(imgs[1].props.src).toBe('data:image/jpeg;base64,existing2');
  });

  it('deletes removed photo from db on save when editing a job', async () => {
    const cloudId = 'job_edit_delete_test';
    await saveJobPhotos(cloudId, [
      { photoId: 'p_to_keep', dataUrl: 'data:image/jpeg;base64,keep' },
      { photoId: 'p_to_delete', dataUrl: 'data:image/jpeg;base64,delete' },
    ]);

    const jobId = await db.jobs.add({
      cloudId,
      customerName: 'Manoj',
      phone: '9876543210',
      model: 'Samsung S21',
      complaint: 'Charging issue',
      estimate: 1200,
      advance: 0,
      status: 'received',
      receivedAt: Date.now(),
      readyAt: null,
      deliveredAt: null,
      finalAmount: null,
      bookEntryId: null,
    });

    const jobToEdit = (await db.jobs.get(jobId))!;

    const handleSaved = vi.fn();
    const mounted = mountJobSheet({
      isOpen: true,
      onClose: vi.fn(),
      onSaved: handleSaved,
      jobToEdit,
      language: 'en',
    });

    await new Promise((res) => setTimeout(res, 50));
    mounted.rerender();

    // Find delete button for p_to_delete (second photo)
    const deleteBtn = mounted.findNode((n) => n.type === 'button' && n.props?.['aria-label'] === 'Remove photo 2');
    expect(deleteBtn).not.toBeNull();
    deleteBtn.props.onClick();

    // Save job
    await mounted.submit();

    expect(handleSaved).toHaveBeenCalledWith(jobId);

    const remainingPhotos = await getJobPhotos(cloudId);
    expect(remainingPhotos).toHaveLength(1);
    expect(remainingPhotos[0].photoId).toBe('p_to_keep');
  });

  it('passes photo count to buildIntakeSlipMessage when WhatsApp notification is sent', async () => {
    const openSpy = vi.fn();
    (globalThis as any).window = {
      open: openSpy,
      location: { origin: 'https://mymobileshop.web.app' },
    };

    const mounted = mountJobSheet({
      isOpen: true,
      onClose: vi.fn(),
      onSaved: vi.fn(),
      jobToEdit: null,
      language: 'en',
      shopName: 'Kerala Mobile Care',
    });

    // Fill fields
    mounted.changeInput('Rajesh', 'Sujith');
    mounted.changeInput('9876543210', '9876543210');
    mounted.changeInput('Redmi Note', 'Realme 8');
    mounted.changeInput('Screen broken', 'Speaker not working');

    // Add 3 intake photos
    const fileInput = mounted.findNode((n) => n.type === 'input' && n.props?.type === 'file');
    await fileInput.props.onChange({
      target: {
        files: [
          new File(['1'], 'p1.jpg', { type: 'image/jpeg' }),
          new File(['2'], 'p2.jpg', { type: 'image/jpeg' }),
          new File(['3'], 'p3.jpg', { type: 'image/jpeg' }),
        ],
      },
    });

    await mounted.submit();

    expect(openSpy).toHaveBeenCalled();
    const openedUrl = openSpy.mock.calls[0][0];
    const decodedUrl = decodeURIComponent(openedUrl);
    expect(decodedUrl).toContain('Photos: 3 intake condition photo(s) recorded');
  });

  it('renders clean thumbnails without sync status badges or clock icons', async () => {
    const mounted = mountJobSheet({
      isOpen: true,
      onClose: vi.fn(),
      onSaved: vi.fn(),
      jobToEdit: null,
      language: 'en',
    });

    const fileInput = mounted.findNode((n) => n.type === 'input' && n.props?.type === 'file');
    await fileInput.props.onChange({
      target: { files: [new File(['thumb'], 'clean.jpg', { type: 'image/jpeg' })] },
    });

    // Verify thumbnail exists
    const imgNode = mounted.findNode((n) => n.type === 'img' && n.props?.src?.includes('mockphoto_clean.jpg'));
    expect(imgNode).not.toBeNull();

    // Verify no clock or sync icons exist in the photo container
    const clockOrSyncIcons = mounted.findNodes(
      (n) =>
        typeof n.type === 'function' &&
        (n.type.name?.toLowerCase().includes('clock') ||
          n.type.name?.toLowerCase().includes('sync') ||
          n.type.displayName?.toLowerCase().includes('sync'))
    );
    expect(clockOrSyncIcons).toHaveLength(0);
  });
});
