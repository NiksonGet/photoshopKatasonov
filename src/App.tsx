import { useState } from 'react'
import { CommandBar } from './components/CommandBar'
import { DocumentPanel } from './components/DocumentPanel'
import { EditorHeader } from './components/EditorHeader'
import { ImageWorkspace } from './components/ImageWorkspace'
import { StatusBar } from './components/StatusBar'
import { ToolRail } from './components/ToolRail'
import type { ExportImageFormat, RasterDocument } from './domain/image'
import {
  createImageExport,
  downloadImageExport,
} from './image/imageExporter'
import { openImageFile } from './image/imageFileLoader'
import './App.css'

function App() {
  const [currentImage, setCurrentImage] = useState<RasterDocument | null>(null)
  const [exportFormat, setExportFormat] = useState<ExportImageFormat>('png')
  const [isExporting, setIsExporting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleFileSelect(file: File) {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const loadedImage = await openImageFile(file)
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

  async function handleExport() {
    if (!currentImage) {
      return
    }

    setIsExporting(true)
    setErrorMessage('')

    try {
      const imageExport = await createImageExport(currentImage, exportFormat)
      downloadImageExport(imageExport)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Не удалось экспортировать изображение.',
      )
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="app-shell">
      <EditorHeader fileName={currentImage?.fileName} />
      <CommandBar
        exportFormat={exportFormat}
        hasImage={currentImage !== null}
        isExporting={isExporting}
        isLoading={isLoading}
        onFileSelect={handleFileSelect}
        onExportFormatChange={setExportFormat}
        onExport={handleExport}
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
        isExporting={isExporting}
        isLoading={isLoading}
        errorMessage={errorMessage}
      />
    </div>
  )
}

export default App
