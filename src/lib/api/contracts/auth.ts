import type { PermissionDTO } from "./system";

export interface LoginRequest {
  username: string;
  password: string;
  twoFactorCode?: string;
  deviceId?: string;
}

export interface LoginResponse {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType?: string;
  expiresIn?: number;
  userId: string;
  username: string;
  realName?: string;
  roles?: string[];
  permissions?: string[];
  needChangePassword?: boolean;
  message?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceId?: string;
}

export interface UserInfo {
  userId: string;
  username: string;
  realName?: string;
  avatar?: string;
  email?: string;
  phone?: string;
  /** Only present once the backend exposes it; the profile form hides the field otherwise. */
  timezone?: string;
  deptId?: string;
  deptName?: string;
  userLevel?: number;
  roles?: string[];
  permissions?: string[];
  menuTree?: PermissionDTO[];
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
  confirmPassword?: string;
}

export interface WebAuthnChallengeResponse {
  challenge: string;
  rpId: string;
  timeout?: number;
  allowCredentials?: Array<Record<string, unknown>>;
  userVerification?: string;
}

export interface WebAuthnRegisterChallengeResponse {
  challenge: string;
  rpId: string;
  timeout?: number;
  user: Record<string, unknown>;
  attestation?: string;
}

export interface WebAuthnAuthenticationRequest {
  credentialId: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  userHandle?: string;
  signCount?: number;
}

export interface WebAuthnRegistrationRequest {
  credentialId: string;
  clientDataJSON: string;
  attestationObject: string;
  deviceId?: string;
  publicKeyPem?: string;
  algorithm?: string;
  deviceName?: string;
  aaguid?: string;
  transports?: string;
  authenticatorAttachment?: string;
  userVerification?: string;
  backupState?: boolean;
  backupEligible?: boolean;
}

export interface WebAuthnCredentialDTO {
  credentialId: string;
  deviceName?: string;
  algorithm?: string;
  aaguid?: string;
  transports?: string;
  authenticatorAttachment?: string;
  isActive?: boolean;
  backupState?: boolean;
  lastUsedAt?: string;
  createdTime?: string;
}

export interface TokenUpgradeResponse {
  accessToken: string;
  tokenType?: string;
  expiresIn?: number;
}

/** `GET /api/auth/sessions` — one row per active login session. */
export interface AuthSessionDTO {
  sessionId: string;
  deviceName?: string;
  deviceType?: "web" | "mobile" | "desktop";
  ip?: string;
  location?: string;
  userAgent?: string;
  createdAt?: string;
  lastActiveAt?: string;
  /** True for the session that issued the current access token. */
  current?: boolean;
}

/** `POST /api/auth/sessions/logout-others` — the current session is always kept. */
export interface LogoutOthersResponse {
  revokedCount: number;
}
