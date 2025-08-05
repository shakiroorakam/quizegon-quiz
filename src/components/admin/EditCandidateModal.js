import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { doc, setDoc } from 'firebase/firestore';
import Modal from '../common/Modal';

export default function EditCandidateModal({ quizId, candidate, onClose }) {
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [dob, setDob] = useState('');
    
    useEffect(() => {
        if (candidate) {
            setName(candidate.name);
            setMobile(candidate.mobile);
            setDob(candidate.dob);
        }
    }, [candidate]);

    const handleUpdateCandidate = async (e) => {
        e.preventDefault();
        if (!name || !mobile || !dob) return alert('Please fill all fields.');
        if (!/^\d{10}$/.test(mobile)) return alert('Enter a valid 10-digit mobile number.');
        
        const candidateDocRef = doc(db, 'quizzes', quizId, 'candidates', candidate.id);
        await setDoc(candidateDocRef, { name, mobile, dob });
        
        alert('Candidate updated successfully.');
        onClose();
    };

    return (
        <Modal onClose={onClose} title={`Edit Candidate: ${candidate.name}`}>
            <form onSubmit={handleUpdateCandidate}>
                <div className="mb-3">
                    <label className="form-label">Name</label>
                    <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="mb-3">
                    <label className="form-label">Mobile</label>
                    <input type="tel" className="form-control" value={mobile} onChange={e => setMobile(e.target.value)} required />
                </div>
                <div className="mb-3">
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-control" value={dob} onChange={e => setDob(e.target.value)} required />
                </div>
                <button type="submit" className="btn btn-primary">Update Candidate</button>
            </form>
        </Modal>
    );
}
