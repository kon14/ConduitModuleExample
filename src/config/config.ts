export default {
  active: {
    doc: 'Enables the module',
    format: 'Boolean',
    default: true,
  },
  defaultCookieCount: {
    doc: `The default amount of available cookies during service startup and reset`,
    format: 'Number',
    default: 20,
  },
  illegalNames: {
    doc: `A collection of illegal names that won't be receiving cookies`,
    format: 'Array',
    default: ['Alex', 'Betty', 'Charlie'],
    children: {
      format: 'String'
    },
  },
};
