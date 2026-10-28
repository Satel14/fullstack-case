import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from './ErrorBoundary';

jest.mock('react-i18next', () => {
    const mockReact = require('react');
    const t = (key) => key;
    return {
        useTranslation: () => ({ t }),
        withTranslation: () => (Component) => (props) => mockReact.createElement(Component, { ...props, t }),
    };
});

const Broken = () => {
    throw new Error('render failed');
};

beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
    console.error.mockRestore();
});

test('a page that crashes shows a notice with a reload and a way home instead of a blank screen', () => {
    render(
        <ErrorBoundary resetKey="/case/dust2">
            <Broken />
        </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('crash.title');
    expect(screen.getByText('crash.text')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /crash\.reload/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'error.goHome' })).toHaveAttribute('href', '/');
});

test('the notice stays while the same page re-renders, and clears once the player moves to another page', () => {
    const { rerender } = render(
        <ErrorBoundary resetKey="/case/dust2">
            <Broken />
        </ErrorBoundary>,
    );

    rerender(
        <ErrorBoundary resetKey="/case/dust2">
            <div>case page</div>
        </ErrorBoundary>,
    );
    expect(screen.getByText('crash.title')).toBeInTheDocument();
    expect(screen.queryByText('case page')).toBeNull();

    rerender(
        <ErrorBoundary resetKey="/top">
            <div>top page</div>
        </ErrorBoundary>,
    );
    expect(screen.getByText('top page')).toBeInTheDocument();
    expect(screen.queryByText('crash.title')).toBeNull();
});

test('a healthy page renders untouched', () => {
    render(
        <ErrorBoundary resetKey="/">
            <div>home page</div>
        </ErrorBoundary>,
    );

    expect(screen.getByText('home page')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
});
