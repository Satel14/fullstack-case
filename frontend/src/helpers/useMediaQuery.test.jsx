import React from 'react';
import { act, render, screen } from '@testing-library/react';
import useMediaQuery from './useMediaQuery';

const originalMatchMedia = window.matchMedia;
let lists;

const mediaList = (query, matches) => {
    const listeners = new Set();
    return {
        query,
        matches,
        listeners,
        addEventListener: (event, listener) => listeners.add(listener),
        removeEventListener: (event, listener) => listeners.delete(listener),
        change(next) {
            this.matches = next;
            listeners.forEach((listener) => listener({ matches: next }));
        },
    };
};

beforeEach(() => {
    lists = {};
    window.matchMedia = jest.fn((query) => {
        lists[query] = lists[query] || mediaList(query, query === '(min-width: 992px)');
        return lists[query];
    });
});

afterEach(() => {
    window.matchMedia = originalMatchMedia;
});

const Probe = ({ query }) => <span>{useMediaQuery(query) ? 'match' : 'no match'}</span>;

test('answers on the first render, before any effect runs', () => {
    const seen = [];
    const Recorder = () => {
        seen.push(useMediaQuery('(min-width: 992px)'));
        return null;
    };

    render(<Recorder />);

    expect(seen[0]).toBe(true);
});

test('follows the screen when it crosses the breakpoint', () => {
    render(<Probe query="(min-width: 992px)" />);
    expect(screen.getByText('match')).toBeInTheDocument();

    act(() => lists['(min-width: 992px)'].change(false));
    expect(screen.getByText('no match')).toBeInTheDocument();

    act(() => lists['(min-width: 992px)'].change(true));
    expect(screen.getByText('match')).toBeInTheDocument();
});

test('stops listening once the component is gone', () => {
    const { unmount } = render(<Probe query="(min-width: 1200px)" />);
    expect(lists['(min-width: 1200px)'].listeners.size).toBe(1);

    unmount();

    expect(lists['(min-width: 1200px)'].listeners.size).toBe(0);
});
