import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import { Spinner } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChevronLeft } from 'lucide-react';
import ReportView from '../../components/ReportView';
import Chat from '../../components/Chat';

export default function ReportPage() {
  const { submissionId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/reports/${submissionId}`)
      .then(r => { setReport(r.data); setSubmission(r.data.submission); })
      .finally(() => setLoading(false));
  }, [submissionId]);

  if (loading) return <div className="flex justify-center mt-20"><Spinner className="h-8 w-8" /></div>;
  if (!report) return <p className="text-muted-foreground">Звіт не знайдено.</p>;

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-4 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">Звіт перевірки</h1>
      </div>

      <ReportView
        report={report}
        submission={submission}
        student={submission?.student}
        assignment={submission?.assignment}
      />

      <div className="mt-6 print:hidden">
        <Chat submissionId={parseInt(submissionId)} />
      </div>
    </div>
  );
}
