/**
 * Resume Parser - Extract structured data from resume text using Claude AI
 */

import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

export interface ParsedResume {
  skills: {
    technical: string[]
    soft: string[]
  }
  experience: {
    jobTitles: string[]
    yearsOfExperience: number
    industries: string[]
  }
  preferences: {
    desiredRoles: string[]
    minSalary?: number
    maxSalary?: number
    locations: string[]
    remotePreference: 'only' | 'hybrid' | 'no-preference'
  }
  summary: string
}

const RESUME_PARSER_PROMPT = `You are an expert resume parser. Analyze the resume text and extract structured information.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "skills": {
    "technical": ["skill1", "skill2", ...],
    "soft": ["communication", "leadership", ...]
  },
  "experience": {
    "jobTitles": ["Software Engineer", "Senior Developer", ...],
    "yearsOfExperience": 5,
    "industries": ["Technology", "Finance", ...]
  },
  "preferences": {
    "desiredRoles": ["AI Engineer", "ML Engineer", ...],
    "minSalary": 150000,
    "maxSalary": 220000,
    "locations": ["San Francisco", "Remote", ...],
    "remotePreference": "only"
  },
  "summary": "Brief 2-sentence professional summary"
}

Guidelines:
- Extract ALL technical skills (languages, frameworks, tools, technologies)
- Infer years of experience from job dates
- Identify role progression and seniority
- Infer salary range from current/recent roles if mentioned
- Determine remote preference from location history
- If information is not available, use empty arrays or reasonable defaults`

/**
 * Parse resume text and extract structured data
 */
export async function parseResume(resumeText: string): Promise<ParsedResume> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `${RESUME_PARSER_PROMPT}\n\nResume Text:\n${resumeText}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude')
    }

    // Parse JSON response
    const parsed = JSON.parse(content.text) as ParsedResume

    // Validate structure
    if (!parsed.skills || !parsed.experience || !parsed.preferences) {
      throw new Error('Invalid resume parse response structure')
    }

    return parsed
  } catch (error) {
    console.error('Resume parsing error:', error)

    // Return default structure on error
    return {
      skills: {
        technical: [],
        soft: [],
      },
      experience: {
        jobTitles: [],
        yearsOfExperience: 0,
        industries: [],
      },
      preferences: {
        desiredRoles: [],
        locations: [],
        remotePreference: 'no-preference',
      },
      summary: 'Unable to parse resume',
    }
  }
}

/**
 * Extract just skills from resume (faster, cheaper)
 */
export async function extractSkills(resumeText: string): Promise<string[]> {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001', // Use faster model for simple extraction
      max_tokens: 512,
      messages: [
        {
          role: 'user',
          content: `Extract all technical skills from this resume as a JSON array of strings. Return ONLY the array, no explanation.\n\nResume:\n${resumeText}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return []
    }

    const skills = JSON.parse(content.text) as string[]
    return skills
  } catch (error) {
    console.error('Skill extraction error:', error)
    return []
  }
}
