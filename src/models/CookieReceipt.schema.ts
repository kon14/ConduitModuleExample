import { ConduitActiveSchema, DatabaseProvider, TYPE } from '@conduitplatform/grpc-sdk';

const schema = {
  _id: TYPE.ObjectId,
  receiverName: {
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

export class CookieReceipt extends ConduitActiveSchema<CookieReceipt> {
  private static _instance: CookieReceipt;
  _id!: string;
  receiverName!: string;
  createdAt!: Date;
  updatedAt!: Date;

  private constructor(database: DatabaseProvider) {
    super(database, CookieReceipt.name, schema, modelOptions, collectionName);
  }

  static getInstance(database?: DatabaseProvider) {
    if (CookieReceipt._instance) return CookieReceipt._instance;
    if (!database) {
      throw new Error('No database instance provided!');
    }
    CookieReceipt._instance = new CookieReceipt(database);
    return CookieReceipt._instance;
  }
}
