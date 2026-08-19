export type SurveyType = 'survey' | 'quiz';
export type SurveyStatus = 'draft' | 'published' | 'archived';
export type AccessMode = 'open' | 'password' | 'invitation';

export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multiple_choice'
  | 'rating'
  | 'yes_no'
  | 'date'
  | 'file_upload'
  | 'store_hierarchy'
  | 'ordering';

export interface QuestionOption {
  id: string;
  question_id: string;
  text: string;
  value: string;
  next_question_id?: string;
  is_correct?: boolean;
  weight?: number;
}

export interface JumpRule {
  id: string;
  question_id: string;
  condition_type: 'option_equals' | 'rating_greater' | 'rating_less' | 'yes_no_equals' | 'always';
  value: string;
  target_question_id: string;
}

export interface Question {
  id: string;
  survey_id: string;
  question_bank_id?: string;
  type: QuestionType;
  title: string;
  description?: string;
  order: number;
  required: boolean;
  options?: QuestionOption[];
  jump_rules?: JumpRule[];
  
  rating_min?: number;
  rating_max?: number;
  rating_min_label?: string;
  rating_max_label?: string;
  
  max_file_size_mb?: number;
  allowed_file_types?: string[];

  correct_feedback?: string;
  incorrect_feedback?: string;
  points?: number;
  is_ungraded?: boolean;

  isCollapsed?: boolean;
}

export interface ThemeConfig {
  theme_style?: 'base' | 'crimson' | 'dark';
  primary_color: string;
  background_color: string;
  background_image_url?: string;
  card_style: 'standard' | 'glass' | 'minimal';
  font_family: 'inter' | 'poppins' | 'playfair' | 'jakarta';
  logo_url?: string;
  logo_position?: 'left' | 'center';
}

export interface ThankYouConfig {
  title: string;
  message: string;
  show_button: boolean;
  button_text?: string;
  button_url?: string;
  show_score?: boolean;
}

export interface HiddenFieldConfig {
  key: string;
  label: string;
  default_value?: string;
}

export const DEFAULT_SURVEY_CATEGORIES = [
  'Operaciones',
  'Servicio al Cliente',
  'Auditoría / Calidad',
  'Recursos Humanos',
  'Capacitación',
  'Seguridad y Salud',
  'General',
] as const;

export type SurveyCategory = typeof DEFAULT_SURVEY_CATEGORIES[number] | (string & {});

export interface Survey {
  id: string;
  owner_id: string;
  owner_name?: string;
  type: SurveyType;
  category?: string;
  title: string;
  description?: string;
  status: SurveyStatus;
  
  theme: ThemeConfig;
  thank_you: ThankYouConfig;

  access_mode: AccessMode;
  access_password?: string;
  hidden_fields?: HiddenFieldConfig[];

  scoring_type?: 'simple' | 'weighted';
  passing_score_percent?: number;
  show_results_immediately?: boolean;
  show_results_in_reports?: boolean;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  max_attempts?: number;
  time_limit_seconds?: number;

  questions: Question[];

  created_at: string;
  updated_at: string;
}

export interface Answer {
  id: string;
  response_id: string;
  question_id: string;
  question_title: string;
  question_type: QuestionType;
  value: any;
  value_display?: string;
  is_correct?: boolean;
  points_earned?: number;
  max_points?: number;
}

export interface ResponseRecord {
  id: string;
  survey_id: string;
  token?: string;
  respondent_id?: string;
  respondent_email?: string;
  respondent_ref?: string;
  status: 'partial' | 'completed';
  last_question_id?: string;
  started_at: string;
  completed_at?: string;
  created_at?: string;
  duration_seconds?: number;
  
  score_percent?: number;
  passed?: boolean;
  total_points?: number;
  earned_points?: number;

  segments?: Record<string, string>;
  answers: Answer[];
}

export interface QuizAnalyticsSummary {
  total_attempts: number;
  total_completed: number;
  avg_score_percent: number;
  pass_rate_percent: number;
  avg_time_seconds: number;
  score_distribution: { range: string; count: number }[];
  question_accuracy: {
    question_id: string;
    question_title: string;
    total_answers: number;
    correct_answers: number;
    accuracy_percent: number;
  }[];
}
