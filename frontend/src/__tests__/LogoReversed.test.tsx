import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LogoReversed from '../components/LogoReversed';

describe('LogoReversed Component', () => {
  it('renders without crashing', () => {
    expect(() => render(<LogoReversed />)).not.toThrow();
  });

  it('renders an SVG element', () => {
    const { container } = render(<LogoReversed />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });

  it('applies custom size correctly', () => {
    const { container } = render(<LogoReversed size={64} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('64');
    expect(svg?.getAttribute('height')).toBe('64');
  });

  it('applies default size when size prop is not provided', () => {
    const { container } = render(<LogoReversed />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('40');
    expect(svg?.getAttribute('height')).toBe('40');
  });

  it('applies custom className', () => {
    const { container } = render(<LogoReversed className="custom-reversed-logo-class" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toBe('custom-reversed-logo-class');
  });

  it('has correct viewBox attribute', () => {
    const { container } = render(<LogoReversed />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 64 64');
  });

  it('contains reversed gradient definitions', () => {
    const { container } = render(<LogoReversed />);
    const gradient = container.querySelector('#purpleGradientReversed');
    expect(gradient).toBeDefined();
  });

  it('contains the main white background rectangle', () => {
    const { container } = render(<LogoReversed />);
    const whiteRect = container.querySelector('rect[fill="white"]');
    expect(whiteRect).toBeDefined();
  });

  it('contains geometric family elements with purple gradient', () => {
    const { container } = render(<LogoReversed />);
    const purpleCircles = container.querySelectorAll('circle[fill="url(#purpleGradientReversed)"]');
    const purpleLines = container.querySelectorAll('line[stroke="url(#purpleGradientReversed)"]');
    
    expect(purpleCircles.length).toBe(5); // 1 central + 4 family member circles
    expect(purpleLines.length).toBe(4); // 4 connecting lines
  });

  it('has proper SVG namespace', () => {
    const { container } = render(<LogoReversed />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
  });

  it('contains shadow filter definition', () => {
    const { container } = render(<LogoReversed />);
    const shadow = container.querySelector('#shadowReversed');
    expect(shadow).toBeDefined();
  });

  it('renders without errors for different sizes', () => {
    expect(() => render(<LogoReversed size={16} />)).not.toThrow();
    expect(() => render(<LogoReversed size={96} />)).not.toThrow();
    expect(() => render(<LogoReversed size={1} />)).not.toThrow();
  });

  it('has hover animation styles', () => {
    const { container } = render(<LogoReversed />);
    const svg = container.querySelector('svg');
    const style = window.getComputedStyle(svg!);
    expect(svg?.style.transition).toContain('transform');
    expect(svg?.style.cursor).toBe('pointer');
  });
}); 