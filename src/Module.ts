import ConduitGrpcSdk, {
  ManagedModule,
  DatabaseProvider,
  ConfigController,
  HealthCheckStatus,
  ConduitActiveSchema,
  GrpcRequest,
  GrpcResponse,
} from '@conduitplatform/grpc-sdk';
import {
  GetCookieRequest,
  GetCookieResponse,
  ResetCookiesRequest,
  ResetCookiesResponse,
} from './proto/service';
import ModuleConfigSchema, { Config } from './config';
import metricsSchema from './metrics';
import { AdminRoutes, AppRoutes } from './routes';
import * as models from './models';
import { ModuleStateObject } from './types';
import { status } from '@grpc/grpc-js';
import path from 'path';

export default class Module extends ManagedModule<Config> {
  configSchema = ModuleConfigSchema;
  protected metricsSchema = metricsSchema;
  service = {
    protoPath: path.resolve(__dirname, 'service.proto'),
    protoDescription: 'example.ConduitModule',
    functions: {
      GetCookie: this.getCookieGrpc.bind(this),
      ResetCookies: this.resetCookiesGrpc.bind(this),
    },
  };
  private database?: DatabaseProvider;
  private adminRouter: AdminRoutes;
  private appRouter: AppRoutes;
  private readonly state: ModuleStateObject;
  private initialized = false;

  constructor() {
    super('example-module');
    this.updateHealth(HealthCheckStatus.UNKNOWN, true);
    this.state = {
      // Module monitoring initiated during onRegister() lifecycle hook
      authAvailable: false,
      // Config-dependent values initialized during onConfig() lifecycle hook
      cookiesLeft: 0,
      illegalNames: [],
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
    this.adminRouter.registerRoutes(); // Administrative routing is always available
    this.state.authAvailable = !!this.grpcSdk.authentication;
    await this.grpcSdk.monitorModule('authentication', async (serving) => {
      this.state.authAvailable = serving;
    });
    await this.grpcSdk.monitorModule('router', async (serving) => {
      if (serving) {
        // Application routing available once Router module comes online
        this.appRouter.init(this.grpcServer, this.grpcSdk);
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
      this.state.illegalNames = config.illegalNames;
      if (!this.initialized) {
        this.state.cookiesLeft = config.defaultCookieCount;
        this.initialized = true;
      }
      this.updateHealth(HealthCheckStatus.SERVING);
    }
  }

  protected registerSchemas() {
    const promises = Object.values(models).map(model => {
      const modelInstance = model.getInstance(this.database);
      if (
        Object.keys((modelInstance as ConduitActiveSchema<typeof modelInstance>).fields)
          .length !== 0
      ) {
        // only creating owned schemas
        return this.database!.createSchemaFromAdapter(modelInstance);
      }
    });
    return Promise.all(promises);
  }

  async initializeMetrics() {
    const cookiesTotal = await models.CookieReceipt.getInstance().countDocuments({});
    ConduitGrpcSdk.Metrics?.increment('cookie_requests_total', cookiesTotal);
    ConduitGrpcSdk.Metrics?.set('cookies_left', this.state.cookiesLeft);
  }

  // gRPC RPCs
  async getCookieGrpc(call: GrpcRequest<GetCookieRequest>, callback: GrpcResponse<GetCookieResponse>) {
    ConduitGrpcSdk.Metrics?.increment('cookie_requests_total', 1);
    ConduitGrpcSdk.Metrics?.set('cookies_left', --this.state.cookiesLeft);
    const { name } = call.request;
    if (this.state.cookiesLeft === 0) {
      return callback({
        code: status.RESOURCE_EXHAUSTED,
        message: 'We run out of cookies 😵!',
      });
    }
    this.state.illegalNames.forEach(illegalName => {
      if (name.toLowerCase() === illegalName.toLowerCase()) {
        ConduitGrpcSdk.Logger.error(`${name} attempted to receive a cookie via gRPC`);
        return callback({
          code: status.ABORTED,
          message: `I'm sorry ${name}, no cookies for you today 💅.`,
        });
      }
    });
    ConduitGrpcSdk.Logger.log(`${name} received a cookie via gRPC`);
    callback(null, {
      msg: `Hey there ${name}, have a cookie 🍪.`,
    });
  }

  async resetCookiesGrpc(call: GrpcRequest<ResetCookiesRequest>, callback: GrpcResponse<ResetCookiesResponse>) {
    const defaultCookiesLeft: number = ConfigController.getInstance().config.defaultCookieCount;
    const previousCookiesLeft = this.state.cookiesLeft;
    this.state.cookiesLeft = call.request.cookiesLeft ?? defaultCookiesLeft;
    ConduitGrpcSdk.Logger.log(`Available cookies set to ${this.state.cookiesLeft} via gRPC`);
    ConduitGrpcSdk.Metrics?.set('cookies_left', this.state.cookiesLeft);
    callback(null, {
      previousCookiesLeft,
      currentCookiesLeft: this.state.cookiesLeft },
    );
  }
}
