import { MetricType } from '@conduitplatform/grpc-sdk';

export default {
  helloRequestsTotal: {
    type: MetricType.Gauge,
    config: {
      name: 'hello_requests_total',
      help: `Tracks the total number of 'Hello' requests`,
    },
  },
  hellosLeft: {
    type: MetricType.Counter,
    config: {
      name: 'hellos_left',
      help: `Tracks the number of 'Hello's left before resource exhaustion`,
    },
  },
};
