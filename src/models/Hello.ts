import { ConduitActiveSchema, DatabaseProvider, TYPE } from '@conduitplatform/grpc-sdk';

const schema = {
  _id: TYPE.ObjectId,
  name: {
    type: TYPE.String,
    required: true,
  },
  createdAt: TYPE.Date,
  updatedAt: TYPE.Date,
};
const modelOptions = {
  timestamps: true,
  conduit: {
    permissions: {
      extendable: true,
      canCreate: true,
      canModify: 'Everything',
      canDelete: true,
    },
  },
} as const;
const collectionName = undefined;

export class Hello extends ConduitActiveSchema<Hello> {
  private static _instance: Hello;
  _id!: string;
  name!: string;
  createdAt!: Date;
  updatedAt!: Date;

  private constructor(database: DatabaseProvider) {
    super(database, Hello.name, schema, modelOptions, collectionName);
  }

  static getInstance(database?: DatabaseProvider) {
    if (Hello._instance) return Hello._instance;
    if (!database) {
      throw new Error('No database instance provided!');
    }
    Hello._instance = new Hello(database);
    return Hello._instance;
  }
}
