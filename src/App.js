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
        const path = window.location.pathname.split('/');
        if (path[1] === 'quiz' && path[2]) {
            setQuizId(path[2]);
            setPage('candidateLogin');
        } else {
            setPage('adminLogin');
        }

        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser && currentUser.email === 'quizegon2025@gmail.com') {
                setAdminUser(currentUser);
                setPage('adminDashboard');
            } else {
                setAdminUser(null);
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
            window.location.href = '/';
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
