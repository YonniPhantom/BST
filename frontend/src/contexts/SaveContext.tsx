import { createContext, useContext, useState, type ReactNode } from 'react'

interface SaveState {
  isSaving: boolean
  lastSaved: Date | null
  hasUnsavedChanges: boolean
  saveError: string | null
}

interface SaveContextType extends SaveState {
  setSaving: (saving: boolean) => void
  setLastSaved: (date: Date) => void
  setUnsavedChanges: (hasChanges: boolean) => void
  setSaveError: (error: string | null) => void
  markAsSaved: () => void
  markAsChanged: () => void
}

const SaveContext = createContext<SaveContextType | undefined>(undefined)

export function SaveProvider({ children }: { children: ReactNode }) {
  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    lastSaved: null,
    hasUnsavedChanges: false,
    saveError: null
  })

  const setSaving = (saving: boolean) => {
    setSaveState(prev => ({ ...prev, isSaving: saving }))
  }

  const setLastSaved = (date: Date) => {
    setSaveState(prev => ({ ...prev, lastSaved: date }))
  }

  const setUnsavedChanges = (hasChanges: boolean) => {
    setSaveState(prev => ({ ...prev, hasUnsavedChanges: hasChanges }))
  }

  const setSaveError = (error: string | null) => {
    setSaveState(prev => ({ ...prev, saveError: error }))
  }

  const markAsSaved = () => {
    setSaveState(prev => ({
      ...prev,
      isSaving: false,
      lastSaved: new Date(),
      hasUnsavedChanges: false,
      saveError: null
    }))
  }

  const markAsChanged = () => {
    setSaveState(prev => ({
      ...prev,
      hasUnsavedChanges: true,
      saveError: null
    }))
  }

  const value: SaveContextType = {
    ...saveState,
    setSaving,
    setLastSaved,
    setUnsavedChanges,
    setSaveError,
    markAsSaved,
    markAsChanged
  }

  return (
    <SaveContext.Provider value={value}>
      {children}
    </SaveContext.Provider>
  )
}

export function useSave() {
  const context = useContext(SaveContext)
  if (context === undefined) {
    throw new Error('useSave must be used within a SaveProvider')
  }
  return context
}
