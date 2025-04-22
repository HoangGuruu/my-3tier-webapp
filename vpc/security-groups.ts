import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface SecurityGroupArgs {
    name: string;
    vpcId: pulumi.Input<string>;
    description?: string;
    tags?: { [key: string]: string };
}

export function createLambdaSecurityGroup(args: SecurityGroupArgs): aws.ec2.SecurityGroup {
    return new aws.ec2.SecurityGroup(`${args.name}-lambda-sg`, {
        vpcId: args.vpcId,
        description: args.description || "Security group for Lambda function",
        egress: [
            {
                protocol: "-1",
                fromPort: 0,
                toPort: 0,
                cidrBlocks: ["0.0.0.0/0"],
            },
        ],
        tags: {
            Name: `${args.name}-lambda-sg`,
            Project: "3TierWebApp",
            ...args.tags,
        },
    });
}

export function createRdsSecurityGroup(args: SecurityGroupArgs, lambdaSgId: pulumi.Input<string>): aws.ec2.SecurityGroup {
    return new aws.ec2.SecurityGroup(`${args.name}-rds-sg`, {
        vpcId: args.vpcId,
        description: args.description || "Security group for RDS instance",
        ingress: [
            {
                protocol: "tcp",
                fromPort: 5432,
                toPort: 5432,
                securityGroups: [lambdaSgId],
                description: "Allow PostgreSQL access from Lambda",
            },
        ],
        tags: {
            Name: `${args.name}-rds-sg`,
            Project: "3TierWebApp",
            ...args.tags,
        },
    });
}