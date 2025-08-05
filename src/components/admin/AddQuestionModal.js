import React, { useState } from 'react';
import { db } from '../../firebase/config';
import { collection, addDoc } from 'firebase/firestore';
import { read, utils } from 'xlsx';
import Modal from '../common/Modal';

export default function AddQuestionModal({ quizId, folder, onClose }) {
    const [manualQuestion, setManualQuestion] = useState({ text: '', options: ['', '', '', ''], answer: '' });
    const questionsCollectionRef = collection(db, 'quizzes', quizId, 'questionFolders', folder.id, 'questions');

    const handleManualSubmit = async (e) => {
        e.preventDefault();
        if (!manualQuestion.text || manualQuestion.options.some(o => !o) || !manualQuestion.answer) {
            return alert('Please fill all fields.');
        }
        await addDoc(questionsCollectionRef, manualQuestion);
        setManualQuestion({ text: '', options: ['', '', '', ''], answer: '' });
        alert('Question added successfully.');
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
                const jsonData = utils.sheet_to_json(ws, { header: 1 });
                let questionsAdded = 0;
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (row && row.length >= 6 && row[0]) {
                        await addDoc(questionsCollectionRef, {
                            text: row[0] || '', options: [row[1], row[2], row[3], row[4]], answer: row[5] || ''
                        });
                        questionsAdded++;
                    }
                }
                alert(`${questionsAdded} questions imported into "${folder.name}"!`);
                onClose();
            } catch (error) {
                alert("An error occurred during import.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    return (
        <Modal onClose={onClose} title={`Add Questions to "${folder.name}"`}>
            <div className="mb-4 p-3 border rounded">
                <h6>Add Manually</h6>
                <form onSubmit={handleManualSubmit}>
                    <textarea className="form-control mb-2" placeholder="Question Text" value={manualQuestion.text} onChange={e => setManualQuestion({...manualQuestion, text: e.target.value})} required />
                    {manualQuestion.options.map((opt, i) => (
                        <input key={i} type="text" className="form-control mb-2" placeholder={`Option ${i+1}`} value={opt} onChange={e => setManualQuestion({...manualQuestion, options: [...manualQuestion.options.slice(0, i), e.target.value, ...manualQuestion.options.slice(i+1)]})} required />
                    ))}
                    <input type="text" className="form-control mb-2" placeholder="Correct Answer" value={manualQuestion.answer} onChange={e => setManualQuestion({...manualQuestion, answer: e.target.value})} required />
                    <button type="submit" className="btn btn-primary">Add Question</button>
                </form>
            </div>
            <div className="p-3 border rounded">
                <h6>Import from Excel</h6>
                <p className="small text-muted">Columns: Question, Opt1, Opt2, Opt3, Opt4, Answer</p>
                <input type="file" className="form-control" accept=".xlsx, .xls" onChange={handleFileImport} />
            </div>
        </Modal>
    );
}
