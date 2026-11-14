import { ResumeData } from '../../types';

export interface ResumeRevision {
  id: string;
  timestamp: string;
  title: string;
  data: ResumeData;
  changeNote?: string;
}

export interface SearchResultItem {
  id: string;
  category: 'Resume Bullet' | 'Job Application' | 'Interview STAR' | 'Skill Course' | 'Contact / Profile';
  title: string;
  snippet: string;
  fullContent: string;
  metadata?: string;
  sourceTab: 'builder' | 'tracker' | 'mock-interview' | 'skills' | 'dashboard';
}
