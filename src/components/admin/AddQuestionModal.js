import React, { useState, useEffect } from "react";
import { db } from "../../firebase/config";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { read, utils } from "xlsx";

const AddQuestionModal = ({ quiz, folder, questionToEdit, onClose }) => {
  const [questionText, setQuestionText] = useState("");
  const [options, setOptions] = useState(["", "", "", ""]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [answerParameters, setAnswerParameters] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (questionToEdit) {
      setQuestionText(questionToEdit.questionText);
      if (quiz.type === "Multiple Choice") {
        setOptions(questionToEdit.options || ["", "", "", ""]);
        setCorrectAnswer(questionToEdit.correctAnswer || "");
      } else {
        setAnswerParameters(questionToEdit.answerParameters || "");
      }
    } else {
      resetForm();
    }
  }, [questionToEdit, quiz.type]);

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const resetForm = () => {
    setQuestionText("");
    setOptions(["", "", "", ""]);
    setCorrectAnswer("");
    setAnswerParameters("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const questionData = {
      questionText,
      ...(quiz.type === "Multiple Choice"
        ? { options, correctAnswer }
        : { answerParameters }),
    };

    if (!questionText.trim()) {
      alert("Question text cannot be empty.");
      return;
    }

    try {
      const questionsRef = collection(
        db,
        "quizzes",
        quiz.id,
        "folders",
        folder.id,
        "questions"
      );
      if (questionToEdit) {
        const questionDocRef = doc(
          db,
          "quizzes",
          quiz.id,
          "folders",
          folder.id,
          "questions",
          questionToEdit.id
        );
        await updateDoc(questionDocRef, questionData);
      } else {
        await addDoc(questionsRef, questionData);
      }
      resetForm();
      onClose();
    } catch (error) {
      console.error("Error saving question: ", error);
      alert("Failed to save question.");
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
        const workbook = read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          alert("The selected file is empty or in the wrong format.");
          setIsUploading(false);
          return;
        }

        const headers = Object.keys(json[0]).map((h) => h.trim());
        const requiredHeaders =
          quiz.type === "Multiple Choice"
            ? [
                "Question",
                "Choice1",
                "Choice2",
                "Choice3",
                "Choice4",
                "CorrectAnswer",
              ]
            : ["Question", "AnswerParameters"];

        const missingHeaders = requiredHeaders.filter(
          (rh) => !headers.includes(rh)
        );

        if (missingHeaders.length > 0) {
          alert(
            `Import failed. Missing required columns: ${missingHeaders.join(
              ", "
            )}`
          );
          setIsUploading(false);
          return;
        }

        const questionsRef = collection(
          db,
          "quizzes",
          quiz.id,
          "folders",
          folder.id,
          "questions"
        );
        let questionsAdded = 0;

        for (const row of json) {
          const questionData = {
            questionText: row["Question"]?.trim(),
            ...(quiz.type === "Multiple Choice"
              ? {
                  options: [
                    String(row["Choice1"]),
                    String(row["Choice2"]),
                    String(row["Choice3"]),
                    String(row["Choice4"]),
                  ],
                  correctAnswer: String(row["CorrectAnswer"]),
                }
              : {
                  answerParameters: String(row["AnswerParameters"]),
                }),
          };

          if (questionData.questionText) {
            await addDoc(questionsRef, questionData);
            questionsAdded++;
          }
        }
        alert(`${questionsAdded} questions were successfully imported!`);
        onClose();
      } catch (error) {
        console.error("Error importing questions:", error);
        alert(
          "An error occurred during import. Please check the file format and try again."
        );
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className='modal show' style={{ display: "block" }}>
      <div className='modal-dialog modal-lg'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h5 className='modal-title'>
              {questionToEdit ? "Edit Question" : "Add New Question"}
            </h5>
            <button
              type='button'
              className='btn-close'
              onClick={onClose}
            ></button>
          </div>
          <div className='modal-body'>
            <ul
              className='nav nav-tabs mb-3'
              id='addQuestionTab'
              role='tablist'
            >
              <li className='nav-item' role='presentation'>
                <button
                  className='nav-link active'
                  id='manual-tab'
                  data-bs-toggle='tab'
                  data-bs-target='#manual'
                  type='button'
                  role='tab'
                >
                  Manual Entry
                </button>
              </li>
              <li className='nav-item' role='presentation'>
                <button
                  className='nav-link'
                  id='excel-tab'
                  data-bs-toggle='tab'
                  data-bs-target='#excel'
                  type='button'
                  role='tab'
                >
                  Import from Excel
                </button>
              </li>
            </ul>
            <div className='tab-content' id='addQuestionTabContent'>
              <div
                className='tab-pane fade show active'
                id='manual'
                role='tabpanel'
              >
                <form onSubmit={handleSubmit}>
                  <div className='mb-3'>
                    <label className='form-label'>Question Text</label>
                    <textarea
                      className='form-control multilingual-text'
                      rows='3'
                      value={questionText}
                      onChange={(e) => setQuestionText(e.target.value)}
                      required
                    ></textarea>
                  </div>

                  {quiz.type === "Multiple Choice" ? (
                    <div>
                      {options.map((opt, index) => (
                        <div className='mb-3' key={index}>
                          <label className='form-label'>
                            Option {index + 1}
                          </label>
                          <input
                            type='text'
                            className='form-control multilingual-text'
                            value={opt}
                            onChange={(e) =>
                              handleOptionChange(index, e.target.value)
                            }
                            required
                          />
                        </div>
                      ))}
                      <div className='mb-3'>
                        <label className='form-label'>Correct Answer</label>
                        <input
                          type='text'
                          className='form-control multilingual-text'
                          value={correctAnswer}
                          onChange={(e) => setCorrectAnswer(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  ) : (
                    <div className='mb-3'>
                      <label className='form-label'>
                        Answer Keywords (for auto-scoring)
                      </label>
                      <input
                        type='text'
                        className='form-control'
                        value={answerParameters}
                        onChange={(e) => setAnswerParameters(e.target.value)}
                        required
                      />
                      <small className='form-text text-muted'>
                        Enter essential keywords separated by commas (e.g.,
                        penicillin, alexander fleming, 1928). The answer must
                        contain ALL keywords to be marked correct.
                      </small>
                    </div>
                  )}

                  <div className='modal-footer px-0 pb-0'>
                    <button
                      type='button'
                      className='btn btn-secondary'
                      onClick={onClose}
                    >
                      Close
                    </button>
                    <button type='submit' className='btn btn-primary'>
                      {questionToEdit ? "Save Changes" : "Add Question"}
                    </button>
                  </div>
                </form>
              </div>
              <div className='tab-pane fade' id='excel' role='tabpanel'>
                <p>Upload an Excel file (.xlsx) with the required columns.</p>
                {quiz.type === "Multiple Choice" ? (
                  <small className='d-block mb-3'>
                    Columns:{" "}
                    <strong>
                      Question, Choice1, Choice2, Choice3, Choice4,
                      CorrectAnswer
                    </strong>
                  </small>
                ) : (
                  <small className='d-block mb-3'>
                    Columns: <strong>Question, AnswerParameters</strong>{" "}
                    (comma-separated keywords)
                  </small>
                )}

                <input
                  className='form-control'
                  type='file'
                  accept='.xlsx'
                  onChange={handleFileImport}
                  disabled={isUploading}
                />
                {isUploading && <div className='mt-2'>Processing file...</div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddQuestionModal;
