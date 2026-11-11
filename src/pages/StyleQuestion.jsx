import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ActionBar, usePageTitle } from '../components/ui.jsx';
import { COLORS, EXPERIENCE_LEVELS, PROJECT_TYPES, STYLES, TOOLS } from '../lib/constants.js';
import { loadPreferencesOrEmpty, savePreferences } from '../services/preferences.js';
import { assetUrl } from '../services/projects.js';

// Q6–Q11: the five questions and their options.
const QUESTIONS = [
  {
    field: 'styles',
    title: 'Which styles feel like you?',
    hint: 'Choose as many as you like.',
    multiple: true,
    layout: 'cards',
    options: STYLES.map((style) => ({ value: style.name, image: style.image })),
  },
  {
    field: 'colors',
    title: 'What colors do you wear most?',
    hint: 'Select all your go-to shades.',
    multiple: true,
    layout: 'swatches',
    options: COLORS.map((color) => ({ value: color.name, swatch: color.swatch })),
  },
  {
    field: 'projectTypes',
    title: 'What would you like to make?',
    hint: 'Pick any projects that interest you.',
    multiple: true,
    layout: 'grid',
    options: PROJECT_TYPES.map((value) => ({ value })),
  },
  {
    field: 'experienceLevel',
    title: 'How experienced are you with sewing?',
    hint: 'We’ll match projects to your comfort level.',
    multiple: false,
    layout: 'list',
    options: EXPERIENCE_LEVELS.map((value) => ({ value })),
  },
  {
    field: 'tools',
    title: 'Which tools do you have?',
    hint: 'Select everything you can use right now.',
    multiple: true,
    layout: 'list',
    options: TOOLS.map((value) => ({ value })),
  },
];

export const QUESTION_COUNT = QUESTIONS.length;

function toSelection(question, saved) {
  const value = saved?.[question.field];
  if (question.multiple) return Array.isArray(value) ? value : [];
  return value ? [value] : [];
}

/**
 * Q1–Q21. `?edit=1` means the user came from "Edit" on the Preferences page (P6),
 * so finishing Question 5 returns there instead of the Profile Complete page (Q21).
 */
export default function StyleQuestion({ step }) {
  const question = QUESTIONS[step - 1];
  usePageTitle(`Question ${step} of ${QUESTION_COUNT}`);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const editing = new URLSearchParams(location.search).get('edit') === '1';
  const query = editing ? '?edit=1' : '';

  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState(false);

  // Q16 / P6: show what the user saved earlier.
  useEffect(() => {
    let active = true;
    loadPreferencesOrEmpty(user.id).then((saved) => {
      if (active) setSelected(toSelection(question, saved));
    });
    return () => {
      active = false;
    };
  }, [user.id, question]);

  function toggle(value) {
    if (!question.multiple) {
      setSelected([value]); // Q14: one experience level at a time
      return;
    }
    setSelected((current) =>
      current.includes(value) ? current.filter((v) => v !== value) : [...current, value],
    );
  }

  function goForward() {
    if (step < QUESTION_COUNT) navigate(`/questions/${step + 1}${query}`);
    else navigate(editing ? '/preferences' : '/profile-complete');
  }

  async function handleNext() {
    if (!selected.length || busy) return;
    setBusy(true);
    const value = question.multiple
      ? question.options.map((o) => o.value).filter((v) => selected.includes(v))
      : selected[0];
    await savePreferences(user.id, { [question.field]: value });
    goForward();
  }

  function handleBack() {
    if (step > 1) {
      navigate(`/questions/${step - 1}${query}`);
    } else if (location.key !== 'default') {
      navigate(-1); // Q17: whatever page came before Question 1
    } else {
      navigate('/');
    }
  }

  const inputType = question.multiple ? 'checkbox' : 'radio';
  const progress = Math.round((step / QUESTION_COUNT) * 100);

  return (
    <>
      <div className="question-progress">
        <p className="question-count">Question {step} of {QUESTION_COUNT}</p>
        <div className="bar" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
      </div>
      <div className="question-nav">
        <button type="button" className="text-link" onClick={handleBack}>
          <span aria-hidden="true">←</span> Back
        </button>
        <Link to={step < QUESTION_COUNT ? `/questions/${step + 1}${query}` : editing ? '/preferences' : '/profile-complete'} className="text-link">
          Skip
        </Link>
      </div>

      <h1 id="question-title">{question.title}</h1>
      <p className="lead" id="question-hint">{question.hint}</p>

      <fieldset className={`options options-${question.layout}`} aria-labelledby="question-title" aria-describedby="question-hint">
        {question.options.map((option) => {
          const isSelected = selected.includes(option.value);
          const id = `option-${question.field}-${option.value.replace(/\W+/g, '-').toLowerCase()}`;
          return (
            <label key={option.value} htmlFor={id} className={`option${isSelected ? ' selected' : ''}`}>
              <input
                id={id}
                type={inputType}
                name={question.field}
                value={option.value}
                checked={isSelected}
                onChange={() => toggle(option.value)}
              />
              {option.image && <img src={assetUrl(option.image)} alt={`${option.value} style example`} width="160" height="120" />}
              {option.swatch && <span className={`swatch ${option.swatch}`} aria-hidden="true" />}
              <span className="option-label">{option.value}</span>
            </label>
          );
        })}
      </fieldset>

      <ActionBar>
        <button type="button" className="btn btn-primary" disabled={!selected.length || busy} onClick={handleNext}>
          Next
        </button>
      </ActionBar>
    </>
  );
}
