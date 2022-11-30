import convict from 'convict';
import ModuleConfigSchema from './config';

const config = convict(ModuleConfigSchema);
const configProperties = config.getProperties();
export type Config = typeof configProperties;
export default ModuleConfigSchema;
