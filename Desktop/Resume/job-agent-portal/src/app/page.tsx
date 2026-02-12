import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 md:p-24">
      <div className="max-w-5xl w-full text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            Job Agent Portal
          </h1>
          <p className="mx-auto max-w-2xl text-lg leading-8 text-muted-foreground">
            AI-powered job aggregation from all major US job boards. Find, track, and apply to jobs
            with intelligent filtering and personalized outreach.
          </p>
        </div>

        <div className="flex items-center justify-center gap-x-6">
          <Link
            href="/login"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors"
          >
            Get started
          </Link>
          <Link href="/register" className="text-sm font-semibold hover:underline">
            Create account →
          </Link>
        </div>

        <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24">
          <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
            <div className="relative">
              <dt className="text-base font-semibold leading-7">
                Multi-Platform Scraping
              </dt>
              <dd className="mt-2 text-base leading-7 text-muted-foreground">
                Aggregate jobs from Indeed, Dice, LinkedIn, Glassdoor, and ZipRecruiter
              </dd>
            </div>
            <div className="relative">
              <dt className="text-base font-semibold leading-7">
                Application Tracking
              </dt>
              <dd className="mt-2 text-base leading-7 text-muted-foreground">
                Manage your entire application pipeline from saved to offer
              </dd>
            </div>
            <div className="relative">
              <dt className="text-base font-semibold leading-7">
                AI-Powered Outreach
              </dt>
              <dd className="mt-2 text-base leading-7 text-muted-foreground">
                Generate personalized messages to recruiters using Claude AI
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </main>
  )
}
