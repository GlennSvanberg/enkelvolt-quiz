import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '~/components/ui/button';
import { ThemeToggle } from '~/components/ThemeToggle';

export const Route = createFileRoute('/quizzes/$quizId')({
  component: QuizDetail,
  loader: async ({ context, params }) => {
    const { queryClient } = context as { queryClient: any };
    await queryClient.ensureQueryData(
      convexQuery(api.quizzes.getQuiz, { quizId: params.quizId as any }),
    );
  },
});

function QuizDetail() {
  const { quizId } = Route.useParams();
  const navigate = useNavigate();
  const createSession = useMutation(api.quizzes.createSession);

  const { data: quiz } = useSuspenseQuery(
    convexQuery(api.quizzes.getQuiz, { quizId: quizId as any }),
  );

  const handleStartSession = async () => {
    try {
      const result = await createSession({ quizId: quizId as any });
      navigate({
        to: '/sessions/$code/host',
        params: { code: result.code } as any,
        search: {} as any,
      });
    } catch (error) {
      console.error('Error creating session:', error);
      alert('Failed to start session. Please try again.');
    }
  };

  if (!quiz) {
    return (
      <div className="p-8 text-center">
        <p>Quiz not found</p>
        <Link to="/" className="text-blue-600 underline">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <Link to="/" className="text-xl font-bold">
          Enkelvolt
        </Link>
        <ThemeToggle />
      </header>
      <main className="p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <Link
            to="/"
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            ← Back to quizzes
          </Link>
        </div>

        <div className="border rounded-lg p-6 bg-white dark:bg-gray-900 mb-6">
          <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
          {quiz.description && (
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {quiz.description}
            </p>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-500">
            {quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="mb-6">
          <Button
            onClick={handleStartSession}
            className="bg-green-500 text-white hover:bg-green-600 text-lg"
            size="lg"
          >
            Start Session
          </Button>
        </div>

        <div className="border rounded-lg p-6 bg-white dark:bg-gray-900">
          <h2 className="text-2xl font-semibold mb-4">Questions</h2>
          <div className="flex flex-col gap-6">
            {quiz.questions.map((question, index) => (
              <div
                key={question._id}
                className="border-b pb-4 last:border-b-0 last:pb-0"
              >
                <h3 className="text-lg font-semibold mb-2">
                  {index + 1}. {question.text}
                </h3>
                <div className="flex flex-col gap-2 ml-4">
                  {question.answers.map((answer, answerIndex) => (
                    <div
                      key={answer._id}
                      className={`flex items-center gap-2 ${
                        answer.isCorrect
                          ? 'text-green-600 dark:text-green-400 font-semibold'
                          : ''
                      }`}
                    >
                      <span className="w-6 h-6 rounded-full border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center text-sm">
                        {String.fromCharCode(65 + answerIndex)}
                      </span>
                      <span>{answer.text}</span>
                      {answer.isCorrect && (
                        <span className="text-xs">✓ Correct</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
