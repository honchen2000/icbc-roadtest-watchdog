// Known ICBC road-test exam-type codes. Users can also supply a custom code.
// Format observed: `{class}-R-1` (R = road test). Verified for Class 6 (motorcycle);
// 5 and 7 follow the same documented pattern.

export interface ExamType {
  code: string;
  label: string;
}

export const ROAD_TEST_EXAM_TYPES: ExamType[] = [
  { code: "5-R-1", label: "Class 5 — passenger vehicle road test" },
  { code: "6-R-1", label: "Class 6 — motorcycle road test" },
  { code: "7-R-1", label: "Class 7 — novice (Class 7) road test" },
];

export function findExamType(code: string): ExamType | undefined {
  return ROAD_TEST_EXAM_TYPES.find((e) => e.code === code);
}
