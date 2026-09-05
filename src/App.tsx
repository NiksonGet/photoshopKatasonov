import { useState } from 'react'
import { CommandBar } from './components/CommandBar'
import { DocumentPanel } from './components/DocumentPanel'
import { EditorHeader } from './components/EditorHeader'
import { ImageWorkspace } from './components/ImageWorkspace'
import { StatusBar } from './components/StatusBar'
import { ToolRail } from './components/ToolRail'
import type { RasterDocument } from './domain/image'
import { loadBrowserImage } from './image/browserImageLoader'
import './App.css'

function App() {
  const [currentImage, setCurrentImage] = useState<RasterDocument | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleFileSelect(file: File) {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const loadedImage = await loadBrowserImage(file)
      setCurrentImage(loadedImage)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Не удалось открыть выбранное изображение.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <EditorHeader fileName={currentImage?.fileName} />
      <CommandBar
        isLoading={isLoading}
        onFileSelect={handleFileSelect}
      />

      <div className="editor-layout">
        <ToolRail />
        <ImageWorkspace
          image={currentImage}
          isLoading={isLoading}
          errorMessage={errorMessage}
        />
        <DocumentPanel image={currentImage} />
      </div>

      <StatusBar
        image={currentImage}
        isLoading={isLoading}
        errorMessage={errorMessage}
      />
    </div>
  )
}

export default App
