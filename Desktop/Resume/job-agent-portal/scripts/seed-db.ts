import { db } from '../src/lib/db'
import {
  users,
  searchProfiles,
  jobs,
  recruiterContacts,
  jobApplications,
  resumes,
} from '../src/lib/db/schema'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'

async function seed() {
  console.log('🌱 Seeding database...')

  try {
    // Create test user
    const userId = crypto.randomUUID()
    const passwordHash = await bcrypt.hash('Password123!', 10)

    await db.insert(users).values({
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
      passwordHash,
      location: 'San Francisco, CA',
      phone: '+1-555-0100',
      linkedinUrl: 'https://linkedin.com/in/testuser',
      resumeText: `John Doe
AI Solution Architect | 10+ years experience

SKILLS
- Python, TensorFlow, PyTorch
- AWS, Azure, GCP
- Machine Learning, Deep Learning
- System Architecture
- Solution Design

EXPERIENCE
Senior AI Architect at Tech Corp (2020-Present)
- Led AI platform development
- Deployed ML models at scale
- Managed team of 5 engineers`,
      preferences: JSON.stringify({
        emailNotifications: true,
        defaultView: 'grid',
      }),
    })

    console.log(`✅ Created user: ${userId}`)

    // Create search profiles
    const aiProfileId = crypto.randomUUID()
    const ediProfileId = crypto.randomUUID()

    await db.insert(searchProfiles).values([
      {
        id: aiProfileId,
        userId,
        name: 'AI Solution Architect',
        isActive: true,
        jobTitles: JSON.stringify(['AI Solution Architect', 'AI Architect', 'ML Architect']),
        skills: JSON.stringify(['Python', 'TensorFlow', 'AWS', 'Azure', 'Machine Learning']),
        locations: JSON.stringify(['United States', 'Remote']),
        isRemote: true,
        employmentTypes: JSON.stringify(['contract', 'c2c']),
        minSalary: 85,
        maxSalary: 120,
        salaryType: 'hourly',
        excludeKeywords: JSON.stringify(['security clearance', 'US citizen only']),
        includeKeywords: JSON.stringify(['C2C', 'Corp to Corp', 'W2']),
        platforms: JSON.stringify(['indeed', 'dice', 'linkedin']),
        domain: 'AI',
      },
      {
        id: ediProfileId,
        userId,
        name: 'EDI Developer',
        isActive: false,
        jobTitles: JSON.stringify(['EDI Developer', 'EDI Consultant', 'Integration Specialist']),
        skills: JSON.stringify(['EDI', 'X12', 'EDIFACT', 'AS2', 'B2B Integration']),
        locations: JSON.stringify(['United States']),
        isRemote: true,
        employmentTypes: JSON.stringify(['contract']),
        minSalary: 70,
        maxSalary: 95,
        salaryType: 'hourly',
        excludeKeywords: JSON.stringify([]),
        includeKeywords: JSON.stringify(['EDI', 'X12']),
        platforms: JSON.stringify(['indeed', 'dice']),
        domain: 'EDI',
      },
    ])

    console.log(`✅ Created search profiles: ${aiProfileId}, ${ediProfileId}`)

    // Create sample jobs
    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000)

    const job1Id = crypto.randomUUID()
    const job2Id = crypto.randomUUID()
    const job3Id = crypto.randomUUID()

    await db.insert(jobs).values([
      {
        id: job1Id,
        externalId: 'indeed-12345',
        platform: 'indeed',
        dedupHash: crypto
          .createHash('sha256')
          .update('ai solution architect-tech corp-san francisco, ca')
          .digest('hex'),
        title: 'AI Solution Architect',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        isRemote: false,
        salaryText: '$95-110/hr',
        salaryMin: 95,
        salaryMax: 110,
        salaryType: 'hourly',
        employmentType: 'contract',
        description: `We are seeking an experienced AI Solution Architect to lead our AI platform development.

Key Responsibilities:
- Design and implement scalable AI solutions
- Lead technical architecture decisions
- Collaborate with cross-functional teams
- Deploy ML models to production

Requirements:
- 8+ years of experience in software development
- Strong expertise in Python, TensorFlow, PyTorch
- Experience with AWS/Azure cloud platforms
- Excellent communication skills`,
        requirements: 'Python, TensorFlow, AWS, 8+ years experience',
        postedAt: yesterday.toISOString(),
        postedAtRaw: '1 day ago',
        applyUrl: 'https://www.indeed.com/jobs?q=AI+Solution+Architect&l=San+Francisco%2C+CA',
        sourceUrl: 'https://indeed.com/q-ai-solution-architect-l-san-francisco-jobs.html',
      },
      {
        id: job2Id,
        externalId: 'dice-67890',
        platform: 'dice',
        dedupHash: crypto
          .createHash('sha256')
          .update('machine learning engineer-ai innovations-remote')
          .digest('hex'),
        title: 'Machine Learning Engineer',
        company: 'AI Innovations',
        location: 'Remote',
        isRemote: true,
        salaryText: '$100-120/hr',
        salaryMin: 100,
        salaryMax: 120,
        salaryType: 'hourly',
        employmentType: 'c2c',
        description: `Corp-to-Corp opportunity for an experienced ML Engineer.

What You'll Do:
- Build and deploy ML models
- Optimize model performance
- Work with large-scale datasets
- Collaborate with data scientists

Must Have:
- 5+ years ML experience
- Python, scikit-learn, TensorFlow
- C2C experience preferred`,
        requirements: 'Python, ML, 5+ years, C2C',
        postedAt: now.toISOString(),
        postedAtRaw: 'Just posted',
        applyUrl: 'https://www.dice.com/jobs?q=Machine+Learning+Engineer&location=Remote',
        sourceUrl: 'https://dice.com/jobs?q=machine+learning',
      },
      {
        id: job3Id,
        externalId: 'linkedin-abc123',
        platform: 'linkedin',
        dedupHash: crypto
          .createHash('sha256')
          .update('senior ai architect-future tech-austin, tx')
          .digest('hex'),
        title: 'Senior AI Architect',
        company: 'Future Tech',
        location: 'Austin, TX',
        isRemote: true,
        salaryText: '$140,000-$180,000/year',
        salaryMin: 67.31, // ~140k annual to hourly
        salaryMax: 86.54, // ~180k annual to hourly
        salaryType: 'annual',
        employmentType: 'full-time',
        description: `Join our team as a Senior AI Architect!

Responsibilities:
- Lead AI strategy and implementation
- Mentor junior engineers
- Design scalable AI systems

Requirements:
- 10+ years experience
- Deep learning expertise
- Strong leadership skills`,
        requirements: 'Deep learning, Leadership, 10+ years',
        postedAt: twoDaysAgo.toISOString(),
        postedAtRaw: '2 days ago',
        applyUrl: 'https://www.linkedin.com/jobs/search/?keywords=Senior%20AI%20Architect&location=Remote',
        sourceUrl: 'https://linkedin.com/jobs/search/?keywords=ai%20architect',
      },
    ])

    console.log(`✅ Created jobs: ${job1Id}, ${job2Id}, ${job3Id}`)

    // Create recruiter contacts
    await db.insert(recruiterContacts).values([
      {
        jobId: job1Id,
        name: 'Sarah Johnson',
        email: 'sjohnson@recruiter.com',
        phone: '+1-555-0200',
        linkedinUrl: 'https://linkedin.com/in/sarahjohnson',
        company: 'Tech Recruiters Inc',
        title: 'Senior Technical Recruiter',
        source: 'dice_listing',
      },
      {
        jobId: job2Id,
        name: 'Mike Chen',
        linkedinUrl: 'https://linkedin.com/in/mikechen',
        company: 'AI Innovations',
        title: 'Hiring Manager',
        source: 'linkedin_scrape',
      },
    ])

    console.log('✅ Created recruiter contacts')

    // Create sample resume
    const resumeId = crypto.randomUUID()
    await db.insert(resumes).values({
      id: resumeId,
      userId,
      filename: 'resume-ai-architect.pdf',
      filePath: `uploads/${userId}/resumes/resume-ai-architect.pdf`,
      fileType: 'pdf',
      fileSize: 245678,
      parsedText: `John Doe
AI Solution Architect | 10+ years experience

SKILLS
- Python, TensorFlow, PyTorch, scikit-learn
- AWS, Azure, GCP
- Machine Learning, Deep Learning, NLP
- Docker, Kubernetes
- System Architecture, Solution Design

EXPERIENCE
Senior AI Architect at Tech Corp (2020-Present)
- Led AI platform development serving 10M+ users
- Deployed 15+ ML models to production
- Managed team of 5 engineers
- Reduced inference latency by 60%

AI Engineer at DataCo (2016-2020)
- Built recommendation systems
- Developed NLP pipelines
- Implemented CI/CD for ML models

EDUCATION
M.S. Computer Science - Stanford University
B.S. Computer Science - UC Berkeley`,
      isDefault: true,
      label: 'AI Roles',
    })

    console.log(`✅ Created resume: ${resumeId}`)

    // Create sample applications
    await db.insert(jobApplications).values([
      {
        userId,
        jobId: job1Id,
        profileId: aiProfileId,
        status: 'applied',
        appliedAt: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
        appliedVia: 'website',
        resumeId,
        notes: 'Great role at Tech Corp. Submitted application via Indeed.',
      },
      {
        userId,
        jobId: job2Id,
        profileId: aiProfileId,
        status: 'saved',
        notes: 'C2C opportunity - need to follow up with recruiter',
      },
      {
        userId,
        jobId: job3Id,
        profileId: aiProfileId,
        status: 'ready_to_apply',
        notes: 'Full-time role in Austin - prepare customized cover letter',
      },
    ])

    console.log('✅ Created job applications')

    console.log('\n🎉 Database seeding complete!')
    console.log('\nTest credentials:')
    console.log('Email: test@example.com')
    console.log('Password: Password123!')
  } catch (error) {
    console.error('❌ Seeding failed:', error)
    process.exit(1)
  }
}

seed()
