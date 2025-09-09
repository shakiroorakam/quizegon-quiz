import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { read, utils } from 'xlsx';

const AddQuestionModal = ({ quiz, folder, questionToEdit, onClose }) => {
    const [questionText, setQuestionText] = useState('');
    const [options, setOptions] = useState(['', '', '', '']);
    const [correctAnswer, setCorrectAnswer] = useState('');
    const [answerParameters, setAnswerParameters] = useState('');
    const [score, setScore] = useState(1);
    const [isPriority, setIsPriority] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (questionToEdit) {
            setQuestionText(questionToEdit.questionText);
            setScore(questionToEdit.score || 1);
            setIsPriority(questionToEdit.isPriority || false);
            if (quiz.type === 'Multiple Choice') {
                setOptions(questionToEdit.options || ['', '', '', '']);
                setCorrectAnswer(questionToEdit.correctAnswer || '');
            } else {
                setAnswerParameters(questionToEdit.answerParameters || '');
            }
        } else {
            resetForm();
        }
    }, [questionToEdit, quiz.type]);

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const resetForm = () => {
        setQuestionText('');
        setOptions(['', '', '', '']);
        setCorrectAnswer('');
        setAnswerParameters('');
        setScore(1);
        setIsPriority(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const questionData = {
            questionText,
            score: Number(score),
            isPriority,
            ...(quiz.type === 'Multiple Choice'
                ? { options, correctAnswer }
                : { answerParameters }
            ),
        };

        if (!questionText.trim()) {
            alert('Question text cannot be empty.');
            return;
        }

        try {
            const questionsRef = collection(db, 'quizzes', quiz.id, 'folders', folder.id, 'questions');
            if (questionToEdit) {
                const questionDocRef = doc(db, 'quizzes', quiz.id, 'folders', folder.id, 'questions', questionToEdit.id);
                await updateDoc(questionDocRef, questionData);
            } else {
                await addDoc(questionsRef, questionData);
            }
            resetForm();
            onClose();
        } catch (error) {
            console.error("Error saving question: ", error);
            alert('Failed to save question.');
        }
    };

    const handleFileImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = utils.sheet_to_json(worksheet);

            if (json.length === 0) {
                throw new Error("The Excel file is empty.");
            }
            
            const questionsRef = collection(db, 'quizzes', quiz.id, 'folders', folder.id, 'questions');
            for (const row of json) {
                const questionData = {
                    questionText: row['Question'],
                    score: Number(row['Score']) || 1,
                    isPriority: row['IsPriority'] === true || String(row['IsPriority']).toLowerCase() === 'true',
                    ...(quiz.type === 'Multiple Choice'
                        ? {
                            options: [row['Choice1'], row['Choice2'], row['Choice3'], row['Choice4']],
                            correctAnswer: row['CorrectAnswer'],
                        }
                        : {
                            answerParameters: row['AnswerParameters']
                        }
                    ),
                };
                if (questionData.questionText) {
                    await addDoc(questionsRef, questionData);
                }
            }
            alert(`${json.length} questions imported successfully!`);
            onClose();
        } catch (error) {
            console.error("Error importing questions:", error);
            alert(`An error occurred during import: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    };


    return (
        <div className="modal show" style={{ display: 'block' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">{questionToEdit ? 'Edit Question' : 'Add New Question'}</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <ul className="nav nav-tabs mb-3">
                            <li className="nav-item"><button className="nav-link active" data-bs-toggle="tab" data-bs-target="#manual">Manual Entry</button></li>
                            <li className="nav-item"><button className="nav-link" data-bs-toggle="tab" data-bs-target="#excel">Import from Excel</button></li>
                        </ul>
                        <div className="tab-content">
                            <div className="tab-pane fade show active" id="manual">
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label className="form-label">Question Text</label>
                                        <textarea className="form-control multilingual-text" rows="3" value={questionText} onChange={(e) => setQuestionText(e.target.value)} required></textarea>
                                    </div>
                                    
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label">Score (Points)</label>
                                            <input type="number" className="form-control" value={score} onChange={(e) => setScore(e.target.value)} min="1" required />
                                        </div>
                                        <div className="col-md-6 mb-3 d-flex align-items-center">
                                            <div className="form-check form-switch mt-4">
                                                <input className="form-check-input" type="checkbox" role="switch" id="isPriorityCheck" checked={isPriority} onChange={(e) => setIsPriority(e.target.checked)} />
                                                <label className="form-check-label" htmlFor="isPriorityCheck">High Priority Question</label>
                                            </div>
                                        </div>
                                    </div>

                                    {quiz.type === 'Multiple Choice' ? (
                                        <div>
                                            {options.map((opt, index) => (
                                                <div className="mb-3" key={index}><label className="form-label">Option {index + 1}</label><input type="text" className="form-control multilingual-text" value={opt} onChange={(e) => handleOptionChange(index, e.target.value)} required /></div>
                                            ))}
                                            <div className="mb-3"><label className="form-label">Correct Answer</label><input type="text" className="form-control multilingual-text" value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)} required /></div>
                                        </div>
                                    ) : (
                                        <div className="mb-3">
                                            <label className="form-label">Answer Keywords (for auto-scoring)</label>
                                            <input type="text" className="form-control" value={answerParameters} onChange={(e) => setAnswerParameters(e.target.value)} required />
                                            <small className="form-text text-muted">Enter essential keywords separated by commas. The answer must contain ALL keywords to be marked correct.</small>
                                        </div>
                                    )}

                                    <div className="modal-footer px-0 pb-0">
                                        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                                        <button type="submit" className="btn btn-primary">{questionToEdit ? 'Save Changes' : 'Add Question'}</button>
                                    </div>
                                </form>
                            </div>
                            <div className="tab-pane fade" id="excel">
                                <p>Upload an Excel file (.xlsx) with the required columns. Columns are case-sensitive.</p>
                                {quiz.type === 'Multiple Choice' ? (
                                    <small className="d-block mb-3">Required: <strong>Question, Choice1, Choice2, Choice3, Choice4, CorrectAnswer</strong><br/>Optional: <strong>Score, IsPriority</strong> (enter TRUE for priority)</small>
                                ) : (
                                    <small className="d-block mb-3">Required: <strong>Question, AnswerParameters</strong><br/>Optional: <strong>Score, IsPriority</strong> (enter TRUE for priority)</small>
                                )}
                                
                                <input className="form-control" type="file" accept=".xlsx" onChange={handleFileImport} disabled={isUploading} />
                                {isUploading && <div className="mt-2">Processing file...</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddQuestionModal;

