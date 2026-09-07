import { useCallback, useMemo, useState } from 'react'
import { CommandBar } from './components/CommandBar'
import { DocumentPanel } from './components/DocumentPanel'
import { EditorHeader } from './components/EditorHeader'
import { ImageWorkspace } from './components/ImageWorkspace'
import { LevelsDialog } from './components/LevelsDialog'
import { ResizeDialog } from './components/ResizeDialog'
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
import {
  clampDisplayScale,
  DEFAULT_INTERPOLATION,
  getScaledDimensions,
  resizeImageData,
} from './image/imageScaling'
import './App.css'

function App() {
  const [currentImage, setCurrentImage] = useState<RasterDocument | null>(null)
  const [exportFormat, setExportFormat] = useState<ExportImageFormat>('png')
  const [channelVisibility, setChannelVisibility] = useState(
    createChannelVisibility,
  )
  const [activeTool, setActiveTool] = useState<EditorTool>('pointer')
  const [pixelSample, setPixelSample] = useState<PixelSample | null>(null)
  const [isLevelsOpen, setIsLevelsOpen] = useState(false)
  const [levelsPreview, setLevelsPreview] = useState<ImageData | null>(null)
  const [isResizeOpen, setIsResizeOpen] = useState(false)
  const [displayScale, setDisplayScale] = useState(100)
  const [fitRequestId, setFitRequestId] = useState(0)
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
      levelsPreview ?? currentImage.pixels,
      channelVisibility,
      documentChannels,
    )
  }, [channelVisibility, currentImage, documentChannels, levelsPreview])
  const renderedPixels = useMemo(() => {
    if (!displayedPixels) {
      return null
    }

    const dimensions = getScaledDimensions(
      displayedPixels.width,
      displayedPixels.height,
      displayScale,
    )

    return resizeImageData(
      displayedPixels,
      dimensions.width,
      dimensions.height,
      DEFAULT_INTERPOLATION,
    )
  }, [displayScale, displayedPixels])

  async function handleFileSelect(file: File) {
    setIsLoading(true)
    setErrorMessage('')
    setIsLevelsOpen(false)
    setLevelsPreview(null)
    setIsResizeOpen(false)

    try {
      const loadedImage = await openImageFile(file)
      setCurrentImage(loadedImage)
      setChannelVisibility(createChannelVisibility())
      setPixelSample(null)
      setDisplayScale(100)
      setFitRequestId((current) => current + 1)
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

  function handleLevelsApply(pixels: ImageData) {
    setCurrentImage((current) => current ? { ...current, pixels } : current)
    setLevelsPreview(null)
    setIsLevelsOpen(false)
    setPixelSample(null)
  }

  function handleLevelsCancel() {
    setLevelsPreview(null)
    setIsLevelsOpen(false)
    setPixelSample(null)
  }

  const handleLevelsPreview = useCallback((pixels: ImageData | null) => {
    setLevelsPreview(pixels)
    setPixelSample(null)
  }, [])

  function handleOpenLevels() {
    setActiveTool('pointer')
    setPixelSample(null)
    setIsResizeOpen(false)
    setIsLevelsOpen(true)
  }

  function handleResizeApply(pixels: ImageData) {
    setCurrentImage((current) => current
      ? {
          ...current,
          pixels,
          width: pixels.width,
          height: pixels.height,
        }
      : current)
    setIsResizeOpen(false)
    setPixelSample(null)
  }

  function handleOpenResize() {
    setActiveTool('pointer')
    setPixelSample(null)
    setLevelsPreview(null)
    setIsLevelsOpen(false)
    setIsResizeOpen(true)
  }

  const handleDisplayScaleChange = useCallback((scale: number) => {
    setDisplayScale(clampDisplayScale(scale))
    setPixelSample(null)
  }, [])

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
          isLevelsOpen={isLevelsOpen}
          isResizeOpen={isResizeOpen}
          onOpenLevels={handleOpenLevels}
          onOpenResize={handleOpenResize}
          onSelectTool={setActiveTool}
        />
        <ImageWorkspace
          image={currentImage}
          renderedPixels={renderedPixels}
          sampleSource={displayedPixels}
          fitRequestId={fitRequestId}
          isEyedropperActive={activeTool === 'eyedropper'}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onAutoFit={handleDisplayScaleChange}
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
        displayScale={displayScale}
        onDisplayScaleChange={handleDisplayScaleChange}
      />

      {currentImage && isLevelsOpen && (
        <LevelsDialog
          image={currentImage}
          channels={documentChannels}
          onPreview={handleLevelsPreview}
          onApply={handleLevelsApply}
          onCancel={handleLevelsCancel}
        />
      )}

      {currentImage && isResizeOpen && (
        <ResizeDialog
          image={currentImage}
          onApply={handleResizeApply}
          onCancel={() => setIsResizeOpen(false)}
        />
      )}
    </div>
  )
}

export default App
