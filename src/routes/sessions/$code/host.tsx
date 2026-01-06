import { createFileRoute, Link } from '@tanstack/react-router';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import { useEffect, useState, useRef } from 'react';
import { Button } from '~/components/ui/button';
import { Leaderboard } from '~/components/Leaderboard';
import { ThemeToggle } from '~/components/ThemeToggle';
import { Copy, Check, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  User,
  Star,
  Heart,
  Zap,
  Trophy,
  Crown,
  Rocket,
  Gamepad2,
  Music,
  Sparkles,
  Flame,
  Shield,
  type LucideIcon,
} from 'lucide-react';

export const Route = createFileRoute('/sessions/$code/host')({
  component: HostView,
  loader: async ({ context, params }) => {
    const { queryClient } = context as { queryClient: any };
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
  const [animations, setAnimations] = useState<
    Array<{
      id: string;
      name: string;
      avatar: string;
      color: string;
      startTime: number;
      startX: number;
      startY: number;
      side: 'left' | 'right';
    }>
  >([]);
  const [progressBarBounce, setProgressBarBounce] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volumePopoverPosition, setVolumePopoverPosition] = useState({ top: 0, left: 0 });
  const volumeButtonRef = useRef<HTMLDivElement>(null);
  const previousResponseIds = useRef<Set<string>>(new Set());
  const progressBarRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const avatarIconMap: Record<string, LucideIcon> = {
    user: User,
    star: Star,
    heart: Heart,
    zap: Zap,
    trophy: Trophy,
    crown: Crown,
    rocket: Rocket,
    gamepad: Gamepad2,
    music: Music,
    sparkles: Sparkles,
    flame: Flame,
    shield: Shield,
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Detect new responses and trigger animations
  useEffect(() => {
    if (
      !responses ||
      session?.status !== 'active' ||
      !currentQuestion
    ) {
      previousResponseIds.current = new Set();
      return;
    }

    const currentResponseIds = new Set(responses.map((r) => r._id));
    const newResponses = responses.filter(
      (r) => !previousResponseIds.current.has(r._id),
    );

    if (newResponses.length > 0) {
      newResponses.forEach((response, index) => {
        const animationId = `${response._id}-${Date.now()}-${index}`;
        // Random side (left or right)
        const side = Math.random() > 0.5 ? 'right' : 'left';
        // Random starting position: diagonal down from random height
        const startX = side === 'right' ? window.innerWidth + 100 : -100;
        const startY = Math.random() * (window.innerHeight * 0.4) + 50; // Random height in top 40% of screen
        
        setAnimations((prev) => [
          ...prev,
          {
            id: animationId,
            name: response.participant.name,
            avatar: response.participant.avatar || 'user',
            color: response.participant.color || '#4A90E2',
            startTime: Date.now(),
            startX,
            startY,
            side,
          },
        ]);

        // Trigger progress bar bounce when badge lands (at ~60% of animation)
        setTimeout(() => {
          setProgressBarBounce(true);
          setTimeout(() => setProgressBarBounce(false), 300);
        }, 1200);

        // Remove animation after it completes
        setTimeout(() => {
          setAnimations((prev) =>
            prev.filter((a) => a.id !== animationId),
          );
        }, 2000);
      });
    }

    previousResponseIds.current = currentResponseIds;
  }, [responses, session?.status, currentQuestion]);

  // Auto-play audio when question appears
  useEffect(() => {
    if (currentQuestion?.audioUrl && audioRef.current && session?.status === 'active') {
      console.log('Attempting to play audio:', currentQuestion.audioUrl);
      // Reset audio to start from beginning
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio playing successfully');
            setIsPlaying(true);
          })
          .catch((error) => {
            console.error('Error playing audio (autoplay may be blocked):', error);
            setIsPlaying(false);
            // Autoplay was prevented - this is expected in some browsers
            // The user can manually interact to play audio if needed
          });
      }
    } else if (currentQuestion && session?.status === 'active' && !currentQuestion.audioUrl) {
      console.log('No audio URL for current question');
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [currentQuestion?.audioUrl, currentQuestion?._id, session?.status]);

  // Sync audio state with audio element events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentQuestion?.audioUrl]);

  // Update volume when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  // Track audio time and duration
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleDurationChange = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);

    // Initialize duration if already loaded
    if (audio.duration) {
      setDuration(audio.duration);
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
    };
  }, [currentQuestion?.audioUrl]);

  // Close volume slider when clicking outside
  useEffect(() => {
    if (!showVolumeSlider) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        volumeButtonRef.current &&
        !volumeButtonRef.current.contains(target)
      ) {
        setShowVolumeSlider(false);
      }
    };

    // Use setTimeout to avoid immediate closure on button click
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showVolumeSlider]);

  // Log image URL for debugging
  useEffect(() => {
    if (currentQuestion && session?.status === 'active') {
      console.log('Current question media:', {
        hasImage: !!currentQuestion.imageUrl,
        hasAudio: !!currentQuestion.audioUrl,
        imageUrl: currentQuestion.imageUrl,
        audioUrl: currentQuestion.audioUrl,
      });
    }
  }, [currentQuestion?._id, session?.status]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
  };

  const getSessionUrl = () => {
    // Use VITE_SITE_URL if set, otherwise fall back to window.location.origin
    const baseUrl = 
      (import.meta.env.VITE_SITE_URL as string | undefined) ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    
    if (!baseUrl) {
      return '';
    }
    
    // Ensure baseUrl doesn't end with a slash
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    return `${cleanBaseUrl}/sessions/${code}/play`;
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

  const handlePlayPause = () => {
    if (!audioRef.current || !currentQuestion?.audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch((error) => {
        console.error('Error playing audio:', error);
      });
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(false);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeIconClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    // Position popover so bottom aligns with top of button
    // Slider height is 128px (rotated width) + 16px padding (8px top + 8px bottom on outer container)
    const sliderHeight = 128;
    const padding = 16; // 8px top + 8px bottom
    // Calculate button center for horizontal centering - use the actual button element
    const buttonCenterX = rect.left + rect.width / 2;
    setVolumePopoverPosition({
      top: rect.top - sliderHeight - padding, // Position above the button
      left: buttonCenterX, // Center horizontally on button (will use transform to center)
    });
    setShowVolumeSlider((prev) => !prev);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link to="/" className="text-sm sm:text-base font-bold shrink-0">
            Enkelvolt quiz:
          </Link>
          <h1 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white truncate">
            {session.quiz.title}
          </h1>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {(session.status === 'active' || session.status === 'showing_results' || session.status === 'waiting') && (
            <div className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
              {session.currentQuestionIndex + 1}/{session.questionCount}
            </div>
          )}
          <ThemeToggle />
        </div>
      </header>
      <main className="h-[calc(100vh-3rem)] sm:h-[calc(100vh-3.5rem)] flex flex-col bg-gray-50 dark:bg-gray-950 overflow-hidden relative">
        {/* Top Section - Quiz Info and Controls */}
        <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 dark:border-gray-800 shrink-0 relative z-10">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-row items-center justify-between gap-1.5 sm:gap-2 flex-nowrap">
              <div className="flex items-center gap-2 shrink-0 min-w-0">
                <div className="text-base sm:text-lg font-bold text-blue-600 dark:text-blue-400 font-mono truncate">
                  {code}
                </div>
                <Button
                  onClick={handleCopyCode}
                  variant="ghost"
                  size="icon"
                  className="cursor-pointer h-7 w-7 shrink-0"
                  aria-label={copied ? 'Copied!' : 'Copy code'}
                  trackaton-on-click="host-copy-session-code"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-nowrap">
                <div className="flex gap-1 sm:gap-1.5 shrink-0">
                  <div className="bg-white dark:bg-gray-900 rounded-md px-2 sm:px-3 py-1.5 border border-gray-200 dark:border-gray-800 flex items-center gap-1.5 shrink-0 h-fit">
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap leading-tight">
                      Participants
                    </p>
                    <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">
                      {totalParticipants}
                    </p>
                  </div>
                  {session.status === 'active' && (
                    <div className="bg-white dark:bg-gray-900 rounded-md px-2 sm:px-3 py-1.5 border border-gray-200 dark:border-gray-800 flex items-center gap-1.5 shrink-0 h-fit">
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 leading-tight">
                        Responses
                      </p>
                      <p className="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">
                        {totalResponses}
                      </p>
                    </div>
                  )}
                </div>
                {/* Action Buttons */}
                {session.status === 'active' && currentQuestion && (
                  <Button
                    onClick={handleShowResults}
                    className="bg-blue-500 text-white hover:bg-blue-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg cursor-pointer shadow-lg shadow-blue-500/50 hover:shadow-xl transition-all shrink-0 whitespace-nowrap"
                    trackaton-on-click="host-show-results"
                  >
                    Show Results
                  </Button>
                )}
                {session.status === 'showing_results' && currentQuestion && (
                  <Button
                    onClick={handleNextQuestion}
                    className="bg-green-500 text-white hover:bg-green-600 px-3 sm:px-4 py-2 text-xs sm:text-sm font-bold rounded-lg cursor-pointer shadow-lg shadow-green-500/50 hover:shadow-xl transition-all shrink-0 whitespace-nowrap"
                    trackaton-on-click="host-next-question"
                  >
                    {session.currentQuestionIndex < session.questionCount - 1
                      ? 'Next Question'
                      : 'Finish Quiz'}
                  </Button>
                )}
              </div>
            </div>
            {session.status === 'active' && currentQuestion && (
              <div className="mt-2 relative" ref={progressBarRef}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {totalResponses}/{totalParticipants} answered
                  </span>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {totalParticipants > 0 ? Math.round((totalResponses / totalParticipants) * 100) : 0}%
                  </span>
                </div>
                <div className={`w-full bg-gray-200 dark:bg-gray-800 rounded-full h-1.5 sm:h-2 transition-transform duration-300 ${progressBarBounce ? 'animate-progress-bounce' : ''}`}>
                  <div
                    className="bg-blue-500 h-1.5 sm:h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${totalParticipants > 0 ? (totalResponses / totalParticipants) * 100 : 0}%`,
                    }}
                  />
                </div>
                
                {/* Animated badges */}
                {animations.map((animation) => {
                  const AvatarIcon =
                    avatarIconMap[animation.avatar] || User;
                  const progressBarY = progressBarRef.current
                    ? progressBarRef.current.getBoundingClientRect().top +
                      progressBarRef.current.getBoundingClientRect().height / 2
                    : 200;
                  const endX = animation.side === 'right' 
                    ? window.innerWidth * 0.3 
                    : window.innerWidth * 0.7;
                  const deltaX = endX - animation.startX;
                  const deltaY = progressBarY - animation.startY;
                  
                  return (
                    <div key={animation.id}>
                      <div
                        className="fixed z-50 animate-arch-landing"
                        style={{
                          left: `${animation.startX}px`,
                          top: `${animation.startY}px`,
                          '--delta-x': `${deltaX}px`,
                          '--delta-y': `${deltaY}px`,
                          '--color': animation.color,
                        } as React.CSSProperties & {
                          '--delta-x': string;
                          '--delta-y': string;
                          '--color': string;
                        }}
                      >
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 rounded-full shadow-lg text-white text-xs sm:text-sm font-medium whitespace-nowrap"
                          style={{ backgroundColor: animation.color }}
                        >
                          <AvatarIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                          <span>{animation.name}</span>
                        </div>
                      </div>
                      {/* Explosion effect */}
                      <div
                        className="fixed z-40 animate-explosion"
                        style={{
                          left: `${endX}px`,
                          top: `${progressBarY}px`,
                          '--color': animation.color,
                        } as React.CSSProperties & { '--color': string }}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {session.status === 'waiting' && (
            <div className="flex-1 flex items-center justify-center px-4 overflow-auto py-6 sm:py-8">
              <div className="max-w-4xl w-full">
                {/* Main Focus: QR Code and Session Code */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-8 sm:gap-12 mb-8 sm:mb-12">
                  {/* QR Code */}
                  <div className="flex flex-col items-center">
                    <div className="bg-white dark:bg-gray-900 p-3 sm:p-4 md:p-6 rounded-xl sm:rounded-2xl shadow-2xl border-2 border-gray-200 dark:border-gray-800">
                      <QRCodeSVG
                        value={getSessionUrl()}
                        size={280}
                        level="H"
                        includeMargin={false}
                        className="w-[200px] h-[200px] sm:w-[240px] sm:h-[240px] md:w-[280px] md:h-[280px]"
                      />
                    </div>
                    <p className="mt-3 sm:mt-4 text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">
                      Scan to join
                    </p>
                  </div>

                  {/* Session Code - Large and Prominent */}
                  <div className="flex flex-col items-center">
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-3 sm:mb-4 font-medium">
                      Or enter code:
                    </p>
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white px-4 sm:px-6 md:px-8 py-3 sm:py-4 md:py-6 rounded-xl sm:rounded-2xl shadow-2xl border-2 sm:border-4 border-blue-300 dark:border-blue-500">
                      <div className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold font-mono tracking-wider">
                        {code}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Participants List */}
                {participants && participants.length > 0 && (
                  <div className="mb-6 sm:mb-8">
                    <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 mb-3 sm:mb-4 text-center font-medium">
                      Joined participants ({participants.length}):
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {participants.map((p) => {
                        const AvatarIcon =
                          avatarIconMap[p.avatar || 'user'] || User;
                        return (
                          <div
                            key={p._id}
                            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-sm sm:text-base font-medium text-white shadow-md"
                            style={{ backgroundColor: p.color || '#4A90E2' }}
                          >
                            <AvatarIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                            <span>{p.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Start Quiz Button */}
                <div className="text-center">
                  <Button
                    onClick={handleStart}
                    className="bg-green-500 text-white hover:bg-green-600 px-8 sm:px-12 py-4 sm:py-6 text-lg sm:text-xl font-bold rounded-2xl cursor-pointer shadow-lg shadow-green-500/50 hover:shadow-xl transition-all"
                    trackaton-on-click="host-start-quiz"
                  >
                    Start Quiz
                  </Button>
                </div>
              </div>
            </div>
          )}

          {session.status === 'active' && currentQuestion && (
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
              {/* Audio Element */}
              {currentQuestion.audioUrl && (
                <>
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
                </>
              )}

              {/* Image + Question Section - Image extends down to question, question overlaid at bottom */}
              {currentQuestion.imageUrl ? (
                <div className="flex-1 flex flex-col overflow-hidden relative min-h-0">
                  {/* Image Background - Extends down to question */}
                  <div
                    className="absolute inset-0 bg-contain bg-center bg-no-repeat z-0"
                    style={{ backgroundImage: `url(${currentQuestion.imageUrl})` }}
                  />
                  {/* Spacer - Pushes question to bottom */}
                  <div className="flex-1 min-h-0" />
                  {/* Question Text - Overlaid at bottom of image, aligned with bottom edge */}
                  <div className="px-3 sm:px-4 flex justify-center relative z-10 shrink-0">
                    <div className="w-full max-w-4xl">
                      <div className="bg-background/30 backdrop-blur-sm border-2 rounded-lg rounded-b-none p-4 sm:p-6 pb-4 sm:pb-6 shadow-lg">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center text-gray-900 dark:text-white leading-tight px-2 drop-shadow-lg">
                          {currentQuestion.text}
                        </h1>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Question Text - Centered when no image */
                <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-3 sm:py-4 relative z-10">
                  <div className="w-full max-w-4xl">
                    <div className="bg-background/30 backdrop-blur-sm border-2 rounded-lg p-4 sm:p-6 shadow-lg">
                      <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center text-gray-900 dark:text-white leading-tight px-2 drop-shadow-lg">
                        {currentQuestion.text}
                      </h1>
                    </div>
                  </div>
                </div>
              )}

              {/* Answer Responses Grid - Bottom (no image behind) */}
              <div className="flex-1 px-3 sm:px-4 pt-3 sm:pt-4 pb-3 sm:pb-4 overflow-hidden relative z-10">
                <div className="max-w-4xl mx-auto h-full flex flex-col">
                  {/* Timeline - Above Answer Alternatives */}
                  {currentQuestion.audioUrl && (
                    <div className="mb-3 sm:mb-4 flex items-center gap-3 relative">
                      <Button
                        onClick={handlePlayPause}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4 sm:h-5 sm:w-5" />
                        ) : (
                          <Play className="h-4 w-4 sm:h-5 sm:w-5" />
                        )}
                      </Button>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-mono shrink-0 min-w-[40px] sm:min-w-[45px]">
                          {formatTime(currentTime)}
                        </span>
                        <div className="flex-1 relative min-w-0">
                          <input
                            type="range"
                            min="0"
                            max={duration || 0}
                            step="0.1"
                            value={currentTime}
                            onChange={handleSeek}
                            className="w-full h-2.5 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500 min-w-0"
                            style={{
                              background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${duration ? (currentTime / duration) * 100 : 0}%, rgb(229, 231, 235) ${duration ? (currentTime / duration) * 100 : 0}%, rgb(229, 231, 235) 100%)`
                            }}
                            aria-label="Audio timeline"
                          />
                        </div>
                        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-mono shrink-0 min-w-[40px] sm:min-w-[45px]">
                          {formatTime(duration)}
                        </span>
                      </div>
                      {/* Volume Icon and Slider */}
                      <div className="relative shrink-0" ref={volumeButtonRef}>
                        <Button
                          onClick={handleVolumeIconClick}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 sm:h-9 sm:w-9 shrink-0"
                          aria-label={isMuted ? 'Unmute' : 'Mute'}
                        >
                          {isMuted ? (
                            <VolumeX className="h-4 w-4 sm:h-5 sm:w-5" />
                          ) : (
                            <Volume2 className="h-4 w-4 sm:h-5 sm:w-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  {/* Volume Slider Popover - Fixed positioning to escape overflow */}
                  {showVolumeSlider && (
                    <div 
                      className="fixed z-[100]"
                      style={{
                        top: `${volumePopoverPosition.top}px`,
                        left: `${volumePopoverPosition.left}px`,
                        transform: 'translateX(-50%)',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div 
                        className="flex items-center justify-center"
                        style={{
                          padding: '8px 4px',
                        }}
                      >
                        <div 
                          style={{
                            width: '128px',
                            height: '8px',
                            transform: 'rotate(-90deg)',
                            transformOrigin: 'center',
                          }}
                        >
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.01"
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-blue-500"
                            style={{
                              background: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${isMuted ? 0 : volume * 100}%, rgb(229, 231, 235) ${isMuted ? 0 : volume * 100}%, rgb(229, 231, 235) 100%)`,
                            }}
                            aria-label="Volume"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1 auto-rows-fr min-h-0">
                    {currentQuestion.answers.map((answer, index) => {
                      const colors = kahootColors[index % kahootColors.length];
                      const letter = String.fromCharCode(65 + index);

                      return (
                        <div
                          key={answer._id}
                          className={`
                            ${colors.bg} ${colors.text}
                            rounded-xl sm:rounded-2xl
                            p-4 sm:p-6 md:p-8
                            relative overflow-hidden flex flex-col min-h-0
                          `}
                        >
                          {/* Letter indicator */}
                          <div className="absolute top-2 left-3 sm:top-3 sm:left-4">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                              <span className="text-xs sm:text-sm md:text-base font-bold">
                                {letter}
                              </span>
                            </div>
                          </div>

                          {/* Answer text */}
                          <div className="flex-1 min-h-0 flex items-center justify-center">
                            <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold block text-center leading-tight">
                              {answer.text}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {session.status === 'showing_results' && currentQuestion && (
            <div className="flex-1 flex flex-col overflow-hidden relative z-10">
              {/* Image Section - Top */}
              {currentQuestion.imageUrl && (
                <div className="flex-1 flex items-center justify-center px-3 sm:px-4 py-3 sm:py-4 relative min-h-0">
                  <div
                    className="w-full h-full bg-contain bg-center bg-no-repeat"
                    style={{ backgroundImage: `url(${currentQuestion.imageUrl})` }}
                  />
                </div>
              )}

              {/* Question Text - Below image, closer to alternatives */}
              <div className="px-3 sm:px-4 py-2 sm:py-3 flex justify-center relative z-10">
                <div className="w-full max-w-4xl">
                  <div className="bg-background/30 backdrop-blur-sm border-2 rounded-lg p-4 sm:p-6 shadow-lg">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-center text-gray-900 dark:text-white leading-tight px-2 drop-shadow-lg">
                      {currentQuestion.text}
                    </h1>
                  </div>
                </div>
              </div>

              {/* Results Section - Bottom (50% height) */}
              <div className="flex-1 px-3 sm:px-4 pt-3 sm:pt-4 pb-3 sm:pb-4 overflow-hidden relative">
                <div className="max-w-4xl mx-auto h-full flex flex-col">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 flex-1 auto-rows-fr min-h-0">
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
                            rounded-xl sm:rounded-2xl
                            p-4 sm:p-6 md:p-8
                            relative overflow-hidden flex flex-col min-h-0
                            ${item.isCorrect ? 'ring-4 ring-green-400 ring-offset-2 dark:ring-offset-gray-950' : ''}
                          `}
                        >
                          {/* Letter indicator */}
                          <div className="absolute top-2 left-3 sm:top-3 sm:left-4">
                            <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                              <span className="text-xs sm:text-sm md:text-base font-bold">
                                {letter}
                              </span>
                            </div>
                          </div>

                          {/* Correct answer indicator */}
                          {item.isCorrect && (
                            <div className="absolute top-2 right-3 sm:top-3 sm:right-4">
                              <div className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 rounded-full bg-green-400 flex items-center justify-center">
                                <span className="text-sm sm:text-base md:text-lg font-bold text-white">
                                  ✓
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Answer text */}
                          <div className="flex-1 min-h-0 flex items-center justify-center mb-2">
                            <span className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold block text-center leading-tight">
                              {item.text}
                            </span>
                          </div>

                          {/* Response count and bar */}
                          <div className="mt-auto pt-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-base sm:text-lg md:text-xl font-bold">
                                {item.count} {item.count === 1 ? 'vote' : 'votes'}
                              </span>
                              <span className="text-sm sm:text-base md:text-lg opacity-90 font-semibold">
                                {Math.round(percentage)}%
                              </span>
                            </div>
                            <div className="w-full bg-white/20 rounded-full h-2 sm:h-2.5 backdrop-blur-sm">
                              <div
                                className="h-2 sm:h-2.5 rounded-full bg-white/90 transition-all duration-500"
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
