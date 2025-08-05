import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import AddQuestionModal from './AddQuestionModal';

export default function QuestionManagement({ quizId, folder, onBack }) {
    const [questions, setQuestions] = useState([]);
    const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
    const [questionSearch, setQuestionSearch] = useState('');

    // --- FIX: Hooks are now called unconditionally at the top of the component ---
    useEffect(() => {
        // The logic is moved inside the useEffect hook.
        // It will only proceed to create a listener if a valid folder is provided.
        if (!quizId || !folder || !folder.id) {
            setQuestions([]); // Ensure questions are cleared if the folder is invalid
            return;
        }

        const questionsCollectionRef = collection(db, 'quizzes', quizId, 'questionFolders', folder.id, 'questions');
        const unsubscribe = onSnapshot(questionsCollectionRef, (snapshot) => {
            setQuestions(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // The cleanup function will run when the component unmounts or dependencies change.
        return () => unsubscribe();
    }, [quizId, folder]); // Dependency array now correctly watches the folder object.

    const filteredQuestions = questions.filter(q => 
        q.text.toLowerCase().includes(questionSearch.toLowerCase())
    );

    // --- FIX: The early return now happens AFTER all hooks have been called. ---
    if (!folder || !folder.id) {
        // This prevents rendering the component with incomplete data.
        return null; 
    }
    
    const handleDelete = async (questionId) => {
        const questionDocRef = doc(db, 'quizzes', quizId, 'questionFolders', folder.id, 'questions', questionId);
        await deleteDoc(questionDocRef);
    };

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <div>
                    <button className="btn btn-sm btn-outline-secondary me-3" onClick={onBack}>
                        &larr; Back to Folders
                    </button>
                    <h5 className="d-inline-block mb-0">Questions in "{folder.name}" ({filteredQuestions.length})</h5>
                </div>
                <button className="btn btn-primary" onClick={() => setShowAddQuestionModal(true)}>
                    + Add Questions
                </button>
            </div>
            
            <div className="p-3 border-bottom">
                <input 
                    type="text" 
                    className="form-control" 
                    placeholder="Search questions..."
                    value={questionSearch}
                    onChange={e => setQuestionSearch(e.target.value)}
                />
            </div>

            <div className="card-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                {filteredQuestions.map(q => (
                    <div key={q.id} className="border p-2 mb-2 rounded bg-light">
                        <p className="mb-1"><strong>Q:</strong> {q.text}</p>
                        <small><strong>Ans:</strong> {q.answer}</small>
                        <div className="mt-1">
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(q.id)}>Delete</button>
                        </div>
                    </div>
                ))}
                {filteredQuestions.length === 0 && <p className="text-center text-muted mt-3">No questions found.</p>}
            </div>

            {showAddQuestionModal && (
                <AddQuestionModal 
                    quizId={quizId} 
                    folder={folder} 
                    onClose={() => setShowAddQuestionModal(false)} 
                />
            )}
        </div>
    );
}
