import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { query, collection, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function CandidateLogin({ quizId, onLoginSuccess }) {
    const [phone, setPhone] = useState('');
    const [dob, setDob] = useState('');
    const [error, setError] = useState('');
    const [quiz, setQuiz] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const fetchQuizInfo = async () => {
            if (quizId) {
                const quizDoc = await getDoc(doc(db, 'quizzes', quizId));
                if (quizDoc.exists()) {
                    setQuiz(quizDoc.data());
                } else {
                    setError('This quiz does not exist. Please check the link.');
                }
            }
        };
        fetchQuizInfo();
    }, [quizId]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!quiz) {
            setError('Quiz information is still loading. Please try again in a moment.');
            setIsLoading(false);
            return;
        }

        // --- Quiz Status & Schedule Check ---
        const now = new Date();
        if (quiz.status === 'pending') {
            setError('The quiz has not been started yet.');
            setIsLoading(false);
            return;
        }
        if (quiz.status === 'ended') {
            setError('This quiz has ended.');
            setIsLoading(false);
            return;
        }
        if (quiz.status === 'scheduled') {
            if (now < quiz.startTime.toDate()) {
                setError(`This quiz is scheduled to start on ${quiz.startTime.toDate().toLocaleString()}.`);
                setIsLoading(false);
                return;
            }
            if (now > quiz.endTime.toDate()) {
                setError('This quiz has ended.');
                setIsLoading(false);
                return;
            }
        }
        
        try {
            const candidatesRef = collection(db, 'quizzes', quizId, 'candidates');
            const q = query(candidatesRef, where("mobile", "==", phone.trim()));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) throw new Error('This mobile number is not registered for this quiz.');
            
            const candidateDoc = querySnapshot.docs[0];
            if (candidateDoc.data().dob !== dob) throw new Error('The date of birth is incorrect.');

            const resultDoc = await getDoc(doc(db, 'quizzes', quizId, 'results', candidateDoc.id));
            if (resultDoc.exists()) throw new Error('You have already attended this quiz.');

            onLoginSuccess(candidateDoc.id);
        } catch (err) {
            setError(err.message);
        }
        setIsLoading(false);
    };

    return (
        <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6 col-xl-5">
                <div className="card mt-5">
                    <div className="card-body p-4 p-sm-5">
                        <div className="text-center">
                            <h3 className="mb-1">Candidate Login</h3>
                            <p className="text-muted mb-4">Welcome to the {quiz ? quiz.name : 'Quiz'}</p>
                        </div>
                        <form onSubmit={handleLogin}>
                            <div className="mb-3"><label className="form-label">10-digit mobile number</label><input type="tel" className="form-control" value={phone} onChange={e => setPhone(e.target.value)} required disabled={isLoading} /></div>
                            <div className="mb-4"><label className="form-label">Date of Birth</label><input type="date" className="form-control" value={dob} onChange={e => setDob(e.target.value)} required disabled={isLoading} /></div>
                            {error && <div className="alert alert-danger">{error}</div>}
                            <div className="d-grid"><button type="submit" className="btn btn-primary btn-lg" disabled={isLoading}>{isLoading ? 'Logging In...' : 'Login & Start Quiz'}</button></div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
