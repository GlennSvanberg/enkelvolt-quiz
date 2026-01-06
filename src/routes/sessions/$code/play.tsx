import { Link, createFileRoute } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useMutation, useQuery } from 'convex/react';
import { useState, useEffect, useRef } from 'react';
import {
  Crown,
  Flame,
  Gamepad2,
  Heart,
  Music,
  Rocket,
  Shield,
  Sparkles,
  Star,
  Trophy,
  User,
  Zap,
  type LucideIcon
} from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '~/components/ui/button';
import { ThemeToggle } from '~/components/ThemeToggle';

export const Route = createFileRoute('/sessions/$code/play')({
  component: ParticipantView,
  loader: async ({ context, params }) => {
    const { queryClient } = context as { queryClient: any };
    await queryClient.ensureQueryData(
      convexQuery(api.quizzes.getSession, { code: params.code }),
    );
  },
});

const AVATAR_OPTIONS: Array<{ name: string; icon: LucideIcon }> = [
  { name: 'user', icon: User },
  { name: 'star', icon: Star },
  { name: 'heart', icon: Heart },
  { name: 'zap', icon: Zap },
  { name: 'trophy', icon: Trophy },
  { name: 'crown', icon: Crown },
  { name: 'rocket', icon: Rocket },
  { name: 'gamepad', icon: Gamepad2 },
  { name: 'music', icon: Music },
  { name: 'sparkles', icon: Sparkles },
  { name: 'flame', icon: Flame },
  { name: 'shield', icon: Shield },
];

const COLOR_OPTIONS = [
  '#4A90E2', // Blue
  '#50E3C2', // Teal
  '#9013FE', // Purple
  '#F5A623', // Orange
  '#E94B3C', // Red
  '#7ED321', // Green
  '#FF6B9D', // Pink
  '#FFD93D', // Yellow
  '#6C5CE7', // Indigo
  '#00D2D3', // Cyan
];

