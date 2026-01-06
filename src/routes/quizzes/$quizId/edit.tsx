import { Link, createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { convexQuery } from '@convex-dev/react-query';
import { SignedIn, SignedOut, useAuth } from '@clerk/tanstack-start';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Button } from '~/components/ui/button';
import { ThemeToggle } from '~/components/ThemeToggle';
import { X, Image as ImageIcon, Music, ChevronLeft, ChevronRight } from 'lucide-react';

export const Route = createFileRoute('/quizzes/$quizId/edit')({
  component: EditQuiz,
  loader: async ({ context, params }) => {
    const { queryClient } = context as { queryClient: any };
    await queryClient.ensureQueryData(
      convexQuery(api.quizzes.getQuiz, { quizId: params.quizId as any }),
    );
  },
});

interface Question {
  text: string;
  answers: Array<{ text: string; isCorrect: boolean }>;
  imageStorageId?: Id<'_storage'>;
  audioStorageId?: Id<'_storage'>;
  imagePreview?: string;
  audioPreview?: string;
}

type WizardStep = 'details' | 'questions' | 'review';

function EditQuiz() {
  const { quizId } = Route.useParams();
  const navigate = useNavigate();
  const updateQuiz = useMutation(api.quizzes.updateQuiz);
  const generateUploadUrl = useMutation(api.quizzes.generateUploadUrl);
  const { userId, isSignedIn } = useAuth();

  const { data: quiz } = useSuspenseQuery(
    convexQuery(api.quizzes.getQuiz, { quizId: quizId as any }),
  );

  // Initialize state from quiz data
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    {
      text: '',
      answers: [
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
    },
  ]);
  const [currentStep, setCurrentStep] = useState<WizardStep>('details');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const canEdit = isSignedIn === true && !!quiz?.ownerId && quiz.ownerId === userId;

  // Initialize state from quiz data when quiz loads
  useEffect(() => {
    if (quiz) {
      setTitle(quiz.title || '');
      setDescription(quiz.description || '');
      if (quiz.questions && quiz.questions.length > 0) {
        setQuestions(
          quiz.questions.map((q) => ({
            text: q.text,
            answers: q.answers.map((a) => ({
              text: a.text,
              isCorrect: a.isCorrect,
            })),
            imageStorageId: q.imageStorageId || undefined,
            audioStorageId: q.audioStorageId || undefined,
            imagePreview: q.imageUrl || undefined,
            audioPreview: q.audioUrl || undefined,
          })),
        );
      }
    }
  }, [quiz]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      questions.forEach((q) => {
        if (q.imagePreview && q.imagePreview.startsWith('blob:')) {
          URL.revokeObjectURL(q.imagePreview);
        }
        if (q.audioPreview && q.audioPreview.startsWith('blob:')) {
          URL.revokeObjectURL(q.audioPreview);
        }
      });
    };
  }, []);

  const totalSteps = questions.length + 2; 
  const currentStepNumber = currentStep === 'details' 
    ? 1 
    : currentStep === 'review' 
    ? totalSteps 
    : currentQuestionIndex + 2;

  const handleAddQuestion = () => {
    setQuestions([
      ...questions,
      {
        text: '',
        answers: [
          { text: '', isCorrect: false },
          { text: '', isCorrect: false },
        ],
      },
    ]);
    setCurrentQuestionIndex(questions.length);
    setCurrentStep('questions');
  };

  const handleRemoveQuestion = (index: number) => {
    const newQuestions = questions.filter((_, i) => i !== index);
    setQuestions(newQuestions);
    if (currentQuestionIndex >= newQuestions.length) {
      setCurrentQuestionIndex(Math.max(0, newQuestions.length - 1));
    }
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
    newQuestions[questionIndex].answers.forEach((a) => (a.isCorrect = false));
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

  const handleImageUpload = async (
    questionIndex: number,
    file: File,
  ) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB');
      return;
    }

    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      
      if (!result.ok) {
        const errorText = await result.text();
        throw new Error(`Upload failed: ${result.status} ${errorText}`);
      }
      
      const responseData = await result.json();
      const storageId = responseData.storageId;
      if (!storageId) {
        throw new Error('No storageId in upload response');
      }

      const newQuestions = [...questions];
      newQuestions[questionIndex].imageStorageId = storageId;
      newQuestions[questionIndex].imagePreview = URL.createObjectURL(file);
      setQuestions(newQuestions);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
    }
  };

  const handleAudioUpload = async (
    questionIndex: number,
    file: File,
  ) => {
    if (!file.type.startsWith('audio/')) {
      alert('Please upload an audio file');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('Audio size must be less than 20MB');
      return;
    }

    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      
      if (!result.ok) {
        const errorText = await result.text();
        throw new Error(`Upload failed: ${result.status} ${errorText}`);
      }
      
      const responseData = await result.json();
      const storageId = responseData.storageId;
      if (!storageId) {
        throw new Error('No storageId in upload response');
      }

      const newQuestions = [...questions];
      newQuestions[questionIndex].audioStorageId = storageId;
      newQuestions[questionIndex].audioPreview = URL.createObjectURL(file);
      setQuestions(newQuestions);
    } catch (error) {
      console.error('Error uploading audio:', error);
      alert('Failed to upload audio. Please try again.');
    }
  };

  const handleRemoveImage = (questionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].imagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(newQuestions[questionIndex].imagePreview!);
    }
    delete newQuestions[questionIndex].imageStorageId;
    delete newQuestions[questionIndex].imagePreview;
    setQuestions(newQuestions);
  };

  const handleRemoveAudio = (questionIndex: number) => {
    const newQuestions = [...questions];
    if (newQuestions[questionIndex].audioPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(newQuestions[questionIndex].audioPreview!);
    }
    delete newQuestions[questionIndex].audioStorageId;
    delete newQuestions[questionIndex].audioPreview;
    setQuestions(newQuestions);
  };

  const validateDetails = () => {
    if (!title.trim()) {
      alert('Please enter a quiz title');
      return false;
    }
    return true;
  };

  const validateQuestion = (index: number) => {
    const q = questions[index];
    if (!q.text.trim()) {
      alert(`Please enter text for question ${index + 1}`);
      return false;
    }
    if (q.answers.length < 2) {
      alert(`Question ${index + 1} must have at least 2 answers`);
      return false;
    }
    const hasCorrect = q.answers.some((a) => a.isCorrect);
    if (!hasCorrect) {
      alert(`Question ${index + 1} must have at least one correct answer`);
      return false;
    }
    for (let j = 0; j < q.answers.length; j++) {
      if (!q.answers[j].text.trim()) {
        alert(`Question ${index + 1}, Answer ${j + 1} cannot be empty`);
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (currentStep === 'details') {
      if (!validateDetails()) return;
      if (questions.length === 0) {
        handleAddQuestion();
      } else {
        setCurrentQuestionIndex(0);
        setCurrentStep('questions');
      }
    } else if (currentStep === 'questions') {
      if (!validateQuestion(currentQuestionIndex)) return;
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        setCurrentStep('review');
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep === 'questions') {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      } else {
        setCurrentStep('details');
      }
    } else if (currentStep === 'review') {
      setCurrentQuestionIndex(questions.length - 1);
      setCurrentStep('questions');
    }
  };

  const handleGoToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    setCurrentStep('questions');
  };

  const handleSubmit = async () => {
    if (!validateDetails()) return;
    if (questions.length === 0) {
      alert('Please add at least one question');
      return;
    }
    for (let i = 0; i < questions.length; i++) {
      if (!validateQuestion(i)) return;
    }

    setIsSubmitting(true);
    try {
      await updateQuiz({
        quizId: quizId as any,
        title: title.trim(),
        description: description.trim() || undefined,
        questions: questions.map((q) => ({
          text: q.text.trim(),
          imageStorageId: q.imageStorageId,
          audioStorageId: q.audioStorageId,
          answers: q.answers.map((a) => ({
            text: a.text.trim(),
            isCorrect: a.isCorrect,
          })),
        })),
      });

      navigate({
        to: '/quizzes/$quizId',
        params: { quizId: quizId } as any,
        search: {} as any,
      });
    } catch (error) {
      console.error('Error updating quiz:', error);
      alert('Failed to update quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderDetailsStep = () => (
    <div className="w-full max-w-3xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2">Quiz Details</h2>
        <p className="text-base text-muted-foreground">
          Update your quiz title and description
        </p>
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter quiz title"
            className="w-full px-6 py-4 text-lg border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter quiz description"
            className="w-full px-6 py-4 text-lg border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background resize-none"
            rows={4}
          />
        </div>
      </div>
    </div>
  );

  const renderQuestionStep = () => {
    const question = questions[currentQuestionIndex];
    return (
      <div className="w-full max-w-3xl mx-auto">
        <div className="flex flex-col gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Question Text *
                </label>
                <input
                  type="text"
                  value={question.text}
                  onChange={(e) =>
                    handleQuestionChange(currentQuestionIndex, e.target.value)
                  }
                  placeholder="Enter your question"
                  className="w-full px-6 py-4 text-lg border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Answers *
                </label>
                <div className="flex flex-col gap-3">
                  {question.answers.map((answer, answerIndex) => (
                    <div
                      key={answerIndex}
                      className="flex gap-3 items-center"
                    >
                      <input
                        type="radio"
                        name={`correct-${currentQuestionIndex}`}
                        checked={answer.isCorrect}
                        onChange={() =>
                          handleCorrectAnswerChange(
                            currentQuestionIndex,
                            answerIndex,
                          )
                        }
                        className="w-5 h-5 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={answer.text}
                        onChange={(e) =>
                          handleAnswerChange(
                            currentQuestionIndex,
                            answerIndex,
                            e.target.value,
                          )
                        }
                        placeholder={`Answer ${answerIndex + 1}`}
                        className="flex-1 px-6 py-4 text-lg border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-background"
                        required
                      />
                      {question.answers.length > 2 && (
                        <Button
                          type="button"
                          onClick={() =>
                            handleRemoveAnswer(currentQuestionIndex, answerIndex)
                          }
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive/80"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    onClick={() => handleAddAnswer(currentQuestionIndex)}
                    variant="outline"
                    className="self-start"
                  >
                    + Add Answer
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Select the correct answer by clicking the radio button
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Photo (optional)
                  </label>
                  {question.imagePreview ? (
                    <div className="relative">
                      <img
                        src={question.imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg border-2"
                      />
                      <Button
                        type="button"
                        onClick={() => handleRemoveImage(currentQuestionIndex)}
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => imageInputRef.current?.click()}>
                      <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload image
                      </span>
                      <input
                        ref={imageInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(currentQuestionIndex, file);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Audio (optional)
                  </label>
                  {question.audioPreview ? (
                    <div className="border-2 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Music className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm">Audio uploaded</span>
                        </div>
                        <Button
                          type="button"
                          onClick={() => handleRemoveAudio(currentQuestionIndex)}
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <audio
                        src={question.audioPreview}
                        controls
                        className="w-full mt-2"
                      />
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center gap-3 hover:border-primary/50 transition-colors cursor-pointer"
                      onClick={() => audioInputRef.current?.click()}>
                      <Music className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload audio
                      </span>
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleAudioUpload(currentQuestionIndex, file);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
        </div>
      </div>
    );
  };

  const renderReviewStep = () => (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold mb-2">Review Quiz</h2>
        <p className="text-base text-muted-foreground">
          Review all questions before updating your quiz
        </p>
      </div>
      <div className="flex flex-col gap-6">
        <div className="border-2 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-2">{title}</h3>
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>

        <div className="flex flex-col gap-4">
          {questions.map((question, index) => (
            <div key={index} className="border-2 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold">Question {index + 1}</h3>
                <Button
                  type="button"
                  onClick={() => handleGoToQuestion(index)}
                  variant="outline"
                  size="sm"
                >
                  Edit
                </Button>
              </div>
              <div className="flex flex-col gap-4">
                <p className="text-lg">{question.text}</p>
                {question.imagePreview && (
                  <div>
                    <img
                      src={question.imagePreview}
                      alt="Question preview"
                      className="w-full h-48 object-cover rounded-lg border-2"
                    />
                  </div>
                )}
                {question.audioPreview && (
                  <div className="border-2 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Music className="h-5 w-5" />
                      <span className="text-sm font-medium">Audio</span>
                    </div>
                    <audio src={question.audioPreview} controls className="w-full" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {question.answers.map((answer, answerIndex) => (
                    <div
                      key={answerIndex}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 ${
                        answer.isCorrect
                          ? 'border-primary bg-primary/10'
                          : 'border-border'
                      }`}
                    >
                      {answer.isCorrect && (
                        <span className="text-primary font-semibold">✓</span>
                      )}
                      <span>{answer.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <SignedOut>
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border p-4 flex flex-row justify-between items-center">
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
        </header>
        <main className="p-8 max-w-xl mx-auto">
          <div className="border rounded-lg p-6 bg-white dark:bg-gray-900 flex flex-col gap-4 shadow-lg animate-hero-fade-in">
            <h1 className="text-2xl font-bold">Sign in to edit quizzes</h1>
            <Button asChild className="bg-primary hover:bg-primary/90">
              <Link
                to="/sign-in"
                search={{ redirect: `/quizzes/${quizId}/edit` } as any}
              >
                Sign in with Google
              </Link>
            </Button>
          </div>
        </main>
      </SignedOut>

      <SignedIn>
        {!canEdit ? (
          <main className="p-8 max-w-xl mx-auto">
            <div className="border rounded-lg p-6 bg-white dark:bg-gray-900 flex flex-col gap-4 shadow-lg animate-hero-fade-in">
              <h1 className="text-2xl font-bold">You can’t edit this quiz</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Only the creator can edit their quizzes.
              </p>
              <Button asChild variant="outline">
                <Link to="/quizzes/$quizId" params={{ quizId } as any}>
                  Back to quiz
                </Link>
              </Button>
            </div>
          </main>
        ) : (
          <>
            <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border p-4 flex flex-row justify-between items-center">
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
            </header>

            <main className="flex flex-col min-h-screen">
              <section className="relative py-12 px-4 sm:px-6 lg:px-8 overflow-hidden flex-1">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
                <div className="container mx-auto max-w-5xl relative z-10 flex flex-col min-h-full">
                  {/* Progress Indicator */}
                  <div className="mb-12">
                    <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                            currentStep === 'details'
                              ? 'bg-primary text-primary-foreground scale-110'
                              : currentStepNumber > 1
                              ? 'bg-primary/20 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {currentStepNumber > 1 ? '✓' : '1'}
                        </div>
                        <span className={`text-sm sm:text-base font-medium hidden sm:block ${
                          currentStep === 'details' ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          Details
                        </span>
                      </div>

                      {questions.map((_, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className={`h-1 w-4 sm:w-8 bg-muted`} />
                          <div
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold transition-all cursor-pointer hover:scale-110 ${
                              currentStep === 'questions' && currentQuestionIndex === index
                                ? 'bg-primary text-primary-foreground scale-110'
                                : currentStep === 'review' || (currentStep === 'questions' && currentQuestionIndex > index)
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}
                            onClick={() => {
                              if (currentStepNumber > index + 2 || currentStep === 'review' || (currentStep === 'questions' && currentQuestionIndex > index)) {
                                handleGoToQuestion(index);
                              }
                            }}
                          >
                            {currentStep === 'review' || (currentStep === 'questions' && currentQuestionIndex > index) ? '✓' : index + 1}
                          </div>
                          <span className={`text-sm sm:text-base font-medium hidden sm:block ${
                            currentStep === 'questions' && currentQuestionIndex === index ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            Question {index + 1}
                          </span>
                        </div>
                      ))}

                      {questions.length > 0 && (
                        <div className="flex items-center gap-2">
                          <div className={`h-1 w-4 sm:w-8 bg-muted`} />
                          <div
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                              currentStep === 'review'
                                ? 'bg-primary text-primary-foreground scale-110'
                                : currentStepNumber === totalSteps
                                ? 'bg-primary/20 text-primary'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {currentStepNumber === totalSteps && currentStep !== 'review' ? '✓' : totalSteps}
                          </div>
                          <span className={`text-sm sm:text-base font-medium hidden sm:block ${
                            currentStep === 'review' ? 'text-foreground' : 'text-muted-foreground'
                          }`}>
                            Review
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 flex items-start justify-center py-4">
                    {currentStep === 'details' && renderDetailsStep()}
                    {currentStep === 'questions' && renderQuestionStep()}
                    {currentStep === 'review' && renderReviewStep()}
                  </div>

                  <div className="flex justify-between items-center mt-6 gap-4 pt-6 border-t border-border">
                    <Button
                      type="button"
                      onClick={handlePrevious}
                      disabled={currentStep === 'details'}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>

                    <div className="flex items-center gap-2">
                      {currentStep === 'questions' && (
                        <Button
                          type="button"
                          onClick={handleAddQuestion}
                          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          + Add Question
                        </Button>
                      )}
                      {currentStep === 'review' ? (
                        <Button
                          type="button"
                          onClick={handleSubmit}
                          disabled={isSubmitting}
                          className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                          size="lg"
                        >
                          {isSubmitting ? 'Updating...' : 'Update Quiz'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          onClick={handleNext}
                          className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                          size="lg"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </main>
          </>
        )}
      </SignedIn>
    </>
  );
}
