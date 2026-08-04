import { Routes, Route } from 'react-router-dom'

import { AppLayout } from './components/Layout/AppLayout'
import { StampEditorProvider } from './context/StampEditorProvider'
import { ExperimentsProvider } from './context/ExperimentsProvider'
import { ChangelogPage } from './pages/ChangelogPage'

export default function App() {
  return (
    <StampEditorProvider>
      <ExperimentsProvider>
        <Routes>
          <Route path="/" element={<AppLayout />} />
          <Route path="/changelog" element={<ChangelogPage />} />
        </Routes>
      </ExperimentsProvider>
    </StampEditorProvider>
  )
}
