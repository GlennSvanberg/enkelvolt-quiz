import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { api } from '../../convex/_generated/api';
import { Button } from '~/components/ui/button';
import { ThemeToggle } from '~/components/ThemeToggle';

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
        params: { code: quizCode.trim().toUpperCase() },
      });
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          Enkelvolt
        </Link>
        <ThemeToggle />
      </header>
      <main className="p-8 flex flex-col gap-8 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center">Enkelvolt</h1>
        <p className="text-center text-gray-600 dark:text-gray-400">
          Simple quiz app - join or create quizzes
        </p>

        <div className="flex flex-col gap-6">
          <div className="border rounded-lg p-6 bg-white dark:bg-gray-900">
            <h2 className="text-xl font-semibold mb-4">Join a Quiz Session</h2>
            <form onSubmit={handleJoinQuiz} className="flex gap-2">
              <input
                type="text"
                value={quizCode}
                onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
                placeholder="Enter session code"
                className="flex-1 px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                maxLength={6}
              />
              <Button
                type="submit"
                className="bg-green-500 text-white hover:bg-green-600"
              >
                Join
              </Button>
            </form>
          </div>

          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">All Quizzes</h2>
            <Button asChild className="bg-blue-500 text-white hover:bg-blue-600">
              <Link to="/quizzes/create">Create New Quiz</Link>
            </Button>
          </div>

          {quizzes.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <p>No quizzes yet. Create the first one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map((quiz) => (
                <Link
                  key={quiz._id}
                  to="/quizzes/$quizId"
                  params={{ quizId: quiz._id }}
                  className="border rounded-lg p-6 hover:shadow-lg transition-shadow bg-white dark:bg-gray-900 dark:border-gray-700"
                >
                  <h3 className="text-xl font-semibold mb-2">{quiz.title}</h3>
                  {quiz.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      {quiz.description}
                    </p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-500">
                    Created{' '}
                    {new Date(quiz.createdAt).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
