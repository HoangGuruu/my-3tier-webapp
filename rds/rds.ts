import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface RdsArgs {
    name: string;
    username: string;
    password: pulumi.Input<string>;
    dbName: string;
    instanceClass: string;
    allocatedStorage: number;
    engine: string;
    engineVersion: string;
    subnetIds: pulumi.Input<string>[];
    vpcSecurityGroupIds: pulumi.Input<string>[];
    skipFinalSnapshot?: boolean;
    tags?: { [key: string]: string };
}

export interface RdsOutputs {
    instance: aws.rds.Instance;
    subnetGroup: aws.rds.SubnetGroup;
    endpoint: pulumi.Output<string>;
    port: pulumi.Output<number>;
    address: pulumi.Output<string>;
}

export function createRdsInstance(args: RdsArgs): RdsOutputs {
    // Create a subnet group for the RDS instance
    const subnetGroup = new aws.rds.SubnetGroup(`${args.name}-subnet-group`, {
        subnetIds: args.subnetIds,
        tags: {
            Name: `${args.name}-subnet-group`,
            Project: "3TierWebApp",
            ...args.tags,
        },
    });

    // Create an RDS instance
    const instance = new aws.rds.Instance(args.name, {
        allocatedStorage: args.allocatedStorage,
        engine: args.engine,
        engineVersion: args.engineVersion,
        instanceClass: args.instanceClass,
        dbName: args.dbName,
        username: args.username,
        password: args.password,
        skipFinalSnapshot: args.skipFinalSnapshot ?? true,
        dbSubnetGroupName: subnetGroup.name,
        vpcSecurityGroupIds: args.vpcSecurityGroupIds,
        tags: {
            Name: args.name,
            Project: "3TierWebApp",
            ...args.tags,
        },
    });

    return {
        instance,
        subnetGroup,
        endpoint: instance.endpoint,
        port: instance.port,
        address: instance.address,
    };
}