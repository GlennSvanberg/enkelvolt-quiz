import { Link, createFileRoute } from '@tanstack/react-router'
import { SignIn } from '@clerk/tanstack-start'
import { Button } from '~/components/ui/button'

export const Route = createFileRoute('/sign-in')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === 'string' ? search.redirect : '/',
  }),
  component: SignInPage,
})

function SignInPage() {
  const { redirect } = Route.useSearch()

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          Enkelvolt
        </Link>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
        <div className="w-full max-w-md">
          <SignIn afterSignInUrl={redirect} afterSignUpUrl={redirect} />
        </div>
        <Button asChild variant="outline">
          <Link to="/">Back</Link>
        </Button>
      </main>
    </div>
  )
}

