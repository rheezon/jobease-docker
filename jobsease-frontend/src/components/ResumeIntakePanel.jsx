import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle2, RefreshCw } from 'lucide-react';
import {
  extractResumeData,
  formatResumeData,
  parseLatexResumeHeuristic,
  buildOnboardingAutofill,
  buildCreateNotifierAutofill,
} from '../utils/resumeExtraction';

/**
 * @param {'onboarding' | 'notifier'} variant
 * @param {object} context — { user } required; for notifier also { setValue, setSkills } applied via onNotifierPatch
 * @param {(payload: object) => void} onOnboardingAutofill — receives { formData, educationDetails }
 * @param {(patch: { setValue: Record<string, string>, skills: string[], resumeFileName?: string }) => void} onNotifierAutofill
 */
export default function ResumeIntakePanel({
  variant,
  user,
  onOnboardingAutofill,
  onNotifierAutofill,
}) {
  const [tab, setTab] = useState('pdf');
  const [latexDraft, setLatexDraft] = useState('');
  /** Trimmed LaTeX last successfully applied to the form; null = no LaTeX apply yet (or cleared after PDF). */
  const [appliedLatexTrim, setAppliedLatexTrim] = useState(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const fileRef = useRef(null);

  const trimmedLatex = latexDraft.trim();
  const hasLatex = trimmedLatex.length > 0;
  const latexInSync = appliedLatexTrim !== null && trimmedLatex === appliedLatexTrim;
  const latexDirty = appliedLatexTrim !== null && trimmedLatex !== appliedLatexTrim && hasLatex;

  const applyPdf = async (file) => {
    if (!file) return;
    setBusy(true);
    setFeedback(null);
    try {
      const raw = await extractResumeData(file);
      const formatted = formatResumeData(raw);
      if (variant === 'onboarding') {
        const payload = buildOnboardingAutofill(formatted, user);
        onOnboardingAutofill?.(payload);
        setFeedback({ type: 'success', source: 'pdf', fileName: file.name });
      } else {
        const patch = buildCreateNotifierAutofill(formatted, user, { resumeFileName: file.name });
        onNotifierAutofill?.(patch);
        setFeedback({ type: 'success', source: 'pdf', fileName: file.name });
      }
      // PDF is a new source of truth: LaTeX must be submitted/updated again to match fields
      setAppliedLatexTrim(null);
    } catch (e) {
      setFeedback({ type: 'error', message: e?.message || 'Could not process file.' });
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const applyLatex = () => {
    const latex = trimmedLatex;
    if (!latex) {
      setFeedback({ type: 'error', message: 'Paste LaTeX resume code first.' });
      return;
    }
    setBusy(true);
    setFeedback(null);
    const isUpdate = appliedLatexTrim !== null && latex !== appliedLatexTrim;
    try {
      const formatted = parseLatexResumeHeuristic(latex);
      if (variant === 'onboarding') {
        const payload = buildOnboardingAutofill(formatted, user);
        onOnboardingAutofill?.(payload);
        setFeedback({ type: 'success', source: 'latex', isUpdate });
      } else {
        const patch = buildCreateNotifierAutofill(formatted, user, { resumeFileName: '' });
        onNotifierAutofill?.(patch);
        setFeedback({ type: 'success', source: 'latex', isUpdate });
      }
      setAppliedLatexTrim(latex);
    } catch (e) {
      setFeedback({ type: 'error', message: e?.message || 'Could not parse LaTeX.' });
    } finally {
      setBusy(false);
    }
  };

  const successTitle =
    variant === 'notifier'
      ? 'Notifier form autofilled from your resume'
      : 'Onboarding form autofilled from your resume';

  const successBodyPdf =
    variant === 'notifier'
      ? 'Fields below were filled using text extracted from your uploaded resume file. You can edit any value before creating the notifier.'
      : 'Fields below were filled using text extracted from your uploaded resume file. You can edit any value before continuing.';

  const successBodyLatex =
    variant === 'notifier'
      ? 'Fields below were filled using a best-effort parse of your LaTeX resume source. You can edit any value before creating the notifier.'
      : 'Fields below were filled using a best-effort parse of your LaTeX resume source. You can edit any value before continuing.';

  const greyLatexPanelStyle = {
    background: '#f3f4f6',
    border: '1px solid #e5e7eb',
    borderRadius: 12,
    padding: '1rem 1rem 1.125rem',
    marginTop: 4,
  };

  const latexTextareaStyle = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: 8,
    border: '1px solid #d1d5db',
    fontFamily: 'ui-monospace, monospace',
    fontSize: 13,
    background: '#e5e7eb',
    color: '#1f2937',
  };

  return (
    <div className="form-section resume-intake-panel" style={{ marginBottom: '1.5rem' }}>
      <h3 className="form-section-title">Resume: upload PDF or paste LaTeX</h3>
      <p className="field-note" style={{ marginBottom: '1rem', color: 'var(--text-secondary, #64748b)' }}>
        Add your resume first. We autofill the form below; you can change anything before continuing.
        PDF uses a demo extractor today; LaTeX uses light pattern matching on your source.
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button
          type="button"
          className={tab === 'pdf' ? 'submit-btn' : 'action-btn secondary'}
          style={{ padding: '8px 16px', fontSize: 14 }}
          onClick={() => setTab('pdf')}
        >
          <Upload size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          PDF upload
        </button>
        <button
          type="button"
          className={tab === 'latex' ? 'submit-btn' : 'action-btn secondary'}
          style={{ padding: '8px 16px', fontSize: 14 }}
          onClick={() => setTab('latex')}
        >
          <FileText size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          LaTeX code
        </button>
      </div>

      {tab === 'pdf' && (
        <div className="resume-upload-section">
          <div className="file-upload-area">
            <input
              ref={fileRef}
              type="file"
              id="resume-intake-pdf"
              accept=".pdf,.doc,.docx,application/pdf"
              className="file-input"
              disabled={busy}
              onChange={(e) => applyPdf(e.target.files?.[0])}
            />
            <label htmlFor="resume-intake-pdf" className="file-upload-label">
              <Upload size={24} />
              <div className="upload-text">
                <span className="upload-title">{busy ? 'Processing…' : 'Choose PDF / DOC / DOCX'}</span>
                <span className="upload-subtitle">Selecting a file runs extraction and autofills the form</span>
              </div>
            </label>
          </div>
        </div>
      )}

      {tab === 'latex' && (
        <div style={greyLatexPanelStyle}>
          <label className="field-note" htmlFor="resume-intake-latex" style={{ display: 'block', marginBottom: 8, color: '#6b7280' }}>
            Paste full LaTeX resume source
          </label>
          <textarea
            id="resume-intake-latex"
            value={latexDraft}
            onChange={(e) => setLatexDraft(e.target.value)}
            rows={10}
            disabled={busy}
            placeholder="\\documentclass{article}..."
            style={latexTextareaStyle}
          />
          {hasLatex ? (
            <button
              type="button"
              style={{
                marginTop: 14,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '10px 18px',
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 10,
                border: latexInSync && !busy ? '1px solid #86efac' : latexDirty && !busy ? '1px solid #0f766e' : '1px solid #16a34a',
                background: latexInSync && !busy ? '#bbf7d0' : latexDirty && !busy ? '#0d9488' : '#22c55e',
                color: latexInSync && !busy ? '#14532d' : '#ffffff',
                cursor: busy || latexInSync ? 'default' : 'pointer',
                opacity: busy ? 0.85 : 1,
                boxShadow: latexInSync && !busy ? 'none' : '0 1px 2px rgba(22, 163, 74, 0.25)',
              }}
              disabled={busy || latexInSync}
              onClick={applyLatex}
            >
              {latexDirty && !busy ? (
                <RefreshCw size={18} strokeWidth={2.25} />
              ) : (
                <CheckCircle2 size={18} strokeWidth={2.25} />
              )}
              {busy
                ? appliedLatexTrim !== null && trimmedLatex !== appliedLatexTrim
                  ? 'Updating…'
                  : 'Submitting…'
                : latexInSync
                  ? 'Submitted'
                  : latexDirty
                    ? 'Update LatexCode'
                    : 'Submit LatexCode'}
            </button>
          ) : null}
        </div>
      )}

      {feedback?.type === 'success' && (
        <div
          role="status"
          style={{
            marginTop: 14,
            padding: '14px 16px',
            borderRadius: 10,
            background: '#fef9c3',
            border: '1px solid #fde047',
            color: '#713f12',
            fontSize: 14,
            lineHeight: 1.5,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6, color: '#854d0e' }}>{successTitle}</div>
          <div style={{ marginBottom: feedback.source === 'pdf' && feedback.fileName ? 8 : 0 }}>
            {feedback.source === 'pdf' ? successBodyPdf : successBodyLatex}
          </div>
          {feedback.source === 'pdf' && feedback.fileName ? (
            <div style={{ fontSize: 13, color: '#a16207' }}>
              <span style={{ fontWeight: 600 }}>Source file:</span> {feedback.fileName}
            </div>
          ) : null}
          {feedback.source === 'latex' ? (
            <div style={{ fontSize: 13, color: '#a16207', marginTop: 6 }}>
              <span style={{ fontWeight: 600 }}>Source:</span>{' '}
              {feedback.isUpdate
                ? 'LaTeX code was updated; form fields below were refreshed from the new source.'
                : 'LaTeX code you submitted'}
            </div>
          ) : null}
        </div>
      )}

      {feedback?.type === 'error' && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: '10px 12px',
            borderRadius: 8,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: 14,
          }}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
}
