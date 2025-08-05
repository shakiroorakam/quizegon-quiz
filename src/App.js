import React, { useState, useEffect } from 'react';
import { auth } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import CandidateLogin from './pages/CandidateLogin';
import Quiz from './pages/Quiz';
import Loading from './components/common/Loading';
import NotFound from './pages/NotFound';

export default function App() {
    const [adminUser, setAdminUser] = useState(null);
    const [loggedInCandidateId, setLoggedInCandidateId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [page, setPage] = useState('loading');
    const [quizId, setQuizId] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            // This logic now correctly determines the page after checking auth state.
            if (currentUser && currentUser.email === 'quizegon2025@gmail.com') {
                // If an admin is logged in, always show the dashboard.
                setAdminUser(currentUser);
                setPage('adminDashboard');
            } else {
                // If no admin is logged in, determine the page based on the URL.
                setAdminUser(null);
                const path = window.location.pathname.replace(process.env.PUBLIC_URL, '');
                const pathSegments = path.split('/');

                if (pathSegments[1] === 'quiz' && pathSegments[2]) {
                    setQuizId(pathSegments[2]);
                    setPage('candidateLogin');
                } else {
                    setPage('adminLogin');
                }
            }
            setIsAuthReady(true);
        });

        return () => unsubscribe();
    }, []);

    const handleCandidateLoginSuccess = (candidateId) => {
        setLoggedInCandidateId(candidateId);
        setPage('quiz');
    };

    const handleLogout = async () => {
        if (adminUser) {
            await signOut(auth);
            setAdminUser(null);
            window.location.href = process.env.PUBLIC_URL || '/';
        } else if (loggedInCandidateId) {
            setLoggedInCandidateId(null);
            window.location.reload();
        }
    };

    const handleQuizFinish = () => {
        setLoggedInCandidateId(null);
        setPage('candidateLogin');
        window.location.reload();
    };

    const renderPage = () => {
        if (!isAuthReady) return <Loading />;

        if (page === 'adminLogin') return adminUser ? <AdminDashboard /> : <AdminLogin />;
        if (page === 'adminDashboard') return adminUser ? <AdminDashboard /> : <AdminLogin />;

        if (page === 'candidateLogin') return <CandidateLogin quizId={quizId} onLoginSuccess={handleCandidateLoginSuccess} />;
        if (page === 'quiz') return loggedInCandidateId ? <Quiz quizId={quizId} candidateId={loggedInCandidateId} onFinish={handleQuizFinish} /> : <CandidateLogin quizId={quizId} onLoginSuccess={handleCandidateLoginSuccess} />;
        
        return <NotFound />;
    };

    return (
        <div>
            <nav className="navbar navbar-dark bg-dark sticky-top">
                <div className="container">
                    <span className="navbar-brand mb-0 h1">Quizegon</span>
                    {(adminUser || loggedInCandidateId) && <button className="btn btn-sm btn-outline-secondary" onClick={handleLogout}>Logout</button>}
                </div>
            </nav>
            <main className="app-container">
                {renderPage()}
            </main>
        </div>
    );
}
