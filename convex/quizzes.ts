import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

/**
 * Generate a unique 6-character alphanumeric code
 */
function generateSessionCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * List all quizzes ordered by creation time (newest first)
 */
export const listQuizzes = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id('quizzes'),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      createdAt: v.number(),
    }),
  ),
  handler: async (ctx) => {
    const quizzes = await ctx.db.query('quizzes').order('desc').collect();
    return quizzes;
  },
});

/**
 * Get a single quiz with all questions and answers
 */
export const getQuiz = query({
  args: {
    quizId: v.id('quizzes'),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('quizzes'),
      _creationTime: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      createdAt: v.number(),
      questions: v.array(
        v.object({
          _id: v.id('questions'),
          text: v.string(),
          order: v.number(),
          imageUrl: v.union(v.string(), v.null()),
          audioUrl: v.union(v.string(), v.null()),
          imageStorageId: v.union(v.id('_storage'), v.null()),
          audioStorageId: v.union(v.id('_storage'), v.null()),
          answers: v.array(
            v.object({
              _id: v.id('answers'),
              text: v.string(),
              isCorrect: v.boolean(),
              order: v.number(),
            }),
          ),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) {
      return null;
    }

    const questions = await ctx.db
      .query('questions')
      .withIndex('by_quiz', (q) => q.eq('quizId', args.quizId))
      .order('asc')
      .collect();

    const questionsWithAnswers = await Promise.all(
      questions.map(async (question) => {
        const answers = await ctx.db
          .query('answers')
          .withIndex('by_question', (q) => q.eq('questionId', question._id))
          .order('asc')
          .collect();
        
        const imageUrl = question.imageStorageId
          ? await ctx.storage.getUrl(question.imageStorageId)
          : null;
        const audioUrl = question.audioStorageId
          ? await ctx.storage.getUrl(question.audioStorageId)
          : null;

        return {
          _id: question._id,
          text: question.text,
          order: question.order,
          imageUrl,
          audioUrl,
          imageStorageId: question.imageStorageId || null,
          audioStorageId: question.audioStorageId || null,
          answers: answers.map((answer) => ({
            _id: answer._id,
            text: answer.text,
            isCorrect: answer.isCorrect,
            order: answer.order,
          })),
        };
      }),
    );

    return {
      _id: quiz._id,
      _creationTime: quiz._creationTime,
      title: quiz.title,
      description: quiz.description,
      createdAt: quiz.createdAt,
      questions: questionsWithAnswers,
    };
  },
});

/**
 * Get session by code with current state
 */
export const getSession = query({
  args: {
    code: v.string(),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('sessions'),
      quizId: v.id('quizzes'),
      code: v.string(),
      status: v.union(v.literal('waiting'), v.literal('active'), v.literal('showing_results'), v.literal('finished')),
      currentQuestionIndex: v.number(),
      createdAt: v.number(),
      quiz: v.object({
        _id: v.id('quizzes'),
        title: v.string(),
        description: v.optional(v.string()),
      }),
      questionCount: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_code', (q) => q.eq('code', args.code.toUpperCase()))
      .unique();

    if (!session) {
      return null;
    }

    const quiz = await ctx.db.get(session.quizId);
    if (!quiz) {
      return null;
    }

    const questionCount = await ctx.db
      .query('questions')
      .withIndex('by_quiz', (q) => q.eq('quizId', session.quizId))
      .collect()
      .then((questions) => questions.length);

    return {
      _id: session._id,
      quizId: session.quizId,
      code: session.code,
      status: session.status,
      currentQuestionIndex: session.currentQuestionIndex,
      createdAt: session.createdAt,
      quiz: {
        _id: quiz._id,
        title: quiz.title,
        description: quiz.description,
      },
      questionCount,
    };
  },
});

/**
 * Get all participants for a session
 */
export const getSessionParticipants = query({
  args: {
    sessionId: v.id('sessions'),
  },
  returns: v.array(
    v.object({
      _id: v.id('participants'),
      sessionId: v.id('sessions'),
      name: v.string(),
      avatar: v.optional(v.string()),
      color: v.optional(v.string()),
      joinedAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const participants = await ctx.db
      .query('participants')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .order('asc')
      .collect();
    return participants.map((p) => ({
      _id: p._id,
      sessionId: p.sessionId,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
      joinedAt: p.joinedAt,
    }));
  },
});

/**
 * Get current question for a session
 */
export const getCurrentQuestion = query({
  args: {
    sessionId: v.id('sessions'),
  },
  returns: v.union(
    v.null(),
    v.object({
      _id: v.id('questions'),
      quizId: v.id('quizzes'),
      text: v.string(),
      order: v.number(),
      imageUrl: v.union(v.string(), v.null()),
      audioUrl: v.union(v.string(), v.null()),
      answers: v.array(
        v.object({
          _id: v.id('answers'),
          text: v.string(),
          isCorrect: v.boolean(),
          order: v.number(),
        }),
      ),
    }),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return null;
    }

    const questions = await ctx.db
      .query('questions')
      .withIndex('by_quiz', (q) => q.eq('quizId', session.quizId))
      .order('asc')
      .collect();

    const currentQuestion = questions[session.currentQuestionIndex];
    if (!currentQuestion) {
      return null;
    }

    console.log('Current question from DB:', {
      _id: currentQuestion._id,
      text: currentQuestion.text,
      imageStorageId: currentQuestion.imageStorageId,
      audioStorageId: currentQuestion.audioStorageId,
    });

    const answers = await ctx.db
      .query('answers')
      .withIndex('by_question', (q) => q.eq('questionId', currentQuestion._id))
      .order('asc')
      .collect();

    const imageUrl = currentQuestion.imageStorageId
      ? await ctx.storage.getUrl(currentQuestion.imageStorageId)
      : null;
    const audioUrl = currentQuestion.audioStorageId
      ? await ctx.storage.getUrl(currentQuestion.audioStorageId)
      : null;

    console.log('Generated URLs:', {
      imageUrl,
      audioUrl,
    });

    return {
      _id: currentQuestion._id,
      quizId: currentQuestion.quizId,
      text: currentQuestion.text,
      order: currentQuestion.order,
      imageUrl,
      audioUrl,
      answers: answers.map((answer) => ({
        _id: answer._id,
        text: answer.text,
        isCorrect: answer.isCorrect,
        order: answer.order,
      })),
    };
  },
});

/**
 * Get responses for current question in a session
 */
export const getSessionResponses = query({
  args: {
    sessionId: v.id('sessions'),
    questionId: v.id('questions'),
  },
  returns: v.array(
    v.object({
      _id: v.id('responses'),
      sessionId: v.id('sessions'),
      questionId: v.id('questions'),
      participantId: v.id('participants'),
      answerId: v.id('answers'),
      answeredAt: v.number(),
      participant: v.object({
        name: v.string(),
        avatar: v.optional(v.string()),
        color: v.optional(v.string()),
      }),
      answer: v.object({
        text: v.string(),
        isCorrect: v.boolean(),
      }),
    }),
  ),
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query('responses')
      .withIndex('by_session_question', (q) =>
        q.eq('sessionId', args.sessionId).eq('questionId', args.questionId),
      )
      .collect();

    const responsesWithDetails = await Promise.all(
      responses.map(async (response) => {
        const participant = await ctx.db.get(response.participantId);
        const answer = await ctx.db.get(response.answerId);
        return {
          _id: response._id,
          sessionId: response.sessionId,
          questionId: response.questionId,
          participantId: response.participantId,
          answerId: response.answerId,
          answeredAt: response.answeredAt,
          participant: {
            name: participant?.name ?? 'Unknown',
            avatar: participant?.avatar ?? 'user',
            color: participant?.color ?? '#4A90E2',
          },
          answer: {
            text: answer?.text ?? '',
            isCorrect: answer?.isCorrect ?? false,
          },
        };
      }),
    );

    return responsesWithDetails;
  },
});

/**
 * Get a participant's responses for a session
 */
export const getParticipantResponses = query({
  args: {
    participantId: v.id('participants'),
    sessionId: v.id('sessions'),
  },
  returns: v.array(
    v.object({
      _id: v.id('responses'),
      questionId: v.id('questions'),
      answerId: v.id('answers'),
      answeredAt: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const responses = await ctx.db
      .query('responses')
      .withIndex('by_participant', (q) => q.eq('participantId', args.participantId))
      .collect();

    return responses
      .filter((r) => r.sessionId === args.sessionId)
      .map((r) => ({
        _id: r._id,
        questionId: r.questionId,
        answerId: r.answerId,
        answeredAt: r.answeredAt,
      }));
  },
});

/**
 * Generate an upload URL for file storage
 */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Create a new quiz with questions and answers
 */
export const createQuiz = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    questions: v.array(
      v.object({
        text: v.string(),
        imageStorageId: v.optional(v.id('_storage')),
        audioStorageId: v.optional(v.id('_storage')),
        answers: v.array(
          v.object({
            text: v.string(),
            isCorrect: v.boolean(),
          }),
        ),
      }),
    ),
  },
  returns: v.object({
    quizId: v.id('quizzes'),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const quizId = await ctx.db.insert('quizzes', {
      title: args.title,
      description: args.description,
      createdAt: now,
    });

    for (let i = 0; i < args.questions.length; i++) {
      const question = args.questions[i];
      console.log(`Creating question ${i}:`, {
        text: question.text,
        imageStorageId: question.imageStorageId,
        audioStorageId: question.audioStorageId,
      });
      const questionId = await ctx.db.insert('questions', {
        quizId,
        text: question.text,
        order: i,
        imageStorageId: question.imageStorageId,
        audioStorageId: question.audioStorageId,
      });
      console.log(`Question ${i} created with ID:`, questionId);

      for (let j = 0; j < question.answers.length; j++) {
        const answer = question.answers[j];
        await ctx.db.insert('answers', {
          questionId,
          text: answer.text,
          isCorrect: answer.isCorrect,
          order: j,
        });
      }
    }

    return { quizId };
  },
});

/**
 * Update an existing quiz with questions and answers
 */
export const updateQuiz = mutation({
  args: {
    quizId: v.id('quizzes'),
    title: v.string(),
    description: v.optional(v.string()),
    questions: v.array(
      v.object({
        text: v.string(),
        imageStorageId: v.optional(v.id('_storage')),
        audioStorageId: v.optional(v.id('_storage')),
        answers: v.array(
          v.object({
            text: v.string(),
            isCorrect: v.boolean(),
          }),
        ),
      }),
    ),
  },
  returns: v.object({
    quizId: v.id('quizzes'),
  }),
  handler: async (ctx, args) => {
    // Verify quiz exists
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Update quiz details
    await ctx.db.patch(args.quizId, {
      title: args.title,
      description: args.description,
    });

    // Get existing questions
    const existingQuestions = await ctx.db
      .query('questions')
      .withIndex('by_quiz', (q) => q.eq('quizId', args.quizId))
      .collect();

    // Delete existing answers for all questions
    for (const question of existingQuestions) {
      const existingAnswers = await ctx.db
        .query('answers')
        .withIndex('by_question', (q) => q.eq('questionId', question._id))
        .collect();
      for (const answer of existingAnswers) {
        await ctx.db.delete(answer._id);
      }
      await ctx.db.delete(question._id);
    }

    // Insert new questions and answers
    for (let i = 0; i < args.questions.length; i++) {
      const question = args.questions[i];
      const questionId = await ctx.db.insert('questions', {
        quizId: args.quizId,
        text: question.text,
        order: i,
        imageStorageId: question.imageStorageId,
        audioStorageId: question.audioStorageId,
      });

      for (let j = 0; j < question.answers.length; j++) {
        const answer = question.answers[j];
        await ctx.db.insert('answers', {
          questionId,
          text: answer.text,
          isCorrect: answer.isCorrect,
          order: j,
        });
      }
    }

    return { quizId: args.quizId };
  },
});

/**
 * Delete a quiz and all related data (questions, answers, sessions, participants, responses)
 */
export const deleteQuiz = mutation({
  args: {
    quizId: v.id('quizzes'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Verify quiz exists
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Get all questions for this quiz
    const questions = await ctx.db
      .query('questions')
      .withIndex('by_quiz', (q) => q.eq('quizId', args.quizId))
      .collect();

    // Delete all answers for each question
    for (const question of questions) {
      const answers = await ctx.db
        .query('answers')
        .withIndex('by_question', (q) => q.eq('questionId', question._id))
        .collect();
      for (const answer of answers) {
        await ctx.db.delete(answer._id);
      }
      // Delete the question
      await ctx.db.delete(question._id);
    }

    // Get all sessions for this quiz
    const sessions = await ctx.db
      .query('sessions')
      .filter((q) => q.eq(q.field('quizId'), args.quizId))
      .collect();

    // Delete all participants and responses for each session
    for (const session of sessions) {
      // Get all responses for this session (delete by session to ensure we get all)
      const allResponses = await ctx.db
        .query('responses')
        .filter((q) => q.eq(q.field('sessionId'), session._id))
        .collect();
      for (const response of allResponses) {
        await ctx.db.delete(response._id);
      }

      // Get all participants for this session
      const participants = await ctx.db
        .query('participants')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .collect();

      // Delete all participants
      for (const participant of participants) {
        await ctx.db.delete(participant._id);
      }

      // Delete the session
      await ctx.db.delete(session._id);
    }

    // Finally, delete the quiz itself
    await ctx.db.delete(args.quizId);

    return null;
  },
});

/**
 * Start a new quiz session (generate unique code)
 */
export const createSession = mutation({
  args: {
    quizId: v.id('quizzes'),
  },
  returns: v.object({
    sessionId: v.id('sessions'),
    code: v.string(),
  }),
  handler: async (ctx, args) => {
    // Check if quiz exists
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) {
      throw new Error('Quiz not found');
    }

    // Generate unique code
    let code: string;
    let existingSession;
    let attempts = 0;
    do {
      code = generateSessionCode();
      existingSession = await ctx.db
        .query('sessions')
        .withIndex('by_code', (q) => q.eq('code', code))
        .first();
      attempts++;
      if (attempts > 100) {
        throw new Error('Failed to generate unique session code');
      }
    } while (existingSession);

    const now = Date.now();
    const sessionId = await ctx.db.insert('sessions', {
      quizId: args.quizId,
      code,
      status: 'waiting',
      currentQuestionIndex: 0,
      createdAt: now,
    });

    return { sessionId, code };
  },
});

/**
 * Add a participant to a session
 */
export const joinSession = mutation({
  args: {
    sessionId: v.id('sessions'),
    name: v.string(),
    avatar: v.string(),
    color: v.string(),
  },
  returns: v.object({
    participantId: v.id('participants'),
  }),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status === 'finished') {
      throw new Error('Session has ended');
    }

    const now = Date.now();
    const participantId = await ctx.db.insert('participants', {
      sessionId: args.sessionId,
      name: args.name.trim(),
      avatar: args.avatar,
      color: args.color,
      joinedAt: now,
    });

    return { participantId };
  },
});

