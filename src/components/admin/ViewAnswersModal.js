import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import Modal from '../common/Modal';

export default function ViewAnswersModal({ quizId, result, onClose }) {
    const [questions, setQuestions] = useState(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAllQuestions = async () => {
            if (!quizId) return;
            try {
                const foldersRef = collection(db, 'quizzes', quizId, 'questionFolders');
                const foldersSnapshot = await getDocs(foldersRef);

                let allQuestionsData = [];
                await Promise.all(foldersSnapshot.docs.map(async (folderDoc) => {
                    const questionsRef = collection(db, 'quizzes', quizId, 'questionFolders', folderDoc.id, 'questions');
                    const questionsSnapshot = await getDocs(questionsRef);
                    const folderQuestions = questionsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                    allQuestionsData = [...allQuestionsData, ...folderQuestions];
                }));
                
                const questionsMap = new Map(allQuestionsData.map(q => [q.id, q]));
                setQuestions(questionsMap);

            } catch (error) {
                console.error("Error fetching questions for answer sheet:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAllQuestions();
    }, [quizId]);

    const getQuestionData = (questionId) => {
        return questions.get(questionId) || { text: 'Question not found', answer: 'N/A' };
    };

    return (
        <Modal onClose={onClose} title={`Answer Sheet for ${result.candidateName}`}>
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                {isLoading ? (
                    <div className="d-flex justify-content-center align-items-center p-5">
                        <div className="spinner-border" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                ) : (
                    <div className="list-group">
                        {Object.entries(result.answers).map(([questionId, submittedAnswer], index) => {
                            const { text, answer: correctAnswer } = getQuestionData(questionId);
                            const isCorrect = submittedAnswer === correctAnswer;

                            return (
                                <div key={questionId} className={`list-group-item list-group-item-action flex-column align-items-start p-3 mb-2 border rounded ${isCorrect ? 'bg-success-subtle' : 'bg-danger-subtle'}`}>
                                    <div className="d-flex w-100 justify-content-between">
                                        <h6 className="mb-1">Question {index + 1}</h6>
                                        {isCorrect ? (
                                            <span className="text-success">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-check-circle-fill" viewBox="0 0 16 16">
                                                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                                                </svg>
                                            </span>
                                        ) : (
                                            <span className="text-danger">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="bi bi-x-circle-fill" viewBox="0 0 16 16">
                                                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zM5.354 4.646a.5.5 0 1 0-.708.708L7.293 8l-2.647 2.646a.5.5 0 0 0 .708.708L8 8.707l2.646 2.647a.5.5 0 0 0 .708-.708L8.707 8l2.647-2.646a.5.5 0 0 0-.708-.708L8 7.293 5.354 4.646z"/>
                                                </svg>
                                            </span>
                                        )}
                                    </div>
                                    <p className="mb-2"><strong>{text}</strong></p>
                                    <small className="d-block mb-1"><strong>Your Answer:</strong> <span className={isCorrect ? 'text-success-emphasis' : 'text-danger-emphasis'}>{submittedAnswer || 'Not Answered'}</span></small>
                                    {!isCorrect && (
                                        <small className="d-block text-success-emphasis"><strong>Correct Answer:</strong> {correctAnswer}</small>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </Modal>
    );
}
