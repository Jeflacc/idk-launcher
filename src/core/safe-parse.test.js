import { describe, it, expect } from 'vitest';
import { safeParse, esc, stripHtml } from '../../src/core/safe-parse.js';

describe('safeParse', () => {
  it('parses valid JSON', () => {
    expect(safeParse('{"a":1}')).toEqual({ a: 1 });
  });
  it('returns fallback on invalid JSON', () => {
    expect(safeParse('{not json', { fallback: true })).toEqual({ fallback: true });
  });
  it('returns fallback on null input', () => {
    expect(safeParse(null, 'def')).toBe('def');
  });
});

describe('esc', () => {
  it('escapes HTML special chars', () => {
    expect(esc('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });
  it('escapes quotes for attribute contexts', () => {
    expect(esc('"onerror="alert(1)')).toBe('&quot;onerror=&quot;alert(1)');
  });
  it('escapes single quotes', () => {
    expect(esc("a'b")).toBe('a&#x27;b');
  });
  it('escapes backticks for template-literal contexts', () => {
    expect(esc('` ${1+1} `')).toBe('&#x60; ${1+1} &#x60;');
  });
  it('returns empty string for null/undefined', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });
  it('coerces non-string values to string', () => {
    expect(esc(42)).toBe('42');
  });
});

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
  });
  it('returns empty string for null', () => {
    expect(stripHtml(null)).toBe('');
  });
  it('preserves text outside of tags', () => {
    expect(stripHtml('before <a href="#">link</a> after')).toBe('before link after');
  });
});
