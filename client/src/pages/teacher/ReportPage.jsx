import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Card, CardContent, CardHeader, CardTitle, Badge, Spinner } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChevronLeft, Download } from 'lucide-react';

import { useDownloadPdf } from '../../hooks/useDownloadPdf';
import Chat from '../../components/Chat';

export default function ReportPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const downloadPdf = useDownloadPdf();

  useEffect(() => {
    api.get(`/reports/${submissionId}`).then(r => setReport(r.data)).finally(() => setLoading(false));
  }, [submissionId]);

  if (loading) return <div className="flex justify-center mt-20"><Spinner className="h-8 w-8" /></div>;
  if (!report) return <p className="text-muted-foreground">Звіт не знайдено.</p>;

  const { structureResult, plagiarismMatches, grammarResult, completenessResult } = report.details || {};

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold flex-1">Звіт перевірки</h1>
        <Button size="sm" variant="outline" onClick={() => downloadPdf(submissionId)}>
          <Download className="h-4 w-4 mr-2" />PDF
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {/* Plagiarism */}
        <Card>
          <CardHeader><CardTitle>Запозичення</CardTitle></CardHeader>
          <CardContent>
            <p className="text-2xl font-bold mb-2">
              {report.plagiarismScore != null ? `${(report.plagiarismScore * 100).toFixed(1)}%` : '—'}
            </p>
            {plagiarismMatches?.length > 0 ? plagiarismMatches.map((m, i) => (
              <div key={i} className="mb-3 p-3 bg-muted/30 rounded">
                <p className="text-sm font-medium">Збіг з роботою #{m.sourceSubmissionId} — {(m.similarity * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{m.matchCount ?? m.matches?.length ?? 0} збігів</p>
              </div>
            )) : <p className="text-sm text-green-700">Запозичень не виявлено</p>}
          </CardContent>
        </Card>

        {/* Structure */}
        <Card>
          <CardHeader><CardTitle>Структура</CardTitle></CardHeader>
          <CardContent>
            <Badge variant={structureResult?.passed ? 'success' : 'destructive'} className="mb-3">
              {structureResult?.passed ? 'Пройдено' : 'Не пройдено'}
            </Badge>
            {structureResult?.score != null && <p className="text-sm mb-2">Оцінка: {structureResult.score}%</p>}
            {structureResult?.missing?.length > 0 && (
              <p className="text-sm text-destructive">Відсутні: {structureResult.missing.join(', ')}</p>
            )}
            {structureResult?.duplicates?.length > 0 && (
              <p className="text-sm text-yellow-700">Дублікати розділів: {structureResult.duplicates.join(', ')}</p>
            )}
            {structureResult?.orderViolations?.length > 0 && (
              <p className="text-sm text-yellow-700">Порушення порядку: {structureResult.orderViolations.join('; ')}</p>
            )}
            {structureResult?.emptySections?.length > 0 && (
              <p className="text-sm text-yellow-700">
                Недостатній обсяг: {structureResult.emptySections.map(s => typeof s === 'object' ? `${s.name} (${s.wordCount}/${s.required} сл.)` : s).join(', ')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Completeness */}
        {completenessResult && (
          <Card>
            <CardHeader><CardTitle>Повнота розкриття теми</CardTitle></CardHeader>
            <CardContent>
              <p className="text-2xl font-bold mb-1">{completenessResult.score != null ? `${(completenessResult.score * 100).toFixed(1)}%` : '—'}</p>
              <p className="text-sm text-muted-foreground">{completenessResult.label}</p>
            </CardContent>
          </Card>
        )}

        {/* Grammar */}
        {grammarResult && (
          <Card>
            <CardHeader><CardTitle>Граматика</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm mb-3">Знайдено помилок: <span className="font-bold">{grammarResult.errorCount}</span></p>
              {grammarResult.errors?.slice(0, 10).map((e, i) => (
                <div key={i} className="mb-2 p-2 bg-muted/30 rounded text-xs">
                  <p className="font-medium">{e.message}</p>
                  <p className="text-muted-foreground mt-1">«{e.context?.substring(0, 100)}»</p>
                  {e.replacements?.length > 0 && <p className="text-primary mt-1">→ {e.replacements.join(', ')}</p>}
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="mt-6">
        <Chat submissionId={parseInt(submissionId)} />
      </div>
    </div>
  );
}
