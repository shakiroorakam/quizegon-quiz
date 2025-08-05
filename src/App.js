import React, {useState, useEffect } from 'react';
import { auth } from './firebase/config';
import { onAuthStateChanged, signOut } from 'firebase/auth';

import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import CandidateLogin from './pages/CandidateLogin';
import Quiz from './pages/Quiz';
import Loading from './components/common/Loading';
import NotFound from './pages/NotFound';

// --- New Hash-Based Routing Logic ---
const useHashNavigation = () => {
    const [route, setRoute] = useState({ page: 'loading', quizId: null, candidateId: null });

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#/', '');
            const pathSegments = hash.split('/');

            if (pathSegments[0] === 'quiz' && pathSegments[1]) {
                if (pathSegments[2] && pathSegments[2] === 'start' && pathSegments[3]) {
                    // This is a candidate who has successfully logged in and is starting the quiz
                    setRoute({ page: 'quiz', quizId: pathSegments[1], candidateId: pathSegments[3] });
                } else {
                    // This is the candidate login page for a specific quiz
                    setRoute({ page: 'candidateLogin', quizId: pathSegments[1], candidateId: null });
                }
            } else {
                // Default to admin login
                setRoute({ page: 'adminLogin', quizId: null, candidateId: null });
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        handleHashChange(); // Initial check

        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    return route;
};


export default function App() {
    const [adminUser, setAdminUser] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const route = useHashNavigation(); // Use the new routing hook

    useEffect(() => {
        // Auth listener now only manages the admin's login state
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser && currentUser.email === 'quizegon2025@gmail.com') {
                setAdminUser(currentUser);
            } else {
                setAdminUser(null);
            }
            setIsAuthReady(true);
        });
        return () => unsubscribe();
    }, []);

    const handleCandidateLoginSuccess = (candidateId) => {
        // Navigate to the quiz page by changing the hash
        window.location.hash = `#/quiz/${route.quizId}/start/${candidateId}`;
    };

    const handleLogout = async () => {
        if (adminUser) {
            await signOut(auth);
            setAdminUser(null);
            window.location.hash = '#/'; // Go to admin login
        } else {
            // For candidates, go back to their specific quiz login page
            window.location.hash = `#/quiz/${route.quizId}`;
        }
    };

    const handleQuizFinish = () => {
        // After finishing, go back to the quiz login page
        window.location.hash = `#/quiz/${route.quizId}`;
    };

    const renderPage = () => {
        if (!isAuthReady || route.page === 'loading') return <Loading />;

        // If an admin is logged in, always show the dashboard, regardless of the URL
        if (adminUser) return <AdminDashboard />;

        // Otherwise, render based on the hash route
        switch (route.page) {
            case 'adminLogin':
                return <AdminLogin />;
            case 'candidateLogin':
                return <CandidateLogin quizId={route.quizId} onLoginSuccess={handleCandidateLoginSuccess} />;
            case 'quiz':
                return <Quiz quizId={route.quizId} candidateId={route.candidateId} onFinish={handleQuizFinish} />;
            default:
                return <NotFound />;
        }
    };

    return (
        <div>
            <nav className="navbar navbar-dark bg-dark sticky-top">
                <div className="container">
                    <span className="navbar-brand mb-0 h1">Quizegon</span>
                    {(adminUser || route.page === 'quiz') && <button className="btn btn-sm btn-outline-secondary" onClick={handleLogout}>Logout</button>}
                </div>
            </nav>
            <main className="app-container">
                {renderPage()}
            </main>
        </div>
    );
}
