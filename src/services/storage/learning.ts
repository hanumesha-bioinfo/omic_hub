import { BioinformaticsProgram, Course, TrainingProgram } from '../../types';
import {
  INITIAL_COURSES,
  INITIAL_TRAINING_PROGRAMS,
  INITIAL_VERIFIED_PROGRAMS,
} from './defaults';
import { STORAGE_KEYS } from './keys';
import { readJson, writeJson } from './localStore';
import { notifySync } from './sync';

export function getCourses(): Course[] {
  const stored = readJson<Course[]>(STORAGE_KEYS.COURSES);
  return stored.status === 'ok' && Array.isArray(stored.value) ? stored.value : INITIAL_COURSES;
}

export function saveCourses(courses: Course[]): void {
  if (writeJson(STORAGE_KEYS.COURSES, courses)) {
    notifySync(STORAGE_KEYS.COURSES, courses);
  }
}

export function getPrograms(): BioinformaticsProgram[] {
  const stored = readJson<BioinformaticsProgram[]>(STORAGE_KEYS.PROGRAMS);
  return stored.status === 'ok' && Array.isArray(stored.value)
    ? stored.value
    : INITIAL_VERIFIED_PROGRAMS;
}

export function savePrograms(programs: BioinformaticsProgram[]): void {
  if (writeJson(STORAGE_KEYS.PROGRAMS, programs)) {
    notifySync(STORAGE_KEYS.PROGRAMS, programs);
  }
}

export function getTrainingPrograms(): TrainingProgram[] {
  return INITIAL_TRAINING_PROGRAMS;
}
