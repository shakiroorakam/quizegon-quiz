import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { read, utils } from 'xlsx';

const AddCandidateModal = ({ quizId, onClose }) => {
    const [name, setName] = useState('');
    const [place, setPlace] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const resetForm = () => {
        setName('');
        setPlace('');
        setPhone('');
        setPassword('');
    };

    const handleAddCandidate = async (e) => {
        e.preventDefault();
        if (!name.trim() || !place.trim() || !phone.trim() || !password.trim()) {
            alert('Please fill in all fields.');
            return;
        }

        try {
            const candidatesRef = collection(db, 'quizzes', quizId, 'candidates');
            await addDoc(candidatesRef, {
                name,
                place,
                phone,
                password,
                status: 'not-attended'
            });
            resetForm();
            alert('Candidate added successfully!');
        } catch (error) {
            console.error("Error adding candidate:", error);
            alert('Failed to add candidate.');
        }
    };

    const handleFileImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = utils.sheet_to_json(worksheet);

                if (json.length === 0) {
                    alert('The selected file is empty or in the wrong format.');
                    setIsUploading(false);
                    return;
                }

                // --- NEW: Header Validation ---
                const headers = Object.keys(json[0]).map(h => h.trim());
                const requiredHeaders = ['Name', 'Place', 'PhoneNumber', 'Password'];
                const missingHeaders = requiredHeaders.filter(rh => !headers.includes(rh));

                if (missingHeaders.length > 0) {
                    alert(`Import failed. The Excel file is missing the following required columns: ${missingHeaders.join(', ')}`);
                    setIsUploading(false);
                    return;
                }

                const candidatesRef = collection(db, 'quizzes', quizId, 'candidates');
                let candidatesAdded = 0;

                for (const row of json) {
                    const candidateData = {
                        name: String(row['Name'] || '').trim(),
                        place: String(row['Place'] || '').trim(),
                        phone: String(row['PhoneNumber'] || '').trim(),
                        password: String(row['Password'] || '').trim(),
                        status: 'not-attended'
                    };

                    if (candidateData.name && candidateData.place && candidateData.phone && candidateData.password) {
                        await addDoc(candidatesRef, candidateData);
                        candidatesAdded++;
                    }
                }
                alert(`${candidatesAdded} candidates were successfully imported!`);
                onClose();
            } catch (error) {
                console.error("Error importing candidates:", error);
                alert("An error occurred during import. Please check the file format and column headers.");
            } finally {
                setIsUploading(false);
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <div className="modal show" style={{ display: 'block' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Add Candidates</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <ul className="nav nav-tabs mb-3" id="addCandidateTab" role="tablist">
                            <li className="nav-item" role="presentation">
                                <button className="nav-link active" id="manual-add-tab" data-bs-toggle="tab" data-bs-target="#manual-add" type="button" role="tab">Manual Entry</button>
                            </li>
                            <li className="nav-item" role="presentation">
                                <button className="nav-link" id="excel-import-tab" data-bs-toggle="tab" data-bs-target="#excel-import" type="button" role="tab">Import from Excel</button>
                            </li>
                        </ul>
                        <div className="tab-content" id="addCandidateTabContent">
                            <div className="tab-pane fade show active" id="manual-add" role="tabpanel">
                                <form onSubmit={handleAddCandidate}>
                                    <div className="mb-3"><label className="form-label">Name</label><input type="text" className="form-control" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                                    <div className="mb-3"><label className="form-label">Place</label><input type="text" className="form-control" value={place} onChange={(e) => setPlace(e.target.value)} required /></div>
                                    <div className="mb-3"><label className="form-label">Phone Number</label><input type="text" className="form-control" value={phone} onChange={(e) => setPhone(e.target.value)} required /></div>
                                    <div className="mb-3"><label className="form-label">Password</label><input type="text" className="form-control" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                                    <div className="modal-footer px-0 pb-0">
                                        <button type="button" className="btn btn-secondary" onClick={onClose}>Close</button>
                                        <button type="submit" className="btn btn-primary">Add Candidate</button>
                                    </div>
                                </form>
                            </div>
                            <div className="tab-pane fade" id="excel-import" role="tabpanel">
                                <p>Upload an Excel file (.xlsx) with the required columns. The column headers are case-sensitive.</p>
                                <small className="d-block mb-3">Required Columns: <strong>Name, Place, PhoneNumber, Password</strong></small>
                                <input className="form-control" type="file" accept=".xlsx" onChange={handleFileImport} disabled={isUploading} />
                                {isUploading && <div className="mt-2">Processing file...</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddCandidateModal;
