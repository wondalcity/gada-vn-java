import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elasticache from 'aws-cdk-lib/aws-elasticache';
import { Construct } from 'constructs';

interface RedisStackProps extends cdk.StackProps {
  envName: string;
  prefix: string;
  vpc: ec2.Vpc;
  redisSecurityGroup: ec2.SecurityGroup;
}

export class RedisStack extends cdk.Stack {
  public readonly redisEndpoint: string;
  public readonly redisPort: string;

  constructor(scope: Construct, id: string, props: RedisStackProps) {
    super(scope, id, props);

    const { prefix, vpc, redisSecurityGroup, envName } = props;
    const isProd = envName === 'production';

    // Subnet group (isolated subnets)
    const subnetGroup = new elasticache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      description: `${prefix} Redis subnet group`,
      subnetIds: vpc.isolatedSubnets.map((s) => s.subnetId),
      cacheSubnetGroupName: `${prefix}-redis-subnet`,
    });

    // ElastiCache Redis 7
    const redis = new elasticache.CfnReplicationGroup(this, 'Redis', {
      replicationGroupDescription: `${prefix} Redis`,
      replicationGroupId: `${prefix}-redis`,
      cacheNodeType: isProd ? 'cache.r6g.large' : 'cache.t4g.medium',
      engine: 'redis',
      engineVersion: '7.1',
      numCacheClusters: isProd ? 2 : 1, // 2 nodes for prod (primary + replica)
      automaticFailoverEnabled: isProd,
      multiAzEnabled: isProd,
      cacheSubnetGroupName: subnetGroup.cacheSubnetGroupName,
      securityGroupIds: [redisSecurityGroup.securityGroupId],
      atRestEncryptionEnabled: true,
      transitEncryptionEnabled: true,
    });

    redis.addDependsOn(subnetGroup);

    this.redisEndpoint = redis.attrPrimaryEndPointAddress;
    this.redisPort = redis.attrPrimaryEndPointPort;

    new cdk.CfnOutput(this, 'RedisEndpoint', {
      value: redis.attrPrimaryEndPointAddress,
      exportName: `${prefix}-redis-endpoint`,
    });
  }
}
