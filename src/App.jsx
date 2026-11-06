import { Route, Routes, useParams } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import { RequireAuth, RequireConfirmedType, RequireUpload } from './components/guards.jsx';
import Home from './pages/Home.jsx';
import SignUp from './pages/SignUp.jsx';
import LogIn from './pages/LogIn.jsx';
import StyleQuestion, { QUESTION_COUNT } from './pages/StyleQuestion.jsx';
import ProfileComplete from './pages/ProfileComplete.jsx';
import Upload from './pages/Upload.jsx';
import Recognition from './pages/Recognition.jsx';
import Preferences from './pages/Preferences.jsx';
import Recommendations from './pages/Recommendations.jsx';
import TutorialDetails from './pages/TutorialDetails.jsx';
import NotFound from './pages/NotFound.jsx';

/** Remounts the question page for each step so its selections start fresh. */
function StyleQuestionRoute() {
  const { step } = useParams();
  const number = Number(step);
  if (!Number.isInteger(number) || number < 1 || number > QUESTION_COUNT) return <NotFound />;
  return <StyleQuestion key={number} step={number} />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="signup" element={<SignUp />} />
        <Route path="login" element={<LogIn />} />

        {/* A1: everything below needs an account. */}
        <Route element={<RequireAuth />}>
          <Route path="questions/:step" element={<StyleQuestionRoute />} />
          <Route path="profile-complete" element={<ProfileComplete />} />
          <Route path="upload" element={<Upload />} />

          {/* A3: these need a photo uploaded in this session. */}
          <Route element={<RequireUpload />}>
            <Route path="identify" element={<Recognition />} />
            <Route element={<RequireConfirmedType />}>
              <Route path="preferences" element={<Preferences />} />
              <Route path="ideas" element={<Recommendations />} />
              <Route path="ideas/:projectId" element={<TutorialDetails />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
