export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  is_pro: boolean;
  picture_url: string | null;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface SignupPayload {
  username: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface GooglePayload {
  credential: string;
}