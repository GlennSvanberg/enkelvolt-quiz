import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

export interface LeaderboardEntry {
  participantId: string;
  name: string;
  score: number;
  rank: number;
}

interface LeaderboardProps {
  entries: Array<LeaderboardEntry>;
}

export function Leaderboard({ entries }: LeaderboardProps) {
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (entries.length === 0) return;

    // Reset when entries change
    setVisibleCount(0);

    const triggerConfetti = () => {
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        });
      }, 250);
    };

    // Animate entries appearing one by one
    const timers: Array<ReturnType<typeof setTimeout>> = [];
    entries.forEach((_, index) => {
      const timer = setTimeout(() => {
        setVisibleCount(index + 1);

        // Trigger confetti for winner (rank 1) after they appear
        if (index === 0 && entries[0].rank === 1) {
          setTimeout(() => {
            triggerConfetti();
          }, 500);
        }
      }, index * 400); // 400ms delay between each entry

      timers.push(timer);
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [entries]);

  const visibleEntries = entries.slice(0, visibleCount);

  // Kahoot-style colors for podium positions
  const getRankColor = (rank: number, isWinner: boolean) => {
    if (isWinner) {
      return 'bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600';
    }
    if (rank === 2) {
      return 'bg-gradient-to-r from-gray-300 via-gray-400 to-gray-500';
    }
    if (rank === 3) {
      return 'bg-gradient-to-r from-orange-300 via-orange-400 to-orange-500';
    }
    return 'bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700';
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-center text-gray-900 dark:text-white mb-6 sm:mb-8">
        Quiz Finished!
      </h2>
      <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-center text-gray-700 dark:text-gray-300 mb-6 sm:mb-8">
        Final Leaderboard
      </h3>

      <div className="space-y-3 sm:space-y-4">
        {visibleEntries.map((entry, index) => {
          const isWinner = entry.rank === 1;
          const isVisible = index < visibleCount;

          return (
            <div
              key={entry.participantId}
              className={`
                ${getRankColor(entry.rank, isWinner)}
                rounded-xl sm:rounded-2xl
                p-4 sm:p-6
                shadow-lg
                transform transition-all duration-500 ease-out
                ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}
                ${isWinner ? 'ring-4 ring-yellow-300 ring-offset-2 dark:ring-offset-gray-950 scale-105' : ''}
              `}
              style={{
                transitionDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  {/* Rank */}
                  <div className="flex-shrink-0">
                    <div
                      className={`
                        w-12 h-12 sm:w-16 sm:h-16
                        rounded-full
                        ${isWinner ? 'bg-white/30' : 'bg-white/20'}
                        backdrop-blur-sm
                        flex items-center justify-center
                        text-white font-bold
                        text-lg sm:text-xl md:text-2xl
                        shadow-lg
                      `}
                    >
                      {getRankIcon(entry.rank)}
                    </div>
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`
                        text-white font-bold
                        text-lg sm:text-xl md:text-2xl lg:text-3xl
                        truncate
                        drop-shadow-lg
                        ${isWinner ? 'text-yellow-100' : ''}
                      `}
                    >
                      {entry.name}
                    </p>
                    {isWinner && (
                      <p className="text-yellow-100 text-xs sm:text-sm font-semibold mt-1">
                        Winner! 🎉
                      </p>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="flex-shrink-0 ml-4">
                  <div
                    className={`
                      ${isWinner ? 'bg-white/30' : 'bg-white/20'}
                      backdrop-blur-sm
                      rounded-lg sm:rounded-xl
                      px-4 sm:px-6 py-2 sm:py-3
                      shadow-lg
                    `}
                  >
                    <p className="text-white text-xs sm:text-sm font-semibold mb-0.5 sm:mb-1">
                      Score
                    </p>
                    <p
                      className={`
                        text-white font-bold
                        text-xl sm:text-2xl md:text-3xl
                        ${isWinner ? 'text-yellow-100' : ''}
                      `}
                    >
                      {entry.score}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {visibleCount === 0 && entries.length > 0 && (
        <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
          <p className="text-lg">Loading leaderboard...</p>
        </div>
      )}

      {visibleCount === entries.length && entries.length > 0 && (
        <div className="mt-6 sm:mt-8 text-center">
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
            Great job everyone! 🎊
          </p>
        </div>
      )}
    </div>
  );
}
