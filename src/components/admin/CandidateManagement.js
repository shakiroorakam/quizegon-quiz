import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/config';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { read, utils } from 'xlsx';

export default function CandidateManagement({ quizId }) {
    const [name, setName] = useState('');
    const [mobile, setMobile] = useState('');
    const [dob, setDob] = useState(''); // New state for Date of Birth
    const [candidates, setCandidates] = useState([]);
    const candidatesCollectionRef = collection(db, 'quizzes', quizId, 'candidates');

    useEffect(() => {
        const unsubscribe = onSnapshot(candidatesCollectionRef, (snapshot) => {
            const candidatesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCandidates(candidatesList);
        });
        return () => unsubscribe();
    }, [quizId]);

    const handleAddCandidate = async (e) => {
        e.preventDefault();
        if (!name || !mobile || !dob) return alert('Please fill all fields: Name, Mobile, and Date of Birth.');
        if (!/^\d{10}$/.test(mobile)) return alert('Enter a valid 10-digit mobile number.');

        try {
            // Add candidate details to Firestore. No Firebase Auth user is created.
            await addDoc(candidatesCollectionRef, { name, mobile, dob });
            
            setName('');
            setMobile('');
            setDob('');
            alert(`Candidate ${name} added successfully.`);

        } catch (error) {
            console.error("Error adding candidate:", error);
            alert('Failed to add candidate.');
        }
    };

    const handleFileImport = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                
                // --- FIX ---
                // This line ensures the 'ws' variable is correctly defined.
                const ws = wb.Sheets[wsname]; 
                
                // Expects columns: name, mobile, dob (e.g., in YYYY-MM-DD format)
                const data = utils.sheet_to_json(ws, { header: ['name', 'mobile', 'dob'] });
                
                for (const candidate of data) {
                    if (candidate.name && candidate.mobile && candidate.dob) {
                        const mobileStr = String(candidate.mobile);
                        // Convert Excel date serial number to YYYY-MM-DD format if necessary
                        let dobStr = candidate.dob;
                        if (typeof dobStr === 'number') {
                            const date = new Date(Math.round((dobStr - 25569) * 86400 * 1000));
                            dobStr = date.toISOString().split('T')[0];
                        }

                        if (/^\d{10}$/.test(mobileStr)) {
                             await addDoc(candidatesCollectionRef, { name: candidate.name, mobile: mobileStr, dob: dobStr });
                        }
                    }
                }
                alert('Candidates imported successfully!');
            } catch (error) {
                console.error("Error importing candidates:", error);
                alert("An error occurred during import.");
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = null;
    };
    
    const handleDeleteCandidate = async (id) => {
        if (window.confirm("Are you sure?")) {
            await deleteDoc(doc(db, 'quizzes', quizId, 'candidates', id));
        }
    };

    return (
        <div className="card">
            <div className="card-body">
                <h5 className="card-title">Manage Candidates</h5>
                <div className="mb-3">
                    <label className="form-label">Import from Excel (Columns: name, mobile, dob)</label>
                    <input type="file" className="form-control" accept=".xlsx, .xls" onChange={handleFileImport} />
                </div>
                <hr />
                <h6>Add Manually</h6>
                <form onSubmit={handleAddCandidate} className="mb-3">
                     <div className="mb-2">
                        <input type="text" className="form-control" placeholder="Candidate Name" value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className="mb-2">
                        <input type="tel" className="form-control" placeholder="10-digit Mobile Number" value={mobile} onChange={e => setMobile(e.target.value)} />
                    </div>
                    <div className="mb-2">
                        <label className="form-label small">Date of Birth</label>
                        <input type="date" className="form-control" value={dob} onChange={e => setDob(e.target.value)} />
                    </div>
                    <button type="submit" className="btn btn-primary">Add Candidate</button>
                </form>
                <div style={{maxHeight: '300px', overflowY: 'auto'}}>
                    <ul className="list-group">
                        {candidates.map(c => (
                            <li key={c.id} className="list-group-item d-flex justify-content-between align-items-center">
                                <span>{c.name} ({c.mobile}) - DOB: {c.dob}</span>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteCandidate(c.id)}>Delete</button>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
