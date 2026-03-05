export type Topic = 'humanities' | 'social' | 'science' | 'tech' | 'arts';

export interface Sentence {
  id: string;
  text: string;
}

export interface Hint {
  level: number;
  text: string;
}

export interface Question {
  difficulty_level: number;
  topic: Topic;
  passage: string;
  sentences: Sentence[];
  conclusion: string;
  correct_chain: string[];
  hints: Hint[];
}
