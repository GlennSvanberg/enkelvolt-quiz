import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import { Button } from '~/components/ui/button';
import { ThemeToggle } from '~/components/ThemeToggle';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Zap, Users, Shield, Sparkles } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [quizCode, setQuizCode] = useState('');

  const { data: quizzes } = useSuspenseQuery(
    convexQuery(api.quizzes.listQuizzes, {}),
  );

  const handleJoinQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (quizCode.trim()) {
      navigate({
        to: '/sessions/$code/play',
        params: { code: quizCode.trim().toUpperCase() } as any,
        search: {} as any,
      });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex flex-row justify-between items-center">
          <Link to="/" className="flex items-center gap-3 group">
            <img
              src="/enkelvolt_blue.png"
              alt="Enkelvolt"
              className="h-10 w-10 animate-logo-glow transition-transform group-hover:scale-105"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Enkelvolt
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-col">
        {/* Hero Section */}
        <section className="relative py-20 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          <div className="container mx-auto max-w-4xl relative z-10">
            <div className="flex flex-col items-center text-center gap-8 animate-hero-fade-in">
              <div className="flex flex-col items-center gap-6">
                <img
                  src="/enkelvolt_blue.png"
                  alt="Enkelvolt Logo"
                  className="h-32 w-32 animate-logo-glow"
                />
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
                  Simple quizzes.
                  <br />
                  <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    No login. No paywall.
                  </span>
                  <br />
                  Just fun.
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl">
                  The stress-free alternative to Kahoot. Join instantly with a
                  code, or create your own quiz in seconds.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
                <Button
                  asChild
                  size="lg"
                  className="flex-1 text-lg h-14 bg-primary hover:bg-primary/90"
                >
                  <Link to="/quizzes/create">Create Quiz</Link>
                </Button>
                <Button
                  size="lg"
                  variant="secondary"
                  className="flex-1 text-lg h-14"
                  onClick={() => {
                    document
                      .getElementById('join-quiz')
                      ?.scrollIntoView({ behavior: 'smooth' });
                  }}
                >
                  Join Quiz
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 px-4 bg-muted/30">
          <div className="container mx-auto max-w-5xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-2 hover:border-primary/50 transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle>No Login Required</CardTitle>
                  <CardDescription>
                    Jump right in with just a session code. No accounts, no
                    passwords, no hassle.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-accent/50 transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                    <Shield className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle>Completely Free</CardTitle>
                  <CardDescription>
                    No paywalls, no premium features locked away. Everything you
                    need is free, forever.
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="border-2 hover:border-secondary/50 transition-colors">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-secondary/10 flex items-center justify-center mb-4">
                    <Sparkles className="h-6 w-6 text-secondary" />
                  </div>
                  <CardTitle>Simple & Stress-Free</CardTitle>
                  <CardDescription>
                    Clean interface, no distractions. Focus on the fun, not the
                    frustration.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </section>

        {/* Join Quiz Section */}
        <section id="join-quiz" className="py-16 px-4">
          <div className="container mx-auto max-w-2xl">
            <Card className="border-2">
              <CardHeader className="text-center">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-3xl">Join a Quiz Session</CardTitle>
                <CardDescription className="text-lg">
                  Enter your session code to start playing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleJoinQuiz} className="flex flex-col gap-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={quizCode}
                      onChange={(e) =>
                        setQuizCode(e.target.value.toUpperCase())
                      }
                      placeholder="Enter session code"
                      className="flex-1 px-6 py-4 text-lg border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
                      maxLength={6}
                    />
                    <Button
                      type="submit"
                      size="lg"
                      className="px-8 text-lg h-auto bg-primary hover:bg-primary/90"
                    >
                      Join
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quiz List Section */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-5xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h2 className="text-3xl font-bold mb-2">All Quizzes</h2>
                <p className="text-muted-foreground">
                  Browse and play quizzes created by the community
                </p>
              </div>
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90">
                <Link to="/quizzes/create">Create New Quiz</Link>
              </Button>
            </div>

            {quizzes.length === 0 ? (
              <Card className="border-2 border-dashed">
                <CardContent className="py-16 text-center">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <CardTitle className="mb-2">No quizzes yet</CardTitle>
                  <CardDescription className="mb-6">
                    Be the first to create an amazing quiz!
                  </CardDescription>
                  <Button asChild className="bg-primary hover:bg-primary/90">
                    <Link to="/quizzes/create">Create Your First Quiz</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quizzes.map((quiz) => (
                  <Link
                    key={quiz._id}
                    to="/quizzes/$quizId"
                    params={{ quizId: quiz._id }}
                  >
                    <Card className="h-full border-2 hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer group">
                      <CardHeader>
                        <CardTitle className="group-hover:text-primary transition-colors">
                          {quiz.title}
                        </CardTitle>
                        {quiz.description && (
                          <CardDescription className="line-clamp-2">
                            {quiz.description}
                          </CardDescription>
                        )}
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Created{' '}
                          {new Date(quiz.createdAt).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
