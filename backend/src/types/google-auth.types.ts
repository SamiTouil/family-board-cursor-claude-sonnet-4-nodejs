export interface GoogleUser {
  email: string;
  given_name: string;
  family_name: string;
  picture?: string;
  sub: string; // Google user ID
}