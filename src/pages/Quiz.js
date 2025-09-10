import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import './Quiz.css';

// --- THIS IS THE FIX ---
// Define the shuffleArray helper function outside the component.
const shuffleArray = (array) => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const Quiz = ({ quizId, candidate, onQuizComplete }) => {
    const [quiz, setQuiz] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [marked, setMarked] = useState([]);
    const [timeLeft, setTimeLeft] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showSubmitModal, setShowSubmitModal] = useState(false);

    const candidateRef = useRef(candidate);
    const answersRef = useRef(answers);
    const quizRef = useRef(null);
    const questionsRef = useRef(questions);
    const submitQuizRef = useRef();

    useEffect(() => {
        answersRef.current = answers;
        quizRef.current = quiz;
        questionsRef.current = questions;
    }, [answers, quiz, questions]);

    const fetchQuizAndQuestions = useCallback(async () => {
        try {
            const quizDocRef = doc(db, 'quizzes', quizId);
            const quizSnap = await getDoc(quizDocRef);

            if (!quizSnap.exists()) throw new Error("Quiz not found.");
            
            const quizData = { id: quizSnap.id, ...quizSnap.data() };
            setQuiz(quizData);
            setTimeLeft(quizData.duration * 60);

            const foldersRef = collection(db, 'quizzes', quizId, 'folders');
            const foldersSnap = await getDocs(foldersRef);
            
            let allPoolQuestions = [];
            let allFixedQuestions = [];

            for (const folderDoc of foldersSnap.docs) {
                const questionsColRef = collection(db, 'quizzes', quizId, 'folders', folderDoc.id, 'questions');
                const questionsSnap = await getDocs(questionsColRef);
                const folderQuestions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                if (folderDoc.data().name === 'Pool Questions') allPoolQuestions.push(...folderQuestions);
                else if (folderDoc.data().name === 'Fixed Questions') allFixedQuestions.push(...folderQuestions);
            }
            
            let finalQuestions = [];
            const fixedCount = quizData.fixedQuestionsCount || 0;
            const poolCount = quizData.includePoolQuestions ? (quizData.poolQuestionsCount || 0) : 0;

            if(fixedCount > 0) finalQuestions.push(...shuffleArray(allFixedQuestions).slice(0, fixedCount));
            if(poolCount > 0) finalQuestions.push(...shuffleArray(allPoolQuestions).slice(0, poolCount));
            
            setQuestions(shuffleArray(finalQuestions));

            if (finalQuestions.length === 0) throw new Error("No questions are available for this quiz at the moment.");

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [quizId]);

    useEffect(() => {
        fetchQuizAndQuestions();
    }, [fetchQuizAndQuestions]);
    
    useEffect(() => {
        submitQuizRef.current = async () => {
            const currentCandidate = candidateRef.current;
            const currentAnswers = answersRef.current;
            const currentQuiz = quizRef.current;
            const currentQuestions = questionsRef.current;
            
            if (!currentCandidate || !currentCandidate.phone || !currentCandidate.startTime) {
                console.error("Submission failed: Candidate data or start time is missing.", currentCandidate);
                setError("An error occurred during submission. Missing essential data.");
                return;
            }

            try {
                let score = 0;
                let totalPossibleScore = 0;
                let priorityScore = 0;
                const answeredCount = Object.keys(currentAnswers).filter(key => currentAnswers[key]).length;

                currentQuestions.forEach(q => {
                    const questionScore = q.score || 1;
                    totalPossibleScore += questionScore;
                    
                    let isCorrect = false;
                    const submittedAnswer = currentAnswers[q.id] || "";
                    
                    if (currentQuiz.type === 'Multiple Choice') {
                        if (submittedAnswer === q.correctAnswer) isCorrect = true;
                    } else if (currentQuiz.type === 'Descriptive') {
                        const keywordsString = q.answerParameters || "";
                        const keywords = keywordsString.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
                        const candidateAnswer = submittedAnswer.toLowerCase();
                        if (keywords.length > 0 && keywords.every(keyword => candidateAnswer.includes(keyword))) isCorrect = true;
                    }
                    
                    if (isCorrect) {
                        score += questionScore;
                        if (q.isPriority) {
                            priorityScore += questionScore;
                        }
                    }
                });
        
                const resultData = {
                    answers: currentAnswers,
                    submittedAt: serverTimestamp(),
                    startTime: currentCandidate.startTime,
                    score,
                    totalPossibleScore,
                    priorityScore,
                    answeredCount,
                    totalQuestions: currentQuestions.length,
                    candidateDocId: currentCandidate.id 
                };
                
                await setDoc(doc(db, 'quizzes', quizId, 'results', currentCandidate.phone), resultData);
                setShowSubmitModal(true);
        
            } catch (err) {
                console.error("Error submitting quiz:", err);
                setError("There was an error submitting your quiz. Please try again.");
            }
        };
    }, [quizId]);

    useEffect(() => {
        if (timeLeft === null) return;
        if (timeLeft === 0) {
            submitQuizRef.current?.();
            return;
        }
        const intervalId = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        return () => clearInterval(intervalId);
    }, [timeLeft]);

    const handleAnswerSelect = (questionId, answer) => setAnswers(prev => ({ ...prev, [questionId]: answer }));
    const handleMarkQuestion = () => {
        const questionId = questions[currentQuestionIndex]?.id;
        if (!questionId) return;
        setMarked(prev => prev.includes(questionId) ? prev.filter(id => id !== questionId) : [...prev, questionId]);
    };
    const goToNext = () => {
        if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(prev => prev + 1);
    };
    const goToPrevious = () => {
        if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1);
    };

    if (loading) return <div className="loading-container">Preparing your quiz...</div>;
    if (error) return <div className="error-container">{error}</div>;

    const currentQuestion = questions[currentQuestionIndex];
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const isMarked = marked.includes(currentQuestion?.id);

    return (
        <div className="quiz-page-container">
            <header className="quiz-page-header">
                <h1 className="h4 m-0 fw-bold text-dark">Quizegon</h1>
                <button className="btn btn-outline-secondary" onClick={() => submitQuizRef.current?.()}>Logout</button>
            </header>
            
            <div className="timer-bar">Time Left: {minutes}:{seconds < 10 ? `0${seconds}` : seconds}</div>

            <main className="quiz-main-content">
                {currentQuestion && (
                     <div className="question-card-main">
                        <div className="question-header">
                            <p className="question-number">
                                Question {currentQuestionIndex + 1} of {questions.length}
                                {currentQuestion.isPriority && (
                                    <span className="priority-indicator" title="High Priority Question">⭐</span>
                                )}
                            </p>
                            <button onClick={handleMarkQuestion} className={`btn btn-sm ${isMarked ? 'btn-warning' : 'btn-outline-warning'}`}>
                                {isMarked ? 'Unmark Question' : 'Mark for Review'}
                            </button>
                        </div>
                        <h3 className="question-text multilingual-text" style={{ whiteSpace: 'pre-wrap' }}>{currentQuestion.questionText}</h3>
                        
                        {quizRef.current?.type === 'Multiple Choice' ? (
                            <div className="options-grid-container">
                                <div className="options-grid">
                                    {currentQuestion.options.map((option, index) => (
                                        <button key={index} onClick={() => handleAnswerSelect(currentQuestion.id, option)} className={`option-btn multilingual-text ${answers[currentQuestion.id] === option ? 'selected' : ''}`}>{option}</button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="descriptive-answer">
                                 <textarea rows="8" className="form-control multilingual-text" placeholder="Type your answer here..." value={answers[currentQuestion.id] || ''} onChange={(e) => handleAnswerSelect(currentQuestion.id, e.target.value)}></textarea>
                            </div>
                        )}
                     </div>
                )}
                
                <div className="quiz-navigation-footer">
                    <div className="prev-next-container">
                        <button onClick={goToPrevious} disabled={currentQuestionIndex === 0} className="btn btn-secondary nav-btn">&larr; Previous</button>
                        <button onClick={goToNext} disabled={currentQuestionIndex === questions.length - 1} className="btn btn-primary nav-btn">Next &rarr;</button>
                    </div>
                    <button onClick={() => submitQuizRef.current?.()} className="btn btn-danger submit-btn">Submit Quiz</button>
                </div>

                <div className="question-navigation-card">
                    <h5>Question Navigation</h5>
                    <div className="question-grid">
                         {questions.map((q, index) => {
                             const isCurrent = index === currentQuestionIndex;
                             const isAnswered = !!answers[q.id];
                             const isMarkedForReview = marked.includes(q.id);
                             const statusClasses = ['grid-item'];
                             if (isCurrent) statusClasses.push('current');
                             else if (isAnswered) statusClasses.push('answered');
                             if (isMarkedForReview) statusClasses.push('marked');
                             return (<button key={q.id} onClick={() => setCurrentQuestionIndex(index)} className={statusClasses.join(' ')}>{index + 1}</button>);
                         })}
                    </div>
                    <div className="legend">
                        <span className="legend-item answered">Answered</span>
                        <span className="legend-item not-answered">Not Answered</span>
                        <span className="legend-item current">Current</span>
                        <span className="legend-item marked">Marked for Review</span>
                    </div>
                </div>
            </main>

            {showSubmitModal && (
                 <div className="modal show" style={{ display: 'block' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header"><h5 className="modal-title">Submission Successful</h5></div>
                            <div className="modal-body"><p>Your quiz has been successfully submitted.</p></div>
                            <div className="modal-footer"><button type="button" className="btn btn-primary" onClick={onQuizComplete}>OK</button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Quiz;
