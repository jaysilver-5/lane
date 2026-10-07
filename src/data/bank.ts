import raw from './generated-bank.json';
import type { Question } from '../domain/types';
import { mergeSampleBank } from '../domain/content.mjs';
// Generated samples in connected builds; the full bank is loaded only after server authorization.
const sampleQuestions = raw.questions as Question[];
export let questions: Question[] = [...sampleQuestions];
export const questionMap = new Map(questions.map(q => [q.id, q]));
export const sources = raw.sources;
export const bundledContent = { version: raw.version, approved: raw.approved };
export function replaceQuestionBank(full: Question[] = []) {
    questions = mergeSampleBank(sampleQuestions, full) as Question[];
    questionMap.clear();
    questions.forEach(q => questionMap.set(q.id, q));
}
export const topicDescriptions: Record<string, string> = {
    'Basic shapes and sign families': 'Get familiar with the language of the road.',
    'Warning signs': 'Spot what is coming before you get there.',
    'Regulatory signs': 'Know what you must, and must not, do.',
    'Temporary condition signs': 'Navigate construction and changing conditions.',
    'Information and other signs': 'Find your way with confidence.',
    'Traffic signals': 'Understand the signals that keep traffic moving.',
    'Intersections and right-of-way': 'Make the next move a considered one.',
    'Night driving, weather and traction': 'Prepare for less-than-perfect conditions.',
    'G1 licensing and responsibilities': 'Understand the responsibilities of a learner.',
};
export const topics = raw.topics.map((topic, i) => ({
    ...topic,
    description: topicDescriptions[topic.title] || 'Build good habits, one clear explanation at a time.',
    icon: ['sign', 'road', 'compass', 'flag', 'map', 'light', 'turn', 'car'][i % 8]!,
}));
