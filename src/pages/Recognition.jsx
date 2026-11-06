import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionBar, Alert, ProgressTracker, usePageTitle } from '../components/ui.jsx';
import { CLOTHING_TYPES } from '../lib/constants.js';
import { identifiedHeading } from '../lib/wording.js';
import { confirmClothingType, getUpload } from '../services/upload.js';

/** Clothing Recognition (C1–C11). */
export default function Recognition() {
  const navigate = useNavigate();
  const upload = getUpload(); // RequireUpload guarantees this exists
  const identified = upload.detectedType;
  const [selected, setSelected] = useState(upload.confirmedType || identified || null);
  const [noneOfThese, setNoneOfThese] = useState(false);

  usePageTitle(identified ? `Is this ${identified === 'Pants' ? 'pants' : `a ${identified}`}?` : 'Choose your item type');

  function handleConfirm() {
    if (!selected) return;
    confirmClothingType(selected);
    navigate('/preferences');
  }

  return (
    <>
      <ProgressTracker current="Identify" />
      <img className="photo-small" src={upload.photo} alt="Your uploaded clothing photo" />
      <p className="eyebrow">Item type</p>

      {noneOfThese ? (
        <>
          <h1>We can&rsquo;t help with this item yet</h1>
          <Alert tone="info">
            ReWear currently supports only T-shirts, tops, pants, and skirts. Choose another item to upcycle.
          </Alert>
          <button type="button" className="text-link" onClick={() => setNoneOfThese(false)}>
            Back to the options
          </button>
          <ActionBar>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/upload')}>
              Choose Another
            </button>
          </ActionBar>
        </>
      ) : (
        <>
          <h1 id="type-heading">{identified ? identifiedHeading(identified) : 'Choose your item type'}</h1>
          {!identified && <Alert id="type-error">We couldn&rsquo;t identify this item. Choose its type.</Alert>}

          <fieldset className="options options-pills" aria-labelledby="type-heading" aria-describedby={identified ? undefined : 'type-error'}>
            {CLOTHING_TYPES.map((type) => {
              const id = `type-${type.toLowerCase()}`;
              return (
                <label key={type} htmlFor={id} className={`option pill${selected === type ? ' selected' : ''}`}>
                  <input id={id} type="radio" name="clothing-type" value={type} checked={selected === type} onChange={() => setSelected(type)} />
                  <span className="option-label">{type}</span>
                </label>
              );
            })}
          </fieldset>

          {identified && (
            <button type="button" className="text-link" onClick={() => setNoneOfThese(true)}>
              None of these
            </button>
          )}

          <ActionBar>
            <button type="button" className="btn btn-primary" disabled={!selected} onClick={handleConfirm}>
              Confirm
            </button>
          </ActionBar>
        </>
      )}
    </>
  );
}
