import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionBar, Alert, ProgressTracker, Spinner, StatusIcon, usePageTitle } from '../components/ui.jsx';
import { MAX_UPLOAD_BYTES, SUPPORTED_FILE_LABEL } from '../lib/constants.js';
import { isHeic, validatePhoto } from '../lib/validation.js';
import { convertHeic, processPhoto } from '../services/imageProcessing.js';
import { identifyClothing, preloadRecognizer } from '../services/recognition.js';
import { saveUpload } from '../services/upload.js';

const ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic';

const FILE_ERRORS = {
  unsupported: `That file type isn’t supported. Choose a ${SUPPORTED_FILE_LABEL} photo.`,
  'too-large': `That photo is larger than ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB. Choose a smaller photo.`,
};

// Keep the loading screen up long enough to read, so it doesn't just flash.
const MIN_LOADING_MS = 600;

/**
 * Clothing Upload (U1–U22). The page has three states:
 *   choose     — empty upload area, or a preview of the chosen photo
 *   processing — loading screen while the photo is processed and identified
 *   failed     — the image-processing error page with Try Again / Choose Another
 */
export default function Upload() {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [phase, setPhase] = useState('choose');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [fileError, setFileError] = useState(null);
  const triedHeicPreview = useRef(false);

  usePageTitle(phase === 'failed' ? 'We couldn’t process your image' : phase === 'processing' ? 'Identifying your item' : 'Add your clothing item');

  // Free the preview's memory when it's replaced or the page closes.
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  function reset() {
    setFile(null);
    setPreviewUrl(null);
    setPreviewBroken(false);
    setFileError(null);
    setPhase('choose');
  }

  function handleChange(event) {
    const chosen = event.target.files && event.target.files[0];
    event.target.value = ''; // so choosing the same file again still fires change
    if (!chosen) return; // U16: picker closed without choosing anything

    const problem = validatePhoto(chosen);
    if (problem) {
      // U13, U14, U15: show the error and clear the selection so Continue is disabled.
      setFile(null);
      setPreviewUrl(null);
      setFileError(problem);
      return;
    }
    setFileError(null);
    setFile(chosen);
    setPreviewBroken(false);
    triedHeicPreview.current = false;
    setPreviewUrl(URL.createObjectURL(chosen));
    preloadRecognizer();
  }

  async function handlePreviewError() {
    // Chrome and Edge can't display HEIC; convert it so the preview still shows (U5).
    if (file && isHeic(file) && !triedHeicPreview.current) {
      triedHeicPreview.current = true;
      try {
        const jpeg = await convertHeic(file);
        setPreviewUrl(URL.createObjectURL(jpeg));
        return;
      } catch {
        // fall through to the placeholder
      }
    }
    setPreviewBroken(true);
  }

  function openPicker() {
    inputRef.current?.click();
  }

  async function processAndIdentify() {
    if (!file) return;
    setPhase('processing');
    const started = Date.now();
    try {
      const { photo } = await processPhoto(file);
      const detectedType = await identifyClothing({ photo, fileName: file.name });
      saveUpload({ photo, fileName: file.name, detectedType });
      const wait = MIN_LOADING_MS - (Date.now() - started);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      navigate('/identify');
    } catch (error) {
      console.warn('Image processing failed:', error);
      setPhase('failed');
    }
  }

  if (phase === 'processing') {
    return (
      <>
        <ProgressTracker current="Identify" />
        <div className="centered" role="status" aria-live="polite">
          <PhotoThumb url={previewUrl} broken={previewBroken} />
          <Spinner label="Processing" />
          <h1>Identifying your item…</h1>
          <p className="lead">We&rsquo;re looking at its shape and details. This should only take a moment.</p>
        </div>
      </>
    );
  }

  if (phase === 'failed') {
    return (
      <>
        <ProgressTracker current="Identify" />
        <div className="centered">
          <StatusIcon>!</StatusIcon>
          <p className="eyebrow">Something went wrong</p>
          <h1>We couldn&rsquo;t process your image.</h1>
          <Alert>Check your connection and try again, or choose a different photo.</Alert>
        </div>
        <ActionBar>
          <button type="button" className="btn btn-primary" onClick={processAndIdentify}>Try Again</button>
          <button type="button" className="btn btn-secondary" onClick={reset}>Choose Another</button>
        </ActionBar>
      </>
    );
  }

  const hasPhoto = Boolean(file);

  return (
    <>
      <ProgressTracker current="Upload" />
      {hasPhoto ? (
        <>
          <p className="eyebrow">Photo preview</p>
          <h1>Looking good?</h1>
          <p className="lead">Make sure the full item is visible before continuing.</p>
        </>
      ) : (
        <>
          <p className="eyebrow">Step 1 of 4</p>
          <h1>Add your clothing item</h1>
          <p className="lead">Lay it flat in good light so we can see the whole piece.</p>
        </>
      )}

      {fileError && <Alert id="upload-error">{FILE_ERRORS[fileError]}</Alert>}

      {/* No `capture` attribute: phones offer both the camera and the photo library (U3). */}
      <input
        ref={inputRef}
        id="photo-input"
        className="visually-hidden"
        type="file"
        accept={ACCEPT}
        onChange={handleChange}
        aria-describedby={fileError ? 'upload-error' : 'upload-formats'}
        tabIndex={hasPhoto ? -1 : 0}
      />

      {hasPhoto ? (
        <div className="preview">
          {previewBroken ? (
            <div className="preview-placeholder">Preview not available for this photo</div>
          ) : (
            <img src={previewUrl} alt="Preview of your clothing photo" onError={handlePreviewError} />
          )}
          <div className="preview-actions">
            <button type="button" className="text-link" onClick={openPicker}>Replace</button>
            <span aria-hidden="true" className="divider">|</span>
            <button type="button" className="text-link" onClick={reset}>Remove</button>
          </div>
        </div>
      ) : (
        <>
          <label htmlFor="photo-input" className="dropzone">
            <span className="dropzone-plus" aria-hidden="true">+</span>
            <span className="dropzone-title">Tap to take or choose a photo</span>
            <span className="dropzone-formats" id="upload-formats">{SUPPORTED_FILE_LABEL}</span>
          </label>
          <aside className="tip">
            <strong>Photo tip</strong>
            <p>Use a plain background and avoid shadows.</p>
          </aside>
        </>
      )}

      <ActionBar>
        <button type="button" className="btn btn-primary" disabled={!hasPhoto} onClick={processAndIdentify}>
          Continue
        </button>
      </ActionBar>
    </>
  );
}

function PhotoThumb({ url, broken }) {
  if (!url || broken) return <div className="thumb thumb-placeholder" aria-hidden="true" />;
  return <img className="thumb" src={url} alt="Your clothing photo" />;
}
