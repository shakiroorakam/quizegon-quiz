import React, { useState, useEffect } from "react";
import { db } from "../../firebase/config";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";

const ViewAnswersModal = ({ quiz, result, onClose }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchAllQuestions = async () => {
      if (!quiz?.id || !result) return;
      setLoading(true);
      try {
        const foldersRef = collection(db, "quizzes", quiz.id, "folders");
        const foldersSnap = await getDocs(foldersRef);

        let allQuestions = [];
        for (const folderDoc of foldersSnap.docs) {
          const questionsRef = collection(
            db,
            "quizzes",
            quiz.id,
            "folders",
            folderDoc.id,
            "questions"
          );
          const questionsSnap = await getDocs(questionsRef);
          const folderQuestions = questionsSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }));
          allQuestions = [...allQuestions, ...folderQuestions];
        }
        setQuestions(allQuestions);
      } catch (error) {
        console.error("Error fetching questions for answer sheet:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllQuestions();
  }, [quiz, result]);

  const getQuestionById = (id) => questions.find((q) => q.id === id);

  const checkDescriptiveAnswer = (submittedAnswer, keywordsString) => {
    if (!submittedAnswer || !keywordsString) return false;
    const keywords = keywordsString
      .split(",")
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);
    const candidateAnswer = submittedAnswer.toLowerCase();
    // The answer must contain ALL keywords to be correct
    return (
      keywords.length > 0 &&
      keywords.every((keyword) => candidateAnswer.includes(keyword))
    );
  };

  const handleScoreOverride = async (questionId, newIsCorrectStatus) => {
    setIsUpdating(true);
    try {
      const newOverrides = {
        ...result.overrides,
        [questionId]: newIsCorrectStatus,
      };

      // Recalculate the total score
      let newScore = 0;
      Object.entries(result.answers).forEach(([qId, submittedAnswer]) => {
        const question = getQuestionById(qId);
        if (!question) return;

        let isCorrect = false;
        // Check for an override first
        if (newOverrides.hasOwnProperty(qId)) {
          isCorrect = newOverrides[qId];
        } else {
          // If no override, use original scoring logic
          if (quiz.type === "Multiple Choice") {
            isCorrect = submittedAnswer === question.correctAnswer;
          } else if (quiz.type === "Descriptive") {
            isCorrect = checkDescriptiveAnswer(
              submittedAnswer,
              question.answerParameters
            );
          }
        }
        if (isCorrect) {
          newScore++;
        }
      });

      const resultRef = doc(db, "quizzes", quiz.id, "results", result.id);
      await updateDoc(resultRef, {
        score: newScore,
        overrides: newOverrides,
      });
      // The main dashboard will update automatically via its onSnapshot listener
    } catch (error) {
      console.error("Error updating score:", error);
      alert("Failed to update score.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className='modal show' style={{ display: "block" }}>
      <div className='modal-dialog modal-lg modal-dialog-scrollable'>
        <div className='modal-content'>
          <div className='modal-header'>
            <h5 className='modal-title'>Answer Sheet</h5>
            <button
              type='button'
              className='btn-close'
              onClick={onClose}
            ></button>
          </div>
          <div className='modal-body'>
            {loading ? (
              <p>Loading answers...</p>
            ) : (
              Object.entries(result.answers).map(
                ([questionId, submittedAnswer]) => {
                  const question = getQuestionById(questionId);
                  if (!question) return null;

                  let isCorrect;
                  const hasOverride =
                    result.overrides &&
                    result.overrides.hasOwnProperty(questionId);

                  if (hasOverride) {
                    isCorrect = result.overrides[questionId];
                  } else {
                    if (quiz.type === "Multiple Choice") {
                      isCorrect = submittedAnswer === question.correctAnswer;
                    } else if (quiz.type === "Descriptive") {
                      isCorrect = checkDescriptiveAnswer(
                        submittedAnswer,
                        question.answerParameters
                      );
                    }
                  }

                  return (
                    <div
                      key={questionId}
                      className={`mb-4 p-3 border rounded ${
                        isCorrect ? "border-success" : "border-danger"
                      }`}
                    >
                      <p
                        className='fw-bold multilingual-text'
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {question.questionText}
                      </p>

                      {quiz.type === "Multiple Choice" ? (
                        <div>
                          <p>
                            Candidate's Answer:{" "}
                            <span
                              className={`fw-bold multilingual-text ${
                                isCorrect ? "text-success" : "text-danger"
                              }`}
                            >
                              {submittedAnswer}
                            </span>
                            {isCorrect ? (
                              <span className='ms-2 badge bg-success'>
                                Correct
                              </span>
                            ) : (
                              <span className='ms-2 badge bg-danger'>
                                Incorrect
                              </span>
                            )}
                          </p>
                          {!isCorrect && (
                            <p>
                              Correct Answer:{" "}
                              <span className='text-success fw-bold multilingual-text'>
                                {question.correctAnswer}
                              </span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <div>
                          <p className='fw-bold'>Candidate's Answer:</p>
                          <p
                            className='multilingual-text'
                            style={{ whiteSpace: "pre-wrap" }}
                          >
                            {submittedAnswer}
                          </p>
                          <hr />
                          <p>
                            Required Keywords:{" "}
                            <span className='text-info'>
                              {question.answerParameters}
                            </span>
                          </p>
                          <p>
                            Status:
                            {isCorrect ? (
                              <span className='ms-2 badge bg-success'>
                                Correct
                              </span>
                            ) : (
                              <span className='ms-2 badge bg-danger'>
                                Incorrect
                              </span>
                            )}
                            {hasOverride && (
                              <span className='ms-2 badge bg-warning text-dark'>
                                Manually Overridden
                              </span>
                            )}
                          </p>
                          <div className='mt-2'>
                            <button
                              className='btn btn-sm btn-outline-success me-2'
                              onClick={() =>
                                handleScoreOverride(questionId, true)
                              }
                              disabled={isCorrect || isUpdating}
                            >
                              Mark as Correct
                            </button>
                            <button
                              className='btn btn-sm btn-outline-danger'
                              onClick={() =>
                                handleScoreOverride(questionId, false)
                              }
                              disabled={!isCorrect || isUpdating}
                            >
                              Mark as Incorrect
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
              )
            )}
          </div>
          <div className='modal-footer'>
            <button
              type='button'
              className='btn btn-secondary'
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAnswersModal;
