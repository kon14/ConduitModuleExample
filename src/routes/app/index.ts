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
import { CookieReceipt, User } from '../../models';
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
    this.routingManager = new RoutingManager(grpcSdk.router!, server);
    this.initialized = true;
  }

  registerRoutes() {
    if (!this.initialized) {
      throw new Error(`${this.constructor.name} not initialized yet!`);
    }
    this.routingManager!.clear();
    // Unauthorized Variant
    this.routingManager!.route(
      {
        name: 'GetCookie',
        path: '/cookies',
        action: ConduitRouteActions.POST,
        description: 'Receive a free cookie... or get judged upon!',
        bodyParams: {
          name: ConduitString.Required,
        },
      },
      new ConduitRouteReturnDefinition('GetCookieResponse', 'String'),
      this.getCookieUnauthorized.bind(this),
    );
    // Authorized Variant
    if (this.state.authAvailable) {
      this.routingManager!.route(
        {
          name: 'GetCookie',
          path: '/cookies',
          action: ConduitRouteActions.GET,
          description: 'Receive a free cookie... or get judged upon!',
          middlewares: ['authMiddleware'],
        },
        new ConduitRouteReturnDefinition('GetCookieResponse', 'String'),
        this.getCookieAuthorized.bind(this),
      );
    }
    this.routingManager!.registerRoutes();
  }

  async getCookieUnauthorized(call: ParsedRouterRequest): Promise<UnparsedRouterResponse> {
    const name: string = call.request.params.name;
    return this.getCookie(name);
  }

  async getCookieAuthorized(call: ParsedRouterRequest): Promise<UnparsedRouterResponse> {
    const user: User = call.request.context.user;
    const name = user.email.split('@')[0];
    return this.getCookie(name);
  }

  private async getCookie(name: string) {
    ConduitGrpcSdk.Metrics?.increment('cookie_requests_total', 1);
    ConduitGrpcSdk.Metrics?.set('cookies_left', --this.state.cookiesLeft);
    if (this.state.cookiesLeft === 0) {
      throw new GrpcError(
        status.RESOURCE_EXHAUSTED,
        'We run out of cookies 😵!',
      );
    }
    for (const illegalName of this.state.illegalNames) {
      if (name.toLowerCase() === illegalName.toLowerCase()) {
        return `I'm sorry ${name}, no cookies for you today 💅.`;
      }
    }
    await CookieReceipt.getInstance().create({
      receiverName: name,
    });
    return `Hey there ${name}, have a cookie 🍪.`;
  }
}
