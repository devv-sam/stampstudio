import { Routes, Route } from 'react-router-dom'

import { AppLayout } from './components/Layout/AppLayout'
import { StampEditorProvider } from './context/StampEditorProvider'
import { ChangelogPage } from './pages/ChangelogPage'

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <StampEditorProvider>
            <AppLayout />
          </StampEditorProvider>
        }
      />
      <Route path="/changelog" element={<ChangelogPage />} />
    </Routes>
  )
}
