import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface LambdaArgs {
    name: string;
    role: aws.iam.Role;
    vpcConfig: {
        subnetIds: pulumi.Input<string>[];
        securityGroupIds: pulumi.Input<string>[];
    };
    environment?: {
        variables: {
            [key: string]: pulumi.Input<string>;
        };
    };
    tags?: { [key: string]: string };
}

export interface ApiGatewayArgs {
    name: string;
    lambdaFunction: aws.lambda.Function;
    stageName: string;
    tags?: { [key: string]: string };
}

export interface LambdaOutputs {
    lambdaFunction: aws.lambda.Function;
    apiGateway: aws.apigateway.RestApi;
    apiGatewayDeployment: aws.apigateway.Deployment;
    apiGatewayStage: aws.apigateway.Stage;
    apiGatewayIntegration: aws.apigateway.Integration;
    apiGatewayMethod: aws.apigateway.Method;
    apiGatewayPermission: aws.lambda.Permission;
    invokeUrl: pulumi.Output<string>;
}

export function createLambdaWithApiGateway(lambdaArgs: LambdaArgs, apiGatewayArgs: ApiGatewayArgs): LambdaOutputs {
    // Create a Lambda function
    const lambdaFunction = new aws.lambda.Function(lambdaArgs.name, {
        runtime: "nodejs18.x",
        role: lambdaArgs.role.arn,
        handler: "index.handler",
        code: new pulumi.asset.AssetArchive({
            ".": new pulumi.asset.FileArchive("./lambda/lambda-code"),
        }),
        vpcConfig: {
            subnetIds: lambdaArgs.vpcConfig.subnetIds,
            securityGroupIds: lambdaArgs.vpcConfig.securityGroupIds,
        },
        environment: lambdaArgs.environment,
        tags: {
            Name: lambdaArgs.name,
            Project: "3TierWebApp",
            ...lambdaArgs.tags,
        },
    });

    // Create an API Gateway REST API
    const apiGateway = new aws.apigateway.RestApi(apiGatewayArgs.name, {
        description: "API Gateway for 3-tier web application",
        tags: {
            Name: apiGatewayArgs.name,
            Project: "3TierWebApp",
            ...apiGatewayArgs.tags,
        },
    });

    // Create a resource and method for the API Gateway
    const apiResource = new aws.apigateway.Resource("api-resource", {
        restApi: apiGateway.id,
        parentId: apiGateway.rootResourceId,
        pathPart: "api",
    });

    // Create a method for the API Gateway
    const apiGatewayMethod = new aws.apigateway.Method("api-method", {
        restApi: apiGateway.id,
        resourceId: apiResource.id,
        httpMethod: "ANY",
        authorization: "NONE",
    });

    // Create an integration for the API Gateway
    const apiGatewayIntegration = new aws.apigateway.Integration("api-integration", {
        restApi: apiGateway.id,
        resourceId: apiResource.id,
        httpMethod: apiGatewayMethod.httpMethod,
        integrationHttpMethod: "POST",
        type: "AWS_PROXY",
        uri: lambdaFunction.invokeArn,
    });

    // Create a deployment for the API Gateway
    const apiGatewayDeployment = new aws.apigateway.Deployment("api-deployment", {
        restApi: apiGateway.id,
        description: "API Gateway deployment for 3-tier web application",
    }, { dependsOn: [apiGatewayIntegration] });

    // Create a stage for the API Gateway
    const apiGatewayStage = new aws.apigateway.Stage("api-stage", {
        restApi: apiGateway.id,
        deployment: apiGatewayDeployment.id,
        stageName: apiGatewayArgs.stageName,
    });

    // Create a permission for the API Gateway to invoke the Lambda function
    const apiGatewayPermission = new aws.lambda.Permission("api-gateway-permission", {
        action: "lambda:InvokeFunction",
        function: lambdaFunction.name,
        principal: "apigateway.amazonaws.com",
        sourceArn: pulumi.interpolate`${apiGateway.executionArn}/*`,
    });
    

    // Generate the invoke URL
    const invokeUrl = pulumi.interpolate`${apiGatewayStage.invokeUrl}/api`;

    return {
        lambdaFunction,
        apiGateway,
        apiGatewayDeployment,
        apiGatewayStage,
        apiGatewayIntegration,
        apiGatewayMethod,
        apiGatewayPermission,
        invokeUrl,
    };
}

// Create a directory for the Lambda code
// export function createLambdaCode(): void {
//     const fs = require("fs");
//     const path = require("path");

//     const lambdaCodeDir = path.join(__dirname, "../lambda/lambda-code");
//     if (!fs.existsSync(lambdaCodeDir)) {
//         fs.mkdirSync(lambdaCodeDir);
//     }

//     const indexJs = `
// const { Client } = require('pg');
// const AWS = require('aws-sdk');

// exports.handler = async (event, context) => {
//     try {
//         const dbHost = process.env.DB_HOST;
//         const dbName = process.env.DB_NAME;
//         const dbUser = process.env.DB_USER;
//         const dbPassword = process.env.DB_PASSWORD;

//         const client = new Client({
//             host: dbHost,
//             database: dbName,
//             user: dbUser,
//             password: dbPassword,
//             ssl: {
//                 rejectUnauthorized: false
//             }
//         });

//         await client.connect();

//         // Handle POST request
//         if (event.httpMethod === 'POST') {
//             const body = JSON.parse(event.body || '{}');
//             const { name, email } = body;

//             if (!name || !email) {
//                 return {
//                     statusCode: 400,
//                     headers: corsHeaders(),
//                     body: JSON.stringify({ message: "Missing name or email" })
//                 };
//             }

//             const insertQuery = 'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *';
//             const insertResult = await client.query(insertQuery, [name, email]);

//             await client.end();

//             return {
//                 statusCode: 201,
//                 headers: corsHeaders(),
//                 body: JSON.stringify({
//                     message: 'User created successfully',
//                     data: insertResult.rows[0]
//                 })
//             };
//         }

//         // Default to GET users
//         const result = await client.query('SELECT * FROM users LIMIT 10');
//         await client.end();

//         return {
//             statusCode: 200,
//             headers: corsHeaders(),
//             body: JSON.stringify({
//                 message: 'Data retrieved successfully',
//                 data: result.rows
//             })
//         };

//     } catch (error) {
//         console.error('Error:', error);

//         return {
//             statusCode: 200,
//             headers: corsHeaders(),
//             body: JSON.stringify({
//                 message: 'Using mock data due to database error',
//                 data: [
//                     { id: 1, name: 'User 1', email: 'user1@example.com' },
//                     { id: 2, name: 'User 2', email: 'user2@example.com' },
//                     { id: 3, name: 'User 3', email: 'user3@example.com' }
//                 ]
//             })
//         };
//     }
// };

// // Helper: standard CORS headers
// function corsHeaders() {
//     return {
//         'Content-Type': 'application/json',
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
//         'Access-Control-Allow-Headers': 'Content-Type'
//     };
// }

// `;

//     const packageJson = `{
//   "name": "lambda-function",
//   "version": "1.0.0",
//   "description": "Lambda function for 3-tier web application",
//   "main": "index.js",
//   "dependencies": {
//     "pg": "^8.7.1",
//     "aws-sdk": "^2.1048.0"
//   }
// }
// `;

//     fs.writeFileSync(path.join(lambdaCodeDir, "index.js"), indexJs);
//     fs.writeFileSync(path.join(lambdaCodeDir, "package.json"), packageJson);
// }