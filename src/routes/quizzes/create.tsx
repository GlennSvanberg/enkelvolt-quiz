import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '~/components/ui/button';

export const Route = createFileRoute('/quizzes/create')({
  component: CreateQuiz,
});

interface Question {
  text: string;
  answers: Array<{ text: string; isCorrect: boolean }>;
}

function CreateQuiz() {
  const navigate = useNavigate();
  const createQuiz = useMutation(api.quizzes.createQuiz);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    {
      text: '',
      answers: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
    },
  ]);

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: '',
        answers: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ],
      },
    ]);
  };

  const handleRemoveQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleQuestionChange = (index: number, text: string) => {
    const newQuestions = [...questions];
    newQuestions[index].text = text;
    setQuestions(newQuestions);
  };

  const handleAnswerChange = (
    questionIndex: number,
    answerIndex: number,
    text: string,
  ) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].answers[answerIndex].text = text;
    setQuestions(newQuestions);
  };

  const handleCorrectAnswerChange = (
    questionIndex: number,
    answerIndex: number,
  ) => {
    const newQuestions = [...questions];
    // Set all answers to false first
    newQuestions[questionIndex].answers.forEach((a) => (a.isCorrect = false));
    // Set selected answer to true
    newQuestions[questionIndex].answers[answerIndex].isCorrect = true;
    setQuestions(newQuestions);
  };

  const handleAddAnswer = (questionIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].answers.push({ text: '', isCorrect: false });
    setQuestions(newQuestions);
  };

  const handleRemoveAnswer = (questionIndex: number, answerIndex: number) => {
    const newQuestions = [...questions];
    newQuestions[questionIndex].answers = newQuestions[
      questionIndex
    ].answers.filter((_, i) => i !== answerIndex);
    setQuestions(newQuestions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!title.trim()) {
      alert('Please enter a quiz title');
      return;
    }

    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.text.trim()) {
        alert(`Please enter text for question ${i + 1}`);
        return;
      }
      if (q.answers.length < 2) {
        alert(`Question ${i + 1} must have at least 2 answers`);
        return;
      }
      const hasCorrect = q.answers.some((a) => a.isCorrect);
      if (!hasCorrect) {
        alert(`Question ${i + 1} must have at least one correct answer`);
        return;
      }
      for (let j = 0; j < q.answers.length; j++) {
        if (!q.answers[j].text.trim()) {
          alert(`Question ${i + 1}, Answer ${j + 1} cannot be empty`);
          return;
        }
      }
    }

    try {
      const result = await createQuiz({
        title: title.trim(),
        description: description.trim() || undefined,
        questions: questions.map((q) => ({
          text: q.text.trim(),
          answers: q.answers.map((a) => ({
            text: a.text.trim(),
            isCorrect: a.isCorrect,
          })),
        })),
      });

      navigate({
        to: '/quizzes/$quizId',
        params: { quizId: result.quizId },
      });
    } catch (error) {
      console.error('Error creating quiz:', error);
      alert('Failed to create quiz. Please try again.');
    }
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-background p-4 border-b-2 border-slate-200 dark:border-slate-800 flex flex-row justify-between items-center">
        <h1 className="text-xl font-bold">Create Quiz</h1>
        <ThemeToggle />
      </header>
      <main className="p-8 max-w-4xl mx-auto">
        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
          <div className="border rounded-lg p-6 bg-white dark:bg-gray-900">
            <h2 className="text-xl font-semibold mb-4">Quiz Details</h2>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter quiz title"
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter quiz description (optional)"
                  className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Questions</h2>
              <Button
                type="button"
                onClick={handleAddQuestion}
                className="bg-blue-500 text-white hover:bg-blue-600"
              >
                Add Question
              </Button>
            </div>

            {questions.map((question, questionIndex) => (
              <div
                key={questionIndex}
                className="border rounded-lg p-6 bg-white dark:bg-gray-900"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold">
                    Question {questionIndex + 1}
                  </h3>
                  {questions.length > 1 && (
                    <Button
                      type="button"
                      onClick={() => handleRemoveQuestion(questionIndex)}
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Question Text *
                    </label>
                    <input
                      type="text"
                      value={question.text}
                      onChange={(e) =>
                        handleQuestionChange(questionIndex, e.target.value)
                      }
                      placeholder="Enter question"
                      className="w-full px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Answers *
                    </label>
                    <div className="flex flex-col gap-2">
                      {question.answers.map((answer, answerIndex) => (
                        <div
                          key={answerIndex}
                          className="flex gap-2 items-center"
                        >
                          <input
                            type="radio"
                            name={`correct-${questionIndex}`}
                            checked={answer.isCorrect}
                            onChange={() =>
                              handleCorrectAnswerChange(
                                questionIndex,
                                answerIndex,
                              )
                            }
                            className="w-4 h-4"
                          />
                          <input
                            type="text"
                            value={answer.text}
                            onChange={(e) =>
                              handleAnswerChange(
                                questionIndex,
                                answerIndex,
                                e.target.value,
                              )
                            }
                            placeholder={`Answer ${answerIndex + 1}`}
                            className="flex-1 px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
                            required
                          />
                          {question.answers.length > 2 && (
                            <Button
                              type="button"
                              onClick={() =>
                                handleRemoveAnswer(questionIndex, answerIndex)
                              }
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-700"
                            >
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                      <Button
                        type="button"
                        onClick={() => handleAddAnswer(questionIndex)}
                        variant="ghost"
                        size="sm"
                        className="text-blue-500 hover:text-blue-700 self-start"
                      >
                        + Add Answer
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Select the correct answer by clicking the radio button
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4 justify-end">
            <Button
              type="button"
              onClick={() => navigate({ to: '/' })}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-green-500 text-white hover:bg-green-600"
            >
              Create Quiz
            </Button>
          </div>
        </form>
      </main>
    </>
  );
}
