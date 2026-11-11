import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ActionBar, usePageTitle } from '../components/ui.jsx';

const STEPS = [
  { title: 'Upload a photo', text: 'Start with one piece from your closet.' },
  { title: 'Tell us your level', text: 'Choose your skills and tools.' },
  { title: 'Pick an idea', text: 'Follow a tutorial and make it yours.' },
];

/** H1–H5 */
export default function Home() {
  usePageTitle(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <p className="eyebrow">Old clothes, new life</p>
      <h1 className="display">Turn clothes you don&rsquo;t wear into something you love</h1>
      <p className="lead">Snap a photo and find simple projects made for your skills and tools.</p>

      <section className="how-it-works" aria-labelledby="how-heading">
        <h2 id="how-heading" className="eyebrow">How it works</h2>
        <ol className="steps">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <span className="step-number" aria-hidden="true">{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <ActionBar>
        <button type="button" className="btn btn-primary" onClick={() => navigate(user ? '/upload' : '/signup')}>
          Get Started
        </button>
      </ActionBar>
    </>
  );
}
