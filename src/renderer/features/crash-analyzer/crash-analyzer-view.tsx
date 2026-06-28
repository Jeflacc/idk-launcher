import { useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { DEFAULT_CRASH_PATTERNS, CrashAnalyzerService, type CrashReport } from '@/domain/services/crash-analyzer';

const analyzer = new CrashAnalyzerService(DEFAULT_CRASH_PATTERNS);

export function CrashAnalyzerView() {
  const [log, setLog] = useState('');
  const [report, setReport] = useState<CrashReport | null>(null);

  function analyze() {
    setReport(analyzer.analyze(log));
  }

  return (
    <div className="max-w-5xl mx-auto py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Crash analyzer</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Paste a Minecraft crash log or latest.log. The analyzer runs the same data-driven pattern
          set as the main process — pure, testable, no hardcoded inline regex.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <textarea
            value={log}
            onChange={(e) => setLog(e.target.value)}
            placeholder="Paste your crash log here…"
            className="no-drag w-full h-72 p-3 rounded-lg glass text-xs font-mono text-[var(--color-text)] placeholder:text-[var(--color-text-subtle)] focus:outline-none focus:border-[var(--color-accent)] resize-none"
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-[var(--color-text-subtle)]">{log.length} chars</span>
            <Button variant="primary" onClick={analyze} disabled={!log.trim()}>
              Analyze
            </Button>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          {!report && (
            <Card>
              <p className="text-sm text-[var(--color-text-muted)] text-center py-12">
                Results will appear here.
              </p>
            </Card>
          )}
          {report && (
            <>
              <Card>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-sm">Diagnosis</h3>
                  <Badge
                    variant={
                      report.severity === 'fatal'
                        ? 'danger'
                        : report.severity === 'error'
                          ? 'warning'
                          : 'default'
                    }
                  >
                    {report.severity}
                  </Badge>
                </div>
                <p className="text-sm">{report.summary}</p>
                {report.missingMods.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-[var(--color-text-muted)] mb-1">Missing mods:</p>
                    <div className="flex flex-wrap gap-1.5">
                      {report.missingMods.map((m) => (
                        <Badge key={m} variant="danger">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
              {report.patterns.length > 0 && (
                <Card>
                  <h3 className="font-semibold text-sm mb-3">Matched patterns</h3>
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
                    {report.patterns.map((p) => (
                      <div key={p.id} className="text-xs">
                        <div className="flex items-center gap-2 mb-0.5">
                          <Badge variant={p.severity === 'fatal' ? 'danger' : 'warning'}>
                            {p.category}
                          </Badge>
                          <span className="font-medium">{p.title}</span>
                        </div>
                        <p className="text-[var(--color-text-muted)] pl-1">{p.remediation.summary}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
