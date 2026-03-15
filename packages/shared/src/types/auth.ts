export enum UserRole {
  OWNER = 'owner',
  PILOT = 'pilot',
  INSPECTOR = 'inspector',
  ADMIN = 'admin',
}

export interface SessionUser {
  id: string
  email: string
  role: UserRole
  organizationId: string
  fullName: string | null
}

export interface AuthTokenPayload {
  sub: string
  email: string
  role: UserRole
  org_id: string
  exp: number
  iat: number
}

export interface SignUpInput {
  email: string
  password: string
  fullName: string
  role: UserRole
  organizationId?: string
}

export interface SignInInput {
  email: string
  password: string
}
