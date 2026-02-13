'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Mail, Linkedin, Loader2, Copy, CheckCircle2, FileText, Upload, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type MessageType = 'linkedin' | 'email'
type DocumentType = 'resume' | 'coverLetter'
type ToneType = 'professional' | 'formal' | 'casual'

export default function OutreachPage() {
  const { toast } = useToast()

  const [jobDescription, setJobDescription] = useState('')
  const [recruiterName, setRecruiterName] = useState('')
  const [company, setCompany] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [messageTone, setMessageTone] = useState<ToneType>('professional')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isGeneratingDocs, setIsGeneratingDocs] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [linkedinMessage, setLinkedinMessage] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [resumeUrl, setResumeUrl] = useState('')
  const [coverLetterUrl, setCoverLetterUrl] = useState('')
  const [copiedType, setCopiedType] = useState<MessageType | null>(null)
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [convertedPdfUrl, setConvertedPdfUrl] = useState('')
  const [showResumeDialog, setShowResumeDialog] = useState(false)
  const [customResumeFile, setCustomResumeFile] = useState<File | null>(null)

  const handleGenerate = async () => {
    if (!jobDescription.trim()) {
      toast({
        title: 'Job description required',
        description: 'Please enter a job description to generate messages',
        variant: 'destructive',
      })
      return
    }

    setIsGenerating(true)
    try {
      const response = await fetch('/api/chat/generate-outreach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          recruiterName: recruiterName || 'Hiring Manager',
          company: company || 'the company',
          tone: messageTone,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate messages')
      }

      const data = await response.json()
      setLinkedinMessage(data.data.linkedinMessage)
      setEmailMessage(data.data.emailMessage)

      toast({
        title: 'Messages generated',
        description: 'LinkedIn and email messages have been generated successfully',
      })
    } catch (error) {
      toast({
        title: 'Generation failed',
        description: 'Failed to generate outreach messages. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopy = async (type: MessageType) => {
    const message = type === 'linkedin' ? linkedinMessage : emailMessage
    await navigator.clipboard.writeText(message)
    setCopiedType(type)

    toast({
      title: 'Copied to clipboard',
      description: `${type === 'linkedin' ? 'LinkedIn' : 'Email'} message copied successfully`,
    })

    setTimeout(() => setCopiedType(null), 2000)
  }

  const handleGenerateDocuments = async (useCustomResume: boolean = false) => {
    if (!jobDescription.trim()) {
      toast({
        title: 'Job description required',
        description: 'Please enter a job description to generate documents',
        variant: 'destructive',
      })
      return
    }

    setIsGeneratingDocs(true)
    setShowResumeDialog(false)
    try {
      const response = await fetch('/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          jobTitle: jobTitle || 'Position',
          company: company || 'the company',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate documents')
      }

      const data = await response.json()
      setResumeUrl(data.data.resumeUrl)
      setCoverLetterUrl(data.data.coverLetterUrl)

      toast({
        title: 'Documents generated',
        description: 'Resume and cover letter have been generated successfully',
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate documents'
      toast({
        title: 'Generation failed',
        description: errorMessage.includes('resume')
          ? 'Please upload your resume first in the Resumes section'
          : errorMessage,
        variant: 'destructive',
      })
    } finally {
      setIsGeneratingDocs(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.name.endsWith('.docx')) {
        toast({
          title: 'Invalid file type',
          description: 'Please upload a Word document (.docx)',
          variant: 'destructive',
        })
        return
      }
      setUploadedFile(file)
      setConvertedPdfUrl('') // Reset previous conversion
    }
  }

  const handleConvertToPdf = async () => {
    if (!uploadedFile) {
      toast({
        title: 'No file selected',
        description: 'Please upload a Word document first',
        variant: 'destructive',
      })
      return
    }

    setIsConverting(true)
    try {
      const formData = new FormData()
      formData.append('file', uploadedFile)

      const response = await fetch('/api/documents/convert-to-pdf', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to convert document')
      }

      const data = await response.json()
      setConvertedPdfUrl(data.data.pdfUrl)

      toast({
        title: 'Conversion successful',
        description: 'Your document has been converted to PDF',
      })
    } catch (error) {
      toast({
        title: 'Conversion failed',
        description: 'Failed to convert document to PDF. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={Mail}
        title="Recruiter Outreach"
        description="Generate personalized LinkedIn and email messages for recruiters"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Job Details</h3>

            <div className="space-y-4">
              <div>
                <Label htmlFor="jobDescription">Job Description *</Label>
                <Textarea
                  id="jobDescription"
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  className="min-h-[150px] mt-2"
                />
              </div>

              <div>
                <Label htmlFor="jobTitle">Job Title (Optional)</Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g., Senior Software Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="recruiterName">Recruiter Name (Optional)</Label>
                <Input
                  id="recruiterName"
                  placeholder="e.g., John Smith"
                  value={recruiterName}
                  onChange={(e) => setRecruiterName(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="company">Company Name (Optional)</Label>
                <Input
                  id="company"
                  placeholder="e.g., Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div>
                <Label>Message Tone</Label>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <Button
                    type="button"
                    variant={messageTone === 'professional' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMessageTone('professional')}
                    className="w-full"
                  >
                    Professional
                  </Button>
                  <Button
                    type="button"
                    variant={messageTone === 'formal' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMessageTone('formal')}
                    className="w-full"
                  >
                    Formal
                  </Button>
                  <Button
                    type="button"
                    variant={messageTone === 'casual' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setMessageTone('casual')}
                    className="w-full"
                  >
                    Casual
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !jobDescription.trim()}
                  size="lg"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Messages
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => setShowResumeDialog(true)}
                  disabled={isGeneratingDocs || !jobDescription.trim()}
                  variant="secondary"
                  size="lg"
                >
                  {isGeneratingDocs ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-4 w-4" />
                      Resume & CL
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Output Section */}
        <div className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Generated Messages</h3>

            {!linkedinMessage && !emailMessage ? (
              <div className="text-center py-12">
                <Mail className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Enter job details and click generate to create personalized outreach messages
                </p>
              </div>
            ) : (
              <Tabs defaultValue="linkedin" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="linkedin" className="flex items-center gap-2">
                    <Linkedin className="h-4 w-4" />
                    LinkedIn Message
                  </TabsTrigger>
                  <TabsTrigger value="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email Message
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="linkedin" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>LinkedIn Connection Request (300 char limit)</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy('linkedin')}
                      >
                        {copiedType === 'linkedin' ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={linkedinMessage}
                      readOnly
                      className="min-h-[300px] font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Character count: {linkedinMessage.length} / 300
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="email" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Email Message</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy('email')}
                      >
                        {copiedType === 'email' ? (
                          <>
                            <CheckCircle2 className="mr-2 h-4 w-4" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                    <Textarea
                      value={emailMessage}
                      readOnly
                      className="min-h-[300px] font-mono text-sm"
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </Card>

          {/* Generated Documents */}
          {(resumeUrl || coverLetterUrl) && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Generated Documents</h3>
              <div className="space-y-3">
                {resumeUrl && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Resume</p>
                        <p className="text-xs text-muted-foreground">Customized for this position</p>
                      </div>
                    </div>
                    <Button asChild size="sm">
                      <a href={resumeUrl} download>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  </div>
                )}

                {coverLetterUrl && (
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Cover Letter</p>
                        <p className="text-xs text-muted-foreground">Tailored to job description</p>
                      </div>
                    </div>
                    <Button asChild size="sm">
                      <a href={coverLetterUrl} download>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </a>
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Word to PDF Converter */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Word to PDF Converter</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="wordFile">Upload Word Document</Label>
                <div className="mt-2">
                  <Input
                    id="wordFile"
                    type="file"
                    accept=".docx"
                    onChange={handleFileUpload}
                    className="cursor-pointer"
                  />
                </div>
                {uploadedFile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Selected: {uploadedFile.name}
                  </p>
                )}
              </div>

              <Button
                onClick={handleConvertToPdf}
                disabled={!uploadedFile || isConverting}
                className="w-full"
              >
                {isConverting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Converting to PDF...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Convert to PDF
                  </>
                )}
              </Button>

              {convertedPdfUrl && (
                <div className="flex items-center justify-between p-3 border rounded-lg bg-primary/5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">PDF Ready</p>
                      <p className="text-xs text-muted-foreground">Conversion successful</p>
                    </div>
                  </div>
                  <Button asChild size="sm">
                    <a href={convertedPdfUrl} download>
                      <Download className="mr-2 h-4 w-4" />
                      Download PDF
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Resume Selection Dialog */}
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose Resume Source</DialogTitle>
            <DialogDescription>
              Select which resume to use for generating your customized documents
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Button
              onClick={() => handleGenerateDocuments(false)}
              variant="outline"
              className="w-full justify-start h-auto p-4"
              disabled={isGeneratingDocs}
            >
              <div className="text-left">
                <div className="font-semibold mb-1">Use Base Resume</div>
                <div className="text-sm text-muted-foreground">
                  Use your profile resume to generate tailored documents
                </div>
              </div>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customResume">Upload New Resume (Optional)</Label>
              <Input
                id="customResume"
                type="file"
                accept=".txt,.docx,.pdf"
                onChange={(e) => setCustomResumeFile(e.target.files?.[0] || null)}
                className="cursor-pointer"
              />
              {customResumeFile && (
                <p className="text-sm text-muted-foreground">
                  Selected: {customResumeFile.name}
                </p>
              )}
              <Button
                onClick={() => handleGenerateDocuments(true)}
                disabled={!customResumeFile || isGeneratingDocs}
                className="w-full"
              >
                Use Custom Resume
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
