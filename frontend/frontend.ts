import * as fs from 'fs';
import * as path from 'path';
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";


export function updateFrontendWithApiUrl(apiUrl: pulumi.Output<string>): pulumi.Output<string> {
    return apiUrl.apply(url => {
        const frontendDir = path.join(__dirname, "frontend-files");
        const indexHtmlPath = path.join(frontendDir, "index.html");
        
        if (fs.existsSync(indexHtmlPath)) {
            let content = fs.readFileSync(indexHtmlPath, 'utf8');
            content = content.replace('API_GATEWAY_URL', url);
            fs.writeFileSync(indexHtmlPath, content);
        }
        
        return url;
    });
}

export function uploadFrontendToS3(bucket: aws.s3.BucketV2): void {
    const frontendDir = path.join(__dirname, "frontend-files");
    
    if (fs.existsSync(frontendDir)) {
        const files = fs.readdirSync(frontendDir);
        
        files.forEach(file => {
            const filePath = path.join(frontendDir, file);
            const content = fs.readFileSync(filePath);
            
            let contentType = "application/octet-stream";
            if (file.endsWith(".html")) contentType = "text/html";
            if (file.endsWith(".css")) contentType = "text/css";
            if (file.endsWith(".js")) contentType = "application/javascript";
            if (file.endsWith(".json")) contentType = "application/json";
            if (file.endsWith(".png")) contentType = "image/png";
            if (file.endsWith(".jpg") || file.endsWith(".jpeg")) contentType = "image/jpeg";
            
            new aws.s3.BucketObject(file, {
                bucket: bucket.id,
                key: file,
                content: content.toString(),
                contentType: contentType,
            });
        });
    }
}

export function restoreFrontendWithApiUrl(apiUrl: pulumi.Output<string>): pulumi.Output<string> {
    return apiUrl.apply(url => {
        const frontendDir = path.join(__dirname, "frontend-files");
        const indexHtmlPath = path.join(frontendDir, "index.html");
        
        if (fs.existsSync(indexHtmlPath)) {
            let content = fs.readFileSync(indexHtmlPath, 'utf8');
            content = content.replace( url,'API_GATEWAY_URL');
            fs.writeFileSync(indexHtmlPath, content);
        }
        
        return url;
    });
}