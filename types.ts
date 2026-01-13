export interface GalleryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string;
  size: 'small' | 'medium' | 'large';
}

export interface TuringRound {
  id: number;
  imageA: string;
  imageB: string;
  correctAnswer: 'A' | 'B'; // Which one is Human?
  humanDescription: string;
  aiDescription: string;
}

export interface GameState {
  currentRoundIndex: number;
  score: number;
  isGameOver: boolean;
  history: boolean[]; // true for correct, false for wrong
}
