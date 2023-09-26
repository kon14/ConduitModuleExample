import ConduitGrpcSdk, {
  ConduitRouteActions,
  ConduitRouteReturnDefinition,
  GrpcError,
  ParsedRouterRequest,
  UnparsedRouterResponse,
} from '@conduitplatform/grpc-sdk';
import {
  GrpcServer,
  RoutingManager,
  ConduitString,
} from '@conduitplatform/module-tools';
import { ModuleStateObject } from '../../types';
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
        name: 'GetCookieGuest',
        path: '/cookies/guest',
        action: ConduitRouteActions.GET,
        description: 'Receive a free cookie... or get judged upon!',
        queryParams: {
          name: ConduitString.Required,
        },
      },
      new ConduitRouteReturnDefinition('GetCookieGuestResponse', 'String'),
      this.getCookieUnauthenticated.bind(this),
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
        this.getCookieAuthenticated.bind(this),
      );
    }
    this.routingManager!.registerRoutes();
  }

  async getCookieUnauthenticated(call: ParsedRouterRequest): Promise<UnparsedRouterResponse> {
    const name: string = call.request.queryParams.name;
    return this.getCookie(name);
  }

  async getCookieAuthenticated(call: ParsedRouterRequest): Promise<UnparsedRouterResponse> {
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
        ConduitGrpcSdk.Logger.error(`${name} attempted to receive a cookie via REST/GraphQL`);
        return `I'm sorry ${name}, no cookies for you today 💅.`;
      }
    }
    await CookieReceipt.getInstance().create({
      receiverName: name,
    });
    ConduitGrpcSdk.Logger.log(`${name} received a cookie via REST/GraphQL`);
    return `Hey there ${name}, have a cookie 🍪.`;
  }
}
