import { useFile } from '../contexts/FileContext'

export function useSelectedFile() {
  const { selectedFile, setSelectedFile, clearSelectedFile } = useFile()

  return {
    selectedFile,
    setSelectedFile,
    clearSelectedFile,
    hasSelectedFile: !!selectedFile,
    selectedFileId: selectedFile?.id || null,
    selectedFileName: selectedFile?.name || null
  }
}
