import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Import modules
import { createVpc } from "./vpc/vpc";
import { createS3Website } from "./s3/s3";
import { createLambdaRole } from "./iam/iam";
import { createLambdaWithApiGateway } from "./lambda/lambda";
import { createRdsInstance } from "./rds/rds";
import { createLambdaSecurityGroup, createRdsSecurityGroup } from "./vpc/security-groups";
import { updateFrontendWithApiUrl, uploadFrontendToS3,restoreFrontendWithApiUrl } from "./frontend/frontend";
import { vpcConfig, s3Config, rdsConfig, lambdaConfig, apiGatewayConfig } from "./config";

// Create VPC and networking components
const vpc = createVpc({
    vpcName: vpcConfig.vpcName,
    vpcCidr: vpcConfig.vpcCidr,
    publicSubnetCidrs: vpcConfig.publicSubnetCidrs,
    privateSubnetCidrs: vpcConfig.privateSubnetCidrs,
    availabilityZones: vpcConfig.availabilityZones,
});

// Create security groups
const lambdaSecurityGroup = createLambdaSecurityGroup({
    name: `${lambdaConfig.name}-sg`,
    vpcId: vpc.vpc.id,
    description: "Security group for Lambda function",
});

const rdsSecurityGroup = createRdsSecurityGroup({
    name: `${rdsConfig.name}-sg`,
    vpcId: vpc.vpc.id,
    description: "Security group for RDS instance",
}, lambdaSecurityGroup.id);

// Create RDS instance
const rds = createRdsInstance({
    name: rdsConfig.name,
    username: rdsConfig.username,
    password: rdsConfig.password,
    dbName: rdsConfig.dbName,
    instanceClass: rdsConfig.instanceClass,
    allocatedStorage: rdsConfig.allocatedStorage,
    engine: rdsConfig.engine,
    engineVersion: rdsConfig.engineVersion,
    subnetIds: vpc.privateSubnets.map(subnet => subnet.id),
    vpcSecurityGroupIds: [rdsSecurityGroup.id],
    skipFinalSnapshot: rdsConfig.skipFinalSnapshot,
});

// Create IAM role for Lambda
const lambdaRole = createLambdaRole({
    name: lambdaConfig.roleName,
});

// Create Lambda function with API Gateway
const lambda = createLambdaWithApiGateway(
    {
        name: lambdaConfig.name,
        role: lambdaRole,
        vpcConfig: {
            subnetIds: vpc.privateSubnets.map(subnet => subnet.id),
            securityGroupIds: [lambdaSecurityGroup.id],
        },
        environment: {
            variables: {
                DB_HOST: rds.address,
                DB_PORT: rds.port.apply(port => port.toString()),
                DB_NAME: rdsConfig.dbName,
                DB_USER: rdsConfig.username,
                DB_PASSWORD: rdsConfig.password,
            },
        },
    },
    {
        name: apiGatewayConfig.name,
        lambdaFunction: undefined as any, // This will be set by the function
        stageName: apiGatewayConfig.stageName,
    }
);

// Create frontend S3 bucket for static website hosting
const frontend = createS3Website({
    bucketName: s3Config.bucketName,
    indexDocument: s3Config.indexDocument,
    errorDocument: s3Config.errorDocument,
});


// Update frontend with API Gateway URL
const updateUrl = updateFrontendWithApiUrl(lambda.invokeUrl);

updateUrl.apply(() => {
    // Upload frontend files to S3
    uploadFrontendToS3(frontend.bucket);
    // Restore file
    restoreFrontendWithApiUrl(lambda.invokeUrl);
});

// Export outputs
export const vpcId = vpc.vpc.id;
export const publicSubnetIds = vpc.publicSubnets.map(subnet => subnet.id);
export const privateSubnetIds = vpc.privateSubnets.map(subnet => subnet.id);

export const websiteUrl = frontend.websiteUrl;
export const apiEndpoint = lambda.invokeUrl;

// Mask sensitive parts of the RDS endpoint
export const rdsEndpoint = pulumi.secret(
    rds.endpoint.apply(endpoint => {
      const parts = endpoint.split(':');
      if (parts.length >= 1) {
        return parts[0]; 
      }
      return "unknown";
    })
  );
  