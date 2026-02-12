'use client'

import { useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Upload, FileText, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ResumeUploadProps {
  onUpload: (file: File, label?: string, isDefault?: boolean) => Promise<void>
  isUploading?: boolean
}

export function ResumeUpload({ onUpload, isUploading }: ResumeUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [label, setLabel] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (selectedFile: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ]

    if (!allowedTypes.includes(selectedFile.type)) {
      alert('Please upload a PDF or DOCX file')
      return
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (selectedFile.size > maxSize) {
      alert('File size must be less than 10MB')
      return
    }

    setFile(selectedFile)
    if (!label) {
      setLabel(selectedFile.name)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileChange(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    await onUpload(file, label, isDefault)

    // Reset form
    setFile(null)
    setLabel('')
    setIsDefault(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Drag and Drop Area */}
        <div
          className={cn(
            'relative rounded-lg border-2 border-dashed p-8 text-center transition-colors',
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
            isUploading && 'opacity-50 pointer-events-none'
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.docx"
            onChange={handleInputChange}
            disabled={isUploading}
          />

          {file ? (
            <div className="flex flex-col items-center gap-3">
              <FileText className="h-12 w-12 text-primary" />
              <div className="flex items-center gap-2">
                <span className="font-medium">{file.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={removeFile}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <Upload className="h-12 w-12 text-muted-foreground" />
              <div>
                <p className="font-medium">Drag and drop your resume here</p>
                <p className="mt-1 text-sm text-muted-foreground">or</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                Browse Files
              </Button>
              <p className="text-xs text-muted-foreground">
                PDF or DOCX (max 10MB)
              </p>
            </div>
          )}
        </div>

        {/* Label Input */}
        {file && (
          <>
            <div className="space-y-2">
              <Label htmlFor="label">Resume Label</Label>
              <Input
                id="label"
                placeholder="e.g., Senior Developer Resume 2026"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                disabled={isUploading}
              />
            </div>

            {/* Default Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isDefault"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(Boolean(checked))}
                disabled={isUploading}
              />
              <Label htmlFor="isDefault" className="cursor-pointer">
                Set as default resume
              </Label>
            </div>

            {/* Upload Button */}
            <Button type="submit" className="w-full" disabled={isUploading || !file}>
              {isUploading ? 'Uploading...' : 'Upload Resume'}
            </Button>
          </>
        )}
      </form>
    </Card>
  )
}
