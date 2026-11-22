export interface FirebaseUserPayload {
  uid: string;
  phone: string;
  email?: string | null;
  name?: string | null;
}

export interface UserRecord {
  id: string;
  firebaseUid: string;
  phone: string;
  email: string | null;
  name: string;
  role: string;
  locale: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionPayload {
  userId: string;
  firebaseUid: string;
  role: string;
  iat: number;
  exp: number;
}

export class AuthError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode: number = 401, code: string = 'AUTH_ERROR') {
    super(message);
    this.name = 'AuthError';
    this.statusCode = statusCode;
    this.code = code;
  }
}
