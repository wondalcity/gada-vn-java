import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

interface RdsStackProps extends cdk.StackProps {
  envName: string;
  prefix: string;
  vpc: ec2.Vpc;
  dbSecurityGroup: ec2.SecurityGroup;
}

export class RdsStack extends cdk.Stack {
  public readonly dbSecret: secretsmanager.Secret;
  public readonly dbEndpoint: string;

  constructor(scope: Construct, id: string, props: RdsStackProps) {
    super(scope, id, props);

    const { prefix, vpc, dbSecurityGroup, envName } = props;
    const isProd = envName === 'production';

    // DB credentials in Secrets Manager
    this.dbSecret = new secretsmanager.Secret(this, 'DbSecret', {
      secretName: `${prefix}/rds/credentials`,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'gadaadmin' }),
        generateStringKey: 'password',
        excludeCharacters: '"@/\\',
        passwordLength: 32,
      },
    });

    // PostgreSQL parameter group with PostGIS
    const paramGroup = new rds.ParameterGroup(this, 'PgParamGroup', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      parameters: {
        'shared_preload_libraries': 'pg_stat_statements',
        'log_min_duration_statement': '1000',
      },
    });

    // RDS PostgreSQL 16
    const dbInstance = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16,
      }),
      instanceType: isProd
        ? ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE)
        : ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MEDIUM),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromSecret(this.dbSecret),
      databaseName: 'gada_vn',
      parameterGroup: paramGroup,
      multiAz: isProd,
      storageEncrypted: true,
      backupRetention: cdk.Duration.days(isProd ? 14 : 3),
      deletionProtection: isProd,
      enablePerformanceInsights: isProd,
      instanceIdentifier: `${prefix}-db`,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // Read replica (production only)
    if (isProd) {
      new rds.DatabaseInstanceReadReplica(this, 'ReadReplica', {
        sourceDatabaseInstance: dbInstance,
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.R6G, ec2.InstanceSize.LARGE),
        vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [dbSecurityGroup],
        instanceIdentifier: `${prefix}-db-replica`,
      });
    }

    this.dbEndpoint = dbInstance.dbInstanceEndpointAddress;

    new cdk.CfnOutput(this, 'DbEndpoint', {
      value: dbInstance.dbInstanceEndpointAddress,
      exportName: `${prefix}-db-endpoint`,
    });
    new cdk.CfnOutput(this, 'DbSecretArn', {
      value: this.dbSecret.secretArn,
      exportName: `${prefix}-db-secret-arn`,
    });
  }
}
