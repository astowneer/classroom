import { Button } from './ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  // Build page list with ellipsis
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '...') {
      pages.push('...');
    }
  }

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t text-sm">
      <span className="text-muted-foreground">
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} з {total}
      </span>
      <div className="flex items-center gap-1">
        <Button size="sm" variant="outline" disabled={page === 1} onClick={() => onChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground">…</span>
            : <Button key={p} size="sm" variant={p === page ? 'default' : 'outline'} onClick={() => onChange(p)}>{p}</Button>
        )}
        <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => onChange(page + 1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
