import { Agentation } from 'agentation'
import { DialRoot } from 'dialkit'
import 'dialkit/styles.css'
import { MotionConfig } from 'framer-motion'
import { Navigate, Routes, Route } from 'react-router-dom'

import { AppLayout } from './components/Layout/AppLayout'
import { StampEditorProvider } from './context/StampEditorProvider'
import { ExperimentsProvider } from './context/ExperimentsProvider'

export default function App() {
  return (
    <StampEditorProvider>
      <ExperimentsProvider>
        <MotionConfig reducedMotion="user">
          <Routes>
            <Route path="/" element={<AppLayout />} />
            <Route
              path="/changelog"
              element={<Navigate to="/" replace state={{ updates: true }} />}
            />
          </Routes>
        </MotionConfig>
        {import.meta.env.DEV ? (
          <>
            <DialRoot position="top-right" theme="light" defaultOpen={false} />
            <Agentation
              endpoint="http://localhost:4747"
              className="!top-20 !bottom-auto"
            />
          </>
        ) : null}
      </ExperimentsProvider>
    </StampEditorProvider>
  )
}
