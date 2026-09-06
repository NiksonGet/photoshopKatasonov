import { useMemo, useState } from 'react'
import { CommandBar } from './components/CommandBar'
import { DocumentPanel } from './components/DocumentPanel'
import { EditorHeader } from './components/EditorHeader'
import { ImageWorkspace } from './components/ImageWorkspace'
import { StatusBar } from './components/StatusBar'
import { ToolRail } from './components/ToolRail'
import type {
  EditorTool,
  ExportImageFormat,
  ImageChannel,
  PixelSample,
  RasterDocument,
} from './domain/image'
import {
  composeChannelView,
  createChannelVisibility,
  getDocumentChannels,
} from './image/channelProcessing'
import {
  createImageExport,
  downloadImageExport,
} from './image/imageExporter'
import { openImageFile } from './image/imageFileLoader'
import './App.css'

function App() {
  const [currentImage, setCurrentImage] = useState<RasterDocument | null>(null)
  const [exportFormat, setExportFormat] = useState<ExportImageFormat>('png')
  const [channelVisibility, setChannelVisibility] = useState(
    createChannelVisibility,
  )
  const [activeTool, setActiveTool] = useState<EditorTool>('pointer')
  const [pixelSample, setPixelSample] = useState<PixelSample | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const documentChannels = useMemo(
    () => getDocumentChannels(currentImage),
    [currentImage],
  )
  const displayedPixels = useMemo(() => {
    if (!currentImage) {
      return null
    }

    return composeChannelView(
      currentImage.pixels,
      channelVisibility,
      documentChannels,
    )
  }, [channelVisibility, currentImage, documentChannels])

  async function handleFileSelect(file: File) {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const loadedImage = await openImageFile(file)
      setCurrentImage(loadedImage)
      setChannelVisibility(createChannelVisibility())
      setPixelSample(null)
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
    if (!currentImage || !displayedPixels) {
      return
    }

    setIsExporting(true)
    setErrorMessage('')

    try {
      const imageExport = await createImageExport(
        { ...currentImage, pixels: displayedPixels },
        exportFormat,
      )
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

  function handleChannelToggle(channel: ImageChannel) {
    setChannelVisibility((current) => ({
      ...current,
      [channel]: !current[channel],
    }))
    setPixelSample(null)
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
        <ToolRail
          activeTool={activeTool}
          hasImage={currentImage !== null}
          onSelectTool={setActiveTool}
        />
        <ImageWorkspace
          image={currentImage}
          displayedPixels={displayedPixels}
          isEyedropperActive={activeTool === 'eyedropper'}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onPixelSample={setPixelSample}
        />
        <DocumentPanel
          image={currentImage}
          channels={documentChannels}
          channelVisibility={channelVisibility}
          pixelSample={pixelSample}
          onToggleChannel={handleChannelToggle}
        />
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
