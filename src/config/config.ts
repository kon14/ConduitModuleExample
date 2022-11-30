export default {
  active: {
    doc: 'Enables the module',
    format: 'Boolean',
    default: true,
  },
  defaultHellos: {
    doc: `The default amount of available 'Hello's on service startup and 'Hello's reset`,
    format: 'Number',
    default: 20,
  },
  illegalNames: {
    doc: `A collection of illegal names that can't be used in 'Hello' requests`,
    format: 'Array',
    default: ['World'],
    children: {
      format: 'String'
    }
  },
};
