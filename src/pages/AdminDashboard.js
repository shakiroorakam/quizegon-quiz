import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, onSnapshot, doc, deleteDoc, getDocs, setDoc, Timestamp } from 'firebase/firestore';
import { utils, writeFile } from 'xlsx';
import Modal from '../components/common/Modal';
import AddCandidateModal from '../components/admin/AddCandidateModal';
import QuestionManagement from '../components/admin/QuestionManagement';
import EditCandidateModal from '../components/admin/EditCandidateModal';
import ViewAnswersModal from '../components/admin/ViewAnswersModal';

export default function AdminDashboard() {
    const [quizzes, setQuizzes] = useState([]);
    const [selectedQuiz, setSelectedQuiz] = useState(null);
    const [managementView, setManagementView] = useState('home');
    
    const [showCreateQuizModal, setShowCreateQuizModal] = useState(false);
    const [showEditQuizModal, setShowEditQuizModal] = useState(false);
    const [showCandidateModal, setShowCandidateModal] = useState(false);
    const [showEditCandidateModal, setShowEditCandidateModal] = useState(false);
    const [showViewAnswersModal, setShowViewAnswersModal] = useState(false);
    
    const [quizToEdit, setQuizToEdit] = useState(null);
    const [editedQuizName, setEditedQuizName] = useState('');
    const [candidateToEdit, setCandidateToEdit] = useState(null);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [selectedResultForView, setSelectedResultForView] = useState(null);
    
    const [newQuizName, setNewQuizName] = useState('');
    const [candidates, setCandidates] = useState([]);
    const [folders, setFolders] = useState([]);
    const [foldersLoading, setFoldersLoading] = useState(true);
    const [results, setResults] = useState([]);
    const [candidateSearch, setCandidateSearch] = useState('');

    const [startTime, setStartTime] = useState('');
    const [endTime, setEndTime] = useState('');

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'quizzes'), snap => setQuizzes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
        return () => unsub();
    }, []);

    useEffect(() => {
        if (!selectedQuiz) return;
        const candidatesRef = collection(db, 'quizzes', selectedQuiz.id, 'candidates');
        const foldersRef = collection(db, 'quizzes', selectedQuiz.id, 'questionFolders');
        const resultsRef = collection(db, 'quizzes', selectedQuiz.id, 'results');
        
        const unsubCandidates = onSnapshot(candidatesRef, snap => setCandidates(snap.docs.map(d => ({id: d.id, ...d.data()}))));
        const unsubResults = onSnapshot(resultsRef, async (resultsSnap) => {
            const candidatesSnap = await getDocs(candidatesRef);
            const candidatesMap = new Map(candidatesSnap.docs.map(d => [d.id, d.data()]));
            const detailedResults = resultsSnap.docs.map(resultDoc => ({ ...resultDoc.data(), id: resultDoc.id, candidateInfo: candidatesMap.get(resultDoc.id) || {} }));
            detailedResults.sort((a, b) => b.score - a.score);
            setResults(detailedResults);
        });
        const unsubFolders = onSnapshot(foldersRef, async (snap) => {
            if (snap.empty) {
                await addDoc(foldersRef, { name: 'Pool Questions', type: 'pool' });
                await addDoc(foldersRef, { name: 'Fixed Questions', type: 'fixed' });
            } else {
                setFolders(snap.docs.map(d => ({id: d.id, ...d.data()})));
            }
            setFoldersLoading(false);
        });
        return () => { unsubCandidates(); unsubFolders(); unsubResults(); };
    }, [selectedQuiz]);

    const handleCreateQuiz = async () => {
        if (!newQuizName.trim()) return;
        await addDoc(collection(db, 'quizzes'), { name: newQuizName, createdAt: new Date(), status: 'pending' });
        setShowCreateQuizModal(false);
        setNewQuizName('');
    };

    const handleUpdateQuizStatus = async (status) => {
        const quizDocRef = doc(db, 'quizzes', selectedQuiz.id);
        await setDoc(quizDocRef, { status, startTime: null, endTime: null }, { merge: true });
        setSelectedQuiz({...selectedQuiz, status, startTime: null, endTime: null});
    };

    const handleScheduleQuiz = async () => {
        if (!startTime || !endTime) return alert('Please set both a start and end time.');
        const quizDocRef = doc(db, 'quizzes', selectedQuiz.id);
        await setDoc(quizDocRef, {
            startTime: Timestamp.fromDate(new Date(startTime)),
            endTime: Timestamp.fromDate(new Date(endTime)),
            status: 'scheduled'
        }, { merge: true });
        alert('Quiz has been scheduled.');
    };

    const openEditQuizModal = (quiz) => {
        setQuizToEdit(quiz);
        setEditedQuizName(quiz.name);
        setShowEditQuizModal(true);
    };

    const handleUpdateQuiz = async () => {
        if (!editedQuizName.trim()) return alert('Quiz name cannot be empty.');
        const quizDocRef = doc(db, 'quizzes', quizToEdit.id);
        await setDoc(quizDocRef, { name: editedQuizName }, { merge: true });
        setShowEditQuizModal(false);
        setQuizToEdit(null);
    };

    const handleDeleteQuiz = async (quizId) => {
        if (window.confirm("Are you sure you want to delete this quiz? This action is irreversible and will delete all associated data.")) {
            await deleteDoc(doc(db, 'quizzes', quizId));
        }
    };

    const getQuizLink = (id) => {
        const baseUrl = window.location.origin + process.env.PUBLIC_URL;
        return `${baseUrl}/#/quiz/${id}`;
    };

    const copyToClipboard = (id) => {
        navigator.clipboard.writeText(getQuizLink(id)).then(() => {
            alert('Quiz link copied!');
        });
    };

    const openEditModal = (candidate) => { setCandidateToEdit(candidate); setShowEditCandidateModal(true); };
    const openViewAnswersModal = (result) => { setSelectedResultForView(result); setShowViewAnswersModal(true); };
    const handleDeleteCandidate = async (candidateId) => {
        if (window.confirm("Are you sure? This will also delete their result.")) {
            await deleteDoc(doc(db, 'quizzes', selectedQuiz.id, 'candidates', candidateId));
            await deleteDoc(doc(db, 'quizzes', selectedQuiz.id, 'results', candidateId));
        }
    };
    
    const filteredCandidates = candidates.filter(c => c.name.toLowerCase().includes(candidateSearch.toLowerCase()) || c.mobile.includes(candidateSearch));
    
    const getCandidateStatus = (candidate) => {
        if (results.some(r => r.id === candidate.id)) {
            return <span className="badge bg-success">Attended</span>;
        }
        if (candidate.status === 'attending') {
            return <span className="badge bg-primary">Attending</span>;
        }
        return <span className="badge bg-secondary">Not Attended</span>;
    };

    if (selectedQuiz) {
        const attendanceRate = candidates.length > 0 ? ((results.length / candidates.length) * 100).toFixed(1) : 0;
        return (
            <div>
                <button className="btn btn-outline-secondary mb-4 d-flex align-items-center" onClick={() => { setSelectedQuiz(null); setManagementView('home'); }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-arrow-left me-2" viewBox="0 0 16 16"><path fillRule="evenodd" d="M15 8a.5.5 0 0 0-.5-.5H2.707l3.147-3.146a.5.5 0 1 0-.708-.708l-4 4a.5.5 0 0 0 0 .708l4 4a.5.5 0 0 0 .708-.708L2.707 8.5H14.5A.5.5 0 0 0 15 8z"/></svg>
                    Back to All Quizzes
                </button>
                <h2 className="mb-3">Manage: {selectedQuiz.name}</h2>
                <ul className="nav nav-tabs mb-4">
                    <li className="nav-item"><button className={`nav-link ${managementView === 'home' ? 'active' : ''}`} onClick={() => setManagementView('home')}>Home</button></li>
                    <li className="nav-item"><button className={`nav-link ${managementView === 'candidates' ? 'active' : ''}`} onClick={() => setManagementView('candidates')}>Candidates</button></li>
                    <li className="nav-item"><button className={`nav-link ${managementView === 'questions' ? 'active' : ''}`} onClick={() => setManagementView('questions')}>Questions</button></li>
                    <li className="nav-item"><button className={`nav-link ${managementView === 'results' ? 'active' : ''}`} onClick={() => setManagementView('results')}>Result</button></li>
                </ul>

                {managementView === 'home' && (
                    <div>
                        <div className="card mb-4">
                            <div className="card-header"><h5>Quiz Controls</h5></div>
                            <div className="card-body">
                                <div className="row">
                                    <div className="col-md-6">
                                        <h6>Manual Control</h6>
                                        <p>Current Status: <span className="fw-bold">{selectedQuiz.status || 'pending'}</span></p>
                                        {selectedQuiz.status === 'active' ? (
                                            <button className="btn btn-danger" onClick={() => handleUpdateQuizStatus('ended')}>End Quiz Now</button>
                                        ) : (
                                            <button className="btn btn-success" onClick={() => handleUpdateQuizStatus('active')}>Start Quiz Now</button>
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <h6>Schedule Quiz</h6>
                                        <div className="mb-2"><label className="form-label">Start Time</label><input type="datetime-local" className="form-control" value={startTime} onChange={e => setStartTime(e.target.value)}/></div>
                                        <div className="mb-2"><label className="form-label">End Time</label><input type="datetime-local" className="form-control" value={endTime} onChange={e => setEndTime(e.target.value)}/></div>
                                        <button className="btn btn-secondary" onClick={handleScheduleQuiz}>Set Schedule</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="row">
                            <div className="col-md-4"><div className="card text-center h-100"><div className="card-body"><h6 className="card-subtitle mb-2 text-muted">Total Candidates</h6><p className="card-text fs-1 fw-bold">{candidates.length}</p></div></div></div>
                            <div className="col-md-4"><div className="card text-center h-100"><div className="card-body"><h6 className="card-subtitle mb-2 text-muted">Submissions</h6><p className="card-text fs-1 fw-bold">{results.length}</p></div></div></div>
                            <div className="col-md-4"><div className="card text-center h-100"><div className="card-body"><h6 className="card-subtitle mb-2 text-muted">Attendance Rate</h6><p className="card-text fs-1 fw-bold">{attendanceRate}%</p></div></div></div>
                        </div>
                    </div>
                )}
                {managementView === 'candidates' && (<div className="card"><div className="card-header d-flex justify-content-between align-items-center"><h5>Candidate List ({filteredCandidates.length})</h5><button className="btn btn-primary" onClick={() => setShowCandidateModal(true)}>+ Add Candidates</button></div><div className="p-3 border-bottom"><input type="text" className="form-control" placeholder="Search by name or mobile..." value={candidateSearch} onChange={e => setCandidateSearch(e.target.value)} /></div><div className="table-responsive"><table className="table table-striped table-hover mb-0"><thead><tr><th>Name</th><th>Mobile</th><th>DOB</th><th>Status</th><th>Actions</th></tr></thead><tbody>{filteredCandidates.map(c => (<tr key={c.id}><td>{c.name}</td><td>{c.mobile}</td><td>{c.dob}</td><td>{getCandidateStatus(c)}</td><td><button className="btn btn-sm btn-outline-primary me-2" onClick={() => openEditModal(c)}>Edit</button><button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteCandidate(c.id)}>Delete</button></td></tr>))}</tbody></table></div></div>)}
                {managementView === 'questions' && (<div>{selectedFolder ? <QuestionManagement quizId={selectedQuiz.id} folder={selectedFolder} onBack={() => setSelectedFolder(null)} /> : (<div className="card"><div className="card-header"><h5>Question Folders</h5></div>{foldersLoading ? <div className="card-body text-center"><p>Loading folders...</p></div> : (<div className="list-group list-group-flush">{folders.map(folder => (<div key={folder.id} className="list-group-item d-flex justify-content-between align-items-center"><span>{folder.name} <span className={`badge ${folder.type === 'fixed' ? 'bg-info' : 'bg-secondary'}`}>{folder.type}</span></span><button className="btn btn-secondary btn-sm" onClick={() => setSelectedFolder(folder)}>View Questions</button></div>))}</div>)}</div>)}</div>)}
                {managementView === 'results' && (<div className="card"><div className="card-header d-flex justify-content-between align-items-center"><h5>Quiz Results ({results.length} submissions)</h5><button className="btn btn-success" onClick={handleDownloadResults}>Download Results</button></div><div className="table-responsive"><table className="table table-striped table-hover mb-0"><thead><tr><th>Rank</th><th>Candidate Name</th><th>Score</th><th>Actions</th></tr></thead><tbody>{results.map((res, index) => (<tr key={res.id}><td>{index + 1}</td><td>{res.candidateInfo.name || 'Unknown'}</td><td>{res.score} / {res.totalQuestions}</td><td><button className="btn btn-sm btn-outline-info" onClick={() => openViewAnswersModal(res)}>View Answers</button></td></tr>))}</tbody></table></div></div>)}
                {showCandidateModal && <AddCandidateModal quizId={selectedQuiz.id} onClose={() => setShowCandidateModal(false)} />}
                {showEditCandidateModal && <EditCandidateModal quizId={selectedQuiz.id} candidate={candidateToEdit} onClose={() => setShowEditCandidateModal(false)} />}
                {showViewAnswersModal && <ViewAnswersModal quizId={selectedQuiz.id} result={selectedResultForView} onClose={() => setShowViewAnswersModal(false)} />}
            </div>
        );
    }

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-4"><h1 className="h2">Admin Dashboard</h1><button className="btn btn-primary" onClick={() => setShowCreateQuizModal(true)}>+ Create New Quiz</button></div>
            <div className="row g-4">
                {quizzes.map(quiz => (
                    <div key={quiz.id} className="col-md-6 col-lg-4">
                        <div className="card h-100">
                            <div className="card-body d-flex flex-column">
                                <div className="d-flex justify-content-between"><h5 className="card-title">{quiz.name}</h5><div className="dropdown"><button className="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown" aria-expanded="false">&#8942;</button><ul className="dropdown-menu dropdown-menu-end"><li><button className="dropdown-item" onClick={() => openEditQuizModal(quiz)}>Edit</button></li><li><button className="dropdown-item text-danger" onClick={() => handleDeleteQuiz(quiz.id)}>Delete</button></li></ul></div></div>
                                {quiz.createdAt && <p className="card-subtitle mb-2 text-muted small">Created: {new Date(quiz.createdAt.seconds * 1000).toLocaleDateString()}</p>}
                                <div className="mt-auto pt-3 d-flex justify-content-between align-items-center">
                                    <button className="btn btn-primary" onClick={() => setSelectedQuiz(quiz)}>Manage</button>
                                    <button className="btn btn-outline-secondary btn-sm" onClick={() => copyToClipboard(quiz.id)}>Copy Link</button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            {showCreateQuizModal && <Modal onClose={() => setShowCreateQuizModal(false)} title="Create New Quiz"><input type="text" className="form-control" value={newQuizName} onChange={(e) => setNewQuizName(e.target.value)} /><button className="btn btn-primary mt-3" onClick={handleCreateQuiz}>Create</button></Modal>}
            {showEditQuizModal && (<Modal onClose={() => setShowEditQuizModal(false)} title="Edit Quiz Name"><input type="text" className="form-control" value={editedQuizName} onChange={(e) => setEditedQuizName(e.target.value)} /><button className="btn btn-primary mt-3" onClick={handleUpdateQuiz}>Update</button></Modal>)}
        </div>
    );
}
