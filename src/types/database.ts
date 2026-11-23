export type EventStatus =
  | 'not_started'
  | 'voting_live'
  | 'voting_completed'
  | 'revealing'
  | 'completed';

export type RevealStage =
  | 'locked'
  | 'intro'
  | 'third_place'
  | 'second_place'
  | 'first_place'
  | 'finished';

export interface EventRecord {
  id: string;
  name: string;
  event_date: string;
  is_current: boolean;
  status: EventStatus;
  reveal_stage: RevealStage;
  active_team_count: number;
  valid_vote_count: number;
  voting_started_at: string | null;
  voting_closed_at: string | null;
  reveal_started_at: string | null;
  reveal_completed_at: string | null;
  completed_at: string | null;
}

export interface TeamRecord {
  id: string;
  event_id: string;
  team_name: string;
  team_code: string;
  is_active: boolean;
  created_at: string;
}

export interface RankedTeam {
  rank: number;
  team_id: string;
  team_name: string;
  team_code: string;
  votes: number;
  is_tied: boolean;
}

export interface ResultsSnapshot {
  id: string;
  event_id: string;
  event_name: string;
  event_date: string;
  final_rankings: RankedTeam[];
  top_three: RankedTeam[];
  valid_vote_count: number;
  participating_team_count: number;
  voting_completion_percentage: number;
  completed_at: string;
}