import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface S3WebsiteArgs {
    bucketName: string;
    indexDocument?: string;
    errorDocument?: string;
    tags?: { [key: string]: string };
}

export interface S3WebsiteOutputs {
    bucket: aws.s3.BucketV2;
    bucketWebsite: aws.s3.BucketWebsiteConfigurationV2;
    bucketOwnershipControls: aws.s3.BucketOwnershipControls;
    bucketPublicAccessBlock: aws.s3.BucketPublicAccessBlock;
    bucketPolicy: aws.s3.BucketPolicy;
    websiteUrl: pulumi.Output<string>;
}

export function createS3Website(args: S3WebsiteArgs): S3WebsiteOutputs {
    // Create an S3 bucket
    const bucket = new aws.s3.BucketV2(args.bucketName, {
        tags: {
            Name: args.bucketName,
            Project: "3TierWebApp",
            ...args.tags,
        },
    });

    // Configure bucket ownership controls
    const bucketOwnershipControls = new aws.s3.BucketOwnershipControls(`${args.bucketName}-ownership`, {
        bucket: bucket.id,
        rule: {
            objectOwnership: "BucketOwnerPreferred",
        },
    });

    // Configure public access block settings
    const bucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(`${args.bucketName}-public-access-block`, {
        bucket: bucket.id,
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
    });

    // Configure website settings
    const bucketWebsite = new aws.s3.BucketWebsiteConfigurationV2(`${args.bucketName}-website`, {
        bucket: bucket.id,
        indexDocument: {
            suffix: args.indexDocument || "index.html",
        },
        errorDocument: args.errorDocument ? {
            key: args.errorDocument,
        } : undefined,
    });

    // Create a bucket policy to allow public read access
    const bucketPolicy = new aws.s3.BucketPolicy(`${args.bucketName}-policy`, {
        bucket: bucket.id,
        policy: pulumi.all([bucket.arn]).apply(([bucketArn]) => JSON.stringify({
            Version: "2012-10-17",
            Statement: [{
                Effect: "Allow",
                Principal: "*",
                Action: ["s3:GetObject"],
                Resource: [`${bucketArn}/*`],
            }],
        })),
    }, { dependsOn: [bucketPublicAccessBlock, bucketOwnershipControls] });

    // Generate the website URL
    const websiteUrl = pulumi.interpolate`http://${bucket.bucket}.s3-website-${aws.config.region}.amazonaws.com`;

    return {
        bucket,
        bucketWebsite,
        bucketOwnershipControls,
        bucketPublicAccessBlock,
        bucketPolicy,
        websiteUrl,
    };
}