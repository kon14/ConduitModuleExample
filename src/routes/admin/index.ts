import ConduitGrpcSdk, {
  GrpcServer,
  RoutingManager,
  ConduitRouteActions,
  ConduitRouteReturnDefinition,
  ConfigController,
  ParsedRouterRequest,
  UnparsedRouterResponse,
  ConduitNumber,
} from '@conduitplatform/grpc-sdk';
import { ModuleStateObject } from '../../types';

export class AdminRoutes {
  private server?: GrpcServer;
  private grpcSdk?: ConduitGrpcSdk;
  private routingManager?: RoutingManager;
  private initialized = false;

  constructor(private readonly state: ModuleStateObject) {}

  init(server: GrpcServer, grpcSdk: ConduitGrpcSdk) {
    if (this.initialized) return;
    this.server = server;
    this.grpcSdk = grpcSdk;
    this.routingManager = new RoutingManager(grpcSdk.admin, server);
    this.initialized = true;
  }

  registerRoutes() {
    if (!this.initialized) {
      throw new Error(`${this.constructor.name} not initialized yet!`);
    }
    this.routingManager!.clear();
    this.routingManager!.route(
      {
        name: 'ResetCookies',
        path: '/cookies/reset',
        action: ConduitRouteActions.POST,
        description: 'Reset the amount of available cookies.',
        bodyParams: {
          cookiesLeft: ConduitNumber.Optional,
        },
      },
      new ConduitRouteReturnDefinition('ResetCookiesResponse', {
        previousCookiesLeft: ConduitNumber.Required,
        currentCookiesLeft: ConduitNumber.Optional,
      }),
      this.resetCookies.bind(this),
    );
    this.routingManager!.registerRoutes();
  }

  async resetCookies(call: ParsedRouterRequest): Promise<UnparsedRouterResponse> {
    const defaultCookiesLeft: string = ConfigController.getInstance().config.defaultCookieCount;
    const previousCookiesLeft = this.state.cookiesLeft;
    this.state.cookiesLeft = call.request.params.cookiesLeft ?? defaultCookiesLeft;
    ConduitGrpcSdk.Logger.log(`Available cookies set to ${this.state.cookiesLeft} via REST/GraphQL`);
    ConduitGrpcSdk.Metrics?.set('cookies_left', this.state.cookiesLeft);
    return {
      previousCookiesLeft,
      currentCookiesLeft: this.state.cookiesLeft,
    };
  }
}
