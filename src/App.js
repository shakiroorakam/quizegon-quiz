import React, { useState, useEffect } from 'react';
import { auth } from './firebase/config';
import { onAuthStateChanged } from 'firebase/auth';

import AdminDashboard from './pages/AdminDashboard';
import AdminLogin from './pages/AdminLogin';
import CandidateLogin from './pages/CandidateLogin';
import Quiz from './pages/Quiz';
import './index.css';

function App() {
    const [page, setPage] = useState('loading'); // loading | adminLogin | adminDashboard | candidateLogin | quiz
    const [user, setUser] = useState(undefined); // undefined: auth state unknown, null: logged out, object: logged in
    const [quizId, setQuizId] = useState(null);
    const [candidate, setCandidate] = useState(null);

    // Effect 1: Simply listen to Firebase Auth and keep the user state in sync.
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    // Effect 2: React to changes in the user's auth state to decide which page to show.
    useEffect(() => {
        if (user === undefined) {
            // Still waiting for the initial auth check from Firebase.
            setPage('loading');
            return;
        }

        if (user) {
            // If there is a user object, they are an admin. Always go to the dashboard.
            setPage('adminDashboard');
        } else {
            // If user is null (logged out), then we check the URL to see if it's a candidate link.
            const path = window.location.hash.slice(1); // e.g., /quiz/someid
            const pathSegments = path.split('/');
            
            if (pathSegments[1] === 'quiz' && pathSegments[2]) {
                setQuizId(pathSegments[2]);
                setPage('candidateLogin');
            } else {
                // If it's not a candidate link and the user is logged out, show the admin login.
                setPage('adminLogin');
            }
        }
    }, [user]); // This effect re-runs whenever the user logs in or out.

    const renderPage = () => {
        switch (page) {
            case 'adminDashboard':
                return <AdminDashboard />;
            case 'candidateLogin':
                return <CandidateLogin quizId={quizId} onLoginSuccess={(loggedInCandidate) => {
                    setCandidate(loggedInCandidate);
                    setPage('quiz');
                }} />;
            case 'quiz':
                return <Quiz quizId={quizId} candidate={candidate} onQuizComplete={() => {
                    // After quiz, reset state and go back to a clean login page
                    setCandidate(null);
                    window.location.hash = `#/quiz/${quizId}`; // Reset hash
                    setPage('candidateLogin');
                }} />;
            case 'adminLogin':
                return <AdminLogin />;
            case 'loading':
            default:
                return <div className="loading-container">Loading Application...</div>;
        }
    };

    return (
        <div className="app-container">
            {renderPage()}
        </div>
    );
}

export default App;