/**
 * Submit an answer for a question
 */
export const submitAnswer = mutation({
  args: {
    sessionId: v.id('sessions'),
    questionId: v.id('questions'),
    participantId: v.id('participants'),
    answerId: v.id('answers'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }

    // Check if participant already answered this question
    const existingResponse = await ctx.db
      .query('responses')
      .withIndex('by_session_question', (q) =>
        q.eq('sessionId', args.sessionId).eq('questionId', args.questionId),
      )
      .filter((q) => q.eq(q.field('participantId'), args.participantId))
      .first();

    if (existingResponse) {
      throw new Error('Already answered this question');
    }

    // Verify the answer belongs to the question
    const answer = await ctx.db.get(args.answerId);
    if (!answer) {
      throw new Error('Answer not found');
    }

    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    // Verify answer belongs to question
    const answers = await ctx.db
      .query('answers')
      .withIndex('by_question', (q) => q.eq('questionId', args.questionId))
      .collect();

    if (!answers.some((a) => a._id === args.answerId)) {
      throw new Error('Answer does not belong to this question');
    }

    const now = Date.now();
    await ctx.db.insert('responses', {
      sessionId: args.sessionId,
      questionId: args.questionId,
      participantId: args.participantId,
      answerId: args.answerId,
      answeredAt: now,
    });

    return null;
  },
});

