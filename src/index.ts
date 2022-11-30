import { ModuleManager } from '@conduitplatform/grpc-sdk';
import Module from './Module';
import dotenv from 'dotenv';

dotenv.config();
const mod = new Module();
const moduleManager = new ModuleManager(mod);
moduleManager.start();
