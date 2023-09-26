// Model Controller for Authentication Module's User Schema

// This codebase doesn't technically need this class,
// but you can use it to ergonomically perform User related db queries.
// It also provides a type signature for User variables.

import { DatabaseProvider, Indexable } from '@conduitplatform/grpc-sdk';
import { ConduitActiveSchema } from '@conduitplatform/module-tools';

export class User extends ConduitActiveSchema<User> {
  private static _instance: User;
  _id!: string;
  email!: string;
  hashedPassword?: string;
  google?: {
    id: string;
    token: string;
    tokenExpires: Date;
    data: Indexable;
  };
  facebook?: {
    id: string;
    token: string;
    data: Indexable;
  };
  twitch?: {
    id: string;
    token: string;
    tokenExpires: string;
    profile_image_url?: string;
    data: Indexable;
  };
  slack?: {
    id: string;
    token: string;
    tokenExpires: Date;
    data: Indexable;
  };
  figma?: {
    id: string;
    token: string;
    tokenExpires: Date;
    data: Indexable;
  };
  microsoft?: {
    id: string;
    token: string;
    tokenExpires: Date;
    data: Indexable;
  };
  github?: {
    id: string;
    token: string;
    tokenExpires: Date;
    data: Indexable;
  };
  active!: boolean;
  isVerified!: boolean;
  hasTwoFA!: boolean;
  twoFaMethod!: string;
  phoneNumber?: string;
  createdAt!: Date;
  updatedAt!: Date;

  constructor(database: DatabaseProvider) {
    super(database, 'User');
  }

  static getInstance(database?: DatabaseProvider) {
    if (User._instance) return User._instance;
    if (!database) {
      throw new Error('No database instance provided!');
    }
    User._instance = new User(database);
    return User._instance;
  }
}
