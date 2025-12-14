import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useEffect, useState } from 'react';
import { Button } from '~/components/ui/button';
import { Leaderboard } from '~/components/Leaderboard';
import { ThemeToggle } from '~/components/ThemeToggle';

export const Route = createFileRoute('/sessions/$code/host')({
  component: HostView,
  loader: async ({ context, params }) => {
    const { queryClient } = context;
    await queryClient.ensureQueryData(
      convexQuery(api.quizzes.getSession, { code: params.code }),
    );
  },
});

function HostView() {
  const { code } = Route.useParams();
  const startSession = useMutation(api.quizzes.startSession);
  const showResults = useMutation(api.quizzes.showResults);
  const nextQuestion = useMutation(api.quizzes.nextQuestion);
  const endSession = useMutation(api.quizzes.endSession);

  const { data: session } = useSuspenseQuery(
    convexQuery(api.quizzes.getSession, { code }),
  );

  const participants = useQuery(
    api.quizzes.getSessionParticipants,
    session ? { sessionId: session._id } : 'skip',
  );

  const currentQuestion = useQuery(
    api.quizzes.getCurrentQuestion,
    session && (session.status === 'active' || session.status === 'showing_results') ? { sessionId: session._id } : 'skip',
  );

  const responses = useQuery(
    api.quizzes.getSessionResponses,
    session && currentQuestion && (session.status === 'active' || session.status === 'showing_results')
      ? {
          sessionId: session._id,
          questionId: currentQuestion._id,
        }
      : 'skip',
  );

  const leaderboard = useQuery(
    api.quizzes.getSessionLeaderboard,
    session && session.status === 'finished' ? { sessionId: session._id } : 'skip',
  );

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
  };

  const handleStart = async () => {
    if (!session) return;
    try {
      await startSession({ sessionId: session._id });
    } catch (error) {
      console.error('Error starting session:', error);
      alert('Failed to start session');
    }
  };

  const handleShowResults = async () => {
    if (!session) return;
    if (session.status !== 'active') {
      console.error('Session status is not active:', session.status);
      alert('Session is not in active state');
      return;
    }
    try {
      await showResults({ sessionId: session._id });
    } catch (error: any) {
      console.error('Error showing results:', error);
      const errorMessage = error?.message || 'Unknown error';
      alert(`Failed to show results: ${errorMessage}`);
    }
  };

  const handleNextQuestion = async () => {
    if (!session) return;
    try {
      await nextQuestion({ sessionId: session._id });
    } catch (error) {
      console.error('Error moving to next question:', error);
      alert('Failed to move to next question');
    }
  };

  const handleEndSession = async () => {
    if (!session) return;
    if (!confirm('Are you sure you want to end this session?')) return;
    try {
      await endSession({ sessionId: session._id });
    } catch (error) {
      console.error('Error ending session:', error);
      alert('Failed to end session');
    }
  };

  if (!session) {
    return (
      <div className="p-8 text-center">
        <p>Session not found</p>
        <Link to="/" className="text-blue-600 underline">
          Go home
        </Link>
      </div>
    );
  }

  const responseCounts = currentQuestion
    ? currentQuestion.answers.map((answer) => ({
        answerId: answer._id,
        text: answer.text,
        count:
          responses?.filter((r) => r.answerId === answer._id).length ?? 0,
        isCorrect: answer.isCorrect,
      }))
    : [];

  const totalResponses = responses?.length ?? 0;
  const totalParticipants = participants?.length ?? 0;

  // Kahoot-style colors - same as participant view
  const kahootColors = [
    {
      bg: 'bg-[#4A90E2]', // Blue
      hover: 'hover:bg-[#3A7BC8]',
      text: 'text-white',
      shadow: 'shadow-[#4A90E2]/50',
    },
    {
      bg: 'bg-[#9013FE]', // Purple
      hover: 'hover:bg-[#7A0FE8]',
      text: 'text-white',
      shadow: 'shadow-[#9013FE]/50',
    },
    {
      bg: 'bg-[#50E3C2]', // Teal/Green
      hover: 'hover:bg-[#40D3B2]',
      text: 'text-white',
      shadow: 'shadow-[#50E3C2]/50',
    },
    {
      bg: 'bg-[#F5A623]', // Orange
      hover: 'hover:bg-[#E59613]',
      text: 'text-white',
      shadow: 'shadow-[#F5A623]/50',
    },
    {
      bg: 'bg-[#E94B3C]', // Red
      hover: 'hover:bg-[#D93B2C]',
      text: 'text-white',
      shadow: 'shadow-[#E94B3C]/50',
    },
    {
      bg: 'bg-[#7ED321]', // Green
      hover: 'hover:bg-[#6EC311]',
      text: 'text-white',
      shadow: 'shadow-[#7ED321]/50',
    },
  ];

  return (
    <>
      <header className="h-12 sm:h-14 bg-background px-2 sm:px-3 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center shrink-0">
        <Link to="/" className="text-sm sm:text-base font-bold">
          Enkelvolt
        </Link>
        <div className="flex items-center gap-1.5 sm:gap-2">
          {session.status === 'active' && (
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              {session.currentQuestionIndex + 1}/{session.questionCount}
            </div>
          )}
          <div className="text-lg sm:text-xl md:text-2xl font-bold text-blue-600 dark:text-blue-400">
            {code}
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="h-[calc(100vh-3rem)] sm:h-[calc(100vh-3.5rem)] flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
        {/* Top Section - Quiz Info and Controls */}
        <div className="px-2 sm:px-3 py-1.5 sm:py-2 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
                  {session.quiz.title}
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 hidden sm:inline">
                    Share code
                  </p>
                  <Button
                    onClick={handleCopyCode}
                    variant="secondary"
                    size="sm"
                    className="cursor-pointer h-6 text-[10px] px-1.5"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
                {session.status === 'active' && currentQuestion && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                        Progress: {totalResponses}/{totalParticipants} answered
                      </span>
                      <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                        {totalParticipants > 0 ? Math.round((totalResponses / totalParticipants) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 sm:h-2">
                      <div
                        className="bg-blue-500 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${totalParticipants > 0 ? (totalResponses / totalParticipants) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-1.5 sm:gap-2 shrink-0">
                <div className="bg-white dark:bg-gray-900 rounded-md p-1.5 sm:p-2 border border-gray-200 dark:border-gray-800 min-w-[60px] sm:min-w-[70px]">
                  <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                    Participants
                  </p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    {totalParticipants}
                  </p>
                </div>
                {session.status === 'active' && (
                  <div className="bg-white dark:bg-gray-900 rounded-md p-1.5 sm:p-2 border border-gray-200 dark:border-gray-800 min-w-[60px] sm:min-w-[70px]">
                    <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">
                      Responses
                    </p>
                    <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                      {totalResponses}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {session.status === 'waiting' && (
            <div className="flex-1 flex items-center justify-center px-4 overflow-auto">
              <div className="max-w-2xl w-full text-center">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                  Waiting for participants...
                </h2>
                {participants && participants.length > 0 && (
                  <div className="mb-4 sm:mb-6">
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-2 sm:mb-3">
                      Joined participants:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {participants.map((p) => (
                        <span
                          key={p._id}
                          className="px-2 sm:px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs sm:text-sm font-medium"
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                <Button
                  onClick={handleStart}
                  className="bg-green-500 text-white hover:bg-green-600 px-6 sm:px-8 py-4 sm:py-6 text-base sm:text-lg font-bold rounded-2xl cursor-pointer shadow-lg shadow-green-500/50 hover:shadow-xl transition-all"
                >
                  Start Quiz
                </Button>
              </div>
            </div>
          )}

          {session.status === 'active' && currentQuestion && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Question Section - Top (50% height) */}
              <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-3 sm:py-4 border-b-2 border-gray-300 dark:border-gray-700">
                <div className="w-full max-w-4xl">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center text-gray-900 dark:text-white leading-tight px-2">
                    {currentQuestion.text}
                  </h1>
                </div>
              </div>

              {/* Answer Responses Grid - Bottom (50% height) */}
              <div className="flex-1 px-3 sm:px-4 pb-3 sm:pb-4 overflow-hidden">
                <div className="max-w-4xl mx-auto h-full flex flex-col">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 flex-1 auto-rows-fr min-h-0">
                    {currentQuestion.answers.map((answer, index) => {
                      const colors = kahootColors[index % kahootColors.length];
                      const letter = String.fromCharCode(65 + index);

                      return (
                        <div
                          key={answer._id}
                          className={`
                            ${colors.bg} ${colors.text}
                            rounded-lg sm:rounded-xl
                            p-1 sm:p-1.5
                            relative overflow-hidden flex flex-col min-h-0
                          `}
                        >
                          {/* Letter indicator */}
                          <div className="absolute top-0.5 left-1 sm:left-1.5">
                            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                              <span className="text-[9px] sm:text-[10px] font-bold">
                                {letter}
                              </span>
                            </div>
                          </div>

                          {/* Answer text */}
                          <div className="mt-3 sm:mt-3.5 mb-0.5 flex-1 min-h-0 flex items-center justify-center">
                            <span className="text-[10px] sm:text-[11px] font-bold block text-center leading-tight">
                              {answer.text}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Control Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-4 shrink-0 justify-end">
                    {session.currentQuestionIndex < session.questionCount - 1 ? (
                      <Button
                        onClick={handleShowResults}
                        className="bg-blue-500 text-white hover:bg-blue-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl cursor-pointer shadow-lg shadow-blue-500/50 hover:shadow-xl transition-all flex-1 sm:flex-none"
                      >
                        Show Results
                      </Button>
                    ) : (
                      <Button
                        onClick={handleShowResults}
                        className="bg-blue-500 text-white hover:bg-blue-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl cursor-pointer shadow-lg shadow-blue-500/50 hover:shadow-xl transition-all flex-1 sm:flex-none"
                      >
                        Show Results
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {session.status === 'showing_results' && currentQuestion && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Question Section - Top (50% height) */}
              <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-3 sm:py-4 border-b-2 border-gray-300 dark:border-gray-700">
                <div className="w-full max-w-4xl">
                  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center text-gray-900 dark:text-white leading-tight px-2">
                    {currentQuestion.text}
                  </h1>
                </div>
              </div>

              {/* Results Section - Bottom (50% height) */}
              <div className="flex-1 px-3 sm:px-4 pb-3 sm:pb-4 overflow-hidden">
                <div className="max-w-4xl mx-auto h-full flex flex-col">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 flex-1 auto-rows-fr min-h-0">
                    {responseCounts.map((item, index) => {
                      const colors = kahootColors[index % kahootColors.length];
                      const letter = String.fromCharCode(65 + index);
                      const percentage =
                        totalParticipants > 0
                          ? (item.count / totalParticipants) * 100
                          : 0;

                      return (
                        <div
                          key={item.answerId}
                          className={`
                            ${colors.bg} ${colors.text}
                            rounded-lg sm:rounded-xl
                            p-2 sm:p-3
                            relative overflow-hidden flex flex-col min-h-0
                            ${item.isCorrect ? 'ring-4 ring-green-400 ring-offset-2 dark:ring-offset-gray-950' : ''}
                          `}
                        >
                          {/* Letter indicator */}
                          <div className="absolute top-1 left-2 sm:left-2.5">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                              <span className="text-[10px] sm:text-xs font-bold">
                                {letter}
                              </span>
                            </div>
                          </div>

                          {/* Correct answer indicator */}
                          {item.isCorrect && (
                            <div className="absolute top-1 right-2 sm:right-2.5">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-green-400 flex items-center justify-center">
                                <span className="text-xs sm:text-sm font-bold text-white">
                                  ✓
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Answer text */}
                          <div className="mt-4 sm:mt-5 mb-1 flex-1 min-h-0">
                            <span className="text-xs sm:text-sm font-bold block mb-1 leading-tight">
                              {item.text}
                            </span>
                          </div>

                          {/* Response count and bar */}
                          <div className="mt-auto pt-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm sm:text-base font-bold">
                                {item.count} {item.count === 1 ? 'vote' : 'votes'}
                              </span>
                              <span className="text-xs sm:text-sm opacity-90">
                                {Math.round(percentage)}%
                              </span>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-1 sm:h-1.5 backdrop-blur-sm">
                              <div
                                className="h-1 sm:h-1.5 rounded-full bg-white/90 transition-all duration-500"
                                style={{
                                  width: `${percentage}%`,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Control Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-4 shrink-0 justify-end">
                    {session.currentQuestionIndex < session.questionCount - 1 ? (
                      <Button
                        onClick={handleNextQuestion}
                        className="bg-green-500 text-white hover:bg-green-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl cursor-pointer shadow-lg shadow-green-500/50 hover:shadow-xl transition-all flex-1 sm:flex-none"
                      >
                        Continue to Next Question
                      </Button>
                    ) : (
                      <Button
                        onClick={handleNextQuestion}
                        className="bg-green-500 text-white hover:bg-green-600 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl cursor-pointer shadow-lg shadow-green-500/50 hover:shadow-xl transition-all flex-1 sm:flex-none"
                      >
                        Finish Quiz
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {session.status === 'finished' && (
            <div className="flex-1 flex items-center justify-center px-4 overflow-auto py-6 sm:py-8">
              {leaderboard === undefined ? (
                <div className="max-w-2xl w-full text-center">
                  <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
                    Loading leaderboard...
                  </p>
                </div>
              ) : leaderboard.length === 0 ? (
                <div className="max-w-2xl w-full text-center">
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4">
                    Quiz Finished!
                  </h2>
                  <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
                    No participants joined this session.
                  </p>
                  <Link
                    to="/"
                    className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 text-white hover:bg-blue-600 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold transition-all cursor-pointer"
                  >
                    Go back to home
                  </Link>
                </div>
              ) : (
                <div className="w-full">
                  <Leaderboard entries={leaderboard} />
                  <div className="mt-6 sm:mt-8 text-center">
                    <Link
                      to="/"
                      className="inline-block px-4 sm:px-6 py-2 sm:py-3 bg-blue-500 text-white hover:bg-blue-600 rounded-xl sm:rounded-2xl text-sm sm:text-base font-semibold transition-all cursor-pointer"
                    >
                      Go back to home
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
