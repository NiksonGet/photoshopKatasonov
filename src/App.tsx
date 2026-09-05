import { CommandBar } from './components/CommandBar'
import { DocumentPanel } from './components/DocumentPanel'
import { EditorHeader } from './components/EditorHeader'
import { ImageWorkspace } from './components/ImageWorkspace'
import { StatusBar } from './components/StatusBar'
import { ToolRail } from './components/ToolRail'
import './App.css'

function App() {
  return (
    <div className="app-shell">
      <EditorHeader />
      <CommandBar />

      <div className="editor-layout">
        <ToolRail />
        <ImageWorkspace />
        <DocumentPanel />
      </div>

      <StatusBar />
    </div>
  )
}

export default App