/**
 * Show results for current question (host only)
 */
export const showResults = mutation({
  args: {
    sessionId: v.id('sessions'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'active') {
      throw new Error('Session is not active');
    }

    // Change status to showing_results
    await ctx.db.patch(args.sessionId, {
      status: 'showing_results',
    });

    return null;
  },
});

/**
 * Move session to next question (host only)
 * Only works when status is 'showing_results'
 */
export const nextQuestion = mutation({
  args: {
    sessionId: v.id('sessions'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'showing_results') {
      throw new Error('Session is not showing results');
    }

    // Get total question count
    const questions = await ctx.db
      .query('questions')
      .withIndex('by_quiz', (q) => q.eq('quizId', session.quizId))
      .collect();

    const nextIndex = session.currentQuestionIndex + 1;

    if (nextIndex >= questions.length) {
      // End session
      await ctx.db.patch(args.sessionId, {
        status: 'finished',
        currentQuestionIndex: session.currentQuestionIndex,
      });
    } else {
      // Move to next question
      await ctx.db.patch(args.sessionId, {
        status: 'active',
        currentQuestionIndex: nextIndex,
      });
    }

    return null;
  },
});

/**
 * Start the session (begin first question)
 */
export const startSession = mutation({
  args: {
    sessionId: v.id('sessions'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.status !== 'waiting') {
      throw new Error('Session has already started');
    }

    await ctx.db.patch(args.sessionId, {
      status: 'active',
      currentQuestionIndex: 0,
    });

    return null;
  },
});

