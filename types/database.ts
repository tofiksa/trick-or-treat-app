export type Group = {
  id: string;
  name: string;
  created_at: string;
};

export type User = {
  id: string;
  name: string;
  group_id: string | null;
  avatar: string | null;
  created_at: string;
};

export type Checkin = {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  distance_from_previous: number;
  created_at: string;
};

export type Photo = {
  id: string;
  checkin_id: string;
  storage_url: string;
  uploaded_at: string;
};

export type CheckinWithPhotos = Checkin & {
  photos: Photo[];
};

export type UserStats = {
  checkin_count: number;
  total_distance: number;
  first_checkin_time: string | null;
};

export type GroupStats = {
  group_id: string;
  group_name: string;
  total_checkins: number;
  total_distance: number;
  participant_count: number;
};

