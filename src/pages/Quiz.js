import React, { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, doc, setDoc, Timestamp } from 'firebase/firestore';
import Timer from '../components/quiz/Timer';
import QuestionGrid from '../components/quiz/QuestionGrid';
import Loading from '../components/common/Loading';
import Modal from '../components/common/Modal';

// Fisher-Yates shuffle algorithm for true randomization
const shuffleArray = (array) => {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
};

export default function Quiz({ quizId, candidateId, onFinish }) {
    const [questions, setQuestions] = useState([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [quizStartTime, setQuizStartTime] = useState(null);
    
    const [showWarningModal, setShowWarningModal] = useState(false);
    const [warningMessage, setWarningMessage] = useState('');
    const tabSwitchCount = useRef(0);
    
    const onFinishRef = useRef(onFinish);
    useEffect(() => {
        onFinishRef.current = onFinish;
    }, [onFinish]);

    // --- FIX: Use a ref to hold the latest version of the submit function ---
    const handleSubmitQuizRef = useRef();

    const handleSubmitQuiz = useCallback(async () => {
        if (!candidateId || !questions.length) return;

        let score = 0;
        questions.forEach(q => {
            if (answers[q.id] && answers[q.id] === q.answer) {
                score++;
            }
        });

        try {
            const resultDocRef = doc(db, 'quizzes', quizId, 'results', candidateId);
            await setDoc(resultDocRef, {
                answers,
                score,
                totalQuestions: questions.length,
                startTime: Timestamp.fromDate(quizStartTime),
                submittedAt: Timestamp.now()
            });
            setShowSuccessModal(true);
        } catch (error) {
            console.error("Error submitting quiz results:", error);
            alert("There was an error submitting your quiz.");
        }
    }, [quizId, candidateId, questions, answers, quizStartTime]);

    // --- FIX: Keep the ref updated with the latest version of the function ---
    useEffect(() => {
        handleSubmitQuizRef.current = handleSubmitQuiz;
    }, [handleSubmitQuiz]);

    // --- ANTI-CHEATING FEATURES ---
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                tabSwitchCount.current += 1;
                if (tabSwitchCount.current === 1) {
                    setWarningMessage('You have switched tabs. This is the first and final warning. Switching tabs again will result in automatic submission of your quiz.');
                    setShowWarningModal(true);
                } else if (tabSwitchCount.current >= 2) {
                    // Call the function from the ref to ensure it has the latest state
                    handleSubmitQuizRef.current();
                }
            }
        };

        const preventAction = (e) => {
            e.preventDefault();
            setWarningMessage('This action is disabled during the quiz.');
            setShowWarningModal(true);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        document.addEventListener('contextmenu', preventAction);
        document.addEventListener('copy', preventAction);
        document.addEventListener('paste', preventAction);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            document.removeEventListener('contextmenu', preventAction);
            document.removeEventListener('copy', preventAction);
            document.removeEventListener('paste', preventAction);
        };
    }, []); // This useEffect should only run once

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const foldersRef = collection(db, 'quizzes', quizId, 'questionFolders');
                const foldersSnapshot = await getDocs(foldersRef);

                let allPoolQuestions = [];
                let allFixedQuestions = [];

                await Promise.all(foldersSnapshot.docs.map(async (folderDoc) => {
                    const folderData = folderDoc.data();
                    const questionsRef = collection(db, 'quizzes', quizId, 'questionFolders', folderDoc.id, 'questions');
                    const questionsSnapshot = await getDocs(questionsRef);
                    const folderQuestions = questionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                    if (folderData.type === 'pool') {
                        allPoolQuestions = [...allPoolQuestions, ...folderQuestions];
                    } else if (folderData.type === 'fixed') {
                        allFixedQuestions = [...allFixedQuestions, ...folderQuestions];
                    }
                }));

                const shuffledPool = shuffleArray(allPoolQuestions);
                const selectedPoolQuestions = shuffledPool.slice(0, 20);
                const selectedFixedQuestions = allFixedQuestions.slice(0, 10);
                
                const combinedQuestions = [...selectedFixedQuestions, ...selectedPoolQuestions];
                const finalQuestions = shuffleArray(combinedQuestions);

                setQuestions(finalQuestions);
                setQuizStartTime(new Date());
            } catch (error) {
                console.error("Error fetching questions:", error);
                alert("Could not load the quiz questions. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        if (quizId) {
            fetchQuestions();
        }
    }, [quizId]);

    const handleSelectOption = (questionId, option) => {
        setAnswers(prev => ({ ...prev, [questionId]: option }));
    };
    
    const handleNext = () => {
        if (currentQuestionIndex < questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        }
    };
    
    const handlePrev = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    if (isLoading) {
        return <Loading text="Preparing your quiz..." />;
    }
    
    if (!questions.length) {
        return <div className="text-center"><h2>No questions are available for this quiz at the moment.</h2></div>;
    }

    const currentQuestion = questions[currentQuestionIndex];

    return (
        <div>
            {showSuccessModal && (
                <Modal onClose={() => onFinishRef.current()} title="Submission Successful">
                    <p>Your quiz has been submitted successfully.</p>
                    <button className="btn btn-primary" onClick={() => onFinishRef.current()}>
                        OK
                    </button>
                </Modal>
            )}

            {showWarningModal && (
                <Modal onClose={() => setShowWarningModal(false)} title="Warning">
                    <p>{warningMessage}</p>
                    <button className="btn btn-warning" onClick={() => setShowWarningModal(false)}>
                        I Understand
                    </button>
                </Modal>
            )}

            <Timer duration={15 * 60} onTimeUp={handleSubmitQuiz} />
            <div className="card my-4">
                <div className="card-header d-flex justify-content-between">
                    <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
                </div>
                <div className="card-body p-4">
                    <h4 className="card-title mb-5 text-center" style={{minHeight: '60px'}}>{currentQuestion.text}</h4>
                    
                    <div className="d-flex justify-content-center">
                        <div className="row g-3" style={{ maxWidth: '600px' }}>
                            {currentQuestion.options.map((option, i) => (
                                <div key={i} className="col-6">
                                    <button 
                                        className={`btn w-100 p-3 d-flex align-items-center justify-content-center ${answers[currentQuestion.id] === option ? 'btn-primary' : 'btn-outline-primary'}`}
                                        onClick={() => handleSelectOption(currentQuestion.id, option)}
                                        style={{
                                            whiteSpace: 'normal', 
                                            lineHeight: '1.3',
                                            minHeight: '90px'
                                        }}
                                    >
                                        {option}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="mb-4">
                <div className="d-flex justify-content-between">
                    <button className="btn btn-secondary" onClick={handlePrev} disabled={currentQuestionIndex === 0}>&larr; Previous</button>
                    <button className="btn btn-primary" onClick={handleNext} disabled={currentQuestionIndex === questions.length - 1}>Next &rarr;</button>
                </div>
                <div className="text-center mt-3">
                    <button className="btn btn-danger btn-lg" onClick={() => {
                        if (window.confirm("Are you sure you want to submit the quiz? You cannot make changes after this.")) {
                            handleSubmitQuiz();
                        }
                    }}>Submit Quiz</button>
                </div>
            </div>

            <QuestionGrid 
                questions={questions}
                answers={answers}
                currentIndex={currentQuestionIndex}
                onSelectQuestion={setCurrentQuestionIndex}
            />
        </div>
    );
}
