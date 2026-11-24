import Link from 'next/link';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  searchParams: Record<string, string | undefined>;
}

export function Pagination({ currentPage, totalPages, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (value !== undefined && key !== 'page') {
        params.set(key, value);
      }
    }
    params.set('page', String(page));
    return `?${params.toString()}`;
  };

  // Generate page numbers to show (e.g. current - 2 .. current + 2)
  const pages: number[] = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <nav
      aria-label="Pagination"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        marginTop: '2rem',
        flexWrap: 'wrap',
      }}
    >
      {/* Previous Page Link */}
      {currentPage > 1 ? (
        <Link
          href={createPageUrl(currentPage - 1)}
          aria-label="Go to previous page"
          style={{
            padding: '0.45rem 0.85rem',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            color: '#153b5b',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          ← Prev
        </Link>
      ) : (
        <span
          aria-disabled="true"
          style={{
            padding: '0.45rem 0.85rem',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: '#f1f5f9',
            color: '#94a3b8',
            fontSize: '0.85rem',
            cursor: 'not-allowed',
          }}
        >
          ← Prev
        </span>
      )}

      {/* Numbered Page Links */}
      {start > 1 && (
        <>
          <Link
            href={createPageUrl(1)}
            style={{
              padding: '0.45rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#334155',
              textDecoration: 'none',
              fontSize: '0.85rem',
            }}
          >
            1
          </Link>
          {start > 2 && <span style={{ color: '#94a3b8' }}>…</span>}
        </>
      )}

      {pages.map((p) => {
        const isCurrent = p === currentPage;
        return isCurrent ? (
          <span
            key={p}
            aria-current="page"
            style={{
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              backgroundColor: '#153b5b',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
            }}
          >
            {p}
          </span>
        ) : (
          <Link
            key={p}
            href={createPageUrl(p)}
            style={{
              padding: '0.45rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#334155',
              textDecoration: 'none',
              fontSize: '0.85rem',
            }}
          >
            {p}
          </Link>
        );
      })}

      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span style={{ color: '#94a3b8' }}>…</span>}
          <Link
            href={createPageUrl(totalPages)}
            style={{
              padding: '0.45rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#334155',
              textDecoration: 'none',
              fontSize: '0.85rem',
            }}
          >
            {totalPages}
          </Link>
        </>
      )}

      {/* Next Page Link */}
      {currentPage < totalPages ? (
        <Link
          href={createPageUrl(currentPage + 1)}
          aria-label="Go to next page"
          style={{
            padding: '0.45rem 0.85rem',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            color: '#153b5b',
            textDecoration: 'none',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          Next →
        </Link>
      ) : (
        <span
          aria-disabled="true"
          style={{
            padding: '0.45rem 0.85rem',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            backgroundColor: '#f1f5f9',
            color: '#94a3b8',
            fontSize: '0.85rem',
            cursor: 'not-allowed',
          }}
        >
          Next →
        </span>
      )}
    </nav>
  );
}
