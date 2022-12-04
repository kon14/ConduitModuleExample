import { ModuleManager } from '@conduitplatform/grpc-sdk';
import Module from './Module';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();
const mod = new Module();
const packageJsonPath = path.resolve(__dirname, '..', 'package.json');
const moduleManager = new ModuleManager(mod, packageJsonPath);
moduleManager.start();
