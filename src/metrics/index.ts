import { MetricType } from '@conduitplatform/grpc-sdk';

export default {
  cookiesRequestsTotal: {
    type: MetricType.Gauge,
    config: {
      name: 'cookie_requests_total',
      help: `Tracks the total number of cookie requests`,
    },
  },
  cookiesLeft: {
    type: MetricType.Counter,
    config: {
      name: 'cookies_left',
      help: `Tracks the amount of cookies currently available`,
    },
  },
};
