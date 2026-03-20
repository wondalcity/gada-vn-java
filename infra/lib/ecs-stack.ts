import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { Construct } from 'constructs';

interface EcsStackProps extends cdk.StackProps {
  envName: string;
  prefix: string;
  vpc: ec2.Vpc;
  ecsSecurityGroup: ec2.SecurityGroup;
  uploadsBucket: s3.Bucket;
  cdnDistribution: cloudfront.Distribution;
}

export class EcsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const { prefix, vpc, ecsSecurityGroup, envName, uploadsBucket } = props;
    const isProd = envName === 'production';

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'Cluster', {
      clusterName: `${prefix}-cluster`,
      vpc,
      containerInsights: true,
    });

    // ECR Repositories
    const apiRepo = new ecr.Repository(this, 'ApiRepo', {
      repositoryName: `${prefix}/api`,
      imageScanOnPush: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    const webRepo = new ecr.Repository(this, 'WebRepo', {
      repositoryName: `${prefix}/web`,
      imageScanOnPush: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    const adminRepo = new ecr.Repository(this, 'AdminRepo', {
      repositoryName: `${prefix}/admin`,
      imageScanOnPush: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [{ maxImageCount: 10 }],
    });

    // Task execution role
    const executionRole = new iam.Role(this, 'ExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Task role with S3 + Secrets access
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });
    uploadsBucket.grantReadWrite(taskRole);
    taskRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMReadOnlyAccess'),
    );

    // Log groups
    const apiLogGroup = new logs.LogGroup(this, 'ApiLogs', {
      logGroupName: `/ecs/${prefix}/api`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const webLogGroup = new logs.LogGroup(this, 'WebLogs', {
      logGroupName: `/ecs/${prefix}/web`,
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ── API Service ──────────────────────────────────────────────────────
    const apiService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'ApiService', {
      cluster,
      serviceName: `${prefix}-api`,
      cpu: isProd ? 1024 : 512,
      memoryLimitMiB: isProd ? 2048 : 1024,
      desiredCount: isProd ? 2 : 1,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [ecsSecurityGroup],
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(apiRepo, 'latest'),
        containerPort: 3001,
        executionRole,
        taskRole,
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'api',
          logGroup: apiLogGroup,
        }),
        environment: {
          NODE_ENV: envName,
          PORT: '3001',
        },
        secrets: {
          // Secrets pulled from AWS Secrets Manager at runtime
          // DATABASE_URL: ecs.Secret.fromSecretsManager(dbSecret, 'connectionString'),
        },
      },
      publicLoadBalancer: true,
      listenerPort: 443,
      healthCheck: {
        command: ['CMD-SHELL', 'curl -f http://localhost:3001/health || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        healthyThresholdCount: 2,
        unhealthyThresholdCount: 3,
      },
    });

    // API Auto Scaling
    const apiScaling = apiService.service.autoScaleTaskCount({
      minCapacity: isProd ? 2 : 1,
      maxCapacity: isProd ? 10 : 3,
    });
    apiScaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 60,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });
    apiScaling.scaleOnRequestCount('RequestScaling', {
      requestsPerTarget: 1000,
      targetGroup: apiService.targetGroup,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(30),
    });

    // ── Web Service ──────────────────────────────────────────────────────
    const webService = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'WebService', {
      cluster,
      serviceName: `${prefix}-web`,
      cpu: isProd ? 1024 : 512,
      memoryLimitMiB: isProd ? 2048 : 1024,
      desiredCount: isProd ? 2 : 1,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [ecsSecurityGroup],
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(webRepo, 'latest'),
        containerPort: 3000,
        executionRole,
        taskRole,
        logDriver: ecs.LogDrivers.awsLogs({
          streamPrefix: 'web',
          logGroup: webLogGroup,
        }),
        environment: {
          NODE_ENV: envName,
          PORT: '3000',
        },
      },
      publicLoadBalancer: true,
      listenerPort: 443,
    });

    const webScaling = webService.service.autoScaleTaskCount({
      minCapacity: isProd ? 2 : 1,
      maxCapacity: isProd ? 8 : 3,
    });
    webScaling.scaleOnCpuUtilization('WebCpuScaling', {
      targetUtilizationPercent: 70,
      scaleInCooldown: cdk.Duration.seconds(60),
      scaleOutCooldown: cdk.Duration.seconds(60),
    });

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: apiService.loadBalancer.loadBalancerDnsName,
      exportName: `${prefix}-api-url`,
    });
    new cdk.CfnOutput(this, 'WebUrl', {
      value: webService.loadBalancer.loadBalancerDnsName,
      exportName: `${prefix}-web-url`,
    });
    new cdk.CfnOutput(this, 'ApiEcrUri', {
      value: apiRepo.repositoryUri,
      exportName: `${prefix}-api-ecr`,
    });
    new cdk.CfnOutput(this, 'WebEcrUri', {
      value: webRepo.repositoryUri,
      exportName: `${prefix}-web-ecr`,
    });
    new cdk.CfnOutput(this, 'AdminEcrUri', {
      value: adminRepo.repositoryUri,
      exportName: `${prefix}-admin-ecr`,
    });
  }
}
