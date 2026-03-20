import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';

interface CdnStackProps extends cdk.StackProps {
  envName: string;
  prefix: string;
}

export class CdnStack extends cdk.Stack {
  public readonly uploadsBucket: s3.Bucket;
  public readonly cdnBucket: s3.Bucket;
  public readonly cdnDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: CdnStackProps) {
    super(scope, id, props);

    const { prefix, envName } = props;

    // Uploads bucket (private — presigned URL access only)
    this.uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      bucketName: `${prefix}-uploads`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: false,
      lifecycleRules: [
        {
          id: 'delete-temp-uploads',
          prefix: 'temp/',
          expiration: cdk.Duration.days(1),
        },
      ],
      cors: [
        {
          allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 3000,
        },
      ],
      removalPolicy: envName === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // CDN bucket (public, serves optimized images)
    this.cdnBucket = new s3.Bucket(this, 'CdnBucket', {
      bucketName: `${prefix}-cdn`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: envName === 'production' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    // CloudFront OAC
    const oac = new cloudfront.S3OriginAccessControl(this, 'OAC', {
      signing: cloudfront.Signing.SIGV4_NO_OVERRIDE,
    });

    // CloudFront distribution
    this.cdnDistribution = new cloudfront.Distribution(this, 'CdnDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.cdnBucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        compress: true,
      },
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200, // US, EU, Asia
      comment: `${prefix} CDN`,
    });

    // Image optimization Lambda (runs on upload)
    // NOTE: Lambda code must be deployed separately from apps/api/src/lambda/image-optimizer/
    // This is a placeholder that can be replaced with actual Lambda zip
    const imageOptimizerFn = new lambda.Function(this, 'ImageOptimizer', {
      functionName: `${prefix}-image-optimizer`,
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Image optimizer triggered:', JSON.stringify(event));
          // TODO: Implement Sharp-based WebP conversion
          // Replace this inline code with: lambda.Code.fromAsset('../apps/worker/dist/lambda/image-optimizer')
        };
      `),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        CDN_BUCKET: this.cdnBucket.bucketName,
      },
    });

    // Grant permissions
    this.uploadsBucket.grantRead(imageOptimizerFn);
    this.cdnBucket.grantWrite(imageOptimizerFn);

    // Trigger Lambda on uploads bucket
    this.uploadsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(imageOptimizerFn),
      { prefix: 'images/', suffix: '.jpg' },
    );
    this.uploadsBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(imageOptimizerFn),
      { prefix: 'images/', suffix: '.png' },
    );

    new cdk.CfnOutput(this, 'CdnDomain', {
      value: this.cdnDistribution.distributionDomainName,
      exportName: `${prefix}-cdn-domain`,
    });
    new cdk.CfnOutput(this, 'UploadsBucketName', {
      value: this.uploadsBucket.bucketName,
      exportName: `${prefix}-uploads-bucket`,
    });
  }
}
