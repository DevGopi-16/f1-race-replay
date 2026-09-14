export interface LoginPayload {
  email: string;
  password: string;
}

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
}

export interface GooglePayload {
  id_token: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  picture_url?: string | null;
  is_pro?: boolean;
  favorite_driver?: string | null;
  favorite_team?: string | null;
  replays_watched?: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}
