import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const CandidateLogin = ({ quizId, onLoginSuccess }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [quiz, setQuiz] = useState(null);
    const [quizLoading, setQuizLoading] = useState(true);

    const [candidateData, setCandidateData] = useState(null);
    const [pageState, setPageState] = useState('login'); // 'login' or 'welcome'

    useEffect(() => {
        const fetchQuizDetails = async () => {
            if (!quizId) {
                setError('Invalid quiz link.');
                setQuizLoading(false);
                return;
            }
            setQuizLoading(true);
            try {
                const quizRef = doc(db, 'quizzes', quizId);
                const quizSnap = await getDoc(quizRef);
                if (quizSnap.exists()) {
                    setQuiz({ id: quizSnap.id, ...quizSnap.data() });
                } else {
                    setError('This quiz does not exist.');
                }
            } catch (err) {
                setError('Could not load quiz details. Please check the link.');
            } finally {
                setQuizLoading(false);
            }
        };
        fetchQuizDetails();
    }, [quizId]);


    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (!quiz) {
            setError('Quiz details are not loaded yet. Please wait a moment.');
            setLoading(false);
            return;
        }
        
        const now = new Date();
        const startTime = quiz.startTime ? new Date(quiz.startTime) : null;
        const endTime = quiz.endTime ? new Date(quiz.endTime) : null;
        let isQuizActive = quiz.status === 'active';

        if (startTime && endTime) {
            if (now >= startTime && now <= endTime) {
                isQuizActive = true;
            } else {
                setError('The quiz is not active at this time.');
                setLoading(false);
                return;
            }
        }

        if (!isQuizActive) {
            setError('The quiz is not currently active. Please contact the administrator.');
            setLoading(false);
            return;
        }

        try {
            const candidatesRef = collection(db, 'quizzes', quizId, 'candidates');
            const q = query(candidatesRef, where("phone", "==", phone));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                setError("This phone number is not registered for this quiz.");
                setLoading(false);
                return;
            }

            let candidateFound = null;
            querySnapshot.forEach(doc => {
                if (doc.data().password === password) {
                    candidateFound = { id: doc.id, ...doc.data() };
                }
            });

            if (candidateFound) {
                 const resultRef = doc(db, 'quizzes', quizId, 'results', candidateFound.phone);
                 const resultSnap = await getDoc(resultRef);

                 if (resultSnap.exists()) {
                     setError("You have already submitted this quiz.");
                     setLoading(false);
                     return;
                 }
                
                // --- THIS IS THE FIX ---
                // Save the server timestamp as the official start time.
                const candidateDocRef = doc(db, 'quizzes', quizId, 'candidates', candidateFound.id);
                await updateDoc(candidateDocRef, { 
                    status: 'attending',
                    startTime: serverTimestamp() // Use the server's clock
                });
                
                setCandidateData(candidateFound);
                setPageState('welcome');
            } else {
                setError("Incorrect password.");
            }
        } catch (err) {
            console.error("Login error:", err);
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    const handleStartQuiz = () => {
        // We no longer need to pass the start time from here.
        // The Quiz component will fetch the server-set startTime from the candidate data.
        onLoginSuccess(candidateData);
    };

    if (quizLoading) {
        return <div className="loading-container">Loading Quiz...</div>;
    }

    if (pageState === 'welcome') {
        return (
            <div className="login-container">
                <div className="login-card p-4" style={{maxWidth: '600px'}}>
                    <h2 className="text-center">Welcome, {candidateData.name}!</h2>
                    <p className="text-center text-muted">Please confirm your details below.</p>
                    <div className="candidate-details my-4 p-3 bg-light rounded">
                        <p><strong>Place:</strong> {candidateData.place}</p>
                        <p><strong>Phone Number:</strong> {candidateData.phone}</p>
                    </div>
                    <hr />
                    <h4 className="text-center">Quiz Guidelines</h4>
                    <ul className="guidelines">
                        <li>The quiz duration is <strong>{quiz.duration} minutes</strong>.</li>
                        <li>Do not switch tabs or windows. Doing so twice will automatically submit your quiz.</li>
                        <li>Copying, pasting, and right-clicking are disabled.</li>
                        <li>Ensure you have a stable internet connection.</li>
                        <li>Click "Start Quiz" when you are ready to begin. The timer will start immediately.</li>
                    </ul>
                    <button onClick={handleStartQuiz} className="btn btn-success btn-lg w-100 mt-3">
                        Start Quiz
                    </button>
                </div>
            </div>
        );
    }
    
    return (
        <div className="login-container">
            <div className="login-card">
                <h2 className="text-center">Candidate Login</h2>
                <p className="text-center text-muted mb-4">{quiz?.name || 'Welcome to the Test'}</p>
                <form onSubmit={handleLogin}>
                    <div className="mb-3">
                        <label className="form-label">Phone Number</label>
                        <input
                            type="text"
                            className="form-control"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    <div className="mb-4">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                    </div>
                    {error && <div className="alert alert-danger">{error}</div>}
                    <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                        {loading ? 'Logging in...' : 'Login & Start Quiz'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CandidateLogin;

