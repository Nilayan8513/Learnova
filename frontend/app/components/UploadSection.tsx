'use client';

import { useCallback, useRef, useState } from 'react';

export type PDFDetectionResult =
  | { type: 'paper'; text: string }
  | { type: 'book'; pageCount: number; pagesText: string[]; fileName: string }
  | { type: 'too-large'; pageCount: number };

type Props = {
  onDetected: (result: PDFDetectionResult) => void;
  isProcessing: boolean;
};

/** Extract text per-page from a loaded pdfjs document */
async function extractPages(
  pdf: { numPages: number; getPage: (n: number) => Promise<{ getTextContent: () => Promise<{ items: unknown[] }> }> }
): Promise<string[]> {
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = (content.items as { str?: string }[])
      .filter(item => 'str' in item)
      .map(item => item.str ?? '')
      .join(' ');
    pages.push(text);
  }
  return pages;
}

/** Decide if this PDF is a book or research paper — based purely on page count */
function detectDocType(numPages: number): 'book' | 'paper' {
  return numPages >= 100 ? 'book' : 'paper';
}

export default function UploadSection({ onDetected, isProcessing }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((f: File) => {
    if (f.type !== 'application/pdf') { setError('Only PDF files are supported.'); return; }
    setError(null);
    setFile(f);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleAnalyze = async () => {
    if (!file) return;
    setError(null);
    setExtracting(true);
    try {
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
      const arrayBuffer = await file.arrayBuffer();

      let pdf: Awaited<ReturnType<typeof pdfjsLib.getDocument>['promise']>;
      try {
        pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      } catch {
        setError(
          "This PDF couldn't be read — it may be scanned, encrypted, or image-only. Try a text-based PDF."
        );
        return;
      }

      const numPages: number = pdf.numPages;

      // Too large?
      if (numPages > 1000) {
        onDetected({ type: 'too-large', pageCount: numPages });
        return;
      }

      let pages: string[];
      try {
        pages = await extractPages(pdf as Parameters<typeof extractPages>[0]);
      } catch {
        setError(
          "This PDF couldn't be read — it may be scanned, encrypted, or image-only. Try a text-based PDF."
        );
        return;
      }

      const docType = detectDocType(numPages);

      if (docType === 'paper') {
        const fullText = pages.join('\n');
        if (fullText.trim().length < 200) {
          setError(
            "This PDF couldn't be read — it may be scanned, encrypted, or image-only. Try a text-based PDF."
          );
          return;
        }
        onDetected({ type: 'paper', text: fullText });
      } else {
        const extractedText = pages.join('\n');
        if (extractedText.trim().length < 200) {
          setError(
            "This PDF couldn't be read — it may be scanned, encrypted, or image-only. Try a text-based PDF."
          );
          return;
        }
        onDetected({ type: 'book', pageCount: numPages, pagesText: pages, fileName: file.name });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to extract PDF text.');
    } finally { setExtracting(false); }
  };

  const busy = extracting || isProcessing;

  return (
    <div style={{ width: '100%', maxWidth: '480px' }}>
      <div
        id="pdf-drop-zone"
        className={`drop-zone ${isDragging ? 'active' : ''}`}
        onDrop={onDrop}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => !busy && inputRef.current?.click()}
        style={{
          padding: '40px 32px',
          cursor: busy ? 'default' : 'pointer',
          textAlign: 'center',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: '8px', minHeight: '160px', marginBottom: '12px',
        }}
      >
        <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }}
          onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

        {/* Upload icon */}
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: file ? 'var(--accent)' : 'var(--text-muted)', marginBottom: '4px', transition: 'color 0.2s' }}>
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>

        {file ? (
          <>
            <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{file.name}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {(file.size / 1024 / 1024).toFixed(2)} MB — click to change
            </p>
          </>
        ) : (
          <>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Drop a research paper or book here</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Upload a research paper or book — PDF only, max 1000 pages
            </p>
          </>
        )}
      </div>

      {error && <p style={{ fontSize: '12px', color: 'var(--accent)', marginBottom: '10px' }}>{error}</p>}

      <button
        id="generate-btn"
        onClick={handleAnalyze}
        disabled={!!(!file || busy)}
        suppressHydrationWarning
        className="btn-primary"
        style={{
          width: '100%', padding: '12px 24px', fontSize: '14px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        }}
      >
        {busy ? (
          <><span className="spinner" /> {extracting ? 'Reading PDF...' : 'Processing...'}</>
        ) : 'Analyze'}
      </button>
    </div>
  );
}
