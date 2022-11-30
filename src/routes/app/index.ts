import ConduitGrpcSdk, {
  GrpcServer,
  RoutingManager,
  ConduitRouteActions,
  ConduitRouteReturnDefinition,
  GrpcError,
  ParsedRouterRequest,
  UnparsedRouterResponse,
  ConduitString,
} from '@conduitplatform/grpc-sdk';
import { ModuleStateObject} from '../../types';
import { status } from '@grpc/grpc-js';

export class AppRoutes {
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
        name: 'Hello',
        path: '/hellos',
        action: ConduitRouteActions.POST,
        description: 'Get greeted or judged upon!',
        bodyParams: {
          nome: ConduitString.Required,
        },
      },
      new ConduitRouteReturnDefinition('HelloResponse', 'String'),
      this.hello.bind(this),
    );
    this.routingManager!.registerRoutes();
  }

  async hello(call: ParsedRouterRequest): Promise<UnparsedRouterResponse> {
    ConduitGrpcSdk.Metrics?.increment('hello_requests_total', 1);
    ConduitGrpcSdk.Metrics?.set('hellos_left', --this.state.hellosLeft);
    const name: string = call.request.params.name;
    if (this.state.hellosLeft === 0) {
      throw new GrpcError(
        status.RESOURCE_EXHAUSTED,
        'We run out of Hello responses 😵!'
      );
    }
    this.state.illegalNames.forEach(illegalName => {
      if (name.toLowerCase() === illegalName.toLowerCase()) {
        return 'Your name sucks 💅.';
      }
    });
    return `Hey there ${name}, that's a fine name you got there 😘.`;
  }
}
