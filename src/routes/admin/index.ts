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
import { ModuleStateObject} from '../../types';

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
        name: 'ResetHellos',
        path: '/hellos/reset',
        action: ConduitRouteActions.POST,
        description: 'Reset Hello requests left.',
        bodyParams: {
          hellosLeft: ConduitNumber.Optional,
        },
      },
      new ConduitRouteReturnDefinition('ResetHellosResponse', {
        previousHellosLeft: ConduitNumber.Required,
        currentHellosLeft: ConduitNumber.Optional,
      }),
      this.resetHellos.bind(this),
    );
    this.routingManager!.registerRoutes();
  }

  async resetHellos(call: ParsedRouterRequest): Promise<UnparsedRouterResponse> {
    const defaultHellosLeft: string = ConfigController.getInstance().config.defaultHellos;
    const previousHellosLeft = this.state.hellosLeft;
    this.state.hellosLeft = call.request.params.hellosLeft ?? defaultHellosLeft;
    ConduitGrpcSdk.Metrics?.set('hellos_left', this.state.hellosLeft);
    return {
      previousHellosLeft,
      currentHellosLeft: this.state.hellosLeft,
    };
  }
}
