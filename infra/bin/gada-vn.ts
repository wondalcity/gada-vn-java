#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { RdsStack } from '../lib/rds-stack';
import { RedisStack } from '../lib/redis-stack';
import { CdnStack } from '../lib/cdn-stack';
import { EcsStack } from '../lib/ecs-stack';

const app = new cdk.App();

const env = app.node.tryGetContext('env') || 'dev';
const region = 'ap-southeast-1'; // Singapore — closest to Vietnam
const account = process.env.CDK_DEFAULT_ACCOUNT;

const awsEnv: cdk.Environment = { account, region };
const prefix = `gada-vn-${env}`;

// Networking
const vpcStack = new VpcStack(app, `${prefix}-vpc`, {
  env: awsEnv,
  envName: env,
  prefix,
});

// Data layer
const rdsStack = new RdsStack(app, `${prefix}-rds`, {
  env: awsEnv,
  envName: env,
  prefix,
  vpc: vpcStack.vpc,
  dbSecurityGroup: vpcStack.dbSecurityGroup,
});
rdsStack.addDependency(vpcStack);

const redisStack = new RedisStack(app, `${prefix}-redis`, {
  env: awsEnv,
  envName: env,
  prefix,
  vpc: vpcStack.vpc,
  redisSecurityGroup: vpcStack.redisSecurityGroup,
});
redisStack.addDependency(vpcStack);

// CDN + Storage
const cdnStack = new CdnStack(app, `${prefix}-cdn`, {
  env: awsEnv,
  envName: env,
  prefix,
});

// Application (ECS)
const ecsStack = new EcsStack(app, `${prefix}-ecs`, {
  env: awsEnv,
  envName: env,
  prefix,
  vpc: vpcStack.vpc,
  ecsSecurityGroup: vpcStack.ecsSecurityGroup,
  uploadsBucket: cdnStack.uploadsBucket,
  cdnDistribution: cdnStack.cdnDistribution,
});
ecsStack.addDependency(vpcStack);
ecsStack.addDependency(rdsStack);
ecsStack.addDependency(redisStack);
ecsStack.addDependency(cdnStack);

app.synth();
