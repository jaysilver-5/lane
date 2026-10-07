export type Option = {
    id: string;
    text: string;
};
export type Section = 'road_signs' | 'road_rules';
export interface Question {
    id: string;
    code: string;
    revision_id: string;
    revision: number;
    pack_key: string;
    concept_id: string;
    variant: string;
    section: Section;
    topic: string;
    learning_objective: string;
    prompt: string;
    options: Option[];
    correct_option_id: string;
    explanation: string;
    evidence: {
        source_id: string;
        locator: string;
        source_url: string;
        support_note: string;
    }[];
    review: {
        publication_status: string;
        publishable: boolean;
        independent_review: {
            status: string;
        };
        rights_review: {
            status: string;
        };
    };
    media: {
        required: boolean;
        asset_id: string | null;
        visual_recognition_assessed: boolean;
    };
}
export interface Answer {
    id: string;
    questionId: string;
    revisionId: string;
    conceptId: string;
    optionId: string;
    correct: boolean;
    section: Section;
    topic: string;
    at: string;
}
export type StudyMode = 'quick' | 'topic' | 'mistakes' | 'saved' | 'mock';
export interface StudySession {
    id: string;
    mode: StudyMode;
    title: string;
    questionIds: string[];
    answers: Answer[];
    index: number;
    startedAt: string;
    finishedAt?: string;
}
export type ThemeMode = 'light' | 'dark' | 'system';
export interface Preferences {
    name: string;
    theme: ThemeMode;
    goal: number;
    targetDate: string;
    haptics: boolean;
    reduceMotion: boolean;
    reminders: boolean;
    reminderHour: number;
    onboarded: boolean;
}
export interface Report {
    id: string;
    questionId?: string;
    message: string;
    createdAt: string;
    sent: boolean;
}
export interface LearnerState {
    preferences: Preferences;
    bookmarks: string[];
    bookmarkChanges: Record<string, { bookmarked: boolean; at: string }>;
    sessions: StudySession[];
    active: StudySession | null;
    downloaded: boolean;
    demoAccess: boolean;
    pausedPremium: StudySession | null;
    reports: Report[];
}
export const defaults: LearnerState = { preferences: { name: '', theme: 'light', goal: 10, targetDate: '', haptics: true, reduceMotion: false, reminders: false, reminderHour: 19, onboarded: false }, bookmarks: [], bookmarkChanges: {}, sessions: [], active: null, downloaded: false, demoAccess: false, pausedPremium: null, reports: [] };
