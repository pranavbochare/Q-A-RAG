import { answerQuestion } from '../services/ragService.js';
import { badRequest } from '../utils/errors.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUESTION_LENGTH = 1000;

export async function askQuestion(req, res) {
  const { docId, question } = req.body || {};

  if (typeof docId !== 'string' || !UUID_PATTERN.test(docId)) {
    throw badRequest('A valid "docId" is required. Upload a document first.', 'INVALID_DOC_ID');
  }
  if (typeof question !== 'string' || question.trim().length === 0) {
    throw badRequest('Please enter a question.', 'INVALID_QUESTION');
  }
  if (question.trim().length > MAX_QUESTION_LENGTH) {
    throw badRequest(`The question is too long. The limit is ${MAX_QUESTION_LENGTH} characters.`, 'QUESTION_TOO_LONG');
  }

  const result = await answerQuestion({ docId, question: question.trim() });

  res.json({
    success: true,
    question: result.question,
    answer: result.answer,
    sources: result.sources,
  });
}
