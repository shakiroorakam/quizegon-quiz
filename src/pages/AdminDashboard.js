import React, { useState, useEffect, useCallback } from 'react';
import { db, auth } from '../firebase/config';
import {
    collection, addDoc, onSnapshot, doc, getDoc, updateDoc,
    deleteDoc, writeBatch, serverTimestamp
} from 'firebase/firestore';
import AddCandidateModal from '../components/admin/AddCandidateModal';
import EditCandidateModal from '../components/admin/EditCandidateModal';
import QuestionManagement from '../components/admin/QuestionManagement';
import ViewAnswersModal from '../components/admin/ViewAnswersModal';
import { signOut } from 'firebase/auth';
import { utils, writeFile } from 'xlsx';

const defaultInstructions = `Welcome to the quiz. Please read the instructions carefully.

1.  The quiz duration is specified in your quiz settings. The timer will start as soon as you click "Start Quiz".
2.  Do not switch tabs or windows. Doing so twice will automatically submit your quiz.
3.  Copying, pasting, and right-clicking are disabled during the test.
4.  Ensure you have a stable internet connection.

Tie-Breaker Rules:
In the event of a tie in scores, the final rank will be determined by the following criteria in order:
1.  Highest score on "High Priority" questions.
2.  Fastest completion time.
3.  Highest number of questions answered.

All the best!`;