/**
 * Mark session as finished
 */
export const endSession = mutation({
  args: {
    sessionId: v.id('sessions'),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    await ctx.db.patch(args.sessionId, {
      status: 'finished',
    });

    return null;
  },
});

/**
 * Get leaderboard for a finished session
 * Returns participants sorted by score (correct answers), then by name
 */
export const getSessionLeaderboard = query({
  args: {
    sessionId: v.id('sessions'),
  },
  returns: v.array(
    v.object({
      participantId: v.id('participants'),
      name: v.string(),
      score: v.number(),
      rank: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      return [];
    }

    // Get all participants for the session
    const participants = await ctx.db
      .query('participants')
      .withIndex('by_session', (q) => q.eq('sessionId', args.sessionId))
      .collect();

    // Get all responses for the session
    const allResponses = await ctx.db
      .query('responses')
      .filter((q) => q.eq(q.field('sessionId'), args.sessionId))
      .collect();

    // Calculate scores for each participant
    const leaderboard = await Promise.all(
      participants.map(async (participant) => {
        // Get all responses for this participant
        const participantResponses = allResponses.filter(
          (r) => r.participantId === participant._id,
        );

        // Count correct answers
        let score = 0;
        for (const response of participantResponses) {
          const answer = await ctx.db.get(response.answerId);
          if (answer?.isCorrect) {
            score += 1;
          }
        }

        return {
          participantId: participant._id,
          name: participant.name,
          score,
        };
      }),
    );

    // Sort by score (descending), then by name (ascending)
    leaderboard.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.name.localeCompare(b.name);
    });

    // Add ranks (handle ties - same score = same rank)
    let currentRank = 1;
    const leaderboardWithRanks = leaderboard.map((entry, index) => {
      if (index > 0 && leaderboard[index - 1].score > entry.score) {
        currentRank = index + 1;
      }
      return {
        ...entry,
        rank: currentRank,
      };
    });

    return leaderboardWithRanks;
  },
});
