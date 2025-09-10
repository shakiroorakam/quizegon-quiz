import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const ViewAnswersModal = ({ quiz, result, onClose }) => {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isUpdating, setIsUpdating] = useState(false);
    const [manualScores, setManualScores] = useState({});

    useEffect(() => {
        const fetchAllQuestions = async () => {
            if (!quiz?.id || !result) return;
            setLoading(true);
            try {
                const foldersRef = collection(db, 'quizzes', quiz.id, 'folders');
                const foldersSnap = await getDocs(foldersRef);
                
                let allQuestions = [];
                for (const folderDoc of foldersSnap.docs) {
                    const questionsRef = collection(db, 'quizzes', quiz.id, 'folders', folderDoc.id, 'questions');
                    const questionsSnap = await getDocs(questionsRef);
                    const folderQuestions = questionsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                    allQuestions = [...allQuestions, ...folderQuestions];
                }
                setQuestions(allQuestions);
            } catch (error) {
                console.error("Error fetching questions for answer sheet:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllQuestions();
        if(result.overriddenScores) {
            setManualScores(result.overriddenScores);
        }
    }, [quiz, result]);

    const getQuestionById = (id) => questions.find(q => q.id === id);

    // --- THIS IS THE FIX ---
    const checkDescriptiveAnswer = (submittedAnswer, keywordsString) => {
        if (!submittedAnswer || !keywordsString) return false;
        // Ensure keywordsString is treated as a string before splitting
        const keywords = String(keywordsString).split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
        const candidateAnswer = submittedAnswer.toLowerCase();
        return keywords.length > 0 && keywords.every(keyword => candidateAnswer.includes(keyword));
    };

    const handleScoreOverride = async (questionId) => {
        setIsUpdating(true);
        try {
            const newOverrides = { ...result.overriddenScores, [questionId]: manualScores[questionId] };
            
            let newTotalScore = 0;
            const allQuestionsMap = new Map(questions.map(q => [q.id, q]));

            Object.entries(result.answers).forEach(([qId, submittedAnswer]) => {
                const question = allQuestionsMap.get(qId);
                if (!question) return;

                const maxScore = question.score || 1;
                
                if (newOverrides.hasOwnProperty(qId)) {
                    newTotalScore += newOverrides[qId];
                } else {
                    let isCorrect = false;
                    if (quiz.type === 'Multiple Choice') {
                        isCorrect = submittedAnswer === question.correctAnswer;
                    } else {
                        isCorrect = checkDescriptiveAnswer(submittedAnswer, question.answerParameters);
                    }
                    if(isCorrect) newTotalScore += maxScore;
                }
            });

            const resultRef = doc(db, 'quizzes', quiz.id, 'results', result.id);
            await updateDoc(resultRef, {
                score: newTotalScore,
                overriddenScores: newOverrides
            });

        } catch (error) {
            alert("Failed to update score.");
        } finally {
            setIsUpdating(false);
        }
    };
    
    const handleManualScoreChange = (questionId, value) => {
        const question = getQuestionById(questionId);
        const maxScore = question.score || 1;
        const newScore = Math.max(0, Math.min(maxScore, Number(value)));
        setManualScores(prev => ({...prev, [questionId]: newScore}));
    };

    return (
        <div className="modal show" style={{ display: 'block' }}>
            <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Answer Sheet</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        {loading ? <p>Loading...</p> : (
                            Object.entries(result.answers).map(([questionId, submittedAnswer]) => {
                                const question = getQuestionById(questionId);
                                if (!question) return null;

                                const hasOverride = result.overriddenScores && result.overriddenScores.hasOwnProperty(questionId);
                                let isCorrect;
                                if (hasOverride) {
                                    isCorrect = result.overriddenScores[questionId] > 0;
                                } else {
                                    isCorrect = quiz.type === 'Multiple Choice'
                                        ? submittedAnswer === question.correctAnswer
                                        : checkDescriptiveAnswer(submittedAnswer, question.answerParameters);
                                }
                                
                                const awardedScore = hasOverride ? result.overriddenScores[questionId] : (isCorrect ? (question.score || 1) : 0);

                                return (
                                    <div key={questionId} className={`mb-4 p-3 border rounded ${awardedScore > 0 ? 'border-success' : 'border-danger'}`}>
                                        <div className="d-flex justify-content-between">
                                            <p className="fw-bold multilingual-text" style={{ whiteSpace: 'pre-wrap' }}>{question.questionText}</p>
                                            <span className="badge bg-info">{question.score || 1} Points</span>
                                        </div>
                                        
                                        {quiz.type === 'Descriptive' ? (
                                            <div>
                                                <p className="fw-bold">Candidate's Answer:</p>
                                                <p className="multilingual-text" style={{ whiteSpace: 'pre-wrap' }}>{submittedAnswer}</p>
                                                <hr/>
                                                <div className="d-flex align-items-center">
                                                    <label className="me-2">Score:</label>
                                                    <input 
                                                        type="number" 
                                                        className="form-control me-2" 
                                                        style={{width: '80px'}} 
                                                        value={manualScores[questionId] ?? awardedScore}
                                                        onChange={(e) => handleManualScoreChange(questionId, e.target.value)}
                                                        max={question.score || 1}
                                                        min="0"
                                                    />
                                                    <span>/ {question.score || 1}</span>
                                                    <button 
                                                        className="btn btn-sm btn-primary ms-3" 
                                                        onClick={() => handleScoreOverride(questionId)}
                                                        disabled={isUpdating}
                                                    >
                                                        {isUpdating ? 'Saving...' : 'Save Score'}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                             <div>
                                                <p>
                                                    Candidate's Answer: <span className={`fw-bold multilingual-text ${isCorrect ? 'text-success' : 'text-danger'}`}>{submittedAnswer}</span>
                                                    {isCorrect ? <span className="ms-2 badge bg-success">Correct</span> : <span className="ms-2 badge bg-danger">Incorrect</span>}
                                                </p>
                                                {!isCorrect && <p>Correct Answer: <span className="text-success fw-bold multilingual-text">{question.correctAnswer}</span></p>}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ViewAnswersModal;
