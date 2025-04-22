import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Get the current stack
const stack = pulumi.getStack();

// Create a new config object
const config = new pulumi.Config();

// VPC Configuration
export const vpcConfig = {
    vpcName: `3tier-vpc-${stack}`,
    vpcCidr: config.get("vpcCidr") || "10.0.0.0/16",
    publicSubnetCidrs: config.getObject<string[]>("publicSubnetCidrs") || ["10.0.1.0/24", "10.0.2.0/24"],
    privateSubnetCidrs: config.getObject<string[]>("privateSubnetCidrs") || ["10.0.3.0/24", "10.0.4.0/24"],
    availabilityZones: config.getObject<string[]>("availabilityZones") || [
        `${aws.config.region}a`,
        `${aws.config.region}b`,
    ],
};

// S3 Configuration
export const s3Config = {
    bucketName: config.get("bucketName") || `3tier-frontend-${stack}-${pulumi.getStack()}-${Date.now()}`,
    indexDocument: "index.html",
    errorDocument: "index.html",
};

// RDS Configuration
export const rdsConfig = {
    name: `my-3tier-db-${stack}`,
    username: config.get("dbUsername") || "dbadmin",
    password: config.requireSecret("dbPassword"),
    dbName: config.get("dbName") || "appdb",
    instanceClass: config.get("instanceType") || "db.t3.micro",
    allocatedStorage: config.getNumber("allocatedStorage") || 20,
    engine: "postgres",
    engineVersion: "17.1",
    skipFinalSnapshot: true,
};

// Lambda Configuration
export const lambdaConfig = {
    name: `my-3tier-lambda-${stack}`,
    roleName: `my-3tier-lambda-role-${stack}`,
};

// API Gateway Configuration
export const apiGatewayConfig = {
    name: `my-3tier-api-${stack}`,
    stageName: stack,
};