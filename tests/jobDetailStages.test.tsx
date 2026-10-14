import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { JobDetailSheet } from '../src/screens/JobDetailSheet';
import { db } from '../src/db/db';
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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/app', search: '' }),
  };
});

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

function render(componentElement: React.ReactElement) {
  const hookSlots: any[] = [];
  let hookIdx = 0;

  const dispatcher = {
    useState: (initial: any) => {
      const idx = hookIdx++;
      if (!(idx in hookSlots)) {
        hookSlots[idx] = typeof initial === 'function' ? initial() : initial;
      }
      const setState = (next: any) => {
        hookSlots[idx] = typeof next === 'function' ? next(hookSlots[idx]) : next;
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
    useEffect: () => {},
    useCallback: (fn: any) => fn,
    useMemo: (fn: any) => fn(),
    useContext: () => ({
      basename: '/',
      navigator: { push: vi.fn(), replace: vi.fn(), go: vi.fn(), createHref: vi.fn() },
      location: { pathname: '/app', search: '', hash: '', state: null, key: 'default' },
    }),
  };

  const prev = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED?.ReactCurrentDispatcher?.current;
  (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = dispatcher;
  
  let tree: any = null;
  try {
    tree = (componentElement.type as any)(componentElement.props);
  } finally {
    (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = prev;
  }

  const text = extractText(tree);
  return { tree, text };
}

describe('JobDetailSheet Repair Stages & Actions Workflow', () => {
  beforeEach(async () => {
    await db.jobs.clear();
    await db.entries.clear();
  });

  const baseJob: Job = {
    id: 10,
    customerName: 'Anoop',
    phone: '9876543210',
    model: 'OnePlus 11R',
    complaint: 'Screen glass replaced',
    estimate: 3500,
    advance: 1000,
    status: 'received',
    receivedAt: Date.now(),
  };

  it('renders interactive stepper with all 4 stages', () => {
    const { text } = render(
      <JobDetailSheet
        isOpen={true}
        onClose={vi.fn()}
        job={baseJob}
        shopName="Kerala Mobile Shop"
        language="en"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenDelivery={vi.fn()}
        onJobUpdated={vi.fn()}
      />
    );

    expect(text).toContain('Repair Progress');
    expect(text).toContain('Received');
    expect(text).toContain('In Progress');
    expect(text).toContain('Ready');
    expect(text).toContain('Delivered');
  });

  it('for received job, provides Mark as Ready primary CTA, Start Repair and Waiting for Parts', () => {
    const { text } = render(
      <JobDetailSheet
        isOpen={true}
        onClose={vi.fn()}
        job={baseJob}
        shopName="Kerala Mobile Shop"
        language="en"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenDelivery={vi.fn()}
        onJobUpdated={vi.fn()}
      />
    );

    expect(text).toContain('Mark as Ready');
    expect(text).toContain('Start Repair (In Progress)');
    expect(text).toContain('Waiting for Parts');
  });

  it('for in_progress job, provides Mark as Ready and Waiting for Parts option', () => {
    const inProgressJob: Job = { ...baseJob, status: 'in_progress' };
    const { text } = render(
      <JobDetailSheet
        isOpen={true}
        onClose={vi.fn()}
        job={inProgressJob}
        shopName="Kerala Mobile Shop"
        language="en"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenDelivery={vi.fn()}
        onJobUpdated={vi.fn()}
      />
    );

    expect(text).toContain('Mark as Ready');
    expect(text).toContain('Waiting for Parts');
    expect(text).toContain('Return without repair');
  });

  it('for waiting job, displays hold indicator banner and Resume Repair button', () => {
    const waitingJob: Job = { ...baseJob, status: 'waiting' };
    const { text } = render(
      <JobDetailSheet
        isOpen={true}
        onClose={vi.fn()}
        job={waitingJob}
        shopName="Kerala Mobile Shop"
        language="en"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenDelivery={vi.fn()}
        onJobUpdated={vi.fn()}
      />
    );

    expect(text).toContain('On Hold: Waiting for Parts');
    expect(text).toContain('Mark as Ready');
    expect(text).toContain('Resume Repair');
    expect(text).toContain('Return without repair');
  });

  it('for ready job, provides Mark as Delivered and Instant Billing', () => {
    const readyJob: Job = { ...baseJob, status: 'ready', readyAt: Date.now() };
    const { text } = render(
      <JobDetailSheet
        isOpen={true}
        onClose={vi.fn()}
        job={readyJob}
        shopName="Kerala Mobile Shop"
        language="en"
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onOpenDelivery={vi.fn()}
        onOpenBilling={vi.fn()}
        onJobUpdated={vi.fn()}
      />
    );

    expect(text).toContain('Mark as Delivered');
    expect(text).toContain('Generate Bill / Receipt');
    expect(text).toContain('Take Photo (Repaired Device)');
  });
});
