import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface LambdaRoleArgs {
    name: string;
    tags?: { [key: string]: string };
}

export function createLambdaRole(args: LambdaRoleArgs): aws.iam.Role {
    // Create a role for the Lambda function
    const role = new aws.iam.Role(args.name, {
        assumeRolePolicy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: {
                    Service: "lambda.amazonaws.com",
                },
            }],
        }),
        tags: {
            Name: args.name,
            Project: "3TierWebApp",
            ...args.tags,
        },
    });

    // Attach the AWS Lambda basic execution role policy
    const lambdaBasicExecution = new aws.iam.RolePolicyAttachment(`${args.name}-lambda-basic-execution`, {
        role: role.name,
        policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
    });

    // Attach the AWS Lambda VPC access execution role policy
    const lambdaVpcAccess = new aws.iam.RolePolicyAttachment(`${args.name}-lambda-vpc-access`, {
        role: role.name,
        policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole",
    });

    // Create a custom policy for RDS access
    const rdsAccessPolicy = new aws.iam.Policy(`${args.name}-rds-access`, {
        description: "Policy for Lambda to access RDS",
        policy: JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Action: [
                    "rds-db:connect",
                    "rds:DescribeDBInstances",
                    "rds:DescribeDBClusters",
                    "secretsmanager:GetSecretValue",
                ],
                Resource: "*",
            }],
        }),
    });

    // Attach the RDS access policy to the role
    const rdsAccessPolicyAttachment = new aws.iam.RolePolicyAttachment(`${args.name}-rds-access-attachment`, {
        role: role.name,
        policyArn: rdsAccessPolicy.arn,
    });

    return role;
}