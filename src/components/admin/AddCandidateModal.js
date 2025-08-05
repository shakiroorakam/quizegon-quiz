import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { read, utils } from 'xlsx';
import Modal from '../common/Modal';

export default function AddCandidateModal({ quizId, onClose }) {
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [dob, setDob] = useState('');
    const candidatesCollectionRef = collection(db, 'quizzes', quizId, 'candidates');

    const handleAddCandidate = async (e) => {
        e.preventDefault();
        if (!name || !mobile || !dob) return alert('Please fill all fields.');
        if (!/^\d{10}$/.test(mobile)) return alert('Enter a valid 10-digit mobile number.');
        
        await addDoc(candidatesCollectionRef, { name, mobile, dob });
        setName(''); setMobile(''); setDob('');
        alert('Candidate added successfully.');
    };

    const handleFileImport = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const wb = read(data, { type: 'array' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const jsonData = utils.sheet_to_json(ws, { header: ['name', 'mobile', 'dob'] });
                
                let candidatesAdded = 0;
                for (const candidate of jsonData) {
                    if (candidate.name && candidate.mobile && candidate.dob) {
                        await addDoc(candidatesCollectionRef, { ...candidate });
                        candidatesAdded++;
                    }
                }
                alert(`${candidatesAdded} candidates imported successfully!`);
                onClose();
            } catch (error) {
                console.error("Error importing candidates:", error);
                alert("An error occurred during import.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Modal onClose={onClose} title="Add New Candidates">
            <div className="mb-4 p-3 border rounded">
                <h6>Add Manually</h6>
                <form onSubmit={handleAddCandidate}>
                    <input type="text" className="form-control mb-2" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
                    <input type="tel" className="form-control mb-2" placeholder="10-digit Mobile" value={mobile} onChange={e => setMobile(e.target.value)} required />
                    <input type="date" className="form-control mb-2" value={dob} onChange={e => setDob(e.target.value)} required />
                    <button type="submit" className="btn btn-primary">Add Candidate</button>
                </form>
            </div>
            <div className="p-3 border rounded">
                <h6>Import from Excel</h6>
                <p className="small text-muted">Columns: name, mobile, dob (YYYY-MM-DD)</p>
                <input type="file" className="form-control" accept=".xlsx, .xls" onChange={handleFileImport} />
            </div>
        </Modal>
    );
}
