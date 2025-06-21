import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Logo from '../components/Logo';

describe('Logo Component', () => {
  it('renders without crashing', () => {
    expect(() => render(<Logo />)).not.toThrow();
  });

  it('renders an SVG element', () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector('svg');
    expect(svg).toBeDefined();
  });

  it('applies custom size correctly', () => {
    const { container } = render(<Logo size={64} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('64');
    expect(svg?.getAttribute('height')).toBe('64');
  });

  it('applies default size when size prop is not provided', () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('width')).toBe('46');
    expect(svg?.getAttribute('height')).toBe('46');
  });

  it('applies custom className', () => {
    const { container } = render(<Logo className="custom-logo-class" />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('class')).toBe('custom-logo-class');
  });

  it('has correct viewBox attribute', () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 64 64');
  });

  it('contains gradient definitions', () => {
    const { container } = render(<Logo />);
    const gradient = container.querySelector('#purpleGradient');
    expect(gradient).toBeDefined();
  });

  it('contains the main background rectangle with gradient', () => {
    const { container } = render(<Logo />);
    const gradientRect = container.querySelector('rect[fill="url(#purpleGradient)"]');
    expect(gradientRect).toBeDefined();
  });

  it('contains geometric family elements', () => {
    const { container } = render(<Logo />);
    const circles = container.querySelectorAll('circle[fill="white"]');
    const lines = container.querySelectorAll('line[stroke="white"]');
    const polygons = container.querySelectorAll('polygon');
    
    expect(circles.length).toBe(5); // 1 central + 4 family member circles
    expect(lines.length).toBe(4); // 4 connecting lines
    expect(polygons.length).toBe(0); // No decorative triangles
  });

  it('has proper SVG namespace', () => {
    const { container } = render(<Logo />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
  });

  it('contains shadow filter definition', () => {
    const { container } = render(<Logo />);
    const shadow = container.querySelector('#shadow');
    expect(shadow).toBeDefined();
  });

  it('renders without errors for different sizes', () => {
    expect(() => render(<Logo size={16} />)).not.toThrow();
    expect(() => render(<Logo size={96} />)).not.toThrow();
    expect(() => render(<Logo size={1} />)).not.toThrow();
  });
}); 