function ParticipantView() {
  const { code } = Route.useParams();
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<string>('user');
  const [selectedColor, setSelectedColor] = useState<string>('#4A90E2');
  const [participantId, setParticipantId] = useState<Id<'participants'> | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<Id<'answers'> | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const joinSession = useMutation(api.quizzes.joinSession);
  const submitAnswer = useMutation(api.quizzes.submitAnswer);

  const { data: session } = useSuspenseQuery(
    convexQuery(api.quizzes.getSession, { code }),
  );

  const currentQuestion = useQuery(
    api.quizzes.getCurrentQuestion,
    session && (session.status === 'active' || session.status === 'showing_results') ? { sessionId: session._id } : 'skip',
  );

  const myResponses = useQuery(
    api.quizzes.getParticipantResponses,
    participantId && session
      ? {
          participantId: participantId,
          sessionId: session._id,
        }
      : 'skip',
  );

  // Check if participant has already answered current question
  useEffect(() => {
    if (participantId && currentQuestion && myResponses) {
      const answered = myResponses.some(
        (r) => r.questionId === currentQuestion._id,
      );
      setHasAnswered(answered);
      if (answered) {
        const myResponse = myResponses.find(
          (r) => r.questionId === currentQuestion._id,
        );
        if (myResponse) {
          setSelectedAnswer(myResponse.answerId);
        }
      } else {
        setSelectedAnswer(null);
      }
    }
  }, [participantId, currentQuestion, myResponses]);

  // Reset answered state when question changes
  useEffect(() => {
    setHasAnswered(false);
    setSelectedAnswer(null);
  }, [currentQuestion?._id]);

  // Auto-play audio when question appears
  useEffect(() => {
    if (currentQuestion?.audioUrl && audioRef.current) {
      console.log('Attempting to play audio:', currentQuestion.audioUrl);
      audioRef.current.currentTime = 0;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio playing successfully');
          })
          .catch((error) => {
            console.error('Error playing audio (autoplay may be blocked):', error);
          });
      }
    } else if (currentQuestion && !currentQuestion.audioUrl) {
      console.log('No audio URL for current question');
    }
  }, [currentQuestion?.audioUrl, currentQuestion?._id]);

  // Log image URL for debugging
  useEffect(() => {
    if (currentQuestion) {
      console.log('Current question media:', {
        hasImage: !!currentQuestion.imageUrl,
        hasAudio: !!currentQuestion.audioUrl,
        imageUrl: currentQuestion.imageUrl,
        audioUrl: currentQuestion.audioUrl,
      });
    }
  }, [currentQuestion?._id]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !session) return;

    try {
      const result = await joinSession({
        sessionId: session._id,
        name: name.trim(),
        avatar: selectedAvatar,
        color: selectedColor,
      });
      setParticipantId(result.participantId);
    } catch (error: any) {
      console.error('Error joining session:', error);
      alert(error.message || 'Failed to join session');
    }
  };

  const handleAnswerSelect = async (answerId: Id<'answers'>) => {
    if (hasAnswered || !session || !currentQuestion || !participantId) {
      return;
    }

    setSelectedAnswer(answerId);

    try {
      await submitAnswer({
        sessionId: session._id,
        questionId: currentQuestion._id,
        participantId: participantId,
        answerId: answerId,
      });
      setHasAnswered(true);
    } catch (error: any) {
      console.error('Error submitting answer:', error);
      alert(error.message || 'Failed to submit answer');
      setSelectedAnswer(null);
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

  // Not joined yet
  if (!participantId) {
    return (
      <>
        <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
          <Link to="/" className="text-xl font-bold">
            Enkelvolt
          </Link>
        </header>
        <main className="p-8 max-w-2xl mx-auto">
          <div className="border rounded-lg p-6 bg-white dark:bg-gray-900">
            <h1 className="text-3xl font-bold mb-2">{session.quiz.title}</h1>
            <p className="text-2xl font-semibold text-blue-600 dark:text-blue-400 mb-6">
              {code}
            </p>
            <form onSubmit={handleJoin} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Enter your name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  required
                  maxLength={50}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Choose your avatar
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                  {AVATAR_OPTIONS.map((avatar) => {
                    const Icon = avatar.icon;
                    return (
                      <button
                        key={avatar.name}
                        type="button"
                        onClick={() => setSelectedAvatar(avatar.name)}
                        className={`
                          p-3 rounded-lg border-2 transition-all
                          ${
                            selectedAvatar === avatar.name
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                              : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                          }
                        `}
                      >
                        <Icon className="w-6 h-6 mx-auto" />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Choose your color
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      className={`
                        w-10 h-10 rounded-full border-2 transition-all
                        ${
                          selectedColor === color
                            ? 'border-gray-900 dark:border-white scale-110'
                            : 'border-gray-300 dark:border-gray-700 hover:scale-105'
                        }
                      `}
                      style={{ backgroundColor: color }}
                      aria-label={`Select color ${color}`}
                    />
                  ))}
                </div>
              </div>

              <Button
                type="submit"
                className="bg-green-500 text-white hover:bg-green-600"
                trackaton-on-click="play-join-session"
              >
                Join Quiz
              </Button>
            </form>
          </div>
        </main>
      </>
    );
  }

  // Waiting for session to start
  if (session.status === 'waiting') {
    return (
      <>
        <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
          <Link to="/" className="text-xl font-bold">
            Enkelvolt
          </Link>
        </header>
        <main className="p-8 max-w-2xl mx-auto">
          <div className="border rounded-lg p-6 bg-white dark:bg-gray-900 text-center">
            <h1 className="text-3xl font-bold mb-4">{session.quiz.title}</h1>
            <p className="text-xl mb-2">Waiting for host to start the quiz...</p>
            <p className="text-gray-500 dark:text-gray-400">
              You're all set! The quiz will begin soon.
            </p>
          </div>
        </main>
      </>
    );
  }

  // Session finished
  if (session.status === 'finished') {
    return (
      <>
        <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
          <Link to="/" className="text-xl font-bold">
            Enkelvolt
          </Link>
        </header>
        <main className="p-8 max-w-2xl mx-auto">
          <div className="border rounded-lg p-6 bg-white dark:bg-gray-900 text-center">
            <h1 className="text-3xl font-bold mb-4">Quiz Finished!</h1>
            <p className="mb-4">Thank you for participating!</p>
            <Link
              to="/"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Go back to home
            </Link>
          </div>
        </main>
      </>
    );
  }

  // Showing results
  if (session.status === 'showing_results') {
    const myResponseForCurrentQuestion = myResponses?.find(
      (r) => r.questionId === currentQuestion?._id,
    );
    const selectedAnswerData = currentQuestion?.answers.find(
      (a) => a._id === myResponseForCurrentQuestion?.answerId,
    );
    const isCorrect = selectedAnswerData?.isCorrect ?? false;
    const selectedAnswerText = selectedAnswerData?.text || '';

    if (!currentQuestion) {
      return (
        <>
          <header className="h-14 sm:h-16 bg-background px-3 sm:px-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center shrink-0">
            <Link to="/" className="text-base sm:text-lg font-bold">
              Enkelvolt
            </Link>
            <div className="flex items-center gap-2">
              <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                {session.currentQuestionIndex + 1}/{session.questionCount}
              </div>
              <ThemeToggle />
            </div>
          </header>
          <main className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden">
            <div className="flex-1 flex items-center justify-center px-4">
              <div className="max-w-2xl w-full text-center">
                <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
                  Loading results...
                </p>
              </div>
            </div>
          </main>
        </>
      );
    }

    return (
      <>
        <header className="h-14 sm:h-16 bg-background px-3 sm:px-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center shrink-0">
          <Link to="/" className="text-base sm:text-lg font-bold">
            Enkelvolt
          </Link>
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {session.currentQuestionIndex + 1}/{session.questionCount}
          </div>
        </header>
        <main className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex flex-col overflow-hidden">
          <div
            className={`flex-1 flex items-center justify-center px-4 sm:px-6 md:px-8 ${
              isCorrect
                ? 'bg-gradient-to-br from-green-500 to-green-600'
                : 'bg-gradient-to-br from-red-500 to-red-600'
            }`}
          >
            <div className="max-w-3xl w-full text-center text-white">
              <div className="mb-6 sm:mb-8 flex justify-center">
                <div
                  className={`w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center`}
                >
                  {isCorrect ? (
                    <svg
                      className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-12 h-12 sm:w-16 sm:h-16 md:w-20 md:h-20"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  )}
                </div>
              </div>

              <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 drop-shadow-lg">
                {isCorrect
                  ? 'Congratulations!'
                  : 'Oh no!'}
              </h2>

              <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold mb-2 sm:mb-3 drop-shadow-md">
                {isCorrect
                  ? 'You answered right!'
                  : `You answered ${selectedAnswerText}`}
              </p>

              {!isCorrect && (
                <p className="text-lg sm:text-xl md:text-2xl opacity-90 mt-4 sm:mt-6 drop-shadow-sm">
                  That wasn't the correct answer
                </p>
              )}

              <div className="mt-8 sm:mt-10 md:mt-12 pt-6 sm:pt-8 border-t border-white/30">
                <p className="text-base sm:text-lg md:text-xl opacity-90 drop-shadow-sm">
                  Next question starting soon...
                </p>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  // Active session - show question
  if (!currentQuestion) {
    return (
      <>
        <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
          <Link to="/" className="text-xl font-bold">
            Enkelvolt
          </Link>
        </header>
        <main className="p-8 max-w-2xl mx-auto">
          <div className="border rounded-lg p-6 bg-white dark:bg-gray-900 text-center">
            <p>Loading question...</p>
          </div>
        </main>
      </>
    );
  }

  const selectedAnswerData = currentQuestion.answers.find(
    (a) => a._id === selectedAnswer,
  );

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
      <header className="h-14 sm:h-16 bg-background px-3 sm:px-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center shrink-0">
        <Link to="/" className="text-base sm:text-lg font-bold">
          Enkelvolt
        </Link>
        <div className="flex items-center gap-2">
          <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {session.currentQuestionIndex + 1}/{session.questionCount}
          </div>
          <ThemeToggle />
        </div>
      </header>
      <main className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden relative">
        {currentQuestion.audioUrl && (
          <audio
            ref={audioRef}
            src={currentQuestion.audioUrl}
            preload="auto"
            autoPlay
            className="hidden"
            onError={(e) => {
              console.error('Audio playback error:', e);
            }}
          />
        )}

        {currentQuestion.imageUrl && (
          <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-3 sm:py-4 relative min-h-0">
            <div
              className="w-full h-full bg-contain bg-center bg-no-repeat"
              style={{ backgroundImage: `url(${currentQuestion.imageUrl})` }}
            />
          </div>
        )}

        {currentQuestion.text && (
          <div className="px-3 sm:px-4 py-2 sm:py-3 flex justify-center relative z-10">
            <div className="w-full max-w-4xl">
              <div className="bg-background/30 backdrop-blur-sm border-2 rounded-lg p-4 shadow-lg">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-center drop-shadow-lg">
                  {currentQuestion.text}
                </h2>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 px-3 sm:px-4 pb-3 sm:pb-4 overflow-auto flex items-center justify-center relative z-10">
          {hasAnswered ? (
            <div className="max-w-4xl mx-auto w-full flex items-center justify-center">
              <div className="p-4 sm:p-6 md:p-8 rounded-xl sm:rounded-2xl text-center w-full bg-blue-500 text-white">
                <p className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
                  Waiting for other players...
                </p>
                <p className="text-lg sm:text-xl md:text-2xl mb-2">
                  You selected: {selectedAnswerData?.text}
                </p>
                <p className="mt-3 sm:mt-4 text-base sm:text-lg opacity-90">
                  The host will show results soon
                </p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full h-full flex items-center justify-center">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 w-full h-full auto-rows-fr">
                {currentQuestion.answers.map((answer, index) => {
                  const colors = kahootColors[index % kahootColors.length];
                  const letter = String.fromCharCode(65 + index);

                  return (
                    <button
                      key={answer._id}
                      onClick={() => handleAnswerSelect(answer._id)}
                      trackaton-on-click="play-submit-answer"
                      className={`
                        ${colors.bg} ${colors.text} ${colors.hover}
                        rounded-xl sm:rounded-2xl
                        p-3 sm:p-4 md:p-5
                        flex items-center justify-center
                        transition-all duration-200
                        transform hover:scale-[1.02] active:scale-[0.98]
                        shadow-lg ${colors.shadow} hover:shadow-xl
                        relative overflow-hidden
                        group
                        cursor-pointer
                      `}
                    >
                      <div className="absolute top-2 sm:top-3 left-3 sm:left-4">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                          <span className="text-base sm:text-lg md:text-xl font-bold">
                            {letter}
                          </span>
                        </div>
                      </div>

                      <span className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-center px-6 sm:px-8 md:px-10 leading-tight">
                        {answer.text}
                      </span>

                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors rounded-xl sm:rounded-2xl" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
