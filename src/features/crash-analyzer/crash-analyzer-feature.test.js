import { describe, it, expect } from 'vitest';
import { formatAnalysis } from './crash-analyzer-feature.js';

describe('crash-analyzer formatAnalysis', () => {
  it('returns error markup when analysis.error is set', () => {
    const out = formatAnalysis({ error: 'No crash detected' });
    expect(out).toContain('crash-analysis-error');
    expect(out).toContain('No crash detected');
    // Must NOT contain unescaped HTML — the error message should be escaped
    expect(out).not.toContain('<script>');
  });

  it('escapes user-controlled fields (title, message, suggestions)', () => {
    const out = formatAnalysis({
      title: '<script>alert("xss")</script>',
      description: 'safe description',
      message: 'evil: <img src=x onerror=alert(1)>',
      severity: 'critical',
      suggestions: ['<b>bold</b>', 'plain text'],
      modSpecificAdvice: [],
      modsLoaded: 5,
      exception: 'RuntimeException',
    });
    // Raw HTML must be escaped so it renders as text, not as a live element
    expect(out).not.toContain('<script>');
    expect(out).not.toContain('<img ');
    expect(out).not.toContain('<b>bold</b>');
    expect(out).toContain('&lt;script&gt;');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(out).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(out).toContain('plain text');
  });

  it('handles missing optional fields gracefully', () => {
    const out = formatAnalysis({
      title: 'Crash',
      description: 'desc',
      severity: 'medium',
      // message, suggestions, modSpecificAdvice omitted
      modsLoaded: 0,
      exception: 'Error',
    });
    expect(out).toContain('Crash');
    expect(out).toContain('desc');
    // Should not throw on missing suggestions / modSpecificAdvice arrays
    expect(out).toContain('0 mods loaded');
  });

  it('falls back to medium color for unknown severity', () => {
    const out = formatAnalysis({
      title: 'T', description: 'D', severity: 'unknown-severity',
      suggestions: [], modSpecificAdvice: [], modsLoaded: 0, exception: 'X'
    });
    expect(out).toContain('#eab308'); // medium color
  });
});
