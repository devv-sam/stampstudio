import { AppLayout } from './components/Layout/AppLayout'
import { StampEditorProvider } from './context/StampEditorProvider'

export default function App() {
  return (
    <StampEditorProvider>
      <AppLayout />
    </StampEditorProvider>
  )
}
