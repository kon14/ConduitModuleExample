import ConduitGrpcSdk, {
  ManagedModule,
  DatabaseProvider,
  ConfigController,
  HealthCheckStatus,
  GrpcRequest,
  GrpcResponse,
} from '@conduitplatform/grpc-sdk';
import {
  HelloRequest,
  HelloResponse,
  ResetHellosRequest,
  ResetHellosResponse,
} from './proto/src/service';
import ModuleConfigSchema, { Config } from './config';
import metricsSchema from './metrics';
import { AdminRoutes, AppRoutes } from './routes';
import * as models from './models';
import {ModuleStateObject} from './types';
import { status } from '@grpc/grpc-js';
import path from 'path';

export default class Module extends ManagedModule<Config> {
  configSchema = ModuleConfigSchema;
  protected metricsSchema = metricsSchema;
  service = {
    protoPath: path.resolve(__dirname, 'service.proto'),
    protoDescription: 'example.ConduitModule',
    functions: {
      // Standard Conduit RPCs
      SetConfig: this.setConfig.bind(this),
      // Module RPCs
      Hello: this.helloGrpc.bind(this),
      ResetHellos: this.resetHellosGrpc.bind(this),
    },
  };
  private database?: DatabaseProvider;
  private adminRouter: AdminRoutes;
  private appRouter: AppRoutes;
  private readonly state: ModuleStateObject;

  constructor() {
    super('example');
    this.updateHealth(HealthCheckStatus.UNKNOWN, true);
    this.state = {
      hellosLeft: ConfigController.getInstance().config.defaultHellos,
      illegalNames: [], // initialized during onConfig() lifecycle hook
    };
    this.adminRouter = new AdminRoutes(this.state);
    this.appRouter = new AppRoutes(this.state);
  }

  /**
   * This is triggered before spinning up the module's gRPC server.
   * At this stage, the Redis bus and state have not yet been initialized,
   * and only communications with Conduit have been established.
   */
  async preServerStart() {
    this.adminRouter.init(this.grpcServer, this.grpcSdk);
    this.appRouter.init(this.grpcServer, this.grpcSdk);
  }

  /**
   * This is triggered right after gRPC server is started.
   * At this stage, Conduit will communicate with your service
   * for health checks, and the bus and state management mechanics
   * are online and available.
   */
  async onServerStart() {
    await this.grpcSdk.waitForExistence('database');
    this.database = this.grpcSdk.database!;
    await this.registerSchemas();
  }

  /**
   * Triggers right before registering the module with Conduit.
   */
  async preRegister() {}

  /**
   * Triggers when module has been registered with Conduit.
   * This is the step where you should initialize your
   * module's general routing (admin or client) and any other operation
   * that would require other modules being able to reach you
   */
  async onRegister() {
    this.adminRouter.registerRoutes();
    await this.grpcSdk.monitorModule('router', async (serving) => {
      if (serving) {
        await this.appRouter.registerRoutes();
      }
    });
  }

  /**
   * This is triggered when the module receives new configuration.
   * At this step the configuration has not been checked yet and has only been parsed.
   */
  async preConfig(config: Config) {
    return config;
  }

  /**
   * This is triggered when new configuration has been applied.
   * This happens either when changes are being made on the configuration,
   * or on module startup, where the config is recovered from the database.
   * In either case, the configuration is now available through the SDK's ConfigController.
   */
  async onConfig() {
    const config = await ConfigController.getInstance().config;
    if (!config.active) {
      this.updateHealth(HealthCheckStatus.NOT_SERVING);
    } else {
      this.state.illegalNames = ConfigController.getInstance().config.illegalNames;
      this.updateHealth(HealthCheckStatus.SERVING);
    }
  }

  protected registerSchemas() {
    const promises = Object.values(models).map((model: any) => {
      const modelInstance = model.getInstance(this.database);
      return this.database!.createSchemaFromAdapter(modelInstance);
    });
    return Promise.all(promises);
  }

  async initializeMetrics() {
    const hellosTotal = await models.Hello.getInstance().countDocuments({});
    ConduitGrpcSdk.Metrics?.set('hello_requests_total', hellosTotal);
    ConduitGrpcSdk.Metrics?.set('hellos_left', this.state.hellosLeft);
  }

  // gRPC RPCs
  async helloGrpc(call: GrpcRequest<HelloRequest>, callback: GrpcResponse<HelloResponse>) {
    ConduitGrpcSdk.Metrics?.increment('hello_requests_total', 1);
    ConduitGrpcSdk.Metrics?.set('hellos_left', --this.state.hellosLeft);
    const { name } = call.request;
    if (this.state.hellosLeft === 0) {
      return callback({
        code: status.RESOURCE_EXHAUSTED,
        message: 'We run out of Hello responses 😵!',
      });
    }
    this.state.illegalNames.forEach(illegalName => {
      if (name.toLowerCase() === illegalName.toLowerCase()) {
        return callback({
          code: status.ABORTED,
          message: 'Your name sucks 💅.',
        });
      }
    });
    callback(null, {
      msg: `Hey there ${name}, that's a fine name you got there 😘.`,
    });
  }

  async resetHellosGrpc(call: GrpcRequest<ResetHellosRequest>, callback: GrpcResponse<ResetHellosResponse>) {
    const defaultHellosLeft: number = ConfigController.getInstance().config.defaultHellos;
    const previousHellosLeft = this.state.hellosLeft;
    this.state.hellosLeft = call.request.hellosLeft ?? defaultHellosLeft;
    ConduitGrpcSdk.Metrics?.set('hellos_left', this.state.hellosLeft);
    callback(null, {
      previousHellosLeft,
      currentHellosLeft: this.state.hellosLeft },
    );
  }
}
