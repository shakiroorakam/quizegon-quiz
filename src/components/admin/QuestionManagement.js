import React, { useState, useEffect } from "react";
import { db } from "../../firebase/config";
import { collection, onSnapshot, doc, deleteDoc } from "firebase/firestore";
import AddQuestionModal from "./AddQuestionModal";

const QuestionManagement = ({ quiz }) => {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [questionToEdit, setQuestionToEdit] = useState(null);

  useEffect(() => {
    if (!quiz?.id) return;
    setLoadingFolders(true);
    const foldersRef = collection(db, "quizzes", quiz.id, "folders");
    const unsubscribe = onSnapshot(foldersRef, (snapshot) => {
      setFolders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoadingFolders(false);
    });
    return () => unsubscribe();
  }, [quiz]);

  useEffect(() => {
    if (!selectedFolder) {
      setQuestions([]);
      return;
    }
    setLoadingQuestions(true);
    const questionsRef = collection(
      db,
      "quizzes",
      quiz.id,
      "folders",
      selectedFolder.id,
      "questions"
    );
    const unsubscribe = onSnapshot(questionsRef, (snapshot) => {
      setQuestions(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      setLoadingQuestions(false);
    });
    return () => unsubscribe();
  }, [quiz, selectedFolder]);

  const handleDeleteQuestion = async (questionId) => {
    if (window.confirm("Are you sure you want to delete this question?")) {
      await deleteDoc(
        doc(
          db,
          "quizzes",
          quiz.id,
          "folders",
          selectedFolder.id,
          "questions",
          questionId
        )
      );
    }
  };

  const openEditModal = (question) => {
    setQuestionToEdit(question);
    setAddModalOpen(true);
  };

  const filteredQuestions = questions.filter((q) =>
    q.questionText.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!selectedFolder) {
    return (
      <div className='card'>
        <div className='card-header'>
          <h5>Question Folders</h5>
        </div>
        {loadingFolders ? (
          <div className='card-body text-center'>
            <p>Loading folders...</p>
          </div>
        ) : (
          <div className='list-group list-group-flush'>
            {folders.map((folder) => (
              <div
                key={folder.id}
                className='list-group-item d-flex justify-content-between align-items-center'
              >
                <span>{folder.name}</span>
                <button
                  className='btn btn-secondary btn-sm'
                  onClick={() => setSelectedFolder(folder)}
                >
                  View Questions
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className='d-flex justify-content-between align-items-center mb-3'>
        <button
          className='btn btn-outline-secondary'
          onClick={() => setSelectedFolder(null)}
        >
          &larr; Back to Folders
        </button>
        <h3>{selectedFolder.name}</h3>
      </div>
      <div className='card'>
        <div className='card-header d-flex justify-content-between align-items-center'>
          <h5>Questions ({filteredQuestions.length})</h5>
          <button
            className='btn btn-primary'
            onClick={() => {
              setQuestionToEdit(null);
              setAddModalOpen(true);
            }}
          >
            + Add Question
          </button>
        </div>
        <div className='p-3 border-bottom'>
          <input
            type='text'
            className='form-control'
            placeholder='Search questions...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className='table-responsive'>
          <table className='table table-striped table-hover mb-0'>
            <thead>
              <tr>
                <th>Question</th>
                {quiz.type === "Multiple Choice" && <th>Correct Answer</th>}
                {quiz.type === "Descriptive" && <th>Parameters</th>}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingQuestions ? (
                <tr>
                  <td colSpan='3' className='text-center'>
                    Loading questions...
                  </td>
                </tr>
              ) : (
                filteredQuestions.map((q) => (
                  <tr key={q.id}>
                    <td style={{ whiteSpace: "pre-wrap" }}>{q.questionText}</td>
                    <td>{q.correctAnswer || q.answerParameters}</td>
                    <td>
                      <button
                        className='btn btn-sm btn-outline-primary me-2'
                        onClick={() => openEditModal(q)}
                      >
                        Edit
                      </button>
                      <button
                        className='btn btn-sm btn-outline-danger'
                        onClick={() => handleDeleteQuestion(q.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <AddQuestionModal
          quiz={quiz}
          folder={selectedFolder}
          questionToEdit={questionToEdit}
          onClose={() => {
            setAddModalOpen(false);
            setQuestionToEdit(null);
          }}
        />
      )}
    </div>
  );
};

export default QuestionManagement;
