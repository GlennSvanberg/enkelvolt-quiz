import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
  quizzes: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    createdAt: v.number(),
  }),
  questions: defineTable({
    quizId: v.id('quizzes'),
    text: v.string(),
    order: v.number(),
  }).index('by_quiz', ['quizId']),
  answers: defineTable({
    questionId: v.id('questions'),
    text: v.string(),
    isCorrect: v.boolean(),
    order: v.number(),
  }).index('by_question', ['questionId']),
  sessions: defineTable({
    quizId: v.id('quizzes'),
    code: v.string(),
    status: v.union(v.literal('waiting'), v.literal('active'), v.literal('showing_results'), v.literal('finished')),
    currentQuestionIndex: v.number(),
    createdAt: v.number(),
  }).index('by_code', ['code']),
  participants: defineTable({
    sessionId: v.id('sessions'),
    name: v.string(),
    avatar: v.optional(v.string()),
    color: v.optional(v.string()),
    joinedAt: v.number(),
  }).index('by_session', ['sessionId']),
  responses: defineTable({
    sessionId: v.id('sessions'),
    questionId: v.id('questions'),
    participantId: v.id('participants'),
    answerId: v.id('answers'),
    answeredAt: v.number(),
  })
    .index('by_session_question', ['sessionId', 'questionId'])
    .index('by_participant', ['participantId']),
});
