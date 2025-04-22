import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface VpcArgs {
    vpcName: string;
    vpcCidr: string;
    publicSubnetCidrs: string[];
    privateSubnetCidrs: string[];
    availabilityZones: string[];
}

export interface VpcOutputs {
    vpc: aws.ec2.Vpc;
    publicSubnets: aws.ec2.Subnet[];
    privateSubnets: aws.ec2.Subnet[];
    internetGateway: aws.ec2.InternetGateway;
    natGateway: aws.ec2.NatGateway;
    publicRouteTable: aws.ec2.RouteTable;
    privateRouteTable: aws.ec2.RouteTable;
}

export function createVpc(args: VpcArgs): VpcOutputs {
    // Create a VPC
    const vpc = new aws.ec2.Vpc(args.vpcName, {
        cidrBlock: args.vpcCidr,
        enableDnsHostnames: true,
        enableDnsSupport: true,
        tags: {
            Name: args.vpcName,
            Project: "3TierWebApp",
        },
    });

    // Create an Internet Gateway
    const internetGateway = new aws.ec2.InternetGateway(`${args.vpcName}-igw`, {
        vpcId: vpc.id,
        tags: {
            Name: `${args.vpcName}-igw`,
            Project: "3TierWebApp",
        },
    });

    // Create public subnets
    const publicSubnets = args.publicSubnetCidrs.map((cidr, index) => {
        return new aws.ec2.Subnet(`${args.vpcName}-public-${index}`, {
            vpcId: vpc.id,
            cidrBlock: cidr,
            availabilityZone: args.availabilityZones[index % args.availabilityZones.length],
            mapPublicIpOnLaunch: true,
            tags: {
                Name: `${args.vpcName}-public-${index}`,
                Project: "3TierWebApp",
                Tier: "Public",
            },
        });
    });

    // Create private subnets
    const privateSubnets = args.privateSubnetCidrs.map((cidr, index) => {
        return new aws.ec2.Subnet(`${args.vpcName}-private-${index}`, {
            vpcId: vpc.id,
            cidrBlock: cidr,
            availabilityZone: args.availabilityZones[index % args.availabilityZones.length],
            tags: {
                Name: `${args.vpcName}-private-${index}`,
                Project: "3TierWebApp",
                Tier: "Private",
            },
        });
    });

    // Create a public route table
    const publicRouteTable = new aws.ec2.RouteTable(`${args.vpcName}-public-rt`, {
        vpcId: vpc.id,
        tags: {
            Name: `${args.vpcName}-public-rt`,
            Project: "3TierWebApp",
        },
    });

    // Create a route to the internet gateway
    const publicRoute = new aws.ec2.Route(`${args.vpcName}-public-route`, {
        routeTableId: publicRouteTable.id,
        destinationCidrBlock: "0.0.0.0/0",
        gatewayId: internetGateway.id,
    });

    // Associate public subnets with the public route table
    const publicRouteTableAssociations = publicSubnets.map((subnet, index) => {
        return new aws.ec2.RouteTableAssociation(`${args.vpcName}-public-rta-${index}`, {
            subnetId: subnet.id,
            routeTableId: publicRouteTable.id,
        });
    });

    // Create an Elastic IP for the NAT Gateway
    const eip = new aws.ec2.Eip(`${args.vpcName}-eip`, {
        vpc: true,
        tags: {
            Name: `${args.vpcName}-eip`,
            Project: "3TierWebApp",
        },
    });

    // Create a NAT Gateway in the first public subnet
    const natGateway = new aws.ec2.NatGateway(`${args.vpcName}-nat`, {
        allocationId: eip.id,
        subnetId: publicSubnets[0].id,
        tags: {
            Name: `${args.vpcName}-nat`,
            Project: "3TierWebApp",
        },
    });

    // Create a private route table
    const privateRouteTable = new aws.ec2.RouteTable(`${args.vpcName}-private-rt`, {
        vpcId: vpc.id,
        tags: {
            Name: `${args.vpcName}-private-rt`,
            Project: "3TierWebApp",
        },
    });

    // Create a route to the NAT Gateway
    const privateRoute = new aws.ec2.Route(`${args.vpcName}-private-route`, {
        routeTableId: privateRouteTable.id,
        destinationCidrBlock: "0.0.0.0/0",
        natGatewayId: natGateway.id,
    });

    // Associate private subnets with the private route table
    const privateRouteTableAssociations = privateSubnets.map((subnet, index) => {
        return new aws.ec2.RouteTableAssociation(`${args.vpcName}-private-rta-${index}`, {
            subnetId: subnet.id,
            routeTableId: privateRouteTable.id,
        });
    });

    return {
        vpc,
        publicSubnets,
        privateSubnets,
        internetGateway,
        natGateway,
        publicRouteTable,
        privateRouteTable,
    };
}