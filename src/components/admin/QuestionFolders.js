import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, onSnapshot, addDoc, deleteDoc, doc, setDoc } from 'firebase/firestore';
import QuestionManagement from './QuestionManagement';
import Modal from '../common/Modal';

export default function QuestionFolders({ quizId }) {
    const [folders, setFolders] = useState([]);
    const [selectedFolder, setSelectedFolder] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [newFolderType, setNewFolderType] = useState('pool');

    const foldersCollectionRef = collection(db, 'quizzes', quizId, 'questionFolders');

    useEffect(() => {
        const unsubscribe = onSnapshot(foldersCollectionRef, (snapshot) => {
            const folderList = snapshot.docs.map(f => ({ id: f.id, ...f.data() }));
            setFolders(folderList);

            // Create default folders if they don't exist
            if (folderList.length === 0) {
                addDoc(foldersCollectionRef, { name: 'Pool Questions', type: 'pool' });
                addDoc(foldersCollectionRef, { name: 'Fixed Questions', type: 'fixed' });
            }
        });
        return () => unsubscribe();
    }, [quizId]);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return alert('Please enter a folder name.');
        await addDoc(foldersCollectionRef, { name: newFolderName, type: newFolderType });
        setNewFolderName('');
        setShowCreateModal(false);
    };

    const handleDeleteFolder = async (folderId) => {
        if (window.confirm("Are you sure? Deleting a folder will also delete all questions inside it. This action cannot be undone.")) {
            // Note: Deleting subcollections from the client is not recommended for large collections.
            // A Cloud Function is the best practice for production apps.
            await deleteDoc(doc(foldersCollectionRef, folderId));
        }
    };

    if (selectedFolder) {
        return (
            <div>
                <button className="btn btn-sm btn-outline-secondary mb-3" onClick={() => setSelectedFolder(null)}>
                    &larr; Back to All Folders
                </button>
                <QuestionManagement quizId={quizId} folder={selectedFolder} />
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
                <h5>Question Folders</h5>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>+ Create Folder</button>
            </div>
            <div className="list-group list-group-flush">
                {folders.map(folder => (
                    <div key={folder.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                            <span className={`badge me-2 ${folder.type === 'fixed' ? 'bg-info' : 'bg-secondary'}`}>{folder.type}</span>
                            {folder.name}
                        </div>
                        <div>
                            <button className="btn btn-secondary btn-sm me-2" onClick={() => setSelectedFolder(folder)}>Manage Questions</button>
                            <button className="btn btn-outline-danger btn-sm" onClick={() => handleDeleteFolder(folder.id)}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>
            {showCreateModal && (
                <Modal onClose={() => setShowCreateModal(false)} title="Create New Folder">
                    <div className="mb-3">
                        <label className="form-label">Folder Name</label>
                        <input type="text" className="form-control" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Folder Type</label>
                        <select className="form-select" value={newFolderType} onChange={(e) => setNewFolderType(e.target.value)}>
                            <option value="pool">Pool</option>
                            <option value="fixed">Fixed</option>
                        </select>
                    </div>
                    <button className="btn btn-primary" onClick={handleCreateFolder}>Create</button>
                </Modal>
            )}
        </div>
    );
}
