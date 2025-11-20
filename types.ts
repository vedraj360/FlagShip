export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export interface User {
  id: string;
  email: string;
  role: Role;
}

export interface FeatureFlag {
  id: string;
  key: string;
  displayName: string;
  description?: string;
  enabled: boolean;
  value?: string;
  type: string;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  name: string;
  key: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  flags?: FeatureFlag[];
  _count?: {
    flags: number;
  };
}

export interface LoginResponse {
  user: User;
}