const AdminDashboard = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [isCreateModalOpen, setCreateModalOpen] = useState(false);
    
    // Create Modal State
    const [newQuizName, setNewQuizName] = useState('');
    const [newQuizDuration, setNewQuizDuration] = useState(15);
    const [newQuizType, setNewQuizType] = useState('Multiple Choice');
    const [includePool, setIncludePool] = useState(true);
    const [newPoolCount, setNewPoolCount] = useState(20);
    const [newFixedCount, setNewFixedCount] = useState(10);
    const [newAntiCheating, setNewAntiCheating] = useState(true);
    const [newQuizInstructions, setNewQuizInstructions] = useState(defaultInstructions);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [managementTab, setManagementTab] = useState('home');

    // Sub-component states
    const [candidates, setCandidates] = useState([]);
    const [results, setResults] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddCandidateModalOpen, setAddCandidateModalOpen] = useState(false);
    const [isEditCandidateModalOpen, setEditCandidateModalOpen] = useState(false);
    const [candidateToEdit, setCandidateToEdit] = useState(null);
    const [isViewAnswersModalOpen, setViewAnswersModalOpen] = useState(false);
    const [answersToView, setAnswersToView] = useState(null);
    const [homeStats, setHomeStats] = useState({ registered: 0, submissions: 0, attendance: 0 });
    const [isEditQuizModalOpen, setEditQuizModalOpen] = useState(false);
    const [quizToEdit, setQuizToEdit] = useState(null);
    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    // Fetch all quizzes
    useEffect(() => {
        setLoading(true);
        const unsubscribe = onSnapshot(collection(db, 'quizzes'), (snapshot) => {
            setQuizzes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (err) => {
            setError('Failed to load quizzes.');
        });
        return () => unsubscribe();
    }, []);
    
    // Real-time status checker for the selected quiz
    useEffect(() => {
        if (!selectedQuiz || !selectedQuiz.startTime || !selectedQuiz.endTime) return;
    
        const interval = setInterval(async () => {
            const now = new Date();
            const start = new Date(selectedQuiz.startTime);
            const end = new Date(selectedQuiz.endTime);
            const currentStatus = selectedQuiz.status;
            let newStatus = currentStatus;
    
            if (now >= start && now <= end) {
                if (currentStatus !== 'active') newStatus = 'active';
            } else if (now > end) {
                if (currentStatus === 'active') newStatus = 'inactive';
            }
    
            if (newStatus !== currentStatus) {
                const quizRef = doc(db, 'quizzes', selectedQuiz.id);
                await updateDoc(quizRef, { status: newStatus });
                setSelectedQuiz(prev => ({...prev, status: newStatus}));
            }
        }, 1000);
    
        return () => clearInterval(interval);
    }, [selectedQuiz]);


    // Fetch data for the selected quiz
    const fetchQuizData = useCallback((quizId) => {
        if (!quizId) return;
        const candidatesRef = collection(db, 'quizzes', quizId, 'candidates');
        const unsubscribeCandidates = onSnapshot(candidatesRef, (snapshot) => {
            setCandidates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        const resultsRef = collection(db, 'quizzes', quizId, 'results');
        const unsubscribeResults = onSnapshot(resultsRef, (snapshot) => {
            setResults(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => {
            unsubscribeCandidates();
            unsubscribeResults();
        };
    }, []);

    useEffect(() => {
        if (selectedQuiz) {
            const unsubscribe = fetchQuizData(selectedQuiz.id);
            return unsubscribe;
        }
    }, [selectedQuiz, fetchQuizData]);

    // Calculate home stats
    useEffect(() => {
        if (selectedQuiz) {
            const registered = candidates.length;
            const submissions = results.length;
            const attendance = registered > 0 ? ((submissions / registered) * 100).toFixed(1) : 0;
            setHomeStats({ registered, submissions, attendance });
            setStartTime(selectedQuiz.startTime || '');
            setEndTime(selectedQuiz.endTime || '');
        }
    }, [candidates, results, selectedQuiz]);

    const handleCreateQuiz = async () => {
        if (!newQuizName.trim() || !newQuizDuration || !newFixedCount || (includePool && !newPoolCount)) {
            alert('Please fill in all required quiz details.');
            return;
        }
        try {
            const docRef = await addDoc(collection(db, 'quizzes'), {
                name: newQuizName,
                duration: parseInt(newQuizDuration, 10),
                type: newQuizType,
                includePoolQuestions: includePool,
                poolQuestionsCount: includePool ? parseInt(newPoolCount, 10) : 0,
                fixedQuestionsCount: parseInt(newFixedCount, 10),
                antiCheatingEnabled: newAntiCheating,
                instructions: newQuizInstructions,
                createdAt: serverTimestamp(),
                status: 'inactive'
            });

            const batch = writeBatch(db);
            const poolFolderRef = doc(db, 'quizzes', docRef.id, 'folders', 'pool_questions');
            batch.set(poolFolderRef, { name: 'Pool Questions', createdAt: serverTimestamp() });
            const fixedFolderRef = doc(db, 'quizzes', docRef.id, 'folders', 'fixed_questions');
            batch.set(fixedFolderRef, { name: 'Fixed Questions', createdAt: serverTimestamp() });
            await batch.commit();

            setNewQuizName('');
            setNewQuizDuration(15);
            setNewQuizType('Multiple Choice');
            setIncludePool(true);
            setNewPoolCount(20);
            setNewFixedCount(10);
            setNewAntiCheating(true);
            setNewQuizInstructions(defaultInstructions);
            setCreateModalOpen(false);
        } catch (error) {
            alert('Failed to create quiz.');
        }
    };
    
    const openEditQuizModal = (quiz) => {
        setQuizToEdit({
            ...quiz,
            includePoolQuestions: quiz.includePoolQuestions !== false,
            poolQuestionsCount: quiz.poolQuestionsCount || 20,
            fixedQuestionsCount: quiz.fixedQuestionsCount || 10,
            antiCheatingEnabled: quiz.antiCheatingEnabled !== false,
            instructions: quiz.instructions || defaultInstructions
        });
        setEditQuizModalOpen(true);
    };

    const handleUpdateQuiz = async () => {
        if (!quizToEdit || !quizToEdit.name.trim() || !quizToEdit.duration) {
            alert('Please provide a valid name and duration.');
            return;
        }
        try {
            const quizRef = doc(db, 'quizzes', quizToEdit.id);
            await updateDoc(quizRef, {
                name: quizToEdit.name,
                duration: parseInt(quizToEdit.duration, 10),
                type: quizToEdit.type,
                includePoolQuestions: quizToEdit.includePoolQuestions,
                poolQuestionsCount: quizToEdit.includePoolQuestions ? parseInt(quizToEdit.poolQuestionsCount, 10) : 0,
                fixedQuestionsCount: parseInt(quizToEdit.fixedQuestionsCount, 10),
                antiCheatingEnabled: quizToEdit.antiCheatingEnabled,
                instructions: quizToEdit.instructions
            });
            setEditQuizModalOpen(false);
            setQuizToEdit(null);
        } catch (error) {
            alert('Failed to update quiz.');
        }
    };

    const handleDeleteQuiz = async (quizId) => {
        if (window.confirm('Are you sure you want to delete this quiz and all its data? This action cannot be undone.')) {
            await deleteDoc(doc(db, 'quizzes', quizId));
            if (selectedQuiz && selectedQuiz.id === quizId) {
                setSelectedQuiz(null);
            }
        }
    };
    
    const handleLogout = () => signOut(auth).catch((error) => console.error("Logout Error:", error));
    const getQuizLink = (id) => `${window.location.origin}${process.env.PUBLIC_URL}/#/quiz/${id}`;
    const copyToClipboard = (id) => navigator.clipboard.writeText(getQuizLink(id)).then(() => alert('Quiz link copied!'));
    
    const handleDeleteCandidate = async (candidate) => {
        if (window.confirm('Are you sure you want to delete this candidate?')) {
            try {
                await deleteDoc(doc(db, 'quizzes', selectedQuiz.id, 'candidates', candidate.id));
                if(candidate.phone) {
                    const resultRef = doc(db, 'quizzes', selectedQuiz.id, 'results', candidate.phone);
                    await deleteDoc(resultRef);
                }
            } catch (error) {
                alert("Failed to delete candidate.");
            }
        }
    };

    const filteredCandidates = candidates.filter(c => 
        c.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        c.phone?.includes(searchQuery) ||
        c.place?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getCandidateStatus = (candidate) => {
        const result = results.find(r => r.id === candidate.phone);
        if (result) return { text: "Attended", class: "bg-success" };
        if (candidate.status === 'attending') return { text: "Attending", class: "bg-primary" };
        return { text: "Not Attended", class: "bg-secondary" };
    };
    
    const sortedResults = [...results].sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const priorityA = a.priorityScore || 0;
        const priorityB = b.priorityScore || 0;
        if (priorityB !== priorityA) return priorityB - priorityA;
        const timeA = (a.submittedAt?.toDate() - a.startTime?.toDate()) || Infinity;
        const timeB = (b.submittedAt?.toDate() - b.startTime?.toDate()) || Infinity;
        if (timeA !== timeB) return timeA - timeB;
        const answeredA = a.answeredCount || 0;
        const answeredB = b.answeredCount || 0;
        if (answeredB !== answeredA) return answeredB - answeredA;
        return 0;
    });
    
    const handleDownloadResults = async () => {
        if (results.length === 0) {
            alert("No results to download.");
            return;
        }
        const dataToExport = await Promise.all(sortedResults.map(async (result, index) => {
            const candidateData = candidates.find(c => c.phone === result.id) || { name: 'N/A', place: 'N/A'};
            const startTime = result.startTime?.toDate();
            const submitTime = result.submittedAt?.toDate();
            let timeTaken = 'N/A';
            if (startTime && submitTime) {
                const diffMs = submitTime - startTime;
                const diffMins = Math.floor(diffMs / 60000);
                const diffSecs = Math.round((diffMs % 60000) / 1000);
                timeTaken = `${diffMins}m ${diffSecs}s`;
            }
            return {
                'Rank': index + 1,
                'Name': candidateData.name,
                'Place': candidateData.place,
                'Phone Number': result.id,
                'Score': `${result.score} / ${result.totalPossibleScore || result.totalQuestions}`,
                'Priority Score': result.priorityScore || 0,
                'Answered Count': `${result.answeredCount || 0} / ${result.totalQuestions}`,
                'Time Taken': timeTaken,
            };
        }));
        const worksheet = utils.json_to_sheet(dataToExport);
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, "Results");
        writeFile(workbook, `${selectedQuiz.name}_Results.xlsx`);
    };
    
    const handleManualToggleStatus = async () => {
        const newStatus = selectedQuiz.status === 'active' ? 'inactive' : 'active';
        try {
            await updateDoc(doc(db, 'quizzes', selectedQuiz.id), { 
                status: newStatus,
                startTime: null,
                endTime: null
            });
            setSelectedQuiz(prev => ({ ...prev, status: newStatus, startTime: null, endTime: null }));
        } catch (error) {
            alert("Failed to update quiz status.");
        }
    };

    const handleScheduleQuiz = async () => {
        if (!startTime || !endTime) {
            alert("Please set both a start and end time.");
            return;
        }
        try {
            await updateDoc(doc(db, 'quizzes', selectedQuiz.id), {
                startTime: startTime,
                endTime: endTime,
                status: 'inactive'
            });
            setSelectedQuiz(prev => ({ ...prev, startTime, endTime, status: 'inactive' }));
            alert("Quiz schedule updated successfully.");
        } catch (error) {
            alert("Failed to schedule quiz.");
        }
    };

    if (loading) return <div className="loading-container">Loading Dashboard...</div>;
    if (error) return <div className="error-container">{error}</div>;

    if (!selectedQuiz) {
        return (
            <>
                <header className="d-flex justify-content-between align-items-center p-3 px-4 border-bottom bg-white">
                    <h1 className="h4 m-0 fw-bold text-dark">Quizegon</h1>
                    <button onClick={handleLogout} className="btn btn-outline-secondary">Logout</button>
                </header>
                <main className="container-fluid p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="h3">Admin Dashboard</h2>
                        <button onClick={() => setCreateModalOpen(true)} className="btn btn-primary">+ Create New Quiz</button>
                    </div>
                    <div className="row g-4">
                        {quizzes.map(quiz => {
                            const totalQuestions = (quiz.includePoolQuestions ? (quiz.poolQuestionsCount || 0) : 0) + (quiz.fixedQuestionsCount || 0);
                            return (
                                <div key={quiz.id} className="col-md-6 col-lg-4">
                                    <div className="card h-100 shadow-sm">
                                        <div className="card-body d-flex flex-column">
                                            <div className="d-flex justify-content-between">
                                                <h5 className="card-title">{quiz.name}</h5>
                                                <div className="dropdown">
                                                    <button className="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown">&#8942;</button>
                                                    <ul className="dropdown-menu dropdown-menu-end">
                                                        <li><button className="dropdown-item" onClick={() => openEditQuizModal(quiz)}>Edit</button></li>
                                                        <li><button className="dropdown-item text-danger" onClick={() => handleDeleteQuiz(quiz.id)}>Delete</button></li>
                                                    </ul>
                                                </div>
                                            </div>
                                            {quiz.antiCheatingEnabled && (
                                                <span className="badge bg-warning text-dark mb-2 align-self-start">Anti-Cheating Enabled</span>
                                            )}
                                            <p className="card-subtitle mb-2 text-muted small">Total Questions: {totalQuestions}</p>
                                            <div className="mt-auto pt-3 d-flex justify-content-between align-items-center">
                                                <button onClick={() => setSelectedQuiz(quiz)} className="btn btn-primary">Manage</button>
                                                <button onClick={() => copyToClipboard(quiz.id)} className="btn btn-outline-secondary">Copy Link</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </main>

                {isCreateModalOpen && (
                    <div className="modal show" style={{ display: 'block' }}>
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header"><h5 className="modal-title">Create New Quiz</h5><button type="button" className="btn-close" onClick={() => setCreateModalOpen(false)}></button></div>
                                <div className="modal-body">
                                    <div className="mb-3"><label className="form-label">Quiz Name</label><input type="text" className="form-control" value={newQuizName} onChange={(e) => setNewQuizName(e.target.value)} /></div>
                                    <div className="mb-3"><label className="form-label">Duration (minutes)</label><input type="number" className="form-control" value={newQuizDuration} onChange={(e) => setNewQuizDuration(e.target.value)} /></div>
                                    <div className="mb-3"><label className="form-label">Quiz Type</label><select className="form-select" value={newQuizType} onChange={(e) => setNewQuizType(e.target.value)}><option>Multiple Choice</option><option>Descriptive</option></select></div>
                                    <div className="form-check mb-3"><input className="form-check-input" type="checkbox" checked={includePool} onChange={(e) => setIncludePool(e.target.checked)} id="includePoolCheck" /><label className="form-check-label" htmlFor="includePoolCheck">Include Pool Questions</label></div>
                                    {includePool && (<div className="mb-3"><label className="form-label">Number of Pool Questions</label><input type="number" className="form-control" value={newPoolCount} onChange={(e) => setNewPoolCount(e.target.value)} /></div>)}
                                    <div className="mb-3"><label className="form-label">Number of Fixed Questions</label><input type="number" className="form-control" value={newFixedCount} onChange={(e) => setNewFixedCount(e.target.value)} /></div>
                                    <div className="form-check mb-3"><input className="form-check-input" type="checkbox" checked={newAntiCheating} onChange={(e) => setNewAntiCheating(e.target.checked)} id="antiCheatCheck" /><label className="form-check-label" htmlFor="antiCheatCheck">Enable Anti-Cheating Features</label></div>
                                    <div className="mb-3"><label className="form-label">Quiz Instructions</label><textarea className="form-control" rows="8" value={newQuizInstructions} onChange={(e) => setNewQuizInstructions(e.target.value)}></textarea></div>
                                </div>
                                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>Close</button><button type="button" className="btn btn-primary" onClick={handleCreateQuiz}>Create Quiz</button></div>
                            </div>
                        </div>
                    </div>
                )}
                 {isEditQuizModalOpen && quizToEdit && (
                    <div className="modal show" style={{ display: 'block' }}>
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header"><h5 className="modal-title">Edit Quiz</h5><button type="button" className="btn-close" onClick={() => setEditQuizModalOpen(false)}></button></div>
                                <div className="modal-body">
                                    <div className="mb-3"><label className="form-label">Quiz Name</label><input type="text" className="form-control" value={quizToEdit.name} onChange={(e) => setQuizToEdit({...quizToEdit, name: e.target.value})} /></div>
                                    <div className="mb-3"><label className="form-label">Duration (minutes)</label><input type="number" className="form-control" value={quizToEdit.duration} onChange={(e) => setQuizToEdit({...quizToEdit, duration: e.target.value})} /></div>
                                    <div className="mb-3"><label className="form-label">Quiz Type</label><select className="form-select" value={quizToEdit.type} onChange={(e) => setQuizToEdit({...quizToEdit, type: e.target.value})}><option>Multiple Choice</option><option>Descriptive</option></select></div>
                                    <div className="form-check mb-3"><input className="form-check-input" type="checkbox" checked={quizToEdit.includePoolQuestions} onChange={(e) => setQuizToEdit({...quizToEdit, includePoolQuestions: e.target.checked})} id="editIncludePool" /><label className="form-check-label" htmlFor="editIncludePool">Include Pool Questions</label></div>
                                    {quizToEdit.includePoolQuestions && (<div className="mb-3"><label className="form-label">Number of Pool Questions</label><input type="number" className="form-control" value={quizToEdit.poolQuestionsCount} onChange={(e) => setQuizToEdit({...quizToEdit, poolQuestionsCount: e.target.value})} /></div>)}
                                    <div className="mb-3"><label className="form-label">Number of Fixed Questions</label><input type="number" className="form-control" value={quizToEdit.fixedQuestionsCount} onChange={(e) => setQuizToEdit({...quizToEdit, fixedQuestionsCount: e.target.value})} /></div>
                                    <div className="form-check mb-3"><input className="form-check-input" type="checkbox" checked={quizToEdit.antiCheatingEnabled} onChange={(e) => setQuizToEdit({...quizToEdit, antiCheatingEnabled: e.target.checked})} id="editAntiCheat" /><label className="form-check-label" htmlFor="editAntiCheat">Enable Anti-Cheating Features</label></div>
                                    <div className="mb-3"><label className="form-label">Quiz Instructions</label><textarea className="form-control" rows="8" value={quizToEdit.instructions} onChange={(e) => setQuizToEdit({...quizToEdit, instructions: e.target.value})}></textarea></div>
                                </div>
                                <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setEditQuizModalOpen(false)}>Close</button><button type="button" className="btn btn-primary" onClick={handleUpdateQuiz}>Save Changes</button></div>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }
    
    return (
        <>
            <header className="d-flex justify-content-between align-items-center p-3 px-4 border-bottom bg-white">
                <h1 className="h4 m-0 fw-bold text-dark">Quizegon</h1>
                <button onClick={handleLogout} className="btn btn-outline-secondary">Logout</button>
            </header>
            <main className="container-fluid p-4">
                <div className="mb-4">
                    <button onClick={() => setSelectedQuiz(null)} className="btn btn-outline-secondary">&larr; Back to All Quizzes</button>
                </div>
                <h2 className="h3 mb-3">Manage: {selectedQuiz?.name}</h2>
                <ul className="nav nav-tabs mb-4">
                    <li className="nav-item"><button onClick={() => setManagementTab('home')} className={`nav-link ${managementTab === 'home' ? 'active' : ''}`}>Home</button></li>
                    <li className="nav-item"><button onClick={() => setManagementTab('candidates')} className={`nav-link ${managementTab === 'candidates' ? 'active' : ''}`}>Candidates</button></li>
                    <li className="nav-item"><button onClick={() => setManagementTab('questions')} className={`nav-link ${managementTab === 'questions' ? 'active' : ''}`}>Questions</button></li>
                    <li className="nav-item"><button onClick={() => setManagementTab('result')} className={`nav-link ${managementTab === 'result' ? 'active' : ''}`}>Result</button></li>
                </ul>

                <div className="management-content">
                    {managementTab === 'home' && (
                        <div>
                             <div className="card mb-4">
                                <div className="card-header"><h5>Quiz Controls</h5></div>
                                <div className="card-body">
                                    <div className="row">
                                        <div className="col-md-6">
                                            <h6>Manual Control</h6>
                                            <p className="mb-2">Current Status: <strong className="text-capitalize">{selectedQuiz.status}</strong></p>
                                            <button onClick={handleManualToggleStatus} className={`btn ${selectedQuiz.status === 'active' ? 'btn-danger' : 'btn-success'}`}>
                                                {selectedQuiz.status === 'active' ? 'End Quiz Now' : 'Start Quiz Now'}
                                            </button>
                                        </div>
                                        <div className="col-md-6">
                                             <h6>Schedule Quiz</h6>
                                             {selectedQuiz.startTime && selectedQuiz.endTime && (
                                                <div className="alert alert-info">
                                                    Scheduled from {new Date(selectedQuiz.startTime).toLocaleString()} to {new Date(selectedQuiz.endTime).toLocaleString()}
                                                </div>
                                             )}
                                            <div className="mb-2"><label className="form-label">Start Time</label><input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="form-control" /></div>
                                            <div className="mb-3"><label className="form-label">End Time</label><input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="form-control" /></div>
                                            <button onClick={handleScheduleQuiz} className="btn btn-secondary">Set Schedule</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="row g-4">
                                <div className="col-md-4"><div className="card text-center h-100"><div className="card-body"><h6 className="card-subtitle mb-2 text-muted">Total Candidates</h6><p className="card-text fs-1 fw-bold">{homeStats.registered}</p></div></div></div>
                                <div className="col-md-4"><div className="card text-center h-100"><div className="card-body"><h6 className="card-subtitle mb-2 text-muted">Submissions</h6><p className="card-text fs-1 fw-bold">{homeStats.submissions}</p></div></div></div>
                                <div className="col-md-4"><div className="card text-center h-100"><div className="card-body"><h6 className="card-subtitle mb-2 text-muted">Attendance Rate</h6><p className="card-text fs-1 fw-bold">{homeStats.attendance}%</p></div></div></div>
                            </div>
                        </div>
                    )}
                    {managementTab === 'candidates' && (
                        <div className="card">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h5>Candidate List ({filteredCandidates.length})</h5>
                                <button onClick={() => setAddCandidateModalOpen(true)} className="btn btn-primary">+ Add Candidates</button>
                            </div>
                            <div className="p-3 border-bottom"><input type="text" placeholder="Search by name, place, or phone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="form-control" /></div>
                            <div className="table-responsive">
                                <table className="table table-striped table-hover mb-0">
                                    <thead><tr><th>Name</th><th>Place</th><th>Phone Number</th><th>Status</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {filteredCandidates.map(candidate => {
                                            const status = getCandidateStatus(candidate);
                                            return (<tr key={candidate.id}><td>{candidate.name}</td><td>{candidate.place}</td><td>{candidate.phone}</td><td><span className={`badge ${status.class}`}>{status.text}</span></td><td><button onClick={() => { setCandidateToEdit(candidate); setEditCandidateModalOpen(true); }} className="btn btn-sm btn-outline-primary me-2">Edit</button><button onClick={() => handleDeleteCandidate(candidate)} className="btn btn-sm btn-outline-danger">Delete</button></td></tr>);
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {managementTab === 'questions' && ( <QuestionManagement quiz={selectedQuiz} /> )}
                    {managementTab === 'result' && (
                         <div className="card">
                            <div className="card-header d-flex justify-content-between align-items-center">
                                <h5>Quiz Results ({sortedResults.length} submissions)</h5>
                                <button onClick={handleDownloadResults} className="btn btn-success">Download Results</button>
                            </div>
                            <div className="table-responsive">
                                <table className="table table-striped table-hover mb-0">
                                    <thead>
                                        <tr>
                                            <th>Rank</th>
                                            <th>Candidate Name</th>
                                            <th>Score</th>
                                            <th>Priority Score</th>
                                            <th>Answered</th>
                                            <th>Time Taken</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedResults.map((result, index) => {
                                            const candidate = candidates.find(c => c.phone === result.id);
                                            const startTime = result.startTime?.toDate();
                                            const submitTime = result.submittedAt?.toDate();
                                            let timeTaken = 'N/A';
                                            if (startTime && submitTime) {
                                                const diffMs = submitTime - startTime;
                                                const diffMins = Math.floor(diffMs / 60000);
                                                const diffSecs = Math.round((diffMs % 60000) / 1000);
                                                timeTaken = `${diffMins}m ${diffSecs}s`;
                                            }
                                            return (
                                                <tr key={result.id}>
                                                    <td>{index + 1}</td>
                                                    <td>{candidate ? candidate.name : 'Unknown'}</td>
                                                    <td>{result.score} / {result.totalPossibleScore || result.totalQuestions}</td>
                                                    <td>{result.priorityScore || 0}</td>
                                                    <td>{result.answeredCount || 0} / {result.totalQuestions}</td>
                                                    <td>{timeTaken}</td>
                                                    <td><button onClick={() => { setAnswersToView(result); setViewAnswersModalOpen(true); }} className="btn btn-sm btn-outline-info">View Answers</button></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
            {isAddCandidateModalOpen && selectedQuiz && ( <AddCandidateModal quizId={selectedQuiz.id} onClose={() => setAddCandidateModalOpen(false)} /> )}
            {isEditCandidateModalOpen && candidateToEdit && selectedQuiz && ( <EditCandidateModal quizId={selectedQuiz.id} candidate={candidateToEdit} onClose={() => { setEditCandidateModalOpen(false); setCandidateToEdit(null); }} /> )}
            {isViewAnswersModalOpen && answersToView && selectedQuiz && ( <ViewAnswersModal quiz={selectedQuiz} result={answersToView} onClose={() => { setViewAnswersModalOpen(false); setAnswersToView(null); }} /> )}
        </>
    );
};
export default AdminDashboard;